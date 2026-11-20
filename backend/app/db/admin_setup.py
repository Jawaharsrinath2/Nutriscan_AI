"""Admin and Email Template database initialization helpers."""

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import Engine, inspect, select, text
from sqlalchemy.orm import Session

from app.config import BACKEND_DIR, DATA_DIR
from app.db.models import EmailTemplate, User

DEFAULT_TEMPLATES_META = {
    "welcome": {
        "name": "Welcome Email",
        "description": "Sent to new users upon registering an account",
        "variables": ["username", "app_url", "app_name", "support_email", "current_year"],
    },
    "password_reset": {
        "name": "Password Reset Code",
        "description": "Sent when a user requests a password reset code",
        "variables": ["username", "code", "expires_minutes", "app_url", "app_name", "support_email", "current_year"],
    },
    "weekly_summary": {
        "name": "Weekly Nutrition Summary",
        "description": "Weekly digest summarizing calorie and protein targets, logged meals, hydration, and AI coach tips",
        "variables": [
            "username",
            "start_date",
            "end_date",
            "meals_count",
            "days_active",
            "streak_days",
            "avg_kcal",
            "target_kcal",
            "avg_protein",
            "target_protein",
            "total_water_glasses",
            "total_water_liters",
            "coach_tip",
            "app_url",
            "app_name",
            "support_email",
            "current_year",
        ],
    },
}


def ensure_admin_and_templates(engine: Engine) -> None:
    inspector = inspect(engine)

    # 1. Ensure 'role' column exists in 'users' table
    if "users" in inspector.get_table_names():
        user_cols = {col["name"] for col in inspector.get_columns("users")}
        if "role" not in user_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'"))

        if "theme" not in user_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN theme VARCHAR(30) DEFAULT 'emerald'"))

        # Promote default superadmin
        with engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE users SET role = 'admin' "
                    "WHERE email = 'jawaharnatarajan2003@gmail.com' AND (role IS NULL OR role != 'admin')"
                )
            )

        # Ensure is_active is boolean in Postgres if it was created as integer
        if engine.dialect.name == "postgresql":
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "DO $$ BEGIN "
                        "IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active' AND data_type='integer') THEN "
                        "ALTER TABLE users ALTER COLUMN is_active TYPE boolean USING (is_active != 0); "
                        "END IF; END $$;"
                    )
                )

    # 2. Seed email templates if not present in DB
    templates_dir = BACKEND_DIR / "app" / "templates" / "email"
    config_file = DATA_DIR / "email_templates.json"

    disk_configs = {}
    if config_file.is_file():
        try:
            disk_configs = json.loads(config_file.read_text(encoding="utf-8"))
        except Exception:
            disk_configs = {}

    with Session(engine) as db:
        for key, meta in DEFAULT_TEMPLATES_META.items():
            existing = db.get(EmailTemplate, key)
            if existing is not None:
                continue

            cfg = disk_configs.get(key, {})
            subject = cfg.get("subject", f"NutriScan AI - {meta['name']}")
            html_file = cfg.get("html_template", f"{key}.html")
            text_file = cfg.get("text_template", f"{key}.txt")

            html_path = templates_dir / html_file
            text_path = templates_dir / text_file

            html_content = html_path.read_text(encoding="utf-8") if html_path.is_file() else "<p>{{ username }}</p>"
            text_content = text_path.read_text(encoding="utf-8") if text_path.is_file() else "{{ username }}"

            tpl = EmailTemplate(
                key=key,
                name=meta["name"],
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                description=meta["description"],
                variables=meta["variables"],
                updated_at=datetime.utcnow(),
            )
            db.add(tpl)
        db.commit()
