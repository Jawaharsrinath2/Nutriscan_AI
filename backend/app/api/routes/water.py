from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.meal import WaterState, WaterUpdate
from app.services import meal_log_service

router = APIRouter(prefix="/api/water", tags=["water"])


@router.get("/today", response_model=WaterState)
def get_water(db: Session = Depends(get_db)) -> WaterState:
    return meal_log_service.get_water(db, date.today())


@router.put("/today", response_model=WaterState)
def set_water(body: WaterUpdate, db: Session = Depends(get_db)) -> WaterState:
    return meal_log_service.set_water(db, date.today(), body.glasses)
