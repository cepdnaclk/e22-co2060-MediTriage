"""
Repository functions for MedicalEncounter lookups.
"""
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.clinical import MedicalEncounter


def get_encounter_by_id(db: Session, encounter_id: UUID):
    """Return a MedicalEncounter by primary key, or None if not found."""
    return (
        db.query(MedicalEncounter)
        .filter(MedicalEncounter.id == encounter_id)
        .first()
    )
