from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,        # Reconnects if DB connection drops
    pool_size=10,              # Max persistent connections
    max_overflow=20,           # Extra connections under load
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency: provides a DB session per request, closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
