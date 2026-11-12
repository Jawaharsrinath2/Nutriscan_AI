from io import BytesIO

from PIL import Image

from app.vision.base import Detection, DetectionResult, Detector, DetectorError
from app.vision.factory import DetectorChoice, get_detector_choice
from app.main import app


class FakeDetector(Detector):
    name = "fake"
    scores_are_calibrated = True

    def __init__(self, result: DetectionResult | None = None, error: str | None = None):
        self._result, self._error = result, error

    def detect(self, image):
        if self._error:
            raise DetectorError(self._error)
        return self._result


def use_detector(detector: Detector | None, reason: str | None = None):
    app.dependency_overrides[get_detector_choice] = lambda: DetectorChoice("yolo", detector, reason)


def photo() -> dict:
    buffer = BytesIO()
    Image.new("RGB", (640, 480), "orange").save(buffer, format="JPEG")
    return {"photo": ("plate.jpg", buffer.getvalue(), "image/jpeg")}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_food_catalogue(client):
    assert len(client.get("/api/foods/ingredients").json()) == 57
    dishes = client.get("/api/foods/dishes").json()
    assert len(dishes) == 28
    rice = next(d for d in dishes if d["key"] == "steamed_white_rice")
    assert rice["totals"] == {"kcal": 260, "protein": 5.4}
    assert rice["image"] == "/samples/steamed_white_rice.jpg"


def test_evaluate_and_unknown_ingredient(client):
    body = {"items": [{"id": "a", "key": "white_rice", "grams": 200}]}
    result = client.post("/api/nutrition/evaluate", json=body).json()
    assert result["totals"]["kcal"] == 260
    assert result["items"][0]["id"] == "a"
    assert result["targets"]["plan_key"] == "balanced"

    bad = client.post("/api/nutrition/evaluate", json={"items": [{"key": "unicorn", "grams": 10}]})
    assert bad.status_code == 422


def test_logging_meals_updates_consumed_totals(client):
    meal = {"slot": "Lunch", "title": "Rice", "image_url": "/samples/steamed_white_rice.jpg",
            "items": [{"key": "white_rice", "grams": 200}]}
    created = client.post("/api/meals", json=meal)
    assert created.status_code == 201
    assert created.json()["kcal"] == 260

    today = client.get("/api/meals/today").json()
    assert today["totals"]["kcal"] == 260 and len(today["meals"]) == 1

    evaluation = client.post("/api/nutrition/evaluate", json={"items": []}).json()
    assert evaluation["consumed"]["kcal"] == 260
    assert evaluation["remaining"]["kcal"] == 2000 - 260

    assert client.delete(f"/api/meals/{created.json()['id']}").status_code == 204
    assert client.delete("/api/meals/missing").status_code == 404

    client.post("/api/meals", json=meal)
    assert client.delete("/api/meals/today").status_code == 204
    assert client.get("/api/meals/today").json()["meals"] == []


def test_meal_image_url_must_be_local(client):
    meal = {"slot": "Lunch", "title": "x", "image_url": "javascript:alert(1)", "items": [{"key": "white_rice", "grams": 10}]}
    assert client.post("/api/meals", json=meal).status_code == 422


def test_water(client):
    assert client.get("/api/water/today").json()["glasses"] == 0
    assert client.put("/api/water/today", json={"glasses": 5}).json()["glasses"] == 5
    assert client.get("/api/water/today").json()["glasses"] == 5
    assert client.put("/api/water/today", json={"glasses": 13}).status_code == 422


def test_goals(client):
    assert client.get("/api/goals").json()["kcal"] == 2000
    assert len(client.get("/api/goals/plans").json()) == 4
    assert client.put("/api/goals/plan", json={"plan_key": "muscle_gain"}).json()["kcal"] == 2450
    assert client.put("/api/goals/plan", json={"plan_key": "nope"}).status_code == 404
    custom = client.put("/api/goals/custom", json={"kcal": 100, "protein": 999, "carbs": 150, "fat": 50}).json()
    assert custom == {"plan_key": "custom", "kcal": 800, "protein": 350, "carbs": 150, "fat": 50}


def test_vision_status_without_key(client):
    status = client.get("/api/vision").json()
    assert status["active"] == "none" and status["active_ready"]
    gemini = next(o for o in status["options"] if o["mode"] == "gemini")
    assert not gemini["ready"] and "GEMINI_API_KEY" in gemini["reason"]
    assert client.put("/api/vision", json={"mode": "gemini"}).json()["active_ready"] is False


def test_scan_recognises_plate_and_saves_photo(client, uploads_dir):
    use_detector(FakeDetector(DetectionResult(detections=[
        Detection("Idli", (0.1, 0.1, 0.4, 0.4), score=0.9),
        Detection("Idli", (0.4, 0.1, 0.7, 0.4), score=0.8),
        Detection("Sambar", (0.1, 0.5, 0.5, 0.9), score=0.7),
        Detection("dining table", (0, 0, 1, 1), score=0.6),
    ])))
    result = client.post("/api/scan", files=photo()).json()

    assert result["status"] == "recognized"
    assert {item["key"] for item in result["items"]} == {"steamed_idli", "vegetable_sambar"}
    assert result["unmatched_labels"] == ["dining table"]
    assert abs(result["confidence"] - 0.8) < 1e-9  # mean of the mapped detections only
    assert all(d["box"] for d in result["detections"])

    assert (uploads_dir / result["image_url"].rsplit("/", 1)[1]).exists()
    assert client.get(result["image_url"]).status_code == 200


def test_scan_without_detector_still_returns_photo(client):
    use_detector(None, "Set GEMINI_API_KEY")
    result = client.post("/api/scan", files=photo()).json()
    assert result["status"] == "detector_unavailable"
    assert result["items"] == [] and result["image_url"].startswith("/uploads/")


def test_scan_reports_detector_errors(client):
    use_detector(FakeDetector(error="quota exceeded"))
    result = client.post("/api/scan", files=photo()).json()
    assert result["status"] == "detector_error" and "quota exceeded" in result["message"]


def test_scan_with_only_unknown_foods_is_unrecognized(client):
    use_detector(FakeDetector(DetectionResult(detections=[Detection("pizza", (0, 0, 1, 1), score=0.9)])))
    result = client.post("/api/scan", files=photo()).json()
    assert result["status"] == "unrecognized"
    assert result["unmatched_labels"] == ["pizza"] and result["items"] == []


def test_scan_rejects_non_image(client):
    use_detector(None)
    response = client.post("/api/scan", files={"photo": ("x.txt", b"hello", "text/plain")})
    assert response.status_code == 400
