def test_voice_samples(user_client):
    res = user_client.get("/api/voice-log/samples")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) >= 4
    prompts = [s["prompt"] for s in samples]
    assert any("idli" in p.lower() for p in prompts)
    assert any("biryani" in p.lower() for p in prompts)


def test_voice_parse_tanglish_breakfast(user_client):
    payload = {"transcript": "Kaalaila 3 idli, oru cup sambar, aprm filter coffee saapten"}
    res = user_client.post("/api/voice-log/parse", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["slot"] == "Breakfast"
    assert len(data["items"]) >= 2
    item_names = [i["name"].lower() for i in data["items"]]
    assert any("idli" in name for name in item_names)
    assert data["total_kcal"] > 0
    assert data["total_protein"] > 0


def test_voice_parse_tanglish_lunch(user_client):
    payload = {"transcript": "Lunch ku 1 plate chicken biryani with boiled egg and raita"}
    res = user_client.post("/api/voice-log/parse", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["slot"] == "Lunch"
    item_names = [i["name"].lower() for i in data["items"]]
    assert any("biryani" in name for name in item_names)
    assert data["total_protein"] >= 20


def test_confirm_voice_meal(user_client):
    payload = {
        "title": "Idli & Sambar Breakfast",
        "slot": "Breakfast",
        "items": [
            {
                "name": "Idli",
                "quantity_description": "3 pieces",
                "grams": 150.0,
                "kcal": 195,
                "protein": 6.0,
                "carbs": 39.0,
                "fat": 1.2,
                "fiber": 3.0,
            },
            {
                "name": "Vegetable Sambar",
                "quantity_description": "1 cup",
                "grams": 100.0,
                "kcal": 75,
                "protein": 3.0,
                "carbs": 11.0,
                "fat": 2.1,
                "fiber": 2.5,
            },
        ],
        "kcal": 270,
        "protein": 9.0,
        "carbs": 50.0,
        "fat": 3.3,
        "fiber": 5.5,
    }

    res = user_client.post("/api/voice-log/confirm", json=payload)
    assert res.status_code == 201
    logged = res.json()
    assert logged["slot"] == "Breakfast"
    assert "Idli" in logged["title"]
    assert logged["kcal"] == 270

    # Verify reflected in today's diary
    today_res = user_client.get("/api/meals/today")
    assert today_res.status_code == 200
    day_log = today_res.json()
    assert any(m["id"] == logged["id"] for m in day_log["meals"])
    assert day_log["totals"]["kcal"] >= 270
