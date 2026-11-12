"""Application settings, read from environment variables or backend/.env."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "app" / "data"
FRONTEND_DIST = BACKEND_DIR.parent / "frontend" / "dist"

DetectorMode = Literal["gemini", "yolo", "none"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    detector: DetectorMode = "gemini"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    # Tried in order when the main model times out, is overloaded or rate-limited.
    gemini_fallback_models: list[str] = ["gemini-3.5-flash", "gemini-3-flash-preview"]
    gemini_timeout_s: int = 30  # per model, so a model that never answers can't hang the scan

    yolo_weights: Path = Path("models/food_yolo.pt")
    yolo_min_score: float = 0.35

    db_path: Path = Path("storage/nutriscan.db")
    uploads_dir: Path = Path("storage/uploads")
    max_upload_mb: int = 10

    cors_origins: list[str] = ["http://localhost:5175", "http://127.0.0.1:5175"]

    jwt_secret_key: str = "change-me-in-production-use-a-real-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    google_client_id: str = ""

    # SMTP / Email Settings
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@nutriscan.ai"
    smtp_from_name: str = "NutriScan AI"
    smtp_tls: bool = True
    smtp_ssl: bool = False
    app_url: str = "http://localhost:5175"

    def resolve(self, path: Path) -> Path:
        """Relative paths in settings are relative to the backend folder, not the cwd."""
        return path if path.is_absolute() else BACKEND_DIR / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
