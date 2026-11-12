from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.db.models import Base


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    db_file = settings.resolve(settings.db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})


@lru_cache
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(get_engine())


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    with _session_factory()() as session:
        yield session
