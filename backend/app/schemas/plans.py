from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

PlanKind = Literal["diet", "workout"]
PlanSource = Literal["ai", "default"]
MealSlot = Literal["Breakfast", "Lunch", "Evening Snack", "Dinner"]


# ── diet plan ────────────────────────────────────────────────────────────────


class PlanFood(BaseModel):
    name: str
    portion: str  # "2 idlis", "150 g", "1 cup"
    kcal: int = Field(ge=0)
    protein: int = Field(ge=0)


class PlanMeal(BaseModel):
    slot: MealSlot
    time: str  # "8:00 AM"
    items: list[PlanFood]
    kcal: int = Field(ge=0)
    protein: int = Field(ge=0)
    note: str = ""


class DietPlanContent(BaseModel):
    summary: str
    meals: list[PlanMeal] = Field(min_length=1)
    tips: list[str] = []
    swaps: list[str] = []


# ── workout plan ─────────────────────────────────────────────────────────────


class Exercise(BaseModel):
    name: str
    sets: int = Field(ge=1, le=10)
    reps: str  # "8-12", "30 sec", "to failure"
    rest: str = ""  # "60 sec"


class WorkoutDay(BaseModel):
    day: str  # "Monday" or "Day 1"
    focus: str  # "Push", "Full body", "Rest"
    duration_min: int = Field(ge=0, le=180)
    exercises: list[Exercise] = []
    note: str = ""


class WorkoutPlanContent(BaseModel):
    summary: str
    days: list[WorkoutDay] = Field(min_length=1)
    tips: list[str] = []
    safety: str = ""


# ── API ──────────────────────────────────────────────────────────────────────


class PlanInputs(BaseModel):
    """What the plan was written for; used to tell the person when it has gone stale."""

    weight_kg: float
    kcal: int
    protein: int
    goal: str
    gym_days: int


class PlanOut(BaseModel):
    id: int
    kind: PlanKind
    source: PlanSource
    model: str | None
    content: DietPlanContent | WorkoutPlanContent
    inputs: PlanInputs
    generated_at: datetime
    stale: bool
    stale_reason: str | None


class PlansResponse(BaseModel):
    diet: PlanOut | None
    workout: PlanOut | None
    ai_ready: bool  # False when the AI writer is not configured; plans then come from templates
    ai_reason: str | None
    ai_error: str | None = None  # set when a generation just fell back to a template because the AI failed


class GenerateRequest(BaseModel):
    kind: Literal["diet", "workout", "both"] = "both"
