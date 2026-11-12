"""Read-only access to the nutrition data files in app/data."""

import json
from functools import lru_cache
from pathlib import Path
from statistics import median

from app.config import DATA_DIR


class UnknownIngredientError(KeyError):
    def __init__(self, key: str):
        super().__init__(key)
        self.key = key


class FoodRepository:
    def __init__(self, data_dir: Path = DATA_DIR):
        self.ingredients: dict[str, dict] = _load(data_dir / "ingredients.json")
        self.dishes: dict[str, dict] = _load(data_dir / "dishes.json")
        self.plans: dict[str, dict] = _load(data_dir / "diet_plans.json")
        self.aliases: dict[str, list[str]] = _load(data_dir / "label_aliases.json")
        self._typical_grams = _typical_serving_grams(self.dishes)

    def ingredient(self, key: str) -> dict:
        try:
            return self.ingredients[key]
        except KeyError:
            raise UnknownIngredientError(key) from None

    def typical_grams(self, key: str) -> float:
        """Median serving of this ingredient across the dish presets (100 g if it never appears)."""
        return self._typical_grams.get(key, 100.0)


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _typical_serving_grams(dishes: dict[str, dict]) -> dict[str, float]:
    servings: dict[str, list[float]] = {}
    for dish in dishes.values():
        for item in dish["items"]:
            servings.setdefault(item["key"], []).append(item["grams"])
    return {key: float(median(values)) for key, values in servings.items()}


@lru_cache
def get_food_repository() -> FoodRepository:
    return FoodRepository()
