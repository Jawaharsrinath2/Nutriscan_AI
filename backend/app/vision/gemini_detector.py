"""Cloud detection with Gemini vision: returns labelled bounding boxes and gram estimates."""

import json
import logging

import httpx
from PIL import Image

from app.vision.base import Detection, DetectionResult, Detector, DetectorError
from app.vision.preprocess import to_jpeg_bytes

logger = logging.getLogger(__name__)

NO_MATCH_KEY = "other"
BOX_SCALE = 1000  # Gemini returns box_2d as [ymin, xmin, ymax, xmax] on a 0-1000 grid.
TRANSIENT_HTTP_CODES = {429, 500, 502, 503, 504}


def _build_prompt(ingredients: dict[str, dict]) -> str:
    catalogue = "\n".join(f"- {key}: {item['name']}" for key, item in ingredients.items())
    return f"""You are the food detection system of a nutrition app focused on South Indian and Indian meals.

Detect every distinct food item visible in the photo (each idli, dosa, bowl of sambar, chutney, rice
portion, curry, side dish, drink, etc.). For each item return:
- label: a short name for what you see, e.g. "Idli", "Coconut chutney", "Sambar".
- ingredient_key: the closest key from the catalogue below, or "{NO_MATCH_KEY}" if nothing fits.
- box_2d: [ymin, xmin, ymax, xmax] of the item, normalized to 0-{BOX_SCALE}.
- grams: your best estimate of the edible weight of that item in grams.

Also return dish_title (a descriptive name for the whole meal) and cuisine (a short tag such as
"South Indian Tiffin"). If the photo contains no food, set is_food to false and return no items.
Do not invent items you cannot see.

Ingredient catalogue (key: description, nutrition is per 100 g):
{catalogue}
"""


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
        self._prompt = _build_prompt(ingredients)
        self._schema = _response_schema(list(ingredients))

    def _ask(self, model: str, jpeg: bytes) -> dict:
        types = self._types
        response = self._client.models.generate_content(
            model=model,
            contents=[types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"), self._prompt],
            # Temperature left at its default: Google advises against lowering it for Gemini 3 models.
            config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=self._schema),
        )
        return json.loads(response.text or "{}")

    def detect(self, image: Image.Image) -> DetectionResult:
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
