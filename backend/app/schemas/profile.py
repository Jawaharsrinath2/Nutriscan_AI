from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.nutrition import Targets

Sex = Literal["male", "female"]
Goal = Literal["lose", "gain", "strength"]
Activity = Literal["desk", "light", "active", "very_active"]
Experience = Literal["beginner", "intermediate", "advanced"]
DietPref = Literal["veg", "eggetarian", "nonveg"]

KCAL_ADJUST_LIMIT = 200


class ProfileIn(BaseModel):
    """The onboarding answers."""

    sex: Sex
    age: int = Field(ge=13, le=100)
    height_cm: float = Field(ge=100, le=250)
    weight_kg: float = Field(ge=25, le=300)
    target_weight_kg: float | None = Field(default=None, ge=25, le=300)
    goal: Goal
    activity: Activity
    gym: bool = False
    gym_days: int = Field(default=0, ge=0, le=7)
    experience: Experience | None = None
    home_workouts: bool = False
    diet_pref: DietPref
    avoid: list[str] = Field(default_factory=list, max_length=10)
    kcal_adjust: int = Field(default=0, ge=-KCAL_ADJUST_LIMIT, le=KCAL_ADJUST_LIMIT)


class ProfileOut(ProfileIn):
    bmi: float
    bmi_label: str
    onboarded_at: datetime
    updated_at: datetime


class ComputedTargets(BaseModel):
    """What the formula says, before any manual override. Shown on the 'Your numbers' step."""

    bmr: int
    tdee: int
    kcal: int
    protein: int
    carbs: int
    fat: int
    weekly_change_kg: float  # negative = losing
    weeks_to_target: int | None  # only when a target weight is set and the plan moves towards it
    note: str  # one line a person can understand, e.g. "400 kcal below maintenance"


class ProfileResponse(BaseModel):
    profile: ProfileOut | None  # None until onboarding is finished
    computed: ComputedTargets | None
    targets: Targets  # the active targets (computed, or a manual override)
    targets_overridden: bool  # True when the person edited the numbers by hand
