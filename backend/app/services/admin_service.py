"""Admin management service logic for NutriScan AI."""

from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import AiPlan, DailyGoals, MealLog, PasswordResetCode, User, UserProfile, WaterLog
from app.schemas.admin import (
    AdminAiPlanItem,
    AdminLoggedDaySummary,
    AdminOverviewStats,
    AdminSystemStatus,
    AdminUserDetailResponse,
    AdminUserItem,
    AdminUserListResponse,
    AdminUserMealItem,
    AdminUserMealsResponse,
    AdminUserPlansResponse,
)
from app.vision import factory


def get_overview_stats(db: Session) -> AdminOverviewStats:
    today = date.today()
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active == True)) or 0

    meals_today = db.scalar(select(func.count(MealLog.id)).where(MealLog.day == today)) or 0
    meals_total = db.scalar(select(func.count(MealLog.id))) or 0

    water_today_glasses = (
        db.scalar(select(func.coalesce(func.sum(WaterLog.glasses), 0)).where(WaterLog.day == today)) or 0
    )
    plans_generated = db.scalar(select(func.count(AiPlan.id))) or 0

    # 7-day registration & meal trends
    seven_days_ago = today - timedelta(days=6)
    signup_trend = []
    meal_trend = []

    for i in range(7):
        current_day = seven_days_ago + timedelta(days=i)
        day_str = current_day.isoformat()

        # Signups on day (User.created_at is datetime)
        start_dt = datetime.combine(current_day, datetime.min.time())
        end_dt = datetime.combine(current_day, datetime.max.time())
        u_count = (
            db.scalar(select(func.count(User.id)).where(User.created_at >= start_dt, User.created_at <= end_dt)) or 0
        )
        signup_trend.append({"date": day_str, "count": u_count})

        # Meals on day
        m_count = db.scalar(select(func.count(MealLog.id)).where(MealLog.day == current_day)) or 0
        meal_trend.append({"date": day_str, "count": m_count})

    return AdminOverviewStats(
        total_users=total_users,
        active_users=active_users,
        meals_today=meals_today,
        meals_total=meals_total,
        water_today_glasses=water_today_glasses,
        plans_generated=plans_generated,
        signup_trend=signup_trend,
        meal_trend=meal_trend,
    )


def list_users(
    db: Session,
    search: str | None = None,
    role: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> AdminUserListResponse:
    query = select(User)

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(User.username).like(search_pattern),
                func.lower(User.email).like(search_pattern),
            )
        )

    if role and role in ("user", "admin"):
        query = query.where(User.role == role)

    now = datetime.utcnow()
    if status_filter == "locked":
        query = query.where(User.locked_until > now)
    elif status_filter == "suspended":
        query = query.where(User.is_active == False)
    elif status_filter == "active":
        query = query.where(User.is_active == True)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    users = db.scalars(query.order_by(User.id.desc()).offset((page - 1) * limit).limit(limit)).all()

    # Prefetch meal count and profile presence
    user_ids = [u.id for u in users]
    meal_counts = {}
    profiles = set()

    if user_ids:
        counts = db.execute(
            select(MealLog.user_id, func.count(MealLog.id)).where(MealLog.user_id.in_(user_ids)).group_by(MealLog.user_id)
        ).all()
        meal_counts = {uid: count for uid, count in counts}

        prof_rows = db.execute(select(UserProfile.user_id).where(UserProfile.user_id.in_(user_ids))).all()
        profiles = {r[0] for r in prof_rows}

    items = []
    for u in users:
        is_locked = bool(u.locked_until and u.locked_until > now)
        items.append(
            AdminUserItem(
                id=u.id,
                email=u.email,
                username=u.username,
                provider=u.provider,
                role=u.role or "user",
                is_active=bool(u.is_active),
                avatar_url=u.avatar_url,
                meals_logged_count=meal_counts.get(u.id, 0),
                is_locked=is_locked,
                created_at=u.created_at or now,
                has_profile=u.id in profiles,
            )
        )

    return AdminUserListResponse(users=items, total=total, page=page, limit=limit)


def update_user_status(db: Session, user_id: int, is_active: bool | None, unlock: bool | None) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if is_active is not None:
        user.is_active = is_active
    if unlock:
        user.failed_attempts = 0
        user.locked_until = None

    db.commit()
    db.refresh(user)
    return user


