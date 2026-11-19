from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.db.models import Base

# Tables that were per-install before accounts existed. If one still has the old shape it is
# dropped and recreated per-user; the old rows belonged to nobody, so there is nothing to keep.
_PER_USER_TABLES = ("meal_logs", "water_logs", "daily_goals")


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    if settings.database_url:
        url = settings.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        if url.startswith("sqlite"):
            return create_engine(url, connect_args={"check_same_thread": False})
        return create_engine(url, pool_pre_ping=True)
    db_file = settings.resolve(settings.db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})


@lru_cache
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def _drop_pre_account_tables(engine: Engine) -> None:
    inspector = inspect(engine)
    for name in _PER_USER_TABLES:
        if name in inspector.get_table_names():
            columns = {col["name"] for col in inspector.get_columns(name)}
            if "user_id" not in columns:
                Base.metadata.tables[name].drop(engine)


def init_db() -> None:
    engine = get_engine()
    _drop_pre_account_tables(engine)
    Base.metadata.create_all(engine)
    from app.db.admin_setup import ensure_admin_and_templates

    ensure_admin_and_templates(engine)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    with _session_factory()() as session:
        yield session
