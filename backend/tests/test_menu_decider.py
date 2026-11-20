def test_menu_decider_samples(user_client):
    response = user_client.get("/api/menu-decider/samples")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 4
    sample_ids = [s["id"] for s in samples]
    assert "south_indian_veg" in sample_ids
    assert "chettinad_non_veg" in sample_ids


def test_menu_decider_analyze_text(user_client):
    payload = {
        "menu_text": "Tandoori Chicken Half (₹260)\nButter Naan with Dal Makhani\nSteamed Idli with Sambar",
        "remaining_kcal": 550,
        "remaining_protein": 30.0,
        "diet_preference": "any",
    }
    response = user_client.post("/api/menu-decider/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["dishes"]) >= 3
    assert data["remaining_kcal_considered"] == 550
    assert "smart_ordering_tips" in data
    # Check that fit verdicts are one of green, yellow, red
    for dish in data["dishes"]:
        assert dish["fit_verdict"] in ["green", "yellow", "red"]


def test_menu_decider_log_dish(user_client):
    payload = {
        "dish_name": "Tandoori Chicken Half",
        "slot": "Dinner",
        "kcal": 320,
        "protein": 38.0,
        "carbs": 6.0,
        "fat": 12.0,
        "fiber": 2.0,
    }
    response = user_client.post("/api/menu-decider/log", data=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Tandoori Chicken Half" in data["title"]
    assert data["kcal"] == 320
