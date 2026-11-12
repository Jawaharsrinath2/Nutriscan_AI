"""Target calculator and the profile/onboarding API."""

import pytest

from app.schemas.profile import ProfileIn
from app.services import target_calculator as tc

MALE = dict(sex="male", age=30, height_cm=175, weight_kg=75, goal="strength", activity="desk", diet_pref="nonveg")
FEMALE = dict(sex="female", age=25, height_cm=160, weight_kg=45, goal="lose", activity="desk", diet_pref="veg")


def test_bmr_and_maintenance_follow_mifflin_st_jeor():
    c = tc.compute(ProfileIn(**MALE))
    assert c.bmr == 1699  # 10*75 + 6.25*175 - 5*30 + 5 = 1698.75
    assert c.tdee == 2039  # x1.2 for a desk job
    assert c.kcal == 2040 and "maintenance" in c.note  # strength = maintenance, rounded to 10


def test_gym_days_raise_maintenance():
    desk = tc.compute(ProfileIn(**MALE))
    gym = tc.compute(ProfileIn(**MALE, gym=True, gym_days=4))
    assert gym.tdee > desk.tdee  # +0.025 per gym day on the activity factor


def test_fat_loss_is_a_deficit_with_high_protein():
    c = tc.compute(ProfileIn(**{**MALE, "goal": "lose", "target_weight_kg": 70}))
    assert c.kcal == 1640  # 2038.5 - 400 -> 1640
    assert c.protein == 150  # 2.0 g/kg
    assert c.fat == round(1640 * 0.25 / 9)
    assert c.carbs == 157  # (1640 - 600 - 414) / 4 = 156.5, rounded half up
    assert c.weekly_change_kg < 0 and c.weeks_to_target and 10 <= c.weeks_to_target <= 20
    assert "below maintenance" in c.note


def test_gain_is_a_surplus_and_target_in_wrong_direction_gives_no_eta():
    c = tc.compute(ProfileIn(**{**MALE, "goal": "gain", "target_weight_kg": 70}))
    assert c.kcal == 2340 and c.weekly_change_kg > 0
    assert c.weeks_to_target is None  # wants to gain but target is below current weight


def test_small_woman_never_goes_below_the_calorie_floor():
    c = tc.compute(ProfileIn(**FEMALE))
    assert c.kcal == 1200  # formula gives ~997; floor wins
    assert c.carbs >= tc.MIN_CARBS_G


def test_kcal_adjust_slider_moves_the_target():
    base = tc.compute(ProfileIn(**MALE)).kcal
    assert tc.compute(ProfileIn(**MALE, kcal_adjust=200)).kcal == base + 200
    assert tc.compute(ProfileIn(**MALE, kcal_adjust=-150)).kcal == base - 150
    with pytest.raises(ValueError):
        ProfileIn(**MALE, kcal_adjust=500)


def test_bmi_label():
    assert tc.bmi(175, 75) == (24.5, "Healthy")
    assert tc.bmi(160, 45)[1] == "Underweight"


# ── API ──────────────────────────────────────────────────────────────────────


def test_profile_is_null_before_onboarding(user_client):
    data = user_client.get("/api/profile").json()
    assert data["profile"] is None and data["computed"] is None
    assert data["targets"]["plan_key"] == "balanced" and data["targets_overridden"] is False
    assert user_client.post("/api/profile/targets/recalculate").status_code == 404


def test_onboarding_sets_targets_from_the_profile(user_client):
    preview = user_client.post("/api/profile/targets/preview", json=MALE).json()
    assert preview["kcal"] == 2040
    assert user_client.get("/api/profile").json()["profile"] is None  # preview saves nothing

    data = user_client.put("/api/profile", json={**MALE, "avoid": ["dairy"]}).json()
    assert data["profile"]["bmi"] == 24.5 and data["profile"]["avoid"] == ["dairy"]
    assert data["targets"] == {"plan_key": "profile", "kcal": 2040, "protein": 135, "carbs": data["computed"]["carbs"], "fat": data["computed"]["fat"]}
    assert data["targets_overridden"] is False
    # The rest of the app sees the same targets.
    assert user_client.get("/api/goals").json()["kcal"] == 2040
    assert user_client.post("/api/nutrition/evaluate", json={"items": []}).json()["targets"]["kcal"] == 2040


def test_manual_targets_survive_profile_edits_until_recalculated(user_client):
    user_client.put("/api/profile", json=MALE)
    user_client.put("/api/goals/custom", json={"kcal": 1800, "protein": 140, "carbs": 180, "fat": 60})
    data = user_client.put("/api/profile", json={**MALE, "weight_kg": 80}).json()  # a weigh-in
    assert data["targets_overridden"] is True and data["targets"]["kcal"] == 1800
    assert data["computed"]["kcal"] > 2040  # the formula moved, the override did not

    data = user_client.post("/api/profile/targets/recalculate").json()
    assert data["targets_overridden"] is False and data["targets"]["kcal"] == data["computed"]["kcal"]


def test_profile_validation(user_client):
    assert user_client.put("/api/profile", json={**MALE, "age": 7}).status_code == 422
    assert user_client.put("/api/profile", json={**MALE, "goal": "bulk"}).status_code == 422
    assert user_client.put("/api/profile", json={**MALE, "gym_days": 9}).status_code == 422


def test_profiles_are_per_user(client):
    from tests.conftest import sign_up

    alice, bob = sign_up(client, "alice"), sign_up(client, "bob")
    alice.put("/api/profile", json=MALE)
    assert bob.get("/api/profile").json()["profile"] is None
    assert bob.get("/api/goals").json()["kcal"] == 2000
