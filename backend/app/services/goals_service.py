"""Daily calorie/macro targets: preset diet plans or custom values."""

from sqlalchemy.orm import Session

from app.db.models import DailyGoals
from app.schemas.goals import CustomTargets, DietPlan
from app.schemas.nutrition import Targets
from app.services.food_repository import FoodRepository

DEFAULT_PLAN = "balanced"
GOALS_ROW_ID = 1
# Same limits as the inputs on the Diet Plan & Goals screen.
LIMITS = {"kcal": (800, 5000), "protein": (30, 350), "carbs": (20, 500), "fat": (15, 200)}


class UnknownPlanError(KeyError):
    pass


def list_plans(repo: FoodRepository) -> list[DietPlan]:
    return [DietPlan(key=key, **plan) for key, plan in repo.plans.items()]


def _to_targets(row: DailyGoals) -> Targets:
    return Targets(plan_key=row.plan_key, kcal=row.kcal, protein=row.protein, carbs=row.carbs, fat=row.fat)


def _save(db: Session, plan_key: str, values: dict[str, int]) -> Targets:
    row = db.get(DailyGoals, GOALS_ROW_ID)
    if row is None:
        row = DailyGoals(id=GOALS_ROW_ID, plan_key=plan_key, **values)
        db.add(row)
    else:
        row.plan_key = plan_key
        for name, value in values.items():
            setattr(row, name, value)
    db.commit()
    return _to_targets(row)


def get_targets(db: Session, repo: FoodRepository) -> Targets:
    row = db.get(DailyGoals, GOALS_ROW_ID)
    if row is None:
        return select_plan(db, repo, DEFAULT_PLAN)
    return _to_targets(row)


def select_plan(db: Session, repo: FoodRepository, plan_key: str) -> Targets:
    plan = repo.plans.get(plan_key)
    if plan is None:
        raise UnknownPlanError(plan_key)
    return _save(db, plan_key, {name: plan[name] for name in LIMITS})


def set_custom(db: Session, custom: CustomTargets) -> Targets:
    values = {name: max(low, min(high, getattr(custom, name))) for name, (low, high) in LIMITS.items()}
    return _save(db, "custom", values)
