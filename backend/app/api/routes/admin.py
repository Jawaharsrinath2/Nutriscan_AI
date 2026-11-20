"""Admin Panel REST API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from jinja2.exceptions import TemplateSyntaxError
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.admin import (
    AdminOverviewStats,
    AdminSystemStatus,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserMealsResponse,
    AdminUserPlansResponse,
    AdminUserUpdateRole,
    AdminUserUpdateStatus,
    EmailPreviewRequest,
    EmailPreviewResponse,
    EmailTemplateDetail,
    EmailTemplateSummary,
    EmailTemplateUpdate,
    TestEmailRequest,
)
from app.schemas.auth import MessageResponse, UserInfo
from app.services import admin_service, email_service
from app.services.auth_service import create_password_reset_code, get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Enforces admin role-based authorization."""
    if getattr(user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required to access this resource.",
        )
    return user


# ── Overview / Metrics ─────────────────────────────────────────────────────────


@router.get("/overview", response_model=AdminOverviewStats)
def get_overview(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminOverviewStats:
    return admin_service.get_overview_stats(db)


# ── User Management ───────────────────────────────────────────────────────────


@router.get("/users", response_model=AdminUserListResponse)
def get_users(
    search: str | None = None,
    role: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    return admin_service.list_users(db, search, role, status_filter, page, limit)


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: AdminUserUpdateStatus,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    admin_service.update_user_status(db, user_id, body.is_active, body.unlock)
    return MessageResponse(detail="User status updated successfully.")


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    body: AdminUserUpdateRole,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    admin_service.update_user_role(db, user_id, admin.id, body.role)
    return MessageResponse(detail=f"User role updated to '{body.role}'.")


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    admin_service.delete_user_cascade(db, user_id, admin.id)
    return MessageResponse(detail="User and all associated data permanently deleted.")


@router.post("/users/{user_id}/send-reset-code")
def trigger_user_reset_code(
    user_id: int,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    code = create_password_reset_code(db, target_user)
    background_tasks.add_task(
        email_service.send_password_reset_email,
        target_user.email,
        target_user.username,
        code,
    )
    return MessageResponse(detail=f"Password reset verification code dispatched to {target_user.email}.")


@router.post("/users/{user_id}/send-weekly-summary", response_model=MessageResponse)
def trigger_user_weekly_summary(
    user_id: int,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    background_tasks.add_task(email_service.send_weekly_summary_email, db, target_user)
    return MessageResponse(detail=f"Weekly nutrition summary email dispatched to {target_user.email}.")


@router.post("/broadcast-weekly-summary", response_model=MessageResponse)
def trigger_broadcast_weekly_summary(
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    background_tasks.add_task(email_service.broadcast_weekly_summaries, db)
    return MessageResponse(
        detail="Weekly nutrition summaries are being broadcast to all active members in the background."
    )



@router.get("/users/{user_id}/detail", response_model=AdminUserDetailResponse)
def get_user_detail(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserDetailResponse:
    return admin_service.get_user_detail(db, user_id)


@router.get("/users/{user_id}/meals", response_model=AdminUserMealsResponse)
def get_user_meals(
    user_id: int,
    day: str | None = Query(None, description="Target date in YYYY-MM-DD format (defaults to latest logged day)"),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserMealsResponse:
    return admin_service.get_user_meals(db, user_id, day)


@router.get("/users/{user_id}/plans", response_model=AdminUserPlansResponse)
def get_user_plans(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserPlansResponse:
    return admin_service.get_user_plans(db, user_id)



# ── Email Templates & Live Customizer ──────────────────────────────────────────


@router.get("/emails", response_model=list[EmailTemplateSummary])
def list_email_templates(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[EmailTemplateSummary]:
    templates = email_service.list_all_templates(db)
    return [
        EmailTemplateSummary(
            key=t.key,
            name=t.name,
            subject=t.subject,
            description=t.description,
            variables=t.variables or [],
            updated_at=t.updated_at,
        )
        for t in templates
    ]


@router.get("/emails/{template_key}", response_model=EmailTemplateDetail)
def get_email_template(
    template_key: str,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> EmailTemplateDetail:
    tpl = email_service.get_template_by_key(db, template_key)
    if not tpl:
        raise HTTPException(status_code=404, detail=f"Email template '{template_key}' not found.")
    return EmailTemplateDetail(
        key=tpl.key,
        name=tpl.name,
        subject=tpl.subject,
        html_content=tpl.html_content,
        text_content=tpl.text_content,
        description=tpl.description,
        variables=tpl.variables or [],
        updated_at=tpl.updated_at,
    )


@router.put("/emails/{template_key}", response_model=EmailTemplateDetail)
def update_email_template(
    template_key: str,
    body: EmailTemplateUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> EmailTemplateDetail:
    try:
        tpl = email_service.save_email_template(
            db=db,
            key=template_key,
            subject=body.subject,
            html_content=body.html_content,
            text_content=body.text_content,
            name=body.name,
            description=body.description,
        )
    except TemplateSyntaxError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Jinja template syntax: {exc.message} (Line {exc.lineno})",
        )
    return EmailTemplateDetail(
        key=tpl.key,
        name=tpl.name,
        subject=tpl.subject,
        html_content=tpl.html_content,
        text_content=tpl.text_content,
        description=tpl.description,
        variables=tpl.variables or [],
        updated_at=tpl.updated_at,
    )


@router.post("/emails/{template_key}/preview", response_model=EmailPreviewResponse)
def preview_email_template(
    template_key: str,
    body: EmailPreviewRequest,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> EmailPreviewResponse:
    try:
        rendered = email_service.render_template_preview(
            template_key=template_key,
            subject_override=body.subject,
            html_override=body.html_content,
            text_override=body.text_content,
            sample_context=body.sample_context,
            db=db,
        )
        return EmailPreviewResponse(
            subject=rendered["subject"],
            html=rendered["html"],
            text=rendered["text"],
        )
    except TemplateSyntaxError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Jinja Syntax Error: {exc.message} (Line {exc.lineno})",
        )


@router.post("/emails/{template_key}/test-send", response_model=MessageResponse)
def send_test_email(
    template_key: str,
    body: TestEmailRequest,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    try:
        rendered = email_service.render_template_preview(
            template_key=template_key,
            subject_override=body.subject,
            html_override=body.html_content,
            text_override=body.text_content,
            sample_context={"username": "Admin Tester"},
            db=db,
        )
    except TemplateSyntaxError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid template syntax: {exc}")

    test_subject = f"[TEST] {rendered['subject']}"
    sent = email_service.send_email(body.recipient_email, test_subject, rendered["html"], rendered["text"])
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to dispatch test email via SMTP.")

    return MessageResponse(detail=f"Test email successfully sent to {body.recipient_email}!")


# ── System Diagnostics ────────────────────────────────────────────────────────


@router.get("/system", response_model=AdminSystemStatus)
def get_system(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminSystemStatus:
    return admin_service.get_system_status(db)
