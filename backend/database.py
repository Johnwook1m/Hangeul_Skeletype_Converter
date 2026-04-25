from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, text
from sqlalchemy.orm import DeclarativeBase, Session
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "archives.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


class Base(DeclarativeBase):
    pass


class Archive(Base):
    __tablename__ = "archives"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    author_name         = Column(String(120), nullable=False)
    font_name           = Column(String(255), nullable=False)
    features_used       = Column(Text, nullable=False)   # JSON array string
    settings_snapshot   = Column(Text, nullable=False)   # JSON object string
    preview_image_path  = Column(String(512), nullable=False)
    created_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    google_drive_url    = Column(String(512), nullable=True)   # populated after Google sync


class Subscriber(Base):
    __tablename__ = "subscribers"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    email      = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(engine)
    _migrate()


def _migrate():
    """Add missing columns to existing tables. Safe to run on every startup."""
    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(archives)")).fetchall()
        existing_columns = {row[1] for row in rows}
        if "google_drive_url" not in existing_columns:
            conn.execute(text("ALTER TABLE archives ADD COLUMN google_drive_url VARCHAR(512)"))
            conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
