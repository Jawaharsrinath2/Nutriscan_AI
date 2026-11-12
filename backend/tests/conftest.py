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
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    factory.set_active_mode(None)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    yield


@pytest.fixture
def uploads_dir() -> Path:
    return _TMP / "uploads"
