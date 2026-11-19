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
from datetime import datetime, timezone
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
