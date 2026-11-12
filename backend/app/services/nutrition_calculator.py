"""Per-ingredient and per-meal nutrition maths. Ingredient values in the data files are per 100 g."""

import math
from collections.abc import Iterable

from app.schemas.food import PlateItem
from app.schemas.nutrition import DayTotals, MacroSplit, MealTotals
from app.services.food_repository import FoodRepository

NUTRIENTS = ("kcal", "protein", "carbs", "fat", "fiber")
KCAL_PER_GRAM = {"protein": 4, "carbs": 4, "fat": 9}


def round_half_up(value: float) -> int:
    """Match JavaScript Math.round (Python's round() uses banker's rounding)."""
    return math.floor(value + 0.5)


def item_nutrition(ingredient: dict, grams: float) -> dict[str, float]:
    factor = grams / 100.0
    return {n: ingredient[n] * factor for n in NUTRIENTS}


def meal_totals(items: Iterable[PlateItem], repo: FoodRepository) -> MealTotals:
    sums = dict.fromkeys(NUTRIENTS, 0.0)
    total_grams = 0.0
    for item in items:
        for n, value in item_nutrition(repo.ingredient(item.key), item.grams).items():
            sums[n] += value
        total_grams += item.grams
    return MealTotals(
        kcal=round_half_up(sums["kcal"]),
        protein=round(sums["protein"], 1),
        carbs=round(sums["carbs"], 1),
        fat=round(sums["fat"], 1),
        fiber=round(sums["fiber"], 1),
        total_grams=round_half_up(total_grams),
    )


def macro_split(totals: MealTotals) -> MacroSplit:
    p_kcal = totals.protein * KCAL_PER_GRAM["protein"]
    c_kcal = totals.carbs * KCAL_PER_GRAM["carbs"]
    f_kcal = totals.fat * KCAL_PER_GRAM["fat"]
    macro_kcal = max(1.0, p_kcal + c_kcal + f_kcal)
    p_pct = round_half_up(p_kcal / macro_kcal * 100)
    c_pct = round_half_up(c_kcal / macro_kcal * 100)
    has_macros = p_kcal + c_kcal + f_kcal > 0
    return MacroSplit(
        protein_kcal=round_half_up(p_kcal),
        carbs_kcal=round_half_up(c_kcal),
        fat_kcal=round_half_up(f_kcal),
        protein_pct=p_pct,
        carbs_pct=c_pct,
        fat_pct=max(0, 100 - p_pct - c_pct) if has_macros else 0,
    )


def glycemic_label(totals: MealTotals) -> str:
    net_carbs = totals.carbs - totals.fiber
    if net_carbs > 60:
        return "High Glycemic Load"
    if net_carbs > 32:
        return "Moderate Glycemic"
    return "Low Glycemic Load"


def day_totals(meals: Iterable) -> DayTotals:
    """Sum logged meals (anything with kcal/protein/carbs/fat attributes)."""
    sums = {"kcal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    for meal in meals:
        for n in sums:
            sums[n] += getattr(meal, n)
    return DayTotals(**{n: round_half_up(v) for n, v in sums.items()})
