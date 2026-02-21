"""
Pydantic schemas for clinical data management.
Handles medical encounters, clinical notes, and triage interactions.
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.clinical import EncounterStatus, SenderType


# ==================== Medical Encounter Schemas ====================

class EncounterCreate(BaseModel):
    """Request schema for creating a new medical encounter."""
    patient_id: UUID = Field(..., description="Patient UUID")
    chief_complaint: Optional[str] = Field(None, max_length=500, description="Initial complaint")


class EncounterResponse(BaseModel):
    """Response schema for medical encounter details."""
    id: UUID
    patient_id: UUID
    nurse_id: UUID
    doctor_id: Optional[UUID]
    status: EncounterStatus
    is_urgent: bool
    chief_complaint: Optional[str]
    encounter_timestamp: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EncounterUpdateRequest(BaseModel):
    """Request schema for updating encounter urgency (nurse toggle)."""
    is_urgent: Optional[bool] = Field(None, description="Mark encounter as urgent")


# ==================== Triage Interaction Schemas ====================

class MessageResponse(BaseModel):
    """Response schema for triage interaction/chat message."""
    id: UUID
    encounter_id: UUID
    sender_type: SenderType
    message_content: str
    timestamp: datetime

    class Config:
        from_attributes = True


# ==================== Clinical Note Schemas ====================

class ClinicalNoteCreate(BaseModel):
    """Request schema for creating a clinical note (AI draft)."""
    encounter_id: UUID
    subjective: str = Field(..., description="Subjective: Patient's story")
    objective: str = Field(..., description="Objective: Vitals/Observations")
    assessment: str = Field(..., description="Assessment: AI draft diagnosis")
    plan: str = Field(..., description="Plan: Treatment recommendations")


class ClinicalNoteUpdate(BaseModel):
    """Request schema for updating clinical note (Doctor edits)."""
    subjective: Optional[str] = Field(None, description="Updated subjective section")
    objective: Optional[str] = Field(None, description="Updated objective section")
    assessment: Optional[str] = Field(None, description="Updated assessment section")
    plan: Optional[str] = Field(None, description="Updated plan section")
    is_finalized: Optional[bool] = Field(None, description="Mark note as finalized")


class ClinicalNoteResponse(BaseModel):
    """Response schema for clinical note."""
    id: UUID
    encounter_id: UUID
    subjective: Optional[str]
    objective: Optional[str]
    assessment: Optional[str]
    plan: Optional[str]
    is_finalized: bool
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
