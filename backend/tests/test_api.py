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


def test_health(user_client):
    assert user_client.get("/api/health").json() == {"status": "ok"}


def test_food_catalogue(user_client):
    assert len(user_client.get("/api/foods/ingredients").json()) == 57
    dishes = user_client.get("/api/foods/dishes").json()
    assert len(dishes) == 28
    rice = next(d for d in dishes if d["key"] == "steamed_white_rice")
    assert rice["totals"] == {"kcal": 260, "protein": 5.4}
    assert rice["image"] == "/samples/steamed_white_rice.jpg"


def test_evaluate_and_unknown_ingredient(user_client):
    body = {"items": [{"id": "a", "key": "white_rice", "grams": 200}]}
    result = user_client.post("/api/nutrition/evaluate", json=body).json()
    assert result["totals"]["kcal"] == 260
    assert result["items"][0]["id"] == "a"
    assert result["targets"]["plan_key"] == "balanced"

    bad = user_client.post("/api/nutrition/evaluate", json={"items": [{"key": "unicorn", "grams": 10}]})
    assert bad.status_code == 422


def test_logging_meals_updates_consumed_totals(user_client):
    meal = {"slot": "Lunch", "title": "Rice", "image_url": "/samples/steamed_white_rice.jpg",
            "items": [{"key": "white_rice", "grams": 200}]}
    created = user_client.post("/api/meals", json=meal)
    assert created.status_code == 201
    assert created.json()["kcal"] == 260

    today = user_client.get("/api/meals/today").json()
    assert today["totals"]["kcal"] == 260 and len(today["meals"]) == 1

    evaluation = user_client.post("/api/nutrition/evaluate", json={"items": []}).json()
    assert evaluation["consumed"]["kcal"] == 260
    assert evaluation["remaining"]["kcal"] == 2000 - 260

    assert user_client.delete(f"/api/meals/{created.json()['id']}").status_code == 204
    assert user_client.delete("/api/meals/missing").status_code == 404

    user_client.post("/api/meals", json=meal)
    assert user_client.delete("/api/meals/today").status_code == 204
    assert user_client.get("/api/meals/today").json()["meals"] == []


def test_meal_image_url_must_be_local(user_client):
    meal = {"slot": "Lunch", "title": "x", "image_url": "javascript:alert(1)", "items": [{"key": "white_rice", "grams": 10}]}
    assert user_client.post("/api/meals", json=meal).status_code == 422


def test_water(user_client):
    assert user_client.get("/api/water/today").json()["glasses"] == 0
    assert user_client.put("/api/water/today", json={"glasses": 5}).json()["glasses"] == 5
    assert user_client.get("/api/water/today").json()["glasses"] == 5
    assert user_client.put("/api/water/today", json={"glasses": 13}).status_code == 422


def test_goals(user_client):
    assert user_client.get("/api/goals").json()["kcal"] == 2000
    assert len(user_client.get("/api/goals/plans").json()) == 4
    assert user_client.put("/api/goals/plan", json={"plan_key": "muscle_gain"}).json()["kcal"] == 2450
    assert user_client.put("/api/goals/plan", json={"plan_key": "nope"}).status_code == 404
    custom = user_client.put("/api/goals/custom", json={"kcal": 100, "protein": 999, "carbs": 150, "fat": 50}).json()
    assert custom == {"plan_key": "custom", "kcal": 800, "protein": 350, "carbs": 150, "fat": 50}


def test_vision_status_without_key(user_client):
    status = user_client.get("/api/vision").json()
    assert status["active"] == "none" and status["active_ready"]
    gemini = next(o for o in status["options"] if o["mode"] == "gemini")
    assert not gemini["ready"] and "GEMINI_API_KEY" in gemini["reason"]
    assert user_client.put("/api/vision", json={"mode": "gemini"}).json()["active_ready"] is False


