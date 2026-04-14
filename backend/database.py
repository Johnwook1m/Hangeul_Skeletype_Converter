from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
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


def init_db():
    Base.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
