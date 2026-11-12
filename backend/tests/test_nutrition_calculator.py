from app.schemas.food import PlateItem
from app.schemas.nutrition import MealTotals
from app.services.nutrition_calculator import glycemic_label, macro_split, meal_totals, round_half_up


def plate(repo, dish_key):
    return [PlateItem(**item) for item in repo.dishes[dish_key]["items"]]


def test_round_half_up_matches_javascript():
    assert round_half_up(2.5) == 3
    assert round_half_up(3.5) == 4
    assert round_half_up(2.49) == 2


def test_white_rice_bowl_totals(repo):
    totals = meal_totals(plate(repo, "steamed_white_rice"), repo)
    assert totals.kcal == 260
    assert totals.protein == 5.4
    assert totals.total_grams == 200


def test_multi_item_plate_sums_every_ingredient(repo):
    items = [PlateItem(key="white_rice", grams=100), PlateItem(key="grilled_chicken", grams=100)]
    totals = meal_totals(items, repo)
    assert totals.kcal == 130 + 165
    assert totals.protein == round(2.7 + 31.0, 1)
    assert totals.total_grams == 200


def test_macro_split_adds_to_100(repo):
    split = macro_split(meal_totals(plate(repo, "chicken_quinoa_bowl"), repo))
    assert split.protein_pct + split.carbs_pct + split.fat_pct == 100
    assert split.protein_pct > 30


def test_empty_plate_split_is_zero(repo):
    split = macro_split(meal_totals([], repo))
    assert (split.protein_pct, split.carbs_pct, split.fat_pct) == (0, 0, 0)


def test_glycemic_thresholds():
    def totals(carbs, fiber):
        return MealTotals(kcal=0, protein=0, carbs=carbs, fat=0, fiber=fiber, total_grams=0)

    assert glycemic_label(totals(70, 5)) == "High Glycemic Load"
    assert glycemic_label(totals(40, 5)) == "Moderate Glycemic"
    assert glycemic_label(totals(30, 5)) == "Low Glycemic Load"