def test_scan_recognises_plate_and_saves_photo(user_client, uploads_dir):
    use_detector(FakeDetector(DetectionResult(detections=[
        Detection("Idli", (0.1, 0.1, 0.4, 0.4), score=0.9),
        Detection("Idli", (0.4, 0.1, 0.7, 0.4), score=0.8),
        Detection("Sambar", (0.1, 0.5, 0.5, 0.9), score=0.7),
        Detection("dining table", (0, 0, 1, 1), score=0.6),
    ])))
    result = user_client.post("/api/scan", files=photo()).json()

    assert result["status"] == "recognized"
    assert {item["key"] for item in result["items"]} == {"steamed_idli", "vegetable_sambar"}
    assert result["unmatched_labels"] == ["dining table"]
    assert abs(result["confidence"] - 0.8) < 1e-9  # mean of the mapped detections only
    assert all(d["box"] for d in result["detections"])

    assert (uploads_dir / result["image_url"].rsplit("/", 1)[1]).exists()
    assert user_client.get(result["image_url"]).status_code == 200


def test_scan_without_detector_still_returns_photo(user_client):
    use_detector(None, "Set GEMINI_API_KEY")
    result = user_client.post("/api/scan", files=photo()).json()
    assert result["status"] == "detector_unavailable"
    assert result["items"] == [] and result["image_url"].startswith("/uploads/")


def test_scan_reports_detector_errors(user_client):
    use_detector(FakeDetector(error="quota exceeded"))
    result = user_client.post("/api/scan", files=photo()).json()
    assert result["status"] == "detector_error" and "quota exceeded" in result["message"]


def test_scan_with_only_unknown_foods_is_unrecognized(user_client):
    use_detector(FakeDetector(DetectionResult(detections=[Detection("pizza", (0, 0, 1, 1), score=0.9)])))
    result = user_client.post("/api/scan", files=photo()).json()
    assert result["status"] == "unrecognized"
    assert result["unmatched_labels"] == ["pizza"] and result["items"] == []


def test_scan_rejects_non_image(user_client):
    use_detector(None)
    response = user_client.post("/api/scan", files={"photo": ("x.txt", b"hello", "text/plain")})
    assert response.status_code == 400


# ── per-user isolation ──────────────────────────────────────────────────────


def test_per_user_routes_require_login(client):
    assert client.get("/api/meals/today").status_code == 401
    assert client.get("/api/water/today").status_code == 401
    assert client.get("/api/goals").status_code == 401
    assert client.post("/api/nutrition/evaluate", json={"items": []}).status_code == 401
    assert client.post("/api/scan", files=photo()).status_code == 401
    # The catalogue stays public.
    assert client.get("/api/foods/dishes").status_code == 200


def test_users_do_not_see_each_others_data(client):
    from tests.conftest import sign_up

    alice, bob = sign_up(client, "alice"), sign_up(client, "bob")
    meal = {"slot": "Lunch", "title": "Rice", "items": [{"key": "white_rice", "grams": 200}]}
    meal_id = alice.post("/api/meals", json=meal).json()["id"]
    alice.put("/api/water/today", json={"glasses": 3})
    alice.put("/api/goals/plan", json={"plan_key": "muscle_gain"})

    assert bob.get("/api/meals/today").json()["meals"] == []
    assert bob.get("/api/water/today").json()["glasses"] == 0
    assert bob.get("/api/goals").json()["kcal"] == 2000
    assert bob.post("/api/nutrition/evaluate", json={"items": []}).json()["consumed"]["kcal"] == 0
    assert bob.delete(f"/api/meals/{meal_id}").status_code == 404
    bob.delete("/api/meals/today")

    assert alice.get("/api/meals/today").json()["totals"]["kcal"] == 260
    assert alice.get("/api/goals").json()["kcal"] == 2450
    assert alice.post("/api/nutrition/evaluate", json={"items": []}).json()["remaining"]["kcal"] == 2450 - 260


def test_pre_account_tables_are_rebuilt_per_user(tmp_path):
    from sqlalchemy import create_engine, inspect, text

    from app.db.models import Base
    from app.db.session import _drop_pre_account_tables

    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE meal_logs (id VARCHAR(32) PRIMARY KEY, day DATE)"))
        conn.execute(text("CREATE TABLE water_logs (day DATE PRIMARY KEY, glasses INTEGER)"))
    _drop_pre_account_tables(engine)
    Base.metadata.create_all(engine)
    columns = {c["name"] for c in inspect(engine).get_columns("meal_logs")}
    assert "user_id" in columns and "kcal" in columns
    assert {c["name"] for c in inspect(engine).get_columns("water_logs")} == {"user_id", "day", "glasses"}
    # Running it again on the new shape is a no-op.
    _drop_pre_account_tables(engine)
    assert "meal_logs" in inspect(engine).get_table_names()
