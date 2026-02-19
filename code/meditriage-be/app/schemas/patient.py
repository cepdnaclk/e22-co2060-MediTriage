"""
Pydantic schemas for patient management.
Handles patient creation, updates, search, and responses.
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from app.models.patient import Gender


class PatientCreate(BaseModel):
    """Request schema for creating a new patient."""
    national_id: str = Field(..., min_length=9, max_length=20, description="National ID (NIC)")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    date_of_birth: date = Field(..., description="Date of birth")
    gender: Optional[Gender] = Field(None, description="Gender (MALE, FEMALE, OTHER)")
    contact_number: Optional[str] = Field(None, max_length=20, description="Contact phone number")


class PatientUpdate(BaseModel):
    """Request schema for updating patient information."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    contact_number: Optional[str] = Field(None, max_length=20)


class PatientResponse(BaseModel):
    """Response schema for patient data."""
    id: UUID
    national_id: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Optional[Gender]
    contact_number: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientSearchQuery(BaseModel):
    """Query parameters for patient search."""
    nic: Optional[str] = Field(None, description="National ID for exact match")
    name: Optional[str] = Field(None, description="Name for partial match (first or last)")


class EncounterSummary(BaseModel):
    """Summary of a medical encounter for patient history."""
    id: UUID
    encounter_timestamp: datetime
    chief_complaint: Optional[str]
    status: str  # EncounterStatus enum value
    risk_score: Optional[str]  # RiskScore enum value
    nurse_name: str
    doctor_name: Optional[str]

    class Config:
        from_attributes = True
