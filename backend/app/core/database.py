"""
Database connection setup, supporting SQLite (development) and PostgreSQL (production).
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy ORM base class."""
    pass


# Engine and session factory (lazy initialization)
_engine = None
_async_session_factory = None


def get_engine():
    """Get database engine (lazy initialization)."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            echo=False,  # Set to True to see SQL statements
            future=True,
        )
    return _engine


def get_session_factory():
    """Get session factory (lazy initialization)."""
    global _async_session_factory
    if _async_session_factory is None:
        engine = get_engine()
        _async_session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency injection function for session retrieval.

    Usage:
    ```python
    @router.get("/example")
    async def example(session: AsyncSession = Depends(get_db_session)):
        ...
    ```
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """
    Initialize database (create all tables).

    Called at application startup.
    """
    from app.game.models import PlayerModel, NpcStateModel, QuestProgressModel  # noqa: F401

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connection."""
    global _engine, _async_session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _async_session_factory = None
