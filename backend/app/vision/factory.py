"""Choose and cache the active detector. The mode starts from config and can be switched at runtime."""

import importlib.util
import threading
from dataclasses import dataclass

from app.config import DetectorMode, Settings, get_settings
from app.schemas.vision import DetectorOption, VisionStatus
from app.services.food_repository import get_food_repository
from app.vision.base import Detector

MODE_LABELS: dict[DetectorMode, str] = {
    "gemini": "Gemini Vision (cloud)",
    "yolo": "YOLO (local model)",
    "none": "Manual (no detector)",
}

_lock = threading.Lock()
_active_mode: DetectorMode | None = None
_cache: dict[DetectorMode, Detector] = {}


@dataclass
class DetectorChoice:
    mode: DetectorMode
    detector: Detector | None
    unavailable_reason: str | None


def _installed(module: str) -> bool:
    try:
        return importlib.util.find_spec(module) is not None
    except ModuleNotFoundError:  # parent package (e.g. "google") missing
        return False


def check_ready(mode: DetectorMode, settings: Settings) -> tuple[bool, str | None]:
    if mode == "gemini":
        if not settings.gemini_api_key:
            return False, "Set GEMINI_API_KEY in backend/.env to enable Gemini Vision."
        if not _installed("google.genai"):
            return False, "Install the google-genai package (pip install -r requirements.txt)."
        return True, None
    if mode == "yolo":
        if not _installed("ultralytics"):
            return False, "Install the optional ML packages (pip install -r requirements-ml.txt)."
        weights = settings.resolve(settings.yolo_weights)
        if not weights.exists():
            return False, f"No YOLO weights at {weights}. See backend/models/README.md."
        return True, None
    return True, None


def active_mode() -> DetectorMode:
    return _active_mode or get_settings().detector


def set_active_mode(mode: DetectorMode) -> None:
    global _active_mode
    _active_mode = mode


def _build(mode: DetectorMode, settings: Settings) -> Detector:
    if mode == "gemini":
        from app.vision.gemini_detector import GeminiDetector

        return GeminiDetector(
            settings.gemini_api_key,
            settings.gemini_model,
            get_food_repository().ingredients,
            settings.gemini_timeout_s,
            settings.gemini_fallback_models,
        )
    from app.vision.yolo_detector import YoloDetector

    return YoloDetector(settings.resolve(settings.yolo_weights), settings.yolo_min_score)


def get_detector_choice() -> DetectorChoice:
    """FastAPI dependency used by the scan route."""
    settings = get_settings()
    mode = active_mode()
    if mode == "none":
        return DetectorChoice(mode, None, "Manual mode is on: pick the dish from the list below.")
    ready, reason = check_ready(mode, settings)
    if not ready:
        return DetectorChoice(mode, None, reason)
    with _lock:
        if mode not in _cache:
            try:
                _cache[mode] = _build(mode, settings)
            except Exception as exc:  # bad weights file, SDK init failure
                return DetectorChoice(mode, None, f"{MODE_LABELS[mode]} failed to start: {str(exc)[:200]}")
        return DetectorChoice(mode, _cache[mode], None)


def vision_status() -> VisionStatus:
    settings = get_settings()
    options = []
    for mode, label in MODE_LABELS.items():
        ready, reason = check_ready(mode, settings)
        options.append(DetectorOption(mode=mode, label=label, ready=ready, reason=reason))
    active = active_mode()
    return VisionStatus(
        active=active,
        active_ready=next(o.ready for o in options if o.mode == active),
        options=options,
    )
