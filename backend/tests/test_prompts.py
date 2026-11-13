"""Prompt files in app/prompts render with exactly the placeholders the code supplies."""

import pytest

from app import prompts
from app.schemas.nutrition import Targets
from app.schemas.profile import ProfileIn
from app.services.plan_writer import diet_prompt, workout_prompt
from app.vision.gemini_detector import BOX_SCALE, NO_MATCH_KEY, detection_prompt
from tests.test_profile import MALE

TARGETS = Targets(plan_key="profile", kcal=1770, protein=150, carbs=182, fat=49)
PROFILES = [
    ProfileIn(**{**MALE, "gym": True, "gym_days": 4, "experience": "intermediate", "avoid": ["dairy"], "target_weight_kg": 70}),
    ProfileIn(**{**MALE, "gym": False, "home_workouts": True, "goal": "gain", "diet_pref": "eggetarian"}),
    ProfileIn(**{**MALE, "gym": False, "home_workouts": False, "goal": "strength", "diet_pref": "nonveg"}),
]


def assert_filled(text: str):
    assert "${" not in text and "$" not in text, "a placeholder was left unfilled"


def test_every_prompt_file_exists_and_has_no_stray_placeholders():
    for name in prompts.PROMPT_FILES:
        assert prompts.read(name).strip()


def test_detection_prompt_carries_the_parser_constants(repo):
    text = detection_prompt(repo.ingredients)
    assert_filled(text)
    assert f'"{NO_MATCH_KEY}"' in text and f"0-{BOX_SCALE}" in text
    assert "- white_rice: Steamed White Rice" in text  # catalogue lines present


@pytest.mark.parametrize("profile", PROFILES, ids=["gym", "home", "none"])
def test_plan_prompts_render_for_every_training_setting(profile, repo):
    diet = diet_prompt(profile, TARGETS, repo)
    assert_filled(diet)
    assert "1770 kcal" in diet and "150 g" in diet and "Idli" in diet
    if profile.avoid:
        assert "Avoids: dairy." in diet
    workout = workout_prompt(profile)
    assert_filled(workout)
    assert ("a gym" in workout) == profile.gym
    assert ("home with no equipment" in workout) == (not profile.gym and profile.home_workouts)


def test_a_missing_placeholder_is_an_error_not_a_half_filled_prompt():
    with pytest.raises(KeyError):
        prompts.render("workout_plan", profile="x", setting="y")  # goal forgotten
