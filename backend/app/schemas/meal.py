from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.food import PlateItem
from app.schemas.nutrition import DayTotals

MealSlot = Literal["Breakfast", "Lunch", "Evening Snack", "Dinner"]

WATER_GOAL_GLASSES = 8
WATER_MAX_GLASSES = 12


class LogMealRequest(BaseModel):
    slot: MealSlot
    title: str = Field(min_length=1, max_length=300)
    # Only images this app serves: scanned uploads or bundled sample photos.
    image_url: str | None = Field(default=None, pattern=r"^/(uploads|samples)/[\w.-]+$")
    items: list[PlateItem] = Field(min_length=1)


class LoggedMeal(BaseModel):
    id: str
    slot: str
    time: str
    title: str
    image_url: str | None
    items: list[PlateItem]
    kcal: int
    protein: float
    carbs: float
    fat: float
    fiber: float


class DayLog(BaseModel):
    day: date
    meals: list[LoggedMeal]
    totals: DayTotals


class WaterState(BaseModel):
    day: date
    glasses: int
    goal: int = WATER_GOAL_GLASSES


class WaterUpdate(BaseModel):
    glasses: int = Field(ge=0, le=WATER_MAX_GLASSES)
