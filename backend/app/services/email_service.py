"""Dynamic Email Service for NutriScan AI.

Templates and content are loaded dynamically from files on disk
(app/data/email_templates.json and app/templates/email/*.html / *.txt).
Any edits to the template files or subjects take effect immediately
without restarting or modifying Python code.
"""

from __future__ import annotations

import json
import logging
import smtplib
from datetime import date, datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

from jinja2 import BaseLoader, Environment

from app.config import BACKEND_DIR, DATA_DIR, get_settings

logger = logging.getLogger("nutriscan.email")

TEMPLATES_DIR = BACKEND_DIR / "app" / "templates" / "email"
CONFIG_FILE = DATA_DIR / "email_templates.json"

# In-memory mock outbox for development & automated tests when SMTP is not configured
_mock_outbox: list[dict[str, Any]] = []
_latest_dev_codes: dict[str, str] = {}


def _get_jinja_env() -> Environment:
    return Environment(loader=BaseLoader(), autoescape=True)


def load_email_template(
    template_key: str, context: dict[str, Any], db: Any = None
) -> tuple[str, str, str]:
    """Dynamically load and render the email template from DB (fallback to disk).

    Returns: (subject, rendered_html, rendered_text)
    """
    settings = get_settings()

    # Base context values injected automatically
    merged_context = {
        "app_name": "NutriScan AI",
        "app_url": settings.app_url,
        "current_year": datetime.now(timezone.utc).year,
        "support_email": settings.smtp_from_email or "support@nutriscan.ai",
        **context,
    }

    subject_raw = None
    html_raw = None
    text_raw = None

    # 1. Try reading from Database
    try:
        from app.db.models import EmailTemplate
        from app.db.session import _session_factory

        session = db or _session_factory()()
        tpl = session.get(EmailTemplate, template_key)
        if tpl:
            subject_raw = tpl.subject
            html_raw = tpl.html_content
            text_raw = tpl.text_content
        if not db:
            session.close()
    except Exception as exc:
        logger.debug("Database email template lookup failed: %s", exc)

    # 2. Disk fallback if not in DB
    if subject_raw is None or html_raw is None:
        subject_raw = "NutriScan AI Notification"
        html_file = f"{template_key}.html"
        text_file = f"{template_key}.txt"

        if CONFIG_FILE.is_file():
            try:
                cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
                tpl_cfg = cfg.get(template_key, {})
                subject_raw = tpl_cfg.get("subject", subject_raw)
                html_file = tpl_cfg.get("html_template", html_file)
                text_file = tpl_cfg.get("text_template", text_file)
            except Exception as exc:
                logger.warning("Could not read %s: %s", CONFIG_FILE, exc)

        html_path = TEMPLATES_DIR / html_file
        if html_path.is_file():
            html_raw = html_path.read_text(encoding="utf-8")
        else:
            html_raw = f"<p>Hello {merged_context.get('username', 'there')},</p><p>{subject_raw}</p>"

        text_path = TEMPLATES_DIR / text_file
        if text_path.is_file():
            text_raw = text_path.read_text(encoding="utf-8")
        else:
            text_raw = f"Hello {merged_context.get('username', 'there')},\n\n{subject_raw}"

    # Render Subject, HTML and Text with Jinja
    env = _get_jinja_env()
    subject = env.from_string(subject_raw).render(**merged_context)
    rendered_html = env.from_string(html_raw).render(**merged_context)
    rendered_text = env.from_string(text_raw or "").render(**merged_context)

    return subject, rendered_html, rendered_text


