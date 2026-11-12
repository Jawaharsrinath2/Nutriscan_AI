from typing import Literal

from pydantic import BaseModel

from app.schemas.food import PlateItem


class EvaluateItem(PlateItem):
    id: str | None = None  # echoed back so the UI can match rows


class EvaluateRequest(BaseModel):
    items: list[EvaluateItem]


class ItemNutrition(BaseModel):
    id: str | None
    key: str
    name: str
    category: str
    grams: float
    kcal: int
    protein: float
    carbs: float
    fat: float
    fiber: float


class MealTotals(BaseModel):
    kcal: int
    protein: float
    carbs: float
    fat: float
    fiber: float
    total_grams: int


class MacroSplit(BaseModel):
    protein_kcal: int
    carbs_kcal: int
    fat_kcal: int
    protein_pct: int
    carbs_pct: int
    fat_pct: int


class DayTotals(BaseModel):
    kcal: int
    protein: int
    carbs: int
    fat: int


class Targets(BaseModel):
    plan_key: str
    kcal: int
    protein: int
    carbs: int
    fat: int


class Remaining(BaseModel):
    kcal: int
    protein: int


class ImpactRow(BaseModel):
    consumed: int
    meal: int
    after: int
    target: int
    base_pct: int
    add_pct: int


class Impact(BaseModel):
    kcal: ImpactRow
    protein: ImpactRow
    carbs: ImpactRow
    fat: ImpactRow


class Verdict(BaseModel):
    level: Literal["good", "warn", "over", "empty"]
    title: str
    message: str  # **double asterisks** mark bold spans
    show_auto_fit: bool


class EvaluateResponse(BaseModel):
    items: list[ItemNutrition]
    totals: MealTotals
    split: MacroSplit
    glycemic: str
    share_of_day_pct: int
    score: int
    verdict: Verdict
    consumed: DayTotals
    targets: Targets
    remaining: Remaining
    impact: Impact


class AutoFitResponse(BaseModel):
    items: list[EvaluateItem]
    target_kcal: int
