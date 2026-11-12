from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.nutrition import AutoFitResponse, EvaluateRequest, EvaluateResponse
from app.services import diet_evaluator, goals_service, meal_log_service
from app.services.auth_service import get_current_user
from app.services.food_repository import FoodRepository, get_food_repository

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate_plate(
    body: EvaluateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> EvaluateResponse:
    consumed = meal_log_service.consumed_totals(db, user.id, date.today())
    targets = goals_service.get_targets(db, user.id, repo)
    return diet_evaluator.evaluate(body.items, repo, consumed, targets)


@router.post("/auto-fit", response_model=AutoFitResponse)
def auto_fit_plate(
    body: EvaluateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> AutoFitResponse:
    consumed = meal_log_service.consumed_totals(db, user.id, date.today())
    targets = goals_service.get_targets(db, user.id, repo)
    return diet_evaluator.auto_fit(body.items, repo, consumed, targets)
