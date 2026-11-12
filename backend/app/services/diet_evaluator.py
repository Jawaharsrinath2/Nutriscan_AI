"""Pre-meal verdict: how a plate fits today's targets, given what has already been eaten."""

from app.schemas.nutrition import (
    AutoFitResponse,
    DayTotals,
    EvaluateItem,
    EvaluateResponse,
    Impact,
    ImpactRow,
    ItemNutrition,
    MacroSplit,
    MealTotals,
    Remaining,
    Targets,
    Verdict,
)
from app.services.food_repository import FoodRepository
from app.services.nutrition_calculator import (
    glycemic_label,
    item_nutrition,
    macro_split,
    meal_totals,
    round_half_up,
)

GOOD_PROTEIN_PCT = 18
AUTO_FIT_MIN_KCAL = 150
MIN_ITEM_GRAMS = 5


def nutrition_score(totals: MealTotals, split: MacroSplit, after_kcal: int, target_kcal: int) -> int:
    score = 78
    if split.protein_pct >= 22:
        score += 10
    if totals.fiber >= 6:
        score += 7
    if split.fat_pct > 45:
        score -= 12
    if after_kcal > target_kcal:
        score -= 15
    return max(42, min(98, score))


def build_verdict(totals: MealTotals, split: MacroSplit, consumed: DayTotals, targets: Targets) -> Verdict:
    if totals.total_grams == 0:
        return Verdict(
            level="empty",
            title="No Ingredients on the Plate Yet",
            message="Scan a photo, pick a dish, or add ingredients below to see how this meal fits your plan.",
            show_auto_fit=False,
        )

    after_kcal = consumed.kcal + totals.kcal
    kcal_left = targets.kcal - after_kcal
    protein_left = max(0, round_half_up(targets.protein - (consumed.protein + totals.protein)))

    if after_kcal <= targets.kcal and split.protein_pct >= GOOD_PROTEIN_PCT:
        return Verdict(
            level="good",
            title="Great Fit for Your Diet Plan!",
            message=(
                f"Eating this leaves you with **{kcal_left:,} kcal** and **{protein_left}g protein** for the rest "
                f"of today. Strong protein ({split.protein_pct}%) and {totals.fiber}g fiber will keep you satisfied."
            ),
            show_auto_fit=False,
        )
    if after_kcal <= targets.kcal:
        return Verdict(
            level="warn",
            title="Fits Calorie Budget — Consider Adding Protein",
            message=(
                f"Fits cleanly inside your daily calories (**{kcal_left:,} kcal** left after eating), though protein "
                f"is {split.protein_pct}% of calories. Consider adding a boiled egg, curd, or dal side."
            ),
            show_auto_fit=False,
        )

    over_by = after_kcal - targets.kcal
    remaining_before = max(0, targets.kcal - consumed.kcal)
    return Verdict(
        level="over",
        title=f"Exceeds Daily Target by {over_by:,} kcal",
        message=(
            f"This portion puts you **{over_by:,} kcal** above your {targets.kcal:,} kcal target. Try scaling the "
            "portion down or click **Auto-Fit to Remaining Kcal** before eating."
        ),
        show_auto_fit=remaining_before >= AUTO_FIT_MIN_KCAL,
    )


def _impact_row(consumed: int, meal: float, target: int) -> ImpactRow:
    meal_rounded = round_half_up(meal)
    scale = max(1, target)
    base_pct = min(100, round_half_up(consumed / scale * 100))
    add_pct = min(100 - base_pct, round_half_up(meal / scale * 100))
    return ImpactRow(
        consumed=consumed,
        meal=meal_rounded,
        after=consumed + meal_rounded,
        target=target,
        base_pct=base_pct,
        add_pct=add_pct,
    )


def evaluate(items: list[EvaluateItem], repo: FoodRepository, consumed: DayTotals, targets: Targets) -> EvaluateResponse:
    rows = []
    for item in items:
        ingredient = repo.ingredient(item.key)
        n = item_nutrition(ingredient, item.grams)
        rows.append(
            ItemNutrition(
                id=item.id,
                key=item.key,
                name=ingredient["name"],
                category=ingredient["category"],
                grams=item.grams,
                kcal=round_half_up(n["kcal"]),
                protein=round(n["protein"], 1),
                carbs=round(n["carbs"], 1),
                fat=round(n["fat"], 1),
                fiber=round(n["fiber"], 1),
            )
        )

    totals = meal_totals(items, repo)
    split = macro_split(totals)
    after_kcal = consumed.kcal + totals.kcal

    return EvaluateResponse(
        items=rows,
        totals=totals,
        split=split,
        glycemic=glycemic_label(totals),
        share_of_day_pct=round_half_up(totals.kcal / max(1, targets.kcal) * 100),
        score=nutrition_score(totals, split, after_kcal, targets.kcal),
        verdict=build_verdict(totals, split, consumed, targets),
        consumed=consumed,
        targets=targets,
        remaining=Remaining(
            kcal=max(0, targets.kcal - consumed.kcal),
            protein=max(0, targets.protein - consumed.protein),
        ),
        impact=Impact(
            kcal=_impact_row(consumed.kcal, totals.kcal, targets.kcal),
            protein=_impact_row(consumed.protein, totals.protein, targets.protein),
            carbs=_impact_row(consumed.carbs, totals.carbs, targets.carbs),
            fat=_impact_row(consumed.fat, totals.fat, targets.fat),
        ),
    )


def auto_fit(items: list[EvaluateItem], repo: FoodRepository, consumed: DayTotals, targets: Targets) -> AutoFitResponse:
    """Scale every item so the plate fits the calories left today (never below AUTO_FIT_MIN_KCAL)."""
    target_kcal = max(AUTO_FIT_MIN_KCAL, targets.kcal - consumed.kcal)
    meal_kcal = meal_totals(items, repo).kcal
    if meal_kcal <= 0:
        return AutoFitResponse(items=items, target_kcal=target_kcal)
    ratio = target_kcal / meal_kcal
    scaled = [
        item.model_copy(update={"grams": max(MIN_ITEM_GRAMS, round_half_up(item.grams * ratio))}) for item in items
    ]
    return AutoFitResponse(items=scaled, target_kcal=target_kcal)
