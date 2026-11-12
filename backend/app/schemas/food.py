from pydantic import BaseModel, Field


class PlateItem(BaseModel):
    key: str
    grams: float = Field(ge=0, le=2000)


class Ingredient(BaseModel):
    key: str
    name: str
    category: str
    kcal: float
    protein: float
    carbs: float
    fat: float
    fiber: float


class Hotspot(BaseModel):
    x: float
    y: float
    label: str


class DishPreview(BaseModel):
    kcal: int
    protein: float


class Dish(BaseModel):
    key: str
    title: str
    cuisine: str
    image: str
    hotspots: list[Hotspot]
    items: list[PlateItem]
    menu_group: str | None
    menu_label: str
    totals: DishPreview
