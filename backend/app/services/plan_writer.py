"""AI plan writers. Gemini writes diet and workout plans *around* targets the calculator already fixed.

Same resilience as the photo detector: a per-call timeout, fallback models on transient errors,
structured JSON output validated by the pydantic schemas in app/schemas/plans.py.
"""

import json
import logging
from typing import Protocol

import httpx
from pydantic import ValidationError

from app import prompts
from app.config import Settings, get_settings
from app.schemas.nutrition import Targets
from app.schemas.plans import DietPlanContent, WorkoutPlanContent
from app.schemas.profile import ProfileIn
from app.services.food_repository import FoodRepository, get_food_repository

logger = logging.getLogger(__name__)

TRANSIENT_HTTP_CODES = {429, 500, 502, 503, 504}

GOAL_WORDS = {"lose": "fat loss", "gain": "weight gain", "strength": "strength and muscle"}
DIET_WORDS = {"veg": "vegetarian (no meat, fish or eggs)", "eggetarian": "vegetarian plus eggs", "nonveg": "non-vegetarian"}
ACTIVITY_WORDS = {"desk": "desk job", "light": "lightly active", "active": "active", "very_active": "very active"}


class PlanGenerationError(RuntimeError):
    pass


class PlanWriter(Protocol):
    name: str

    def write_diet(self, profile: ProfileIn, targets: Targets) -> DietPlanContent: ...

    def write_workout(self, profile: ProfileIn) -> WorkoutPlanContent: ...


# ── prompts and schemas ──────────────────────────────────────────────────────


def _profile_lines(profile: ProfileIn) -> str:
    training = (
        f"trains {profile.gym_days} days/week, {profile.experience} level"
        if profile.gym
        else ("no gym; wants short home workouts" if profile.home_workouts else "not training at the moment")
    )
    avoid = f"Avoids: {', '.join(profile.avoid)}." if profile.avoid else ""
    target = f" Target weight {profile.target_weight_kg} kg." if profile.target_weight_kg else ""
    return (
        f"{profile.sex}, {profile.age} years, {profile.height_cm} cm, {profile.weight_kg} kg.{target}\n"
        f"Goal: {GOAL_WORDS[profile.goal]}. Daily activity: {ACTIVITY_WORDS[profile.activity]}. Training: {training}.\n"
        f"Diet: {DIET_WORDS[profile.diet_pref]}. {avoid}"
    )


def diet_prompt(profile: ProfileIn, targets: Targets, repo: FoodRepository) -> str:
    """Wording in app/prompts/diet_plan.txt; the targets are the calculator's and must not be changed by the model."""
    foods = ", ".join(item["name"] for item in repo.ingredients.values())
    return prompts.render(
        "diet_plan",
        profile=_profile_lines(profile),
        kcal=targets.kcal,
        protein=targets.protein,
        carbs=targets.carbs,
        fat=targets.fat,
        foods=foods,
    )


def workout_prompt(profile: ProfileIn) -> str:
    """Wording in app/prompts/workout_plan.txt."""
    if profile.gym:
        setting = f"a gym, {profile.gym_days} sessions per week, {profile.experience} level"
    elif profile.home_workouts:
        setting = "home with no equipment, 3 short sessions per week"
    else:
        setting = "someone not training yet: 2-3 gentle sessions per week of walking, mobility and bodyweight basics"
    return prompts.render("workout_plan", profile=_profile_lines(profile), setting=setting, goal=GOAL_WORDS[profile.goal])


def _schema(model_cls) -> dict:
    """Gemini's response_schema from the pydantic model (OpenAPI subset: no $defs/anyOf)."""
    schema = model_cls.model_json_schema(ref_template="#/$defs/{model}")
    defs = schema.pop("$defs", {})

    def inline(node):
        if isinstance(node, dict):
            if "$ref" in node:
                return inline(defs[node["$ref"].rsplit("/", 1)[1]])
            node = {k: inline(v) for k, v in node.items() if k not in {"title", "default", "minItems", "minimum", "maximum"}}
            if "type" in node and isinstance(node["type"], str):
                node["type"] = node["type"].upper()
            return node
        if isinstance(node, list):
            return [inline(v) for v in node]
        return node

    return inline(schema)


