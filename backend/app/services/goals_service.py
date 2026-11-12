"""Daily calorie/macro targets: preset diet plans or custom values."""

from sqlalchemy.orm import Session

from app.db.models import DailyGoals
from app.schemas.goals import CustomTargets, DietPlan
from app.schemas.nutrition import Targets
from app.services.food_repository import FoodRepository

DEFAULT_PLAN = "balanced"
# Same limits as the inputs on the Diet Plan & Goals screen.
LIMITS = {"kcal": (800, 5000), "protein": (30, 350), "carbs": (20, 500), "fat": (15, 200)}


class UnknownPlanError(KeyError):
    pass


def list_plans(repo: FoodRepository) -> list[DietPlan]:
    return [DietPlan(key=key, **plan) for key, plan in repo.plans.items()]


def _to_targets(row: DailyGoals) -> Targets:
    return Targets(plan_key=row.plan_key, kcal=row.kcal, protein=row.protein, carbs=row.carbs, fat=row.fat)


def _save(db: Session, user_id: int, plan_key: str, values: dict[str, int]) -> Targets:
    row = db.get(DailyGoals, user_id)
    if row is None:
        row = DailyGoals(user_id=user_id, plan_key=plan_key, **values)
        db.add(row)
    else:
        row.plan_key = plan_key
        for name, value in values.items():
            setattr(row, name, value)
    db.commit()
    return _to_targets(row)


def get_targets(db: Session, user_id: int, repo: FoodRepository) -> Targets:
    row = db.get(DailyGoals, user_id)
    if row is None:
        return select_plan(db, user_id, repo, DEFAULT_PLAN)
    return _to_targets(row)


def select_plan(db: Session, user_id: int, repo: FoodRepository, plan_key: str) -> Targets:
    plan = repo.plans.get(plan_key)
    if plan is None:
        raise UnknownPlanError(plan_key)
    return _save(db, user_id, plan_key, {name: plan[name] for name in LIMITS})


def set_custom(db: Session, user_id: int, custom: CustomTargets) -> Targets:
    values = {name: max(low, min(high, getattr(custom, name))) for name, (low, high) in LIMITS.items()}
    return _save(db, user_id, "custom", values)
