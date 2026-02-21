"""
Models package initialization.
Exports all models for easy importing and Alembic discovery.
"""
from .base import Base
from .auth import Auth
from .user import User, UserRole
from .patient import Patient
from .clinical import (
    MedicalEncounter,
    TriageInteraction,
    ClinicalNote,
    EncounterStatus,
    SenderType
)

__all__ = [
    "Base",
    "Auth",
    "User",
    "UserRole",
    "Patient",
    "MedicalEncounter",
    "TriageInteraction",
    "ClinicalNote",
    "EncounterStatus",
    "SenderType",
]
