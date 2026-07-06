import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles
from app.models.base import Base
# Make sure all models are imported so their tables are registered on Base.metadata
from app.models.user import User
from app.models.auth import Auth
from app.models.patient import Patient
from app.models.clinical import MedicalEncounter, TriageInteraction, ClinicalNote

@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(element, compiler, **kw):
    return "CHAR(36)"

@pytest.fixture(name="db_session")
def fixture_db_session():
    """
    Provides an isolated in-memory SQLite database session for unit testing.
    All tables are created on startup and dropped/cleared on teardown.
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

