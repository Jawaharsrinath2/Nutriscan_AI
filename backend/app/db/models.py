from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(256), nullable=True)  # null for OAuth-only users
    provider: Mapped[str] = mapped_column(String(20), default="local")  # "local" or "google"
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Integer, default=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    slot: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(300))
    image_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    items: Mapped[list] = mapped_column(JSON)  # [{"key": ..., "grams": ...}]
    kcal: Mapped[int] = mapped_column(Integer)
    protein: Mapped[float] = mapped_column(Float)
    carbs: Mapped[float] = mapped_column(Float)
    fat: Mapped[float] = mapped_column(Float)
    fiber: Mapped[float] = mapped_column(Float)


class WaterLog(Base):
    __tablename__ = "water_logs"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    glasses: Mapped[int] = mapped_column(Integer, default=0)


class DailyGoals(Base):
    """Single-row table: the user's active daily targets."""

    __tablename__ = "daily_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_key: Mapped[str] = mapped_column(String(32))
    kcal: Mapped[int] = mapped_column(Integer)
    protein: Mapped[int] = mapped_column(Integer)
    carbs: Mapped[int] = mapped_column(Integer)
    fat: Mapped[int] = mapped_column(Integer)


class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    code: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_used: Mapped[bool] = mapped_column(Integer, default=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
