import os
import tempfile
from pathlib import Path

# Point storage at a throwaway folder and disable real detectors *before* the app reads settings.
_TMP = Path(tempfile.mkdtemp(prefix="nutriscan-test-"))
os.environ.update(
    DB_PATH=str(_TMP / "test.db"),
    UPLOADS_DIR=str(_TMP / "uploads"),
    DETECTOR="none",
    GEMINI_API_KEY="",
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.models import Base  # noqa: E402
from app.db.session import get_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services.food_repository import FoodRepository, get_food_repository  # noqa: E402
from app.vision import factory  # noqa: E402


@pytest.fixture(scope="session")
def repo() -> FoodRepository:
    return get_food_repository()


@pytest.fixture
def client():
    """Anonymous client."""
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    factory.set_active_mode(None)


def sign_up(client: TestClient, name: str) -> TestClient:
    """A fresh client logged in as a new user called `name`. Each test gets a clean DB, so no clashes."""
    response = client.post(
        "/api/auth/signup", json={"email": f"{name}@example.com", "username": name, "password": "password123"}
    )
    assert response.status_code == 201, response.text
    logged_in = TestClient(app)
    logged_in.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return logged_in


@pytest.fixture
def user_client(client):
    """Client signed in as a user; the per-user routes need this."""
    return sign_up(client, "tester")


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    yield


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Clear the in-memory login/signup rate limiter so sign-ups in one test can't 429 the next."""
    from app.services import auth_service

    with auth_service._rate_lock:
        auth_service._rate_buckets.clear()
    yield
    with auth_service._rate_lock:
        auth_service._rate_buckets.clear()


@pytest.fixture
def uploads_dir() -> Path:
    return _TMP / "uploads"
