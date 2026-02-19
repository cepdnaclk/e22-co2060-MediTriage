"""
Patient model for patient identity management.
Contains demographics and contact information.
Clinical data is stored separately in medical encounters.
"""
import uuid
import enum
from datetime import datetime, date
from sqlalchemy import Column, String, Date, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base


class Gender(str, enum.Enum):
    """Administrative gender options."""
    MALE = "MALE"
    FEMALE = "FEMALE"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class Patient(Base):
    """
    Patient model representing individuals receiving care.
    Contains only identity and demographic information.
    """
    __tablename__ = "patients"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identity (PII - marked for future encryption)
    national_id = Column(String(20), unique=True, nullable=False, index=True)

    # Demographics
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(Gender), nullable=True)

    # Contact
    contact_number = Column(String(20), nullable=True)

    # Audit Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    # One patient can have many encounters
    encounters = relationship("MedicalEncounter", back_populates="patient")

    def __repr__(self):
        return f"<Patient(id={self.id}, name={self.first_name} {self.last_name})>"
