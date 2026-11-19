"""Pydantic schemas for Admin Panel endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class AdminOverviewStats(BaseModel):
    total_users: int
    active_users: int
    meals_today: int
    meals_total: int
    water_today_glasses: int
    plans_generated: int
    signup_trend: list[dict[str, Any]]  # [{"date": "2026-11-12", "count": 2}, ...]
    meal_trend: list[dict[str, Any]]


class AdminUserItem(BaseModel):
    id: int
    email: str
    username: str
    provider: str
    role: str
    is_active: bool
    avatar_url: str | None = None
    meals_logged_count: int
    is_locked: bool
    created_at: datetime
    has_profile: bool


class AdminUserListResponse(BaseModel):
    users: list[AdminUserItem]
    total: int
    page: int
    limit: int


class AdminUserUpdateRole(BaseModel):
    role: Literal["user", "admin"]


class AdminUserUpdateStatus(BaseModel):
    is_active: bool | None = None
    unlock: bool | None = None


class EmailTemplateSummary(BaseModel):
    key: str
    name: str
    subject: str
    description: str | None = None
    variables: list[str]
    updated_at: datetime


class EmailTemplateDetail(BaseModel):
    key: str
    name: str
    subject: str
    html_content: str
    text_content: str
    description: str | None = None
    variables: list[str]
    updated_at: datetime


class EmailTemplateUpdate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    html_content: str = Field(..., min_length=1)
    text_content: str = Field(..., min_length=1)
    name: str | None = None
    description: str | None = None


class EmailPreviewRequest(BaseModel):
    subject: str | None = None
    html_content: str | None = None
    text_content: str | None = None
    sample_context: dict[str, Any] | None = None


class EmailPreviewResponse(BaseModel):
    subject: str
    html: str
    text: str


class TestEmailRequest(BaseModel):
    recipient_email: str
    subject: str | None = None
    html_content: str | None = None
    text_content: str | None = None


class AdminSystemStatus(BaseModel):
    db_type: str
    db_connected: bool
    smtp_configured: bool
    smtp_host: str | None
    vision_mode: str
    gemini_ready: bool
    python_version: str
    server_time: datetime


# ── User Detail, Meals by Date, and AI Plans ──────────────────────────────────


class AdminLoggedDaySummary(BaseModel):
    day: str
    meals_count: int
    total_kcal: int
    water_glasses: int


class AdminUserMealItem(BaseModel):
    id: str
    slot: str
    time: str
    title: str
    image_url: str | None = None
    items: list[Any] = []
    kcal: int
    protein: float
    carbs: float
    fat: float
    fiber: float
    created_at: datetime


class AdminUserMealsResponse(BaseModel):
    user_id: int
    day: str
    water_glasses: int
    totals: dict[str, Any]
    meals: list[AdminUserMealItem]
    available_days: list[str]


class AdminAiPlanItem(BaseModel):
    id: int
    user_id: int
    kind: str  # "diet" | "workout"
    source: str  # "ai" | "default"
    model: str | None = None
    content: dict[str, Any]
    inputs: dict[str, Any] = {}
    created_at: datetime


class AdminUserPlansResponse(BaseModel):
    user_id: int
    plans: list[AdminAiPlanItem]


class AdminUserDetailResponse(BaseModel):
    user: AdminUserItem
    profile: dict[str, Any] | None = None
    targets: dict[str, Any] | None = None
    active_diet_plan: AdminAiPlanItem | None = None
    active_workout_plan: AdminAiPlanItem | None = None
    logged_days: list[AdminLoggedDaySummary] = []

