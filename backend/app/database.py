import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging

logger = logging.getLogger("project_rescue_db")

# Default to Postgres in production / Docker Compose, or fallback to SQLite for lightweight test environments
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg://rescue_user:rescue_secure_pass_2026@localhost:5432/rescue_field_db"
)

# SQLite fallback support if postgres is unavailable in current local context
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """FastAPI database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
