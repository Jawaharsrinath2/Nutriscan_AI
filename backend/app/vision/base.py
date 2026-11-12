"""Detector interface. Every detection engine (cloud or local) returns the same shapes."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from PIL import Image


class DetectorError(RuntimeError):
    """The detector could not process the image (network, auth, model failure)."""


@dataclass
class Detection:
    label: str
    # (x0, y0, x1, y1) as fractions of image width/height, or None if the engine gives no box.
    box: tuple[float, float, float, float] | None
    # Calibrated probability from the model; None when the engine has no real score.
    score: float | None = None
    # Engines that already know our ingredient keys (e.g. Gemini, prompted with them) can fill these.
    ingredient_key: str | None = None
    grams: float | None = None

    @property
    def area(self) -> float:
        if self.box is None:
            return 0.0
        x0, y0, x1, y1 = self.box
        return max(0.0, x1 - x0) * max(0.0, y1 - y0)


@dataclass
class DetectionResult:
    detections: list[Detection] = field(default_factory=list)
    is_food: bool = True
    dish_title: str | None = None
    cuisine: str | None = None


class Detector(ABC):
    name: str
    # True when Detection.score is a real model probability that can be shown to the user.
    scores_are_calibrated: bool

    @abstractmethod
    def detect(self, image: Image.Image) -> DetectionResult:
        """Find food items in an RGB image. Raises DetectorError on failure."""
