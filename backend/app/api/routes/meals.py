from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.meal import DayLog, LoggedMeal, LogMealRequest
from app.services import meal_log_service
from app.services.auth_service import get_current_user
from app.services.food_repository import FoodRepository, get_food_repository

router = APIRouter(prefix="/api/meals", tags=["meals"])


@router.get("/today", response_model=DayLog)
def get_today(
    day: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DayLog:
    query_day = day or date.today()
    return meal_log_service.day_log(db, user.id, query_day)


@router.get("/logged-dates", response_model=list[date])
def get_logged_dates(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[date]:
    return meal_log_service.get_logged_dates(db, user.id)


@router.post("", response_model=LoggedMeal, status_code=status.HTTP_201_CREATED)
def log_meal(
    body: LogMealRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> LoggedMeal:
    return meal_log_service.add_meal(db, user.id, body, repo)


@router.delete("/today", status_code=status.HTTP_204_NO_CONTENT)
def clear_today(
    day: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    query_day = day or date.today()
    meal_log_service.clear_day(db, user.id, query_day)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_meal(meal_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    if not meal_log_service.delete_meal(db, user.id, meal_id):
        raise HTTPException(status_code=404, detail="Meal not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
