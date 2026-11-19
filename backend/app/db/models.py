from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, Integer, String, Text
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
    role: Mapped[str] = mapped_column(String(20), default="user", index=True)  # "user" or "admin"
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    theme: Mapped[str] = mapped_column(String(30), default="emerald")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
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

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    glasses: Mapped[int] = mapped_column(Integer, default=0)


class DailyGoals(Base):
    """One row per user: their active daily targets."""

    __tablename__ = "daily_goals"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_key: Mapped[str] = mapped_column(String(32))
    kcal: Mapped[int] = mapped_column(Integer)
    protein: Mapped[int] = mapped_column(Integer)
    carbs: Mapped[int] = mapped_column(Integer)
    fat: Mapped[int] = mapped_column(Integer)


class UserProfile(Base):
    """Onboarding answers; one row per user. Targets are derived from these (see target_calculator)."""

    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sex: Mapped[str] = mapped_column(String(10))
    age: Mapped[int] = mapped_column(Integer)
    height_cm: Mapped[float] = mapped_column(Float)
    weight_kg: Mapped[float] = mapped_column(Float)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    goal: Mapped[str] = mapped_column(String(16))  # lose | gain | strength
    activity: Mapped[str] = mapped_column(String(16))  # desk | light | active | very_active
    gym: Mapped[bool] = mapped_column(Boolean, default=False)
    gym_days: Mapped[int] = mapped_column(Integer, default=0)
    experience: Mapped[str | None] = mapped_column(String(16), nullable=True)  # beginner | intermediate | advanced
    home_workouts: Mapped[bool] = mapped_column(Boolean, default=False)
    diet_pref: Mapped[str] = mapped_column(String(16))  # veg | eggetarian | nonveg
    avoid: Mapped[list] = mapped_column(JSON, default=list)
    kcal_adjust: Mapped[int] = mapped_column(Integer, default=0)  # the ±200 nudge from the "Your numbers" step
    onboarded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiPlan(Base):
    """A generated diet or workout plan. Old versions are kept; the newest per kind is shown."""

    __tablename__ = "ai_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), index=True)  # diet | workout
    source: Mapped[str] = mapped_column(String(16))  # ai | default
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content: Mapped[dict] = mapped_column(JSON)
    inputs: Mapped[dict] = mapped_column(JSON)  # weight/targets the plan was written for (staleness check)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    subject: Mapped[str] = mapped_column(String(255))
    html_content: Mapped[str] = mapped_column(Text)
    text_content: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    variables: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
