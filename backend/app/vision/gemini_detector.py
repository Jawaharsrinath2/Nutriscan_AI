"""Cloud detection with Gemini vision: returns labelled bounding boxes and gram estimates."""

import json
import logging

import httpx
from PIL import Image

from app import prompts
from app.vision.base import Detection, DetectionResult, Detector, DetectorError
from app.vision.preprocess import to_jpeg_bytes

logger = logging.getLogger(__name__)

NO_MATCH_KEY = "other"
BOX_SCALE = 1000  # Gemini returns box_2d as [ymin, xmin, ymax, xmax] on a 0-1000 grid.
TRANSIENT_HTTP_CODES = {429, 500, 502, 503, 504}


def detection_prompt(ingredients: dict[str, dict]) -> str:
    """The wording lives in app/prompts/food_detection.txt; the keys the parser relies on are filled from here."""
    catalogue = "\n".join(f"- {key}: {item['name']}" for key, item in ingredients.items())
    return prompts.render("food_detection", catalogue=catalogue, no_match_key=NO_MATCH_KEY, box_scale=BOX_SCALE)


def _response_schema(keys: list[str]) -> dict:
    return {
        "type": "OBJECT",
        "properties": {
            "is_food": {"type": "BOOLEAN"},
            "dish_title": {"type": "STRING"},
            "cuisine": {"type": "STRING"},
            "items": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "label": {"type": "STRING"},
                        "ingredient_key": {"type": "STRING", "enum": [*keys, NO_MATCH_KEY]},
                        "box_2d": {"type": "ARRAY", "items": {"type": "INTEGER"}},
                        "grams": {"type": "NUMBER"},
                    },
                    "required": ["label", "ingredient_key", "box_2d", "grams"],
                },
            },
        },
        "required": ["is_food", "dish_title", "cuisine", "items"],
    }


def _to_box(box_2d: list) -> tuple[float, float, float, float] | None:
    if not isinstance(box_2d, list) or len(box_2d) != 4:
        return None
    y0, x0, y1, x1 = (max(0.0, min(1.0, float(v) / BOX_SCALE)) for v in box_2d)
    if x1 <= x0 or y1 <= y0:
        return None
    return (x0, y0, x1, y1)


def _is_transient(exc: Exception) -> bool:
    """Errors worth retrying on the next model: network trouble, timeouts, overload, rate limits."""
    return isinstance(exc, httpx.TransportError) or getattr(exc, "code", None) in TRANSIENT_HTTP_CODES


def _failure_reason(exc: Exception, timeout_s: int) -> str:
    code = getattr(exc, "code", None)
    # 504 is the server's DEADLINE_EXCEEDED: the SDK forwards our timeout to it.
    if isinstance(exc, httpx.TimeoutException) or code == 504:
        return f"did not answer within {timeout_s}s"
    if code == 503:
        return "is overloaded right now (503)"
    if code == 429:
        return "hit its rate limit or quota (429)"
    return f"failed: {str(exc)[:200]}"


class GeminiDetector(Detector):
    name = "gemini"
    scores_are_calibrated = False  # Gemini gives no real probability per box.

    def __init__(
        self,
        api_key: str,
        model: str,
        ingredients: dict[str, dict],
        timeout_s: int = 30,
        fallback_models: list[str] | tuple[str, ...] = (),
    ):
        # Imported here so the backend still starts if only the local detector is installed.
        from google import genai
        from google.genai import types

        self._client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=timeout_s * 1000))
        self._types = types
        self._models = list(dict.fromkeys([model, *fallback_models]))  # primary first, no duplicates
        self._timeout_s = timeout_s
        self._ingredients = ingredients
        self._schema = _response_schema(list(ingredients))

    def _ask(self, model: str, jpeg: bytes) -> dict:
        types = self._types
        response = self._client.models.generate_content(
            model=model,
            # Rendered per scan so an edit to the prompt file applies without a restart.
            contents=[types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"), detection_prompt(self._ingredients)],
            # Temperature left at its default: Google advises against lowering it for Gemini 3 models.
            config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=self._schema),
        )
        return json.loads(response.text or "{}")

    def detect(self, image: Image.Image) -> DetectionResult:
        try:
            detection_prompt(self._ingredients)  # fail early and clearly if the prompt file was mis-edited
        except prompts.PromptError as exc:
            logger.error("Prompt file problem: %s", exc)
            raise DetectorError(f"Prompt file problem: {exc}") from exc
        jpeg = to_jpeg_bytes(image)
        failures = []
        for model in self._models:
            try:
                payload = self._ask(model, jpeg)
                break
            except Exception as exc:  # SDK, network, auth, quota and JSON errors all mean "scan failed"
                failures.append(f"'{model}' {_failure_reason(exc, self._timeout_s)}")
                if not _is_transient(exc):
                    raise DetectorError(f"Gemini {failures[-1]}.") from exc
                logger.warning("Gemini %s; trying the next model if any.", failures[-1])
        else:
            raise DetectorError(f"Gemini {'; '.join(failures)}. Try Re-Scan in a moment.")

        detections = [
            Detection(
                label=str(item.get("label", "")).strip() or "Food item",
                box=_to_box(item.get("box_2d")),
                ingredient_key=item.get("ingredient_key") if item.get("ingredient_key") != NO_MATCH_KEY else None,
                grams=item.get("grams"),
            )
            for item in payload.get("items", [])
        ]
        return DetectionResult(
            detections=detections,
            is_food=bool(payload.get("is_food", bool(detections))),
            dish_title=(payload.get("dish_title") or "").strip() or None,
            cuisine=(payload.get("cuisine") or "").strip() or None,
        )
