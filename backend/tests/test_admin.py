"""Tests for Admin Panel endpoints and authorization."""

import pytest
from fastapi.testclient import TestClient

from app.db.models import User
from app.db.session import _session_factory
from app.main import app


@pytest.fixture
def admin_client(client) -> TestClient:
    """Creates a user with 'admin' role and returns an authenticated TestClient."""
    response = client.post(
        "/api/auth/signup",
        json={"email": "admin_test@example.com", "username": "admin_tester", "password": "password123"},
    )
    assert response.status_code == 201

    # Upgrade to admin directly in DB
    with _session_factory()() as db:
        user = db.query(User).filter(User.email == "admin_test@example.com").first()
        user.role = "admin"
        db.commit()

    admin_c = TestClient(app)
    admin_c.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return admin_c


def test_admin_forbidden_for_normal_user(user_client):
    """Normal user should receive 403 Forbidden on admin routes."""
    assert user_client.get("/api/admin/overview").status_code == 403
    assert user_client.get("/api/admin/users").status_code == 403
    assert user_client.get("/api/admin/emails").status_code == 403
    assert user_client.get("/api/admin/system").status_code == 403


def test_admin_overview_stats(admin_client):
    res = admin_client.get("/api/admin/overview")
    assert res.status_code == 200
    data = res.json()
    assert "total_users" in data
    assert "active_users" in data
    assert "meals_today" in data
    assert len(data["signup_trend"]) == 7
    assert len(data["meal_trend"]) == 7


def test_admin_user_management(admin_client, user_client):
    # List users
    res = admin_client.get("/api/admin/users")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    users = data["users"]
    assert any(u["username"] == "admin_tester" for u in users)

    # Find the normal user
    normal_u = next(u for u in users if u["username"] == "tester")
    normal_id = normal_u["id"]

    # Suspend normal user
    update_res = admin_client.put(f"/api/admin/users/{normal_id}/status", json={"is_active": False})
    assert update_res.status_code == 200

    # Promote normal user to admin
    role_res = admin_client.put(f"/api/admin/users/{normal_id}/role", json={"role": "admin"})
    assert role_res.status_code == 200

    # Admin cannot demote themselves
    admin_u = next(u for u in users if u["username"] == "admin_tester")
    self_demote = admin_client.put(f"/api/admin/users/{admin_u['id']}/role", json={"role": "user"})
    assert self_demote.status_code == 400


def test_admin_email_templates(admin_client):
    # List email templates
    res = admin_client.get("/api/admin/emails")
    assert res.status_code == 200
    templates = res.json()
    assert len(templates) >= 2
    keys = [t["key"] for t in templates]
    assert "welcome" in keys
    assert "password_reset" in keys

    # Get single template
    welcome = admin_client.get("/api/admin/emails/welcome").json()
    assert "Welcome" in welcome["subject"]
    assert "html_content" in welcome

    # Update template with valid Jinja
    new_subject = "Welcome to NutriScan AI VIP, {{ username }}!"
    update_res = admin_client.put(
        "/api/admin/emails/welcome",
        json={
            "subject": new_subject,
            "html_content": "<h1>Hello {{ username }}</h1><p>Enjoy tracking your macros!</p>",
            "text_content": "Hello {{ username }}\nEnjoy tracking your macros!",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["subject"] == new_subject

    # Invalid Jinja syntax throws 400
    bad_syntax = admin_client.put(
        "/api/admin/emails/welcome",
        json={
            "subject": "Bad {{ unclosed",
            "html_content": "<p>Test</p>",
            "text_content": "Test",
        },
    )
    assert bad_syntax.status_code == 400

    # Live preview
    preview = admin_client.post(
        "/api/admin/emails/welcome/preview",
        json={
            "subject": "Custom {{ username }}",
            "html_content": "<p>Hello {{ username }}</p>",
            "sample_context": {"username": "Karthik"},
        },
    )
    assert preview.status_code == 200
    assert "Custom Karthik" in preview.json()["subject"]
    assert "Hello Karthik" in preview.json()["html"]

    # Test send
    test_send = admin_client.post(
        "/api/admin/emails/welcome/test-send",
        json={"recipient_email": "tester@example.com"},
    )
    assert test_send.status_code == 200


def test_admin_user_detail_meals_and_plans(admin_client, user_client):
    # 1. Log a meal for the normal user
    meal_data = {
        "slot": "Breakfast",
        "title": "Steamed Rice",
        "image_url": "/samples/steamed_white_rice.jpg",
        "items": [{"key": "white_rice", "grams": 150}],
    }
    meal_res = user_client.post("/api/meals", json=meal_data)
    assert meal_res.status_code == 201

    # 2. Get list of users to find user_id
    users_res = admin_client.get("/api/admin/users")
    assert users_res.status_code == 200
    normal_u = next(u for u in users_res.json()["users"] if u["username"] == "tester")
    user_id = normal_u["id"]

    # 3. Check Admin User Detail endpoint
    detail_res = admin_client.get(f"/api/admin/users/{user_id}/detail")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["user"]["id"] == user_id
    assert len(detail["logged_days"]) >= 1
    assert detail["logged_days"][0]["meals_count"] >= 1

    # 4. Check Admin User Meals endpoint
    meals_res = admin_client.get(f"/api/admin/users/{user_id}/meals")
    assert meals_res.status_code == 200
    meals_data = meals_res.json()
    assert meals_data["user_id"] == user_id
    assert len(meals_data["meals"]) >= 1
    assert meals_data["meals"][0]["title"] == "Steamed Rice"
    assert meals_data["meals"][0]["slot"] == "Breakfast"
    assert meals_data["meals"][0]["image_url"] == "/samples/steamed_white_rice.jpg"

    # 5. Check Admin User Plans endpoint
    plans_res = admin_client.get(f"/api/admin/users/{user_id}/plans")
    assert plans_res.status_code == 200
    assert "plans" in plans_res.json()

    # 6. Check that normal user cannot access these admin endpoints (403)
    assert user_client.get(f"/api/admin/users/{user_id}/detail").status_code == 403
    assert user_client.get(f"/api/admin/users/{user_id}/meals").status_code == 403
    assert user_client.get(f"/api/admin/users/{user_id}/plans").status_code == 403