def update_user_role(db: Session, target_user_id: int, current_admin_id: int, new_role: str) -> User:
    if target_user_id == current_admin_id and new_role != "admin":
        raise HTTPException(status_code=400, detail="You cannot demote yourself from admin role.")

    user = db.get(User, target_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.role = new_role
    db.commit()
    db.refresh(user)
    return user


def delete_user_cascade(db: Session, target_user_id: int, current_admin_id: int) -> bool:
    if target_user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    user = db.get(User, target_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Cascade deletes
    db.execute(delete(MealLog).where(MealLog.user_id == target_user_id))
    db.execute(delete(WaterLog).where(WaterLog.user_id == target_user_id))
    db.execute(delete(DailyGoals).where(DailyGoals.user_id == target_user_id))
    db.execute(delete(UserProfile).where(UserProfile.user_id == target_user_id))
    db.execute(delete(AiPlan).where(AiPlan.user_id == target_user_id))
    db.execute(delete(PasswordResetCode).where(PasswordResetCode.user_id == target_user_id))
    db.delete(user)
    db.commit()
    return True


def get_system_status(db: Session) -> AdminSystemStatus:
    settings = get_settings()
    engine = db.get_bind()
    dialect = engine.dialect.name if engine else "unknown"

    detector_choice = factory.get_detector(settings.detector, settings)
    gemini_ready = detector_choice.detector is not None

    return AdminSystemStatus(
        db_type=dialect,
        db_connected=True,
        smtp_configured=bool(settings.smtp_host),
        smtp_host=settings.smtp_host or None,
        vision_mode=settings.detector,
        gemini_ready=gemini_ready,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        server_time=datetime.utcnow(),
    )


# ── Detailed User Inspection (Profile, Meals by Date, AI Plans) ───────────────


def get_user_detail(db: Session, user_id: int) -> AdminUserDetailResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    now = datetime.utcnow()
    is_locked = bool(user.locked_until and user.locked_until > now)
    meal_count = db.scalar(select(func.count(MealLog.id)).where(MealLog.user_id == user_id)) or 0
    prof = db.get(UserProfile, user_id)
    has_profile = prof is not None

    user_item = AdminUserItem(
        id=user.id,
        email=user.email,
        username=user.username,
        provider=user.provider,
        role=user.role or "user",
        is_active=bool(user.is_active),
        avatar_url=user.avatar_url,
        meals_logged_count=meal_count,
        is_locked=is_locked,
        created_at=user.created_at or now,
        has_profile=has_profile,
    )

    profile_dict = None
    if prof:
        profile_dict = {
            "sex": prof.sex,
            "age": prof.age,
            "height_cm": prof.height_cm,
            "weight_kg": prof.weight_kg,
            "target_weight_kg": prof.target_weight_kg,
            "goal": prof.goal,
            "activity": prof.activity,
            "gym": prof.gym,
            "gym_days": prof.gym_days,
            "experience": prof.experience,
            "home_workouts": prof.home_workouts,
            "diet_pref": prof.diet_pref,
            "avoid": prof.avoid or [],
            "kcal_adjust": prof.kcal_adjust,
            "onboarded_at": prof.onboarded_at.isoformat() if prof.onboarded_at else None,
        }

    goals = db.get(DailyGoals, user_id)
    targets_dict = None
    if goals:
        targets_dict = {
            "plan_key": goals.plan_key,
            "kcal": goals.kcal,
            "protein": goals.protein,
            "carbs": goals.carbs,
            "fat": goals.fat,
        }

    # Latest diet plan
    diet_plan_row = db.scalars(
        select(AiPlan).where(AiPlan.user_id == user_id, AiPlan.kind == "diet").order_by(AiPlan.id.desc()).limit(1)
    ).first()
    active_diet = None
    if diet_plan_row:
        active_diet = AdminAiPlanItem(
            id=diet_plan_row.id,
            user_id=diet_plan_row.user_id,
            kind=diet_plan_row.kind,
            source=diet_plan_row.source,
            model=diet_plan_row.model,
            content=diet_plan_row.content or {},
            inputs=diet_plan_row.inputs or {},
            created_at=diet_plan_row.created_at,
        )

    # Latest workout plan
    workout_plan_row = db.scalars(
        select(AiPlan).where(AiPlan.user_id == user_id, AiPlan.kind == "workout").order_by(AiPlan.id.desc()).limit(1)
    ).first()
    active_workout = None
    if workout_plan_row:
        active_workout = AdminAiPlanItem(
            id=workout_plan_row.id,
            user_id=workout_plan_row.user_id,
            kind=workout_plan_row.kind,
            source=workout_plan_row.source,
            model=workout_plan_row.model,
            content=workout_plan_row.content or {},
            inputs=workout_plan_row.inputs or {},
            created_at=workout_plan_row.created_at,
        )

    # Group meal logs by day
    day_rows = db.execute(
        select(
            MealLog.day,
            func.count(MealLog.id),
            func.coalesce(func.sum(MealLog.kcal), 0),
        )
        .where(MealLog.user_id == user_id)
        .group_by(MealLog.day)
        .order_by(MealLog.day.desc())
    ).all()

    days_list = [r[0] for r in day_rows]
    water_map = {}
    if days_list:
        water_rows = db.execute(
            select(WaterLog.day, WaterLog.glasses).where(
                WaterLog.user_id == user_id, WaterLog.day.in_(days_list)
            )
        ).all()
        water_map = {r[0]: r[1] for r in water_rows}

    logged_days = [
        AdminLoggedDaySummary(
            day=r[0].isoformat(),
            meals_count=r[1],
            total_kcal=int(r[2]),
            water_glasses=water_map.get(r[0], 0),
        )
        for r in day_rows
    ]

    return AdminUserDetailResponse(
        user=user_item,
        profile=profile_dict,
        targets=targets_dict,
        active_diet_plan=active_diet,
        active_workout_plan=active_workout,
        logged_days=logged_days,
    )


def get_user_meals(db: Session, user_id: int, target_day_str: str | None = None) -> AdminUserMealsResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    distinct_days = db.scalars(
        select(MealLog.day).distinct().where(MealLog.user_id == user_id).order_by(MealLog.day.desc())
    ).all()
    available_days = [d.isoformat() for d in distinct_days]

    if target_day_str:
        try:
            target_date = date.fromisoformat(target_day_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
    else:
        target_date = distinct_days[0] if distinct_days else date.today()

    meal_rows = db.scalars(
        select(MealLog)
        .where(MealLog.user_id == user_id, MealLog.day == target_date)
        .order_by(MealLog.created_at.asc())
    ).all()

    water_glasses = (
        db.scalar(
            select(WaterLog.glasses).where(
                WaterLog.user_id == user_id, WaterLog.day == target_date
            )
        )
        or 0
    )

    meals = []
    tot_kcal = 0
    tot_protein = 0.0
    tot_carbs = 0.0
    tot_fat = 0.0
    tot_fiber = 0.0

    for m in meal_rows:
        tot_kcal += m.kcal or 0
        tot_protein += m.protein or 0.0
        tot_carbs += m.carbs or 0.0
        tot_fat += m.fat or 0.0
        tot_fiber += m.fiber or 0.0

        meals.append(
            AdminUserMealItem(
                id=m.id,
                slot=m.slot,
                time=m.created_at.strftime("%I:%M %p") if m.created_at else "",
                title=m.title,
                image_url=m.image_url,
                items=m.items or [],
                kcal=m.kcal,
                protein=round(m.protein, 1),
                carbs=round(m.carbs, 1),
                fat=round(m.fat, 1),
                fiber=round(m.fiber, 1),
                created_at=m.created_at,
            )
        )

    totals = {
        "kcal": tot_kcal,
        "protein": round(tot_protein, 1),
        "carbs": round(tot_carbs, 1),
        "fat": round(tot_fat, 1),
        "fiber": round(tot_fiber, 1),
    }

    return AdminUserMealsResponse(
        user_id=user_id,
        day=target_date.isoformat(),
        water_glasses=water_glasses,
        totals=totals,
        meals=meals,
        available_days=available_days,
    )


def get_user_plans(db: Session, user_id: int) -> AdminUserPlansResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    rows = db.scalars(
        select(AiPlan).where(AiPlan.user_id == user_id).order_by(AiPlan.id.desc())
    ).all()

    plans = [
        AdminAiPlanItem(
            id=p.id,
            user_id=p.user_id,
            kind=p.kind,
            source=p.source,
            model=p.model,
            content=p.content or {},
            inputs=p.inputs or {},
            created_at=p.created_at,
        )
        for p in rows
    ]

    return AdminUserPlansResponse(user_id=user_id, plans=plans)

