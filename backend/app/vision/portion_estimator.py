"""Estimate grams per detected item.

A single 2D photo cannot give true weight, so these are estimates the user corrects in the
ingredient table. If the engine supplies its own gram estimate (Gemini does), that is used;
otherwise the bounding-box area is compared with a typical serving.
"""

from app.vision.base import Detection

# Fraction of the photo that one typical serving of an item roughly covers.
REFERENCE_AREA = 0.18
MIN_SCALE, MAX_SCALE = 0.4, 2.0
MIN_GRAMS, MAX_GRAMS = 5, 1500


def _round5(grams: float) -> float:
    return float(max(MIN_GRAMS, min(MAX_GRAMS, round(grams / 5) * 5)))


def estimate_group(detections: list[Detection], typical_grams: float) -> list[float]:
    """Grams for each detection of the same ingredient, in the same order."""
    if all(d.grams is not None and d.grams > 0 for d in detections):
        return [_round5(d.grams) for d in detections]

    total_area = sum(d.area for d in detections)
    if total_area <= 0:
        return [_round5(typical_grams / len(detections))] * len(detections)

    scale = max(MIN_SCALE, min(MAX_SCALE, total_area / REFERENCE_AREA))
    group_grams = typical_grams * scale
    return [_round5(group_grams * d.area / total_area) for d in detections]
