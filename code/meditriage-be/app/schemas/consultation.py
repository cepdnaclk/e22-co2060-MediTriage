"""
Pydantic schemas for Consultation Chat Room feature.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.consultation import RoomStatus, MessageType

# --- Request Schemas ---

class CreateRoomRequest(BaseModel):
    encounter_id: UUID
    title: str = Field(..., max_length=255)
    doctor_ids: List[UUID] = Field(default_factory=list, description="Initial members to invite")

class AddMemberRequest(BaseModel):
    doctor_id: UUID

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)

class WebSocketInboundPayload(BaseModel):
    type: str  # e.g., "message"
    content: str = Field(..., min_length=1, max_length=4000)

# --- Response Schemas ---

class MemberResponse(BaseModel):
    doctor_id: UUID
    full_name: str
    license_number: Optional[str] = None
    joined_at: datetime
    is_active: bool

class RoomSummaryResponse(BaseModel):
    id: UUID
    title: str
    status: RoomStatus
    encounter_id: UUID
    created_at: datetime
    member_count: int

class RoomDetailResponse(RoomSummaryResponse):
    created_by: MemberResponse
    members: List[MemberResponse]

class AttachmentResponse(BaseModel):
    id: UUID
    original_filename: str
    mime_type: str
    file_size_bytes: int
    download_url: str

class MessageResponse(BaseModel):
    id: UUID
    room_id: UUID
    sender_id: Optional[UUID]
    sender_name: Optional[str]
    content: str
    message_type: MessageType
    created_at: datetime
    attachment: Optional[AttachmentResponse] = None

class WebSocketOutboundPayload(BaseModel):
    type: str
    data: dict  # Will contain serialized MessageResponse or SystemEventPayload
