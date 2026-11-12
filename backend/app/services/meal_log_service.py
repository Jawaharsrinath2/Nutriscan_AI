"""A user's meal log and water intake, persisted in SQLite."""

import uuid
from datetime import date, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import MealLog, WaterLog
from app.schemas.food import PlateItem
from app.schemas.meal import DayLog, LoggedMeal, LogMealRequest, WaterState
from app.schemas.nutrition import DayTotals
from app.services.food_repository import FoodRepository
from app.services.nutrition_calculator import day_totals, meal_totals


def _to_schema(row: MealLog) -> LoggedMeal:
    return LoggedMeal(
        id=row.id,
        slot=row.slot,
        time=row.created_at.strftime("%I:%M %p"),
        title=row.title,
        image_url=row.image_url,
        items=[PlateItem(**item) for item in row.items],
        kcal=row.kcal,
        protein=row.protein,
        carbs=row.carbs,
        fat=row.fat,
        fiber=row.fiber,
    )


def _meals_on(user_id: int, day: date):
    return select(MealLog).where(MealLog.user_id == user_id, MealLog.day == day)


def list_meals(db: Session, user_id: int, day: date) -> list[LoggedMeal]:
    rows = db.scalars(_meals_on(user_id, day).order_by(MealLog.created_at.desc()))
    return [_to_schema(row) for row in rows]


def consumed_totals(db: Session, user_id: int, day: date) -> DayTotals:
    return day_totals(db.scalars(_meals_on(user_id, day)))


def day_log(db: Session, user_id: int, day: date) -> DayLog:
    meals = list_meals(db, user_id, day)
    return DayLog(day=day, meals=meals, totals=day_totals(meals))


def add_meal(db: Session, user_id: int, request: LogMealRequest, repo: FoodRepository) -> LoggedMeal:
    # Totals are recomputed here rather than trusted from the client.
    totals = meal_totals(request.items, repo)
    now = datetime.now()
    row = MealLog(
        id=uuid.uuid4().hex,
        user_id=user_id,
        day=now.date(),
        created_at=now,
        slot=request.slot,
        title=request.title,
        image_url=request.image_url,
        items=[item.model_dump() for item in request.items],
        kcal=totals.kcal,
        protein=totals.protein,
        carbs=totals.carbs,
        fat=totals.fat,
        fiber=totals.fiber,
    )
    db.add(row)
    db.commit()
    return _to_schema(row)


def delete_meal(db: Session, user_id: int, meal_id: str) -> bool:
    # Filtering by user means another user's meal id simply "does not exist".
    result = db.execute(delete(MealLog).where(MealLog.id == meal_id, MealLog.user_id == user_id))
    db.commit()
    return result.rowcount > 0


def clear_day(db: Session, user_id: int, day: date) -> None:
    db.execute(delete(MealLog).where(MealLog.user_id == user_id, MealLog.day == day))
    db.commit()


def get_water(db: Session, user_id: int, day: date) -> WaterState:
    row = db.get(WaterLog, (user_id, day))
    return WaterState(day=day, glasses=row.glasses if row else 0)


def set_water(db: Session, user_id: int, day: date, glasses: int) -> WaterState:
    row = db.get(WaterLog, (user_id, day))
    if row is None:
        db.add(WaterLog(user_id=user_id, day=day, glasses=glasses))
    else:
        row.glasses = glasses
    db.commit()
    return WaterState(day=day, glasses=glasses)
