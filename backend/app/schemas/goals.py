from pydantic import BaseModel


class DietPlan(BaseModel):
    key: str
    title: str
    description: str
    kcal: int
    protein: int
    carbs: int
    fat: int


class PlanSelect(BaseModel):
    plan_key: str


class CustomTargets(BaseModel):
    # Out-of-range values are clamped by the service (same floors as the old app), not rejected.
    kcal: int
    protein: int
    carbs: int
    fat: int
