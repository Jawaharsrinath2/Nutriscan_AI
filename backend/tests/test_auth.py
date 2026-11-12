"""Tests for authentication: signup, login, attempt limits, rate limits, me, and OAuth."""

from unittest.mock import patch

import pytest
from app.services import auth_service


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Clear in-memory rate limiting between tests."""
    with auth_service._rate_lock:
        auth_service._rate_buckets.clear()
    yield
    with auth_service._rate_lock:
        auth_service._rate_buckets.clear()


def test_auth_config(client):
    res = client.get("/api/auth/config")
    assert res.status_code == 200
    assert "google_client_id" in res.json()


def test_signup_success(client):
    res = client.post(
        "/api/auth/signup",
        json={"email": "alice@example.com", "username": "alice", "password": "password123"},
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["username"] == "alice"
    assert data["user"]["provider"] == "local"


def test_signup_duplicate_email_or_username(client):
    client.post(
        "/api/auth/signup",
        json={"email": "bob@example.com", "username": "bob_user", "password": "password123"},
    )

    # Same email
    res1 = client.post(
        "/api/auth/signup",
        json={"email": "bob@example.com", "username": "bob2", "password": "password123"},
    )
    assert res1.status_code == 409
    assert "email" in res1.json()["detail"]

    # Same username
    res2 = client.post(
        "/api/auth/signup",
        json={"email": "other@example.com", "username": "bob_user", "password": "password123"},
    )
    assert res2.status_code == 409
    assert "username" in res2.json()["detail"]


def test_signup_validation(client):
    # Short password
    res = client.post(
        "/api/auth/signup",
        json={"email": "short@example.com", "username": "valid_user", "password": "123"},
    )
    assert res.status_code == 422

    # Invalid characters in username
    res2 = client.post(
        "/api/auth/signup",
        json={"email": "baduser@example.com", "username": "bad user!", "password": "password123"},
    )
    assert res2.status_code == 422


def test_login_success(client):
    client.post(
        "/api/auth/signup",
        json={"email": "carol@example.com", "username": "carol", "password": "mypassword123"},
    )

    res = client.post(
        "/api/auth/login",
        json={"email": "carol@example.com", "password": "mypassword123"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["user"]["username"] == "carol"


def test_login_invalid_password(client):
    client.post(
        "/api/auth/signup",
        json={"email": "dave@example.com", "username": "dave", "password": "correct_pass"},
    )

    res = client.post(
        "/api/auth/login",
        json={"email": "dave@example.com", "password": "wrong_password"},
    )
    assert res.status_code == 401
    assert "attempt(s) remaining" in res.json()["detail"]


def test_login_attempt_limits_lockout(client):
    client.post(
        "/api/auth/signup",
        json={"email": "eve@example.com", "username": "eve", "password": "securepassword"},
    )

    # 4 bad attempts
    for i in range(4):
        res = client.post(
            "/api/auth/login",
            json={"email": "eve@example.com", "password": f"wrong_{i}"},
        )
        assert res.status_code == 401
        assert "remaining" in res.json()["detail"]

    # 5th bad attempt -> lockout
    res5 = client.post(
        "/api/auth/login",
        json={"email": "eve@example.com", "password": "wrong_5"},
    )
    assert res5.status_code == 401
    assert "Account is now locked" in res5.json()["detail"]

    # 6th attempt (even with CORRECT password) -> blocked with 423
    res6 = client.post(
        "/api/auth/login",
        json={"email": "eve@example.com", "password": "securepassword"},
    )
    assert res6.status_code == 423
    assert "Account temporarily locked" in res6.json()["detail"]


def test_successful_login_resets_failed_attempts(client):
    client.post(
        "/api/auth/signup",
        json={"email": "frank@example.com", "username": "frank", "password": "password123"},
    )

    # 2 failed attempts
    client.post("/api/auth/login", json={"email": "frank@example.com", "password": "wrong"})
    client.post("/api/auth/login", json={"email": "frank@example.com", "password": "wrong"})

    # 1 successful login
    res = client.post("/api/auth/login", json={"email": "frank@example.com", "password": "password123"})
    assert res.status_code == 200

    # Another failed attempt should show 4 attempts remaining (not 2)
    bad_res = client.post("/api/auth/login", json={"email": "frank@example.com", "password": "wrong"})
    assert "4 attempt(s) remaining" in bad_res.json()["detail"]


def test_rate_limiting(client):
    # Perform requests up to limit
    for _ in range(auth_service.MAX_REQUESTS):
        res = client.post("/api/auth/login", json={"email": "unknown@example.com", "password": "pass"})
        assert res.status_code == 401

    # Next request triggers 429
    res_limited = client.post("/api/auth/login", json={"email": "unknown@example.com", "password": "pass"})
    assert res_limited.status_code == 429
    assert "Too many requests" in res_limited.json()["detail"]


def test_current_user_me(client):
    signup_res = client.post(
        "/api/auth/signup",
        json={"email": "grace@example.com", "username": "grace", "password": "password123"},
    )
    token = signup_res.json()["access_token"]

    # Valid token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "grace@example.com"
    assert me_res.json()["username"] == "grace"

    # Missing token
    assert client.get("/api/auth/me").status_code == 401

    # Invalid token
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer badtoken"}).status_code == 401


def test_google_auth_flow(client):
    from unittest.mock import AsyncMock

    fake_payload = {
        "email": "googleuser@gmail.com",
        "name": "Google User",
        "picture": "https://lh3.googleusercontent.com/photo.jpg",
        "sub": "google-sub-12345",
    }

    with patch("app.api.routes.auth.verify_google_token", new_callable=AsyncMock, return_value=fake_payload):
        res = client.post("/api/auth/google", json={"credential": "fake-google-jwt-credential"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["email"] == "googleuser@gmail.com"
        assert data["user"]["provider"] == "google"
        assert data["user"]["avatar_url"] == "https://lh3.googleusercontent.com/photo.jpg"
        assert "access_token" in data

        # Submitting again with same Google account logs in without duplicate error
        res2 = client.post("/api/auth/google", json={"credential": "fake-google-jwt-credential"})
        assert res2.status_code == 200
        assert res2.json()["user"]["email"] == "googleuser@gmail.com"


def test_welcome_email_sent_on_signup(client):
    from app.services import email_service

    email_service._mock_outbox.clear()
    res = client.post(
        "/api/auth/signup",
        json={"email": "newuser@example.com", "username": "newuser", "password": "password123"},
    )
    assert res.status_code == 201

    # Check mock outbox received welcome email
    mock = email_service.get_latest_mock_email("newuser@example.com")
    assert mock is not None
    assert "Welcome to NutriScan AI" in mock["subject"]
    assert "newuser" in mock["text"]
    assert "newuser" in mock["html"]


def test_forgot_password_and_reset_flow(client):
    from app.services import email_service

    # Create account
    client.post(
        "/api/auth/signup",
        json={"email": "resetme@example.com", "username": "resetme", "password": "oldpassword123"},
    )

    # 1. Request forgot password code
    email_service._mock_outbox.clear()
    forgot_res = client.post("/api/auth/forgot-password", json={"email": "resetme@example.com"})
    assert forgot_res.status_code == 200
    assert "verification code has been sent" in forgot_res.json()["detail"]

    # Verify code was saved and emailed
    mock_email = email_service.get_latest_mock_email("resetme@example.com")
    assert mock_email is not None
    code = email_service.get_latest_dev_code("resetme@example.com")
    assert code is not None
    assert len(code) == 6
    assert code in mock_email["subject"] or code in mock_email["html"]

    # 2. Verify code endpoint
    verify_res = client.post("/api/auth/verify-reset-code", json={"email": "resetme@example.com", "code": code})
    assert verify_res.status_code == 200

    # 3. Reset password with code
    reset_res = client.post(
        "/api/auth/reset-password",
        json={"email": "resetme@example.com", "code": code, "new_password": "brandnewpassword123"},
    )
    assert reset_res.status_code == 200
    assert "Password reset successfully" in reset_res.json()["detail"]

    # 4. Old password fails, new password succeeds!
    fail_login = client.post("/api/auth/login", json={"email": "resetme@example.com", "password": "oldpassword123"})
    assert fail_login.status_code == 401

    success_login = client.post("/api/auth/login", json={"email": "resetme@example.com", "password": "brandnewpassword123"})
    assert success_login.status_code == 200
    assert "access_token" in success_login.json()


def test_verify_code_wrong_attempts(client):
    from app.services import email_service

    client.post(
        "/api/auth/signup",
        json={"email": "victim@example.com", "username": "victim", "password": "password123"},
    )
    client.post("/api/auth/forgot-password", json={"email": "victim@example.com"})

    # Send wrong code 5 times
    for i in range(4):
        bad = client.post("/api/auth/verify-reset-code", json={"email": "victim@example.com", "code": f"00000{i}"})
        assert bad.status_code == 400
        assert "attempt(s) remaining" in bad.json()["detail"]

    # 5th attempt exhausts code
    bad5 = client.post("/api/auth/verify-reset-code", json={"email": "victim@example.com", "code": "999999"})
    assert bad5.status_code == 400


def test_dynamic_email_template_rendering():
    from app.services.email_service import load_email_template

    # Test variable rendering
    subject, html, text = load_email_template("welcome", {"username": "Karthik", "email": "karthik@example.com"})
    assert "Karthik" in subject
    assert "Karthik" in html
    assert "Karthik" in text
    assert "NutriScan AI" in html

    sub2, html2, text2 = load_email_template("password_reset", {"username": "Karthik", "code": "123456", "expiry_minutes": 15})
    assert "123456" in sub2
    assert "123456" in html2
    assert "123456" in text2


# ── security: dev code helper and Google token checks ───────────────────────


def _with_smtp(monkeypatch, host):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "smtp_host", host)


def test_dev_code_helper_only_exists_without_smtp(client, monkeypatch):
    from app.services import email_service

    _with_smtp(monkeypatch, "")
    email_service.send_password_reset_email("a@b.com", "a", "123456")
    assert client.get("/api/auth/dev/latest-code", params={"email": "a@b.com"}).json()["code"] == "123456"

    _with_smtp(monkeypatch, "smtp.example.com")
    monkeypatch.setattr(email_service, "send_email", lambda *a, **k: True)
    email_service.send_password_reset_email("c@d.com", "c", "654321")
    assert client.get("/api/auth/dev/latest-code", params={"email": "c@d.com"}).status_code == 404
    assert email_service.get_latest_dev_code("c@d.com") is None


GOOD_GOOGLE = {"aud": "client-1", "iss": "https://accounts.google.com", "email": "g@gmail.com", "email_verified": "true"}


def test_google_payload_accepted_when_fully_valid():
    assert auth_service.check_google_payload(GOOD_GOOGLE, "client-1") is GOOD_GOOGLE


@pytest.mark.parametrize(
    "client_id, changes, code",
    [
        ("", {}, 503),  # Google sign-in not configured → refuse, never skip the audience check
        ("client-1", {"aud": "other-app"}, 401),
        ("client-1", {"iss": "https://evil.example"}, 401),
        ("client-1", {"email_verified": "false"}, 401),
        ("client-1", {"email": ""}, 401),
    ],
)
def test_google_payload_rejected(client_id, changes, code):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as err:
        auth_service.check_google_payload({**GOOD_GOOGLE, **changes}, client_id)
    assert err.value.status_code == code
