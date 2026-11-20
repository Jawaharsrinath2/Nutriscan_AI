from typing import Literal
from pydantic import BaseModel, Field

from app.schemas.meal import MealSlot


class VoiceParseRequest(BaseModel):
    transcript: str = Field(min_length=2, max_length=1500)
    time_hint: str | None = None


class VoiceFoodItem(BaseModel):
    name: str
    quantity_description: str
    grams: float = Field(ge=1, le=3000)
    kcal: int = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    fiber: float = Field(ge=0)


class VoiceParseResponse(BaseModel):
    raw_transcript: str
    meal_title: str
    slot: MealSlot
    items: list[VoiceFoodItem]
    total_kcal: int
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fiber: float
    ai_note: str


class ConfirmVoiceMealRequest(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    slot: MealSlot = "Lunch"
    items: list[VoiceFoodItem]
    kcal: int = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    fiber: float = Field(ge=0)
