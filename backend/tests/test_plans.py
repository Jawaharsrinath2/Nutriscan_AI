"""Diet/workout plans: templates, AI writer plumbing, staleness, rate limit."""

import pytest
from fastapi import HTTPException

from app.main import app
from app.schemas.nutrition import Targets
from app.schemas.plans import DietPlanContent, WorkoutPlanContent
from app.schemas.profile import ProfileIn
from app.services import default_plans
from app.services.plan_writer import PlanGenerationError, _schema, get_plan_writer
from tests.test_profile import MALE

VEG = {**MALE, "diet_pref": "veg", "gym": True, "gym_days": 4, "experience": "intermediate"}


class FakeWriter:
    name = "fake"
    last_model = "fake-1"

    def __init__(self, fail=False):
        self.fail, self.calls = fail, []

    def write_diet(self, profile, targets):
        self.calls.append(("diet", targets.kcal))
        if self.fail:
            raise PlanGenerationError("Gemini 'x': ServerError 503")
        meal = {"slot": "Breakfast", "time": "8 AM", "items": [{"name": "Idli", "portion": "3", "kcal": 200, "protein": 6}], "kcal": 200, "protein": 6}
        return DietPlanContent(summary=f"AI diet for {targets.kcal} kcal", meals=[meal])

    def write_workout(self, profile):
        self.calls.append(("workout", profile.gym_days))
        return WorkoutPlanContent(summary="AI workout", days=[{"day": "Monday", "focus": "Push", "duration_min": 60}])


def use_writer(writer):
    app.dependency_overrides[get_plan_writer] = lambda: writer


# ── templates ────────────────────────────────────────────────────────────────


def test_template_diet_plan_respects_veg_and_lands_near_target(repo):
    targets = Targets(plan_key="profile", kcal=1800, protein=140, carbs=200, fat=50)
    plan = default_plans.diet_plan(ProfileIn(**VEG), targets, repo)
    assert [m.slot for m in plan.meals] == ["Breakfast", "Lunch", "Evening Snack", "Dinner"]
    total = sum(m.kcal for m in plan.meals)
    assert 1800 * 0.8 <= total <= 1800 * 1.2
    names = " ".join(f.name for m in plan.meals for f in m.items).lower()
    assert "chicken" not in names and "egg" not in names and "fish" not in names
    assert any("protein" in t for t in plan.tips)  # template falls short of 140 g and says so


def test_template_workout_plan_follows_gym_days_and_level(repo):
    plan = default_plans.workout_plan(ProfileIn(**VEG))
    training = [d for d in plan.days if d.focus != "Rest"]
    assert len(plan.days) == 7 and len(training) == 4
    assert [d.focus for d in training] == ["Upper", "Lower", "Upper", "Lower"]
    assert training[0].exercises[0].name.startswith("Warm-up") and training[0].exercises[1].sets == 4

    home = default_plans.workout_plan(ProfileIn(**{**MALE, "gym": False, "home_workouts": True}))
    assert sum(d.focus != "Rest" for d in home.days) == 3 and "home" in home.days[0].focus


def test_gemini_failures_reach_the_client_as_short_reasons(repo):
    """The raw SDK error (URLs, response bodies) must stay in the server log."""
    import httpx
    from google.genai.errors import ServerError
    from unittest.mock import Mock
    from types import SimpleNamespace

    from app.config import get_settings
    from app.services.plan_writer import GeminiPlanWriter

    writer = GeminiPlanWriter(get_settings(), repo)
    writer._timeout_s, writer._models = 9, ["a", "b"]
    boom = ServerError(503, {"error": {"message": "secret internal detail https://example.internal/x"}})
    writer._client = SimpleNamespace(models=SimpleNamespace(generate_content=Mock(side_effect=[httpx.ReadTimeout("t"), boom])))
    with pytest.raises(PlanGenerationError) as err:
        writer.write_workout(ProfileIn(**VEG))
    assert str(err.value) == "Gemini 'a' did not answer within 9s; 'b' is overloaded right now (503). Try again in a moment."
    assert "example.internal" not in str(err.value)