def send_email(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """Send an email using SMTP if configured; otherwise logs to mock outbox."""
    settings = get_settings()

    if not settings.smtp_host:
        # Development / test mode: log cleanly to console and save in mock outbox
        logger.info(
            "📧 [DEV MOCK EMAIL] To: %s | Subject: %s",
            to_email,
            subject,
        )
        record = {
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "text": text_content,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        _mock_outbox.append(record)
        return True

    # Real SMTP send
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        if settings.smtp_ssl:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                if settings.smtp_tls:
                    server.starttls()
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from_email, [to_email], msg.as_string())
        logger.info("Successfully sent email to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


# ── High-Level Flow Helpers ───────────────────────────────────────────────────


def send_welcome_email(to_email: str, username: str) -> bool:
    """Send the welcome email to a newly signed up user."""
    context = {"username": username, "email": to_email}
    subject, html_body, text_body = load_email_template("welcome", context)
    return send_email(to_email, subject, html_body, text_body)


def send_password_reset_email(to_email: str, username: str, code: str, expiry_minutes: int = 15) -> bool:
    """Send the 6-digit password reset verification code email."""
    if not get_settings().smtp_host:
        # Mock mode only: the code is never emailed, so expose it to the dev helper endpoint.
        _latest_dev_codes[to_email.lower()] = code
    context = {
        "username": username,
        "email": to_email,
        "code": code,
        "expiry_minutes": expiry_minutes,
    }
    subject, html_body, text_body = load_email_template("password_reset", context)
    return send_email(to_email, subject, html_body, text_body)


def get_weekly_summary_context(db: Any, user: Any, end_date: date | None = None) -> dict[str, Any]:
    """Aggregates the past 7 days of nutrition and hydration for a user and generates smart AI coach tips."""
    if end_date is None:
        end_date = date.today()
    start_date = end_date - timedelta(days=6)

    from sqlalchemy import func, select
    from app.db.models import DailyGoals, MealLog, WaterLog

    # Fetch meals in range
    meals = db.scalars(
        select(MealLog).where(
            MealLog.user_id == user.id,
            MealLog.day >= start_date,
            MealLog.day <= end_date,
        )
    ).all()

    meals_count = len(meals)
    distinct_active_days = len({m.day for m in meals})

    tot_kcal = sum(m.kcal or 0 for m in meals)
    tot_protein = sum(m.protein or 0.0 for m in meals)

    # Average per day across the 7-day period
    avg_kcal = round(tot_kcal / 7) if meals_count > 0 else 0
    avg_protein = round(tot_protein / 7, 1) if meals_count > 0 else 0.0

    # Fetch water logs in range
    water_glasses_sum = (
        db.scalar(
            select(func.coalesce(func.sum(WaterLog.glasses), 0)).where(
                WaterLog.user_id == user.id,
                WaterLog.day >= start_date,
                WaterLog.day <= end_date,
            )
        )
        or 0
    )
    total_water_liters = round(water_glasses_sum * 0.25, 1)

    # Fetch target goals
    goals = db.get(DailyGoals, user.id)
    target_kcal = goals.kcal if goals else 2100
    target_protein = goals.protein if goals else 135

    # Calculate streak (consecutive days logged backwards from end_date)
    streak_days = 0
    check_day = end_date
    logged_days_set = {m.day for m in meals}
    for _ in range(7):
        if check_day in logged_days_set:
            streak_days += 1
            check_day -= timedelta(days=1)
        else:
            break

    # Generate supportive Coach Tip
    if distinct_active_days >= 6:
        if avg_protein >= target_protein * 0.9:
            coach_tip = (
                "Phenomenal consistency! You maintained an active logging streak and crushed your daily protein targets. "
                "Keep this high momentum rolling into next week!"
            )
        else:
            coach_tip = (
                f"Outstanding logging consistency across {distinct_active_days} days! For next week, try boosting your protein slightly "
                f"with eggs, paneer, sprouts, or chicken to hit your {target_protein}g goal."
            )
    elif distinct_active_days >= 3:
        coach_tip = (
            f"Solid effort with {meals_count} meals logged across {distinct_active_days} days! "
            f"Aim to log your breakfast and lunch consistently to build a full 7-day habit next week."
        )
    else:
        coach_tip = (
            "Every step counts! Try setting a small goal for next week: snap and scan at least one meal a day. "
            "Our camera vision makes checking portions and macros effortless."
        )

    return {
        "username": user.username,
        "email": user.email,
        "start_date": start_date.strftime("%b %d, %Y"),
        "end_date": end_date.strftime("%b %d, %Y"),
        "meals_count": meals_count,
        "days_active": distinct_active_days,
        "streak_days": streak_days,
        "avg_kcal": avg_kcal,
        "target_kcal": target_kcal,
        "avg_protein": avg_protein,
        "target_protein": target_protein,
        "total_water_glasses": water_glasses_sum,
        "total_water_liters": total_water_liters,
        "coach_tip": coach_tip,
    }


def send_weekly_summary_email(db: Any, user: Any, end_date: date | None = None) -> bool:
    """Calculates weekly stats and sends the weekly digest to the user."""
    context = get_weekly_summary_context(db, user, end_date)
    subject, html_body, text_body = load_email_template("weekly_summary", context, db=db)
    return send_email(user.email, subject, html_body, text_body)


def send_user_weekly_summary(db: Any, user_id: int) -> dict[str, Any]:
    from fastapi import HTTPException
    from app.db.models import User

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    context = get_weekly_summary_context(db, user)
    sent = send_weekly_summary_email(db, user)
    return {"user_id": user.id, "email": user.email, "sent": sent, "summary": context}


def broadcast_weekly_summaries(db: Any) -> dict[str, Any]:
    from sqlalchemy import select
    from app.db.models import User

    users = db.scalars(select(User).where(User.is_active == True)).all()
    sent_count = 0
    failed_count = 0

    for u in users:
        try:
            if send_weekly_summary_email(db, u):
                sent_count += 1
            else:
                failed_count += 1
        except Exception as exc:
            logger.error("Failed to send weekly summary to %s: %s", u.email, exc)
            failed_count += 1

    return {"total_users": len(users), "sent": sent_count, "failed": failed_count}



def get_latest_mock_email(email: str | None = None) -> dict[str, Any] | None:
    """Helper to inspect the latest mock sent email in dev / testing."""
    if not _mock_outbox:
        return None
    if email:
        for item in reversed(_mock_outbox):
            if item["to"].lower() == email.lower():
                return item
        return None
    return _mock_outbox[-1]


def get_latest_dev_code(email: str) -> str | None:
    return _latest_dev_codes.get(email.lower())


# ── Admin Email Template Management ──────────────────────────────────────────


def validate_template_syntax(subject: str, html_content: str, text_content: str | None = None) -> None:
    """Check that Jinja syntax in subject, HTML and text is valid. Raises TemplateSyntaxError on failure."""
    env = _get_jinja_env()
    env.from_string(subject)
    env.from_string(html_content)
    if text_content:
        env.from_string(text_content)


def list_all_templates(db: Any) -> list[Any]:
    from app.db.models import EmailTemplate

    return db.query(EmailTemplate).order_by(EmailTemplate.name).all()


def get_template_by_key(db: Any, key: str) -> Any:
    from app.db.models import EmailTemplate

    return db.get(EmailTemplate, key)


def save_email_template(
    db: Any,
    key: str,
    subject: str,
    html_content: str,
    text_content: str,
    name: str | None = None,
    description: str | None = None,
) -> Any:
    validate_template_syntax(subject, html_content, text_content)

    from app.db.models import EmailTemplate

    tpl = db.get(EmailTemplate, key)
    if tpl is None:
        tpl = EmailTemplate(
            key=key,
            name=name or key.replace("_", " ").title(),
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            description=description,
            variables=[],
            updated_at=datetime.utcnow(),
        )
        db.add(tpl)
    else:
        tpl.subject = subject
        tpl.html_content = html_content
        tpl.text_content = text_content
        if name:
            tpl.name = name
        if description is not None:
            tpl.description = description
        tpl.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(tpl)
    return tpl


def render_template_preview(
    template_key: str,
    subject_override: str | None = None,
    html_override: str | None = None,
    text_override: str | None = None,
    sample_context: dict[str, Any] | None = None,
    db: Any = None,
) -> dict[str, str]:
    mock_data = {
        "username": "Alex Johnson",
        "email": "alex.johnson@example.com",
        "code": "849201",
        "expiry_minutes": 15,
        "start_date": "Nov 12, 2026",
        "end_date": "Nov 18, 2026",
        "meals_count": 18,
        "days_active": 6,
        "streak_days": 6,
        "avg_kcal": 2040,
        "target_kcal": 2100,
        "avg_protein": 128.5,
        "target_protein": 135,
        "total_water_glasses": 44,
        "total_water_liters": 11.0,
        "coach_tip": "Outstanding consistency this week! You hit your protein target on 5 out of 7 days. For next week, aim to add an extra glass of water on your workout days to optimize recovery.",
        **(sample_context or {}),
    }

    if subject_override is not None and html_override is not None:
        validate_template_syntax(subject_override, html_override, text_override)
        settings = get_settings()
        merged = {
            "app_name": "NutriScan AI",
            "app_url": settings.app_url,
            "current_year": datetime.now(timezone.utc).year,
            "support_email": settings.smtp_from_email or "support@nutriscan.ai",
            **mock_data,
        }
        env = _get_jinja_env()
        return {
            "subject": env.from_string(subject_override).render(**merged),
            "html": env.from_string(html_override).render(**merged),
            "text": env.from_string(text_override or "").render(**merged),
        }

    subject, html, text = load_email_template(template_key, mock_data, db=db)
    return {"subject": subject, "html": html, "text": text}
