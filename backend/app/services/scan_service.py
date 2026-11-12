"""Photo -> detections -> plate items. Never guesses: if nothing is recognised, it says so."""

import uuid
from pathlib import Path

from app.schemas.food import PlateItem
from app.schemas.scan import Box, DetectedItem, ScanResponse
from app.services.food_repository import FoodRepository
from app.vision import dish_matcher
from app.vision.base import Detection, DetectorError
from app.vision.factory import DetectorChoice
from app.vision.label_mapper import LabelMapper
from app.vision.portion_estimator import estimate_group
from app.vision.preprocess import load_image, to_jpeg_bytes

UPLOADS_URL_PREFIX = "/uploads/"
PICK_DISH_HINT = "Pick the dish from the list below or add ingredients by hand."


def save_upload(jpeg: bytes, uploads_dir: Path) -> str:
    name = f"{uuid.uuid4().hex}.jpg"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    (uploads_dir / name).write_bytes(jpeg)
    return UPLOADS_URL_PREFIX + name


def _empty_response(status, message: str, choice: DetectorChoice, image_url: str, **extra) -> ScanResponse:
    return ScanResponse(
        status=status,
        message=message,
        detector=choice.mode,
        image_url=image_url,
        dish_title=None,
        cuisine=None,
        matched_dish_key=None,
        confidence=None,
        detections=extra.get("detections", []),
        unmatched_labels=extra.get("unmatched_labels", []),
        items=[],
    )


def run_scan(raw: bytes, choice: DetectorChoice, repo: FoodRepository, uploads_dir: Path, max_bytes: int) -> ScanResponse:
    image = load_image(raw, max_bytes)  # raises InvalidImageError
    image_url = save_upload(to_jpeg_bytes(image), uploads_dir)

    if choice.detector is None:
        return _empty_response("detector_unavailable", choice.unavailable_reason or PICK_DISH_HINT, choice, image_url)

    try:
        result = choice.detector.detect(image)
    except DetectorError as exc:
        return _empty_response("detector_error", f"{exc} {PICK_DISH_HINT}", choice, image_url)

    if not result.is_food or not result.detections:
        return _empty_response("unrecognized", f"No food was recognised in this photo. {PICK_DISH_HINT}", choice, image_url)

    mapper = LabelMapper(repo)
    groups: dict[str, list[Detection]] = {}
    unmatched_dets: list[Detection] = []
    for det in result.detections:
        key = mapper.map(det.label, det.ingredient_key)
        if key is None:
            unmatched_dets.append(det)
        else:
            groups.setdefault(key, []).append(det)

    detected_items: list[DetectedItem] = []
    plate: dict[str, float] = {}
    for key, dets in groups.items():
        grams = estimate_group(dets, repo.typical_grams(key))
        plate[key] = sum(grams)
        for det, g in zip(dets, grams):
            detected_items.append(_detected_item(det, key, repo.ingredient(key)["name"], g))
    detected_items.extend(_detected_item(det, None, None, None) for det in unmatched_dets)
    unmatched = sorted({det.label for det in unmatched_dets})

    if not plate:
        return _empty_response(
            "unrecognized",
            f"Saw {', '.join(unmatched)}, but none of it is in the nutrition database yet. {PICK_DISH_HINT}",
            choice,
            image_url,
            detections=detected_items,
            unmatched_labels=unmatched,
        )

    matched_key = dish_matcher.best_match(plate, repo.dishes)
    matched = repo.dishes.get(matched_key) if matched_key else None
    scores = [d.score for dets in groups.values() for d in dets if d.score is not None]

    return ScanResponse(
        status="recognized",
        message=None,
        detector=choice.mode,
        image_url=image_url,
        dish_title=result.dish_title or (matched and matched["title"]) or _compose_title(plate, repo),
        cuisine=result.cuisine or (matched and matched["cuisine"]) or "Detected Plate",
        matched_dish_key=matched_key,
        confidence=(sum(scores) / len(scores)) if choice.detector.scores_are_calibrated and scores else None,
        detections=detected_items,
        unmatched_labels=unmatched,
        items=[PlateItem(key=key, grams=grams) for key, grams in plate.items()],
    )


def _detected_item(det: Detection, key: str | None, name: str | None, grams: float | None) -> DetectedItem:
    return DetectedItem(
        label=det.label,
        ingredient_key=key,
        ingredient_name=name,
        box=Box(x0=det.box[0], y0=det.box[1], x1=det.box[2], y1=det.box[3]) if det.box else None,
        score=det.score,
        grams=grams,
    )


def _compose_title(plate: dict[str, float], repo: FoodRepository) -> str:
    names = [repo.ingredient(key)["name"] for key in sorted(plate, key=plate.get, reverse=True)[:3]]
    return " with ".join([names[0], " & ".join(names[1:])]) if len(names) > 1 else names[0]
