def test_chatbot_starter_prompts(user_client):
    response = user_client.get("/api/chatbot/starter-prompts")
    assert response.status_code == 200
    prompts = response.json()
    assert len(prompts) >= 4
    prompt_ids = [p["id"] for p in prompts]
    assert "remaining_dinner" in prompt_ids
    assert "protein_boost" in prompt_ids


def test_chatbot_message_dinner(user_client):
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Night enna healthy-ah sapdalam machan? Remaining calories konjam iruku",
            }
        ],
        "language": "tanglish",
    }
    response = user_client.post("/api/chatbot/message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert len(data["suggested_followups"]) >= 1


def test_chatbot_message_protein(user_client):
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Protein target reach aaga enna high protein Indian foods recommend pannuva?",
            }
        ],
        "language": "tanglish",
    }
    response = user_client.post("/api/chatbot/message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert any(w in data["reply"].lower() for w in ["egg", "paneer", "chicken", "protein", "curd"])
