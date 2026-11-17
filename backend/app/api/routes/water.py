from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.meal import WaterState, WaterUpdate
from app.services import meal_log_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/water", tags=["water"])


@router.get("/today", response_model=WaterState)
def get_water(
    day: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WaterState:
    query_day = day or date.today()
    return meal_log_service.get_water(db, user.id, query_day)


@router.put("/today", response_model=WaterState)
def set_water(
    body: WaterUpdate,
    day: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WaterState:
    query_day = day or date.today()
    return meal_log_service.set_water(db, user.id, query_day, body.glasses)