# ── Gemini ───────────────────────────────────────────────────────────────────


def _is_transient(exc: Exception) -> bool:
    return isinstance(exc, httpx.TransportError) or getattr(exc, "code", None) in TRANSIENT_HTTP_CODES


def _failure_reason(exc: Exception, timeout_s: int) -> str:
    """Short, safe wording for the client; the raw exception (URLs, response bodies) stays in the server log."""
    code = getattr(exc, "code", None)
    if isinstance(exc, httpx.TimeoutException) or code == 504:
        return f"did not answer within {timeout_s}s"
    if code == 503:
        return "is overloaded right now (503)"
    if code == 429:
        return "hit its rate limit or quota (429)"
    if code in (400, 401, 403):
        return f"rejected the request ({code}); check GEMINI_API_KEY and GEMINI_MODEL"
    if isinstance(exc, httpx.TransportError):
        return "could not be reached (network error)"
    return f"failed ({type(exc).__name__})"


class GeminiPlanWriter:
    name = "gemini"

    def __init__(self, settings: Settings, repo: FoodRepository):
        from google import genai
        from google.genai import types

        self._types = types
        self._client = genai.Client(api_key=settings.gemini_api_key, http_options=types.HttpOptions(timeout=settings.gemini_plan_timeout_s * 1000))
        self._models = list(dict.fromkeys([settings.gemini_model, *settings.gemini_fallback_models]))
        self._timeout_s = settings.gemini_plan_timeout_s
        self._repo = repo
        self.last_model: str | None = None

    def _ask(self, prompt: str, schema: dict) -> dict:
        failures = []
        for model in self._models:
            try:
                response = self._client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=self._types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                        # Low thinking: these are long structured answers and extra deliberation mostly adds latency.
                        thinking_config=self._types.ThinkingConfig(thinking_level="LOW"),
                    ),
                )
                self.last_model = model
                return json.loads(response.text or "{}")
            except Exception as exc:
                failures.append(f"'{model}' {_failure_reason(exc, self._timeout_s)}")
                logger.warning("Gemini plan model %s failed: %s", model, str(exc)[:500])
                if not _is_transient(exc):
                    raise PlanGenerationError(f"Gemini {failures[-1]}.") from exc
        raise PlanGenerationError("Gemini " + "; ".join(failures) + ". Try again in a moment.")

    def write_diet(self, profile: ProfileIn, targets: Targets) -> DietPlanContent:
        data = self._ask(diet_prompt(profile, targets, self._repo), _schema(DietPlanContent))
        try:
            return DietPlanContent.model_validate(data)
        except ValidationError as exc:
            logger.warning("Gemini diet plan failed validation: %s", str(exc)[:500])
            raise PlanGenerationError("Gemini returned an unusable diet plan. Try again.") from exc

    def write_workout(self, profile: ProfileIn) -> WorkoutPlanContent:
        data = self._ask(workout_prompt(profile), _schema(WorkoutPlanContent))
        try:
            return WorkoutPlanContent.model_validate(data)
        except ValidationError as exc:
            logger.warning("Gemini workout plan failed validation: %s", str(exc)[:500])
            raise PlanGenerationError("Gemini returned an unusable workout plan. Try again.") from exc


# ── selection ────────────────────────────────────────────────────────────────


def writer_status(settings: Settings | None = None) -> tuple[bool, str | None]:
    settings = settings or get_settings()
    if not settings.gemini_api_key:
        return False, "Set GEMINI_API_KEY in backend/.env to get AI-written plans; template plans are used meanwhile."
    return True, None


def get_plan_writer() -> PlanWriter | None:
    """FastAPI dependency: the AI writer, or None when it is not configured (templates are used instead)."""
    settings = get_settings()
    ready, _ = writer_status(settings)
    return GeminiPlanWriter(settings, get_food_repository()) if ready else None
