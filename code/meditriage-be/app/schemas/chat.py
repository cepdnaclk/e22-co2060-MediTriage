"""
Pydantic schemas for triage chat request/response.
Used for input validation and API response serialization.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class ChatMessageRequest(BaseModel):
    """Request body for sending a triage interview message."""
    encounter_id: UUID = Field(..., description="ID of the active medical encounter")
    message: str = Field(..., min_length=1, description="Patient's response (entered by nurse)")


class SOAPNoteSchema(BaseModel):
    """Structured SOAP note output."""
    subjective: str = Field(default="", description="Patient's reported symptoms and history")
    objective: str = Field(default="", description="Observable findings and vitals")
    assessment: str = Field(default="", description="Clinical observations (NOT a diagnosis)")
    plan: str = Field(default="", description="Recommended next steps")
    risk_score: str = Field(default="MEDIUM", description="HIGH, MEDIUM, or LOW")


class ChatMessageResponse(BaseModel):
    """Response body for a triage interview message."""
    ai_message: str = Field(..., description="AI's next question or completion message")
    is_interview_complete: bool = Field(default=False, description="Whether the interview is finished")
    soap_note: Optional[SOAPNoteSchema] = Field(default=None, description="SOAP note if interview is complete")


class StartInterviewRequest(BaseModel):
    """Request body to start a new triage interview."""
    encounter_id: UUID = Field(..., description="ID of the medical encounter to start triage for")


class StartInterviewResponse(BaseModel):
    """Response body for starting a triage interview."""
    encounter_id: UUID
    ai_message: str = Field(..., description="AI's initial greeting question")
    status: str = Field(default="TRIAGE_IN_PROGRESS")
