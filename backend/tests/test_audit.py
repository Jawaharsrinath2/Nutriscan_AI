from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest

from app.schemas.audit import ProductAuditResponse


def test_audit_presets(user_client):
    res = user_client.get("/api/audit/presets")
    assert res.status_code == 200
    presets = res.json()
    assert len(presets) >= 4
    barcodes = [p["barcode"] for p in presets]
    assert "8901719101038" in barcodes
    assert "5449000000996" in barcodes


def test_audit_preset_parle_g(user_client):
    res = user_client.get("/api/audit/barcode/8901719101038")
    assert res.status_code == 200
    data = res.json()
    assert data["product_name"] == "Parle-G Original Gluco Biscuits"
    assert data["nutriscore_grade"] == "E"
    assert data["nova_group"] == 4
    assert data["summary_status"] == "unhealthy"
    assert any("Palm Oil" in rf for rf in data["red_flags"])
    assert any("Sugar" in rf for rf in data["red_flags"])
    assert len(data["healthy_swaps"]) > 0
    assert data["nutriments"]["kcal_100g"] == 461.0


def test_audit_preset_coca_cola(user_client):
    res = user_client.get("/api/audit/barcode/5449000000996")
    assert res.status_code == 200
    data = res.json()
    assert "Coca-Cola" in data["product_name"]
    assert data["nutriscore_grade"] == "E"
    assert any("Caramel" in rf for rf in data["red_flags"])
    assert any("Coconut Water" in s or "Lime Water" in s for s in data["healthy_swaps"])


@patch("httpx.AsyncClient.get")
def test_audit_external_lookup(mock_get, user_client):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": 1,
        "product": {
            "product_name": "Mock Oats Cookie",
            "brands": "HealthyCo",
            "categories": "Cookies, Healthy Snacks",
            "ingredients_text": "Rolled oats (50%), Whole wheat flour, Honey, Olive oil",
            "nutriscore_grade": "a",
            "nova_group": 2,
            "nutriments": {
                "energy-kcal_100g": 380,
                "proteins_100g": 12.0,
                "carbohydrates_100g": 55.0,
                "fat_100g": 9.0,
                "fiber_100g": 8.0,
                "sugars_100g": 4.0,
                "sodium_100g": 0.05,
            },
        },
    }
    mock_get.return_value = mock_resp

    res = user_client.get("/api/audit/barcode/1234567890123")
    assert res.status_code == 200
    data = res.json()
    assert data["product_name"] == "Mock Oats Cookie"
    assert data["nutriscore_grade"] == "A"
    assert data["summary_status"] == "healthy"
    assert any("Protein" in gf for gf in data["green_flags"])


@patch("httpx.AsyncClient.get")
def test_audit_not_found_barcode(mock_get, user_client):
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_get.return_value = mock_resp

    res = user_client.get("/api/audit/barcode/0000000000000")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_log_audited_packaged_food(user_client):
    # Log 30g of Parle-G
    payload = {
        "product_name": "Parle-G Gluco Biscuits",
        "brand": "Parle",
        "image_url": "/samples/parle_g.jpg",
        "grams": 30.0,
        "slot": "Evening Snack",
        "kcal": 138,
        "protein": 2.1,
        "carbs": 23.4,
        "fat": 3.7,
        "fiber": 0.5,
    }
    log_res = user_client.post("/api/audit/log", json=payload)
    assert log_res.status_code == 201
    logged = log_res.json()
    assert logged["slot"] == "Evening Snack"
    assert "Parle" in logged["title"]
    assert logged["kcal"] == 138
    assert logged["protein"] == 2.1

    # Verify that today's diary reflects the logged packaged food
    today_res = user_client.get("/api/meals/today")
    assert today_res.status_code == 200
    day_log = today_res.json()
    assert any(m["id"] == logged["id"] for m in day_log["meals"])
    assert day_log["totals"]["kcal"] >= 138
    assert day_log["totals"]["protein"] >= 2
