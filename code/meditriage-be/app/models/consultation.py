"""
Models for Consultation Chat Room feature.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base

class RoomStatus(enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class MessageType(enum.Enum):
    TEXT = "TEXT"
    SYSTEM = "SYSTEM"
    ATTACHMENT = "ATTACHMENT"

class ConsultationRoom(Base):
    __tablename__ = "consultation_rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("medical_encounters.id"), nullable=False, index=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(SQLEnum(RoomStatus), nullable=False, default=RoomStatus.OPEN)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    encounter = relationship("MedicalEncounter")
    creator = relationship("User", foreign_keys=[created_by_id])
    memberships = relationship("RoomMembership", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("ConsultationMessage", back_populates="room", cascade="all, delete-orphan")


class RoomMembership(Base):
    __tablename__ = "room_memberships"
    __table_args__ = (
        UniqueConstraint("room_id", "doctor_id", name="uq_room_doctor"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("consultation_rooms.id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    added_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    room = relationship("ConsultationRoom", back_populates="memberships")
    doctor = relationship("User", foreign_keys=[doctor_id])
    added_by = relationship("User", foreign_keys=[added_by_id])


class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("consultation_rooms.id"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    content = Column(Text, nullable=False) # AES-encrypted
    message_type = Column(SQLEnum(MessageType), nullable=False, default=MessageType.TEXT)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    room = relationship("ConsultationRoom", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    attachment = relationship("ConsultationAttachment", back_populates="message", uselist=False, cascade="all, delete-orphan")


class ConsultationAttachment(Base):
    __tablename__ = "consultation_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("consultation_messages.id"), unique=True, nullable=False, index=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("consultation_rooms.id"), nullable=False, index=True)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    original_filename = Column(String(255), nullable=False) # AES-encrypted
    stored_filename = Column(String(255), nullable=False) # Plaintext (UUID-based)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    message = relationship("ConsultationMessage", back_populates="attachment")
    room = relationship("ConsultationRoom")
    uploader = relationship("User", foreign_keys=[uploader_id])
