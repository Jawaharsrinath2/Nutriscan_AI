from datetime import date
from pydantic import BaseModel

from app.schemas.meal import LoggedMeal, WaterState


class DashboardSummary(BaseModel):
    kcal_logged: int
    kcal_target: int
    protein_logged: int
    protein_target: int
    carbs_logged: int
    carbs_target: int
    fat_logged: int
    fat_target: int


class DashboardResponse(BaseModel):
    day: date
    summary: DashboardSummary
    meals: list[LoggedMeal]
    water: WaterState
