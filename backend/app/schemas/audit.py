from typing import Literal
from pydantic import BaseModel, Field

from app.schemas.meal import MealSlot

NutriGrade = Literal["A", "B", "C", "D", "E"]


class ProductNutriments(BaseModel):
    kcal_100g: float = 0.0
    protein_100g: float = 0.0
    carbs_100g: float = 0.0
    fat_100g: float = 0.0
    fiber_100g: float = 0.0
    sugars_100g: float = 0.0
    sodium_100g: float = 0.0  # in grams (e.g. 0.3g = 300mg)
    salt_100g: float = 0.0

    serving_size: str | None = None
    serving_grams: float = 50.0
    serving_kcal: float = 0.0
    serving_protein: float = 0.0
    serving_carbs: float = 0.0
    serving_fat: float = 0.0
    serving_sugars: float = 0.0


class ProductAuditResponse(BaseModel):
    barcode: str
    product_name: str
    brand: str | None = None
    image_url: str | None = None
    categories: list[str] = []
    ingredients_text: str | None = None
    nutriscore_grade: NutriGrade = "C"
    nova_group: int | None = None  # 1 to 4
    health_score: int = Field(ge=0, le=100)
    verdict: str
    summary_status: Literal["healthy", "moderate", "unhealthy"]
    red_flags: list[str] = []
    green_flags: list[str] = []
    harmful_additives: list[str] = []
    healthy_swaps: list[str] = []
    nutriments: ProductNutriments


class BarcodeAuditRequest(BaseModel):
    barcode: str = Field(min_length=3, max_length=64)


class LogPackagedFoodRequest(BaseModel):
    product_name: str = Field(min_length=1, max_length=300)
    brand: str | None = None
    image_url: str | None = None
    grams: float = Field(gt=0, le=2000)
    slot: MealSlot = "Evening Snack"
    kcal: int = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    fiber: float = Field(ge=0)
