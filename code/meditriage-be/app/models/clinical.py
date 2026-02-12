"""
Clinical models for medical encounters, triage interactions, and clinical notes.
Contains MedicalEncounter, TriageInteraction, and ClinicalNote models.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base


class EncounterStatus(enum.Enum):
    """Status of a medical encounter"""
    TRIAGE_IN_PROGRESS = "TRIAGE_IN_PROGRESS"
    AWAITING_REVIEW = "AWAITING_REVIEW"
    COMPLETED = "COMPLETED"


class RiskScore(enum.Enum):
    """Risk assessment score from triage algorithm"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class SenderType(enum.Enum):
    """Type of sender in triage interaction"""
    AI = "AI"
    PATIENT = "PATIENT"
    NURSE = "NURSE"


class MedicalEncounter(Base):
    """
    Medical Encounter representing a single triage visit/session.
    Links patient, nurse (conducting triage), and doctor (reviewing).
    """
    __tablename__ = "medical_encounters"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    nurse_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # Encounter Details
    status = Column(SQLEnum(EncounterStatus), nullable=False, default=EncounterStatus.TRIAGE_IN_PROGRESS)
    risk_score = Column(SQLEnum(RiskScore), nullable=True)
    chief_complaint = Column(String(500), nullable=True)
    encounter_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Audit Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="encounters")
    nurse = relationship("User", foreign_keys=[nurse_id], back_populates="nurse_encounters")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_encounters")
    interactions = relationship("TriageInteraction", back_populates="encounter", cascade="all, delete-orphan")
    clinical_note = relationship("ClinicalNote", back_populates="encounter", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MedicalEncounter(id={self.id}, patient_id={self.patient_id}, status={self.status.value})>"


class TriageInteraction(Base):
    """
    Triage Interaction storing raw interview/chat data.
    Records AI, patient, and nurse messages during triage.
    """
    __tablename__ = "triage_interactions"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Key
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("medical_encounters.id"), nullable=False, index=True)

    # Interaction Details
    sender_type = Column(SQLEnum(SenderType), nullable=False)
    message_content = Column(Text, nullable=False)

    # Future-proofing for voice
    audio_url = Column(String(500), nullable=True)
    transcription_confidence = Column(Float, nullable=True)

    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    encounter = relationship("MedicalEncounter", back_populates="interactions")

    def __repr__(self):
        return f"<TriageInteraction(id={self.id}, encounter_id={self.encounter_id}, sender={self.sender_type.value})>"


class ClinicalNote(Base):
    """
    Clinical Note storing structured SOAP note output.
    AI generates draft, doctor edits and finalizes.
    """
    __tablename__ = "clinical_notes"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Key (One-to-One with MedicalEncounter)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("medical_encounters.id"), unique=True, nullable=False, index=True)

    # SOAP Note Structure
    subjective = Column(Text, nullable=True)  # Patient's story
    objective = Column(Text, nullable=True)   # Vitals/Observations
    assessment = Column(Text, nullable=True)  # AI draft / Doctor diagnosis
    plan = Column(Text, nullable=True)        # Treatment next steps

    # Version Control & Lock
    is_finalized = Column(Boolean, default=False, nullable=False)
    version = Column(Integer, default=1, nullable=False)

    # Audit Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    encounter = relationship("MedicalEncounter", back_populates="clinical_note")

    def __repr__(self):
        return f"<ClinicalNote(id={self.id}, encounter_id={self.encounter_id}, version={self.version}, finalized={self.is_finalized})>"
