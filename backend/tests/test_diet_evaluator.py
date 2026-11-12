from app.schemas.nutrition import DayTotals, EvaluateItem, Targets
from app.services.diet_evaluator import auto_fit, evaluate
from app.services.nutrition_calculator import meal_totals

BALANCED = Targets(plan_key="balanced", kcal=2000, protein=130, carbs=210, fat=65)
NOTHING_EATEN = DayTotals(kcal=0, protein=0, carbs=0, fat=0)


def plate(repo, dish_key):
    return [EvaluateItem(id=f"row{i}", **item) for i, item in enumerate(repo.dishes[dish_key]["items"])]


def test_high_protein_bowl_is_a_good_fit(repo):
    result = evaluate(plate(repo, "chicken_quinoa_bowl"), repo, NOTHING_EATEN, BALANCED)
    assert result.verdict.level == "good"
    assert not result.verdict.show_auto_fit
    assert result.score >= 88


def test_low_protein_rice_gets_protein_warning(repo):
    result = evaluate(plate(repo, "steamed_white_rice"), repo, NOTHING_EATEN, BALANCED)
    assert result.verdict.level == "warn"
    assert "protein" in result.verdict.title.lower()


def test_over_budget_offers_auto_fit_when_room_left(repo):
    consumed = DayTotals(kcal=1700, protein=60, carbs=150, fat=40)
    result = evaluate(plate(repo, "paneer_thali"), repo, consumed, BALANCED)
    assert result.verdict.level == "over"
    assert result.verdict.show_auto_fit  # 300 kcal left >= 150
    assert result.impact.kcal.base_pct + result.impact.kcal.add_pct <= 100


def test_over_budget_hides_auto_fit_when_almost_nothing_left(repo):
    consumed = DayTotals(kcal=1900, protein=60, carbs=150, fat=40)
    result = evaluate(plate(repo, "paneer_thali"), repo, consumed, BALANCED)
    assert result.verdict.level == "over"
    assert not result.verdict.show_auto_fit


def test_empty_plate_verdict(repo):
    result = evaluate([], repo, NOTHING_EATEN, BALANCED)
    assert result.verdict.level == "empty"
    assert result.totals.kcal == 0


def test_rows_echo_ids_in_order(repo):
    items = plate(repo, "masala_dosa")
    result = evaluate(items, repo, NOTHING_EATEN, BALANCED)
    assert [row.id for row in result.items] == [item.id for item in items]


def test_auto_fit_scales_plate_to_remaining_kcal(repo):
    consumed = DayTotals(kcal=1600, protein=60, carbs=150, fat=40)
    fitted = auto_fit(plate(repo, "paneer_thali"), repo, consumed, BALANCED)
    assert fitted.target_kcal == 400
    assert abs(meal_totals(fitted.items, repo).kcal - 400) <= 15
    assert all(item.grams >= 5 for item in fitted.items)


def test_auto_fit_never_targets_below_150_kcal(repo):
    consumed = DayTotals(kcal=2500, protein=60, carbs=150, fat=40)
    fitted = auto_fit(plate(repo, "paneer_thali"), repo, consumed, BALANCED)
    assert fitted.target_kcal == 150