def test_gemini_schema_is_openapi_subset():
    schema = _schema(DietPlanContent)
    assert schema["type"] == "OBJECT" and "$defs" not in schema
    meal = schema["properties"]["meals"]["items"]
    assert meal["properties"]["slot"]["enum"] == ["Breakfast", "Lunch", "Evening Snack", "Dinner"]
    assert meal["properties"]["items"]["items"]["properties"]["kcal"]["type"] == "INTEGER"


# ── API ──────────────────────────────────────────────────────────────────────


def test_plans_need_a_profile(user_client):
    use_writer(None)
    assert user_client.get("/api/plans").json() == {
        "diet": None, "workout": None, "ai_ready": False, "ai_error": None,
        "ai_reason": "Set GEMINI_API_KEY in backend/.env to get AI-written plans; template plans are used meanwhile.",
    }
    assert user_client.post("/api/plans/generate", json={"kind": "both"}).status_code == 404


def test_templates_are_used_without_an_ai_writer(user_client):
    use_writer(None)
    user_client.put("/api/profile", json=VEG)
    data = user_client.post("/api/plans/generate", json={"kind": "both"}).json()
    assert data["diet"]["source"] == "default" and data["workout"]["source"] == "default"
    assert data["diet"]["stale"] is False and data["diet"]["inputs"]["kcal"] == user_client.get("/api/goals").json()["kcal"]
    assert data["ai_ready"] is False


def test_ai_plans_are_stored_and_go_stale_after_a_weigh_in(user_client):
    writer = FakeWriter()
    use_writer(writer)
    user_client.put("/api/profile", json=VEG)
    data = user_client.post("/api/plans/generate", json={"kind": "diet"}).json()
    assert data["diet"]["source"] == "ai" and data["diet"]["model"] == "fake-1"
    assert data["diet"]["content"]["summary"].startswith("AI diet for")
    assert data["workout"] is None and writer.calls == [("diet", data["diet"]["inputs"]["kcal"])]

    user_client.put("/api/profile", json={**VEG, "weight_kg": 78})  # +3 kg
    plans = user_client.get("/api/plans").json()
    assert plans["diet"]["stale"] is True and "78 kg" in plans["diet"]["stale_reason"]

    data = user_client.post("/api/plans/generate", json={"kind": "both"}).json()
    assert data["diet"]["stale"] is False and data["workout"]["source"] == "ai"
    assert data["diet"]["id"] != plans["diet"]["id"]  # old version kept, newest shown


def test_ai_failure_falls_back_to_a_template_and_says_why(user_client):
    use_writer(FakeWriter(fail=True))
    user_client.put("/api/profile", json=VEG)
    res = user_client.post("/api/plans/generate", json={"kind": "both"})
    data = res.json()
    assert res.status_code == 200
    assert data["diet"]["source"] == "default" and data["workout"]["source"] == "ai"  # only the diet call fails
    assert "503" in data["ai_error"]
    assert user_client.get("/api/plans").json()["ai_error"] is None  # only reported on the generate call


def test_ai_generation_is_rate_limited_per_user(user_client):
    use_writer(FakeWriter())
    user_client.put("/api/profile", json=VEG)
    codes = [user_client.post("/api/plans/generate", json={"kind": "workout"}).status_code for _ in range(7)]
    assert codes == [200] * 6 + [429]


def test_plans_are_per_user(client):
    from tests.conftest import sign_up

    use_writer(FakeWriter())
    alice, bob = sign_up(client, "alice"), sign_up(client, "bob")
    alice.put("/api/profile", json=VEG)
    alice.post("/api/plans/generate", json={"kind": "both"})
    bob.put("/api/profile", json=VEG)
    assert bob.get("/api/plans").json()["diet"] is None
