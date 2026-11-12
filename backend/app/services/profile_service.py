"""The user's onboarding profile and the targets derived from it."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import DailyGoals, UserProfile
from app.schemas.profile import ComputedTargets, ProfileIn, ProfileOut, ProfileResponse
from app.services import goals_service, target_calculator
from app.services.food_repository import FoodRepository

MANUAL_PLAN_KEY = "custom"


class NoProfileError(LookupError):
    pass


def _to_out(row: UserProfile) -> ProfileOut:
    value, label = target_calculator.bmi(row.height_cm, row.weight_kg)
    fields = {name: getattr(row, name) for name in ProfileIn.model_fields}
    return ProfileOut(**fields, bmi=value, bmi_label=label, onboarded_at=row.onboarded_at, updated_at=row.updated_at)


def _as_input(row: UserProfile) -> ProfileIn:
    return ProfileIn(**{name: getattr(row, name) for name in ProfileIn.model_fields})


def get_profile(db: Session, user_id: int) -> UserProfile | None:
    return db.get(UserProfile, user_id)


def _apply_computed(db: Session, user_id: int, computed: ComputedTargets) -> None:
    targets = target_calculator.as_targets(computed)
    goals_service._save(db, user_id, targets.plan_key, targets.model_dump(exclude={"plan_key"}))


def save_profile(db: Session, user_id: int, data: ProfileIn) -> UserProfile:
    """Upsert the answers. Targets follow unless the person has overridden them by hand."""
    row = db.get(UserProfile, user_id)
    now = datetime.utcnow()
    if row is None:
        row = UserProfile(user_id=user_id, onboarded_at=now, **data.model_dump())
        db.add(row)
    else:
        for name, value in data.model_dump().items():
            setattr(row, name, value)
    row.updated_at = now
    db.commit()

    goals = db.get(DailyGoals, user_id)
    if goals is None or goals.plan_key != MANUAL_PLAN_KEY:
        _apply_computed(db, user_id, target_calculator.compute(data))
    return row


def recalculate(db: Session, user_id: int) -> None:
    """Replace the active targets with the formula's numbers, dropping any manual override."""
    row = db.get(UserProfile, user_id)
    if row is None:
        raise NoProfileError(user_id)
    _apply_computed(db, user_id, target_calculator.compute(_as_input(row)))


def build_response(db: Session, user_id: int, repo: FoodRepository) -> ProfileResponse:
    row = db.get(UserProfile, user_id)
    targets = goals_service.get_targets(db, user_id, repo)
    if row is None:
        return ProfileResponse(profile=None, computed=None, targets=targets, targets_overridden=False)
    return ProfileResponse(
        profile=_to_out(row),
        computed=target_calculator.compute(_as_input(row)),
        targets=targets,
        targets_overridden=targets.plan_key != target_calculator.PLAN_KEY,
    )
