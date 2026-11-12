from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.goals import CustomTargets, DietPlan, PlanSelect
from app.schemas.nutrition import Targets
from app.services import goals_service
from app.services.food_repository import FoodRepository, get_food_repository

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("", response_model=Targets)
def get_goals(db: Session = Depends(get_db), repo: FoodRepository = Depends(get_food_repository)) -> Targets:
    return goals_service.get_targets(db, repo)


@router.get("/plans", response_model=list[DietPlan])
def list_plans(repo: FoodRepository = Depends(get_food_repository)) -> list[DietPlan]:
    return goals_service.list_plans(repo)


@router.put("/plan", response_model=Targets)
def select_plan(
    body: PlanSelect, db: Session = Depends(get_db), repo: FoodRepository = Depends(get_food_repository)
) -> Targets:
    try:
        return goals_service.select_plan(db, repo, body.plan_key)
    except goals_service.UnknownPlanError:
        raise HTTPException(status_code=404, detail=f"Unknown diet plan: {body.plan_key}") from None


@router.put("/custom", response_model=Targets)
def set_custom(body: CustomTargets, db: Session = Depends(get_db)) -> Targets:
    return goals_service.set_custom(db, body)
