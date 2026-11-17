from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.dashboard import DashboardResponse, DashboardSummary
from app.services import goals_service, meal_log_service
from app.services.auth_service import get_current_user
from app.services.food_repository import FoodRepository, get_food_repository

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    day: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> DashboardResponse:
    query_day = day or date.today()
    day_log = meal_log_service.day_log(db, user.id, query_day)
    targets = goals_service.get_targets(db, user.id, repo)
    water_state = meal_log_service.get_water(db, user.id, query_day)

    summary = DashboardSummary(
        kcal_logged=day_log.totals.kcal,
        kcal_target=targets.kcal,
        protein_logged=day_log.totals.protein,
        protein_target=targets.protein,
        carbs_logged=day_log.totals.carbs,
        carbs_target=targets.carbs,
        fat_logged=day_log.totals.fat,
        fat_target=targets.fat,
    )
    return DashboardResponse(
        day=query_day,
        summary=summary,
        meals=day_log.meals,
        water=water_state,
    )
