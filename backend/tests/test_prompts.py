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


def test_placeholder_mismatches_are_errors_not_half_filled_prompts(monkeypatch):
    with pytest.raises(prompts.PromptError, match="does not fill: \\['goal'\\]"):
        prompts.render("workout_plan", profile="x", setting="y")  # goal forgotten by the code
    # The file dropped ${carbs} (an edit that would silently lose data): every supplied value must be used.
    monkeypatch.setattr(prompts, "read", lambda name: "calories ${kcal} kcal, protein ${protein} g.")
    with pytest.raises(prompts.PromptError, match="no longer uses: \\['carbs'\\]"):
        prompts.render("diet_plan", kcal=1, protein=2, carbs=3)
    monkeypatch.setattr(prompts, "read", lambda name: "costs $5")
    with pytest.raises(prompts.PromptError):
        prompts.render("diet_plan")


def test_broken_prompt_files_reach_the_user_as_app_errors(monkeypatch, repo):
    """A bad edit must surface as a scan failure / template fallback, not a 500."""
    from app.config import get_settings
    from app.services.plan_writer import GeminiPlanWriter, PlanGenerationError
    from app.vision.base import DetectorError
    from app.vision.gemini_detector import GeminiDetector
    from PIL import Image

    monkeypatch.setattr(prompts, "read", lambda name: "no placeholders at all")
    writer = GeminiPlanWriter(get_settings().model_copy(update={"gemini_api_key": "test-key"}), repo)
    with pytest.raises(PlanGenerationError, match="workout_plan.txt"):
        writer.write_workout(PROFILES[0])
    detector = GeminiDetector("test-key", "m", repo.ingredients)
    with pytest.raises(DetectorError, match="food_detection.txt"):
        detector.detect(Image.new("RGB", (64, 64)))
