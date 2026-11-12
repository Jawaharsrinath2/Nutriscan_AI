from typing import Literal

from pydantic import BaseModel

from app.schemas.food import PlateItem

ScanStatus = Literal["recognized", "unrecognized", "detector_unavailable", "detector_error"]


class Box(BaseModel):
    """Bounding box with corners as fractions (0-1) of image width/height."""

    x0: float
    y0: float
    x1: float
    y1: float


class DetectedItem(BaseModel):
    label: str
    ingredient_key: str | None
    ingredient_name: str | None
    box: Box | None
    score: float | None  # only set when the detector produces a calibrated probability
    grams: float | None


class ScanResponse(BaseModel):
    status: ScanStatus
    message: str | None
    detector: str
    image_url: str
    dish_title: str | None
    cuisine: str | None
    matched_dish_key: str | None
    confidence: float | None
    detections: list[DetectedItem]
    unmatched_labels: list[str]
    items: list[PlateItem]
