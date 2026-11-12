from io import BytesIO
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from google.genai.errors import ClientError, ServerError
from PIL import Image

from app.vision.base import Detection, DetectorError
from app.vision.dish_matcher import best_match
from app.vision.gemini_detector import GeminiDetector, _to_box
from app.vision.label_mapper import LabelMapper
from app.vision.portion_estimator import estimate_group
from app.vision.preprocess import MAX_SIDE_PX, InvalidImageError, load_image


@pytest.fixture(scope="module")
def mapper(repo):
    return LabelMapper(repo)


@pytest.mark.parametrize(
    ("label", "expected"),
    [
        ("Idly", "steamed_idli"),
        ("Masala Dosa", "masala_dosa_crepe"),
        ("sambhar", "vegetable_sambar"),
        ("Sambar rice", "sambar_rice_dish"),
        ("Coconut Chutney", "coconut_chutney"),
        ("Bowl of steamed white rice", "white_rice"),
        ("sambbar", "vegetable_sambar"),
        ("pizza", None),
        ("", None),
    ],
)
def test_label_mapping(mapper, label, expected):
    assert mapper.map(label) == expected


def test_detector_suggested_key_wins_when_valid(mapper):
    assert mapper.map("Rice", suggested_key="lemon_rice_dish") == "lemon_rice_dish"


def test_invalid_suggested_key_falls_back_to_label(mapper):
    assert mapper.map("Idli", suggested_key="not_a_key") == "steamed_idli"


def test_portions_use_model_grams_rounded_to_5():
    dets = [Detection("Idli", None, grams=52), Detection("Idli", None, grams=48)]
    assert estimate_group(dets, typical_grams=150) == [50.0, 50.0]


def test_portions_from_box_area_scale_with_size():
    small = estimate_group([Detection("Rice", (0, 0, 0.3, 0.3))], typical_grams=200)[0]
    large = estimate_group([Detection("Rice", (0, 0, 0.6, 0.6))], typical_grams=200)[0]
    assert small < large
    assert 5 <= small and large <= 1500


def test_portions_split_group_by_area():
    dets = [Detection("Idli", (0, 0, 0.2, 0.2)), Detection("Idli", (0.5, 0.5, 0.7, 0.7))]
    grams = estimate_group(dets, typical_grams=150)
    assert grams[0] == grams[1]


def test_dish_matcher_finds_masala_dosa(repo):
    detected = {"masala_dosa_crepe": 100, "potato_masala": 60, "medu_vada": 50, "vegetable_sambar": 120,
                "coconut_chutney": 30, "tomato_chutney": 30}
    assert best_match(detected, repo.dishes) == "masala_dosa"


def test_dish_matcher_returns_none_for_unrelated_plate(repo):
    assert best_match({"whey_scoop": 30}, repo.dishes) is None


def test_gemini_box_conversion():
    assert _to_box([100, 200, 500, 800]) == (0.2, 0.1, 0.8, 0.5)
    assert _to_box([500, 500, 100, 100]) is None
    assert _to_box([1, 2, 3]) is None


def _gemini_with_replies(repo, *replies, fallbacks=("backup-model",)):
    """GeminiDetector whose SDK call returns/raises `replies` in order."""
    detector = GeminiDetector("test-key", "main-model", repo.ingredients, timeout_s=7, fallback_models=fallbacks)
    generate = Mock(side_effect=list(replies))
    detector._client = SimpleNamespace(models=SimpleNamespace(generate_content=generate))
    return detector, generate


GEMINI_OK = SimpleNamespace(text='{"is_food": true, "dish_title": "Idli", "cuisine": "South Indian", "items": []}')
WHITE = Image.new("RGB", (64, 64), "white")


@pytest.mark.parametrize(
    "error",
    [
        httpx.ReadTimeout("read timed out"),
        ServerError(504, {"error": {"status": "DEADLINE_EXCEEDED"}}),
        ServerError(503, {"error": {"status": "UNAVAILABLE"}}),
        ClientError(429, {"error": {"status": "RESOURCE_EXHAUSTED"}}),
    ],
)
def test_gemini_falls_back_to_next_model_on_transient_errors(repo, error):
    detector, generate = _gemini_with_replies(repo, error, GEMINI_OK)
    assert detector.detect(WHITE).dish_title == "Idli"
    assert [c.kwargs["model"] for c in generate.call_args_list] == ["main-model", "backup-model"]


def test_gemini_reports_every_model_when_all_fail(repo):
    detector, _ = _gemini_with_replies(
        repo, httpx.ReadTimeout("read timed out"), ServerError(503, {"error": {"status": "UNAVAILABLE"}})
    )
    with pytest.raises(DetectorError) as err:
        detector.detect(WHITE)
    assert str(err.value) == (
        "Gemini 'main-model' did not answer within 7s; 'backup-model' is overloaded right now (503). "
        "Try Re-Scan in a moment."
    )


def test_gemini_does_not_fall_back_on_a_bad_key(repo):
    detector, generate = _gemini_with_replies(repo, ClientError(400, {"error": {"message": "API key not valid"}}))
    with pytest.raises(DetectorError, match="'main-model' failed: 400"):
        detector.detect(WHITE)
    assert generate.call_count == 1


def _jpeg(width, height) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (width, height), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


def test_preprocess_rejects_non_images():
    with pytest.raises(InvalidImageError):
        load_image(b"definitely not an image", max_bytes=10_000_000)


def test_preprocess_rejects_oversized_files():
    with pytest.raises(InvalidImageError):
        load_image(_jpeg(10, 10), max_bytes=10)


def test_preprocess_shrinks_large_photos():
    image = load_image(_jpeg(4000, 3000), max_bytes=50_000_000)
    assert max(image.size) == MAX_SIDE_PX
    assert image.mode == "RGB"
