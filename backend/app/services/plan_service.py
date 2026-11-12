"""Generate, store and fetch the user's diet and workout plans."""

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AiPlan
from app.schemas.plans import DietPlanContent, PlanInputs, PlanKind, PlanOut, PlansResponse, WorkoutPlanContent
from app.services import default_plans, goals_service, profile_service
from app.services.auth_service import check_rate_limit
from app.services.food_repository import FoodRepository
from app.services.plan_writer import PlanGenerationError, PlanWriter, writer_status

logger = logging.getLogger(__name__)

GENERATIONS_PER_HOUR = 6  # each AI generation costs money
STALE_WEIGHT_KG = 2.0
STALE_KCAL = 100


def _inputs(db: Session, user_id: int, repo: FoodRepository) -> PlanInputs:
    profile = profile_service.get_profile(db, user_id)
    if profile is None:
        raise profile_service.NoProfileError(user_id)
    targets = goals_service.get_targets(db, user_id, repo)
    return PlanInputs(weight_kg=profile.weight_kg, kcal=targets.kcal, protein=targets.protein, goal=profile.goal, gym_days=profile.gym_days if profile.gym else 0)


def _stale(then: PlanInputs, now: PlanInputs, kind: str) -> str | None:
    if abs(now.weight_kg - then.weight_kg) >= STALE_WEIGHT_KG:
        return f"Your weight changed from {then.weight_kg:g} kg to {now.weight_kg:g} kg."
    if now.goal != then.goal:
        return "Your goal changed."
    if kind == "diet" and abs(now.kcal - then.kcal) >= STALE_KCAL:
        return f"Your calorie target moved from {then.kcal} to {now.kcal} kcal."
    if kind == "workout" and now.gym_days != then.gym_days:
        return "Your training days changed."
    return None


def _to_out(row: AiPlan, now: PlanInputs) -> PlanOut:
    then = PlanInputs(**row.inputs)
    content = DietPlanContent(**row.content) if row.kind == "diet" else WorkoutPlanContent(**row.content)
    reason = _stale(then, now, row.kind)
    return PlanOut(
        id=row.id, kind=row.kind, source=row.source, model=row.model, content=content, inputs=then,
        generated_at=row.created_at, stale=reason is not None, stale_reason=reason,
    )


def latest(db: Session, user_id: int, repo: FoodRepository) -> PlansResponse:
    ready, reason = writer_status()
    try:
        now = _inputs(db, user_id, repo)
    except profile_service.NoProfileError:
        return PlansResponse(diet=None, workout=None, ai_ready=ready, ai_reason=reason)
    plans = {}
    for kind in ("diet", "workout"):
        row = db.scalars(select(AiPlan).where(AiPlan.user_id == user_id, AiPlan.kind == kind).order_by(AiPlan.created_at.desc(), AiPlan.id.desc())).first()
        plans[kind] = _to_out(row, now) if row else None
    return PlansResponse(diet=plans["diet"], workout=plans["workout"], ai_ready=ready, ai_reason=reason)


def generate(db: Session, user_id: int, kinds: list[PlanKind], repo: FoodRepository, writer: PlanWriter | None) -> PlansResponse:
    """Write and store the requested plans. With no AI writer the templates are used (not rate-limited)."""
    profile_row = profile_service.get_profile(db, user_id)
    if profile_row is None:
        raise profile_service.NoProfileError(user_id)
    profile = profile_service._as_input(profile_row)
    targets = goals_service.get_targets(db, user_id, repo)
    inputs = _inputs(db, user_id, repo)
    if writer is not None:
        check_rate_limit(f"plans:{user_id}", max_requests=GENERATIONS_PER_HOUR, window=3600)

    ai_error = None
    for kind in kinds:
        content, source, model = None, "default", None
        if writer is not None:
            try:
                content = writer.write_diet(profile, targets) if kind == "diet" else writer.write_workout(profile)
                source, model = "ai", getattr(writer, "last_model", None) or writer.name
            except PlanGenerationError as exc:
                # The person still gets a plan today; the card shows why it is a template and offers Regenerate.
                logger.warning("AI %s plan failed for user %s: %s", kind, user_id, exc)
                ai_error = str(exc)
        if content is None:
            content = default_plans.diet_plan(profile, targets, repo) if kind == "diet" else default_plans.workout_plan(profile)
        db.add(AiPlan(user_id=user_id, kind=kind, source=source, model=model, content=content.model_dump(), inputs=inputs.model_dump(), created_at=datetime.utcnow()))
    db.commit()
    response = latest(db, user_id, repo)
    response.ai_error = ai_error
    return response
