"""
Database operations for Consultation Chat Room feature.
Purely handles database I/O. Encryption boundary is above this layer (in the service).
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from app.models.consultation import (
    ConsultationRoom,
    RoomMembership,
    ConsultationMessage,
    ConsultationAttachment,
    RoomStatus,
    MessageType
)
from app.models.user import User

def create_room(db: Session, room_data: dict) -> ConsultationRoom:
    room = ConsultationRoom(**room_data)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

def get_room_by_id(db: Session, room_id: UUID) -> Optional[ConsultationRoom]:
    return db.query(ConsultationRoom).filter(ConsultationRoom.id == room_id).first()

def get_rooms_for_doctor(db: Session, doctor_id: UUID) -> List[ConsultationRoom]:
    """Returns all rooms a doctor is currently an active member of."""
    return (
        db.query(ConsultationRoom)
        .join(RoomMembership)
        .filter(RoomMembership.doctor_id == doctor_id, RoomMembership.is_active == True)
        .order_by(ConsultationRoom.created_at.desc())
        .all()
    )

def close_room(db: Session, room: ConsultationRoom, closed_at) -> ConsultationRoom:
    room.status = RoomStatus.CLOSED
    room.closed_at = closed_at
    db.commit()
    db.refresh(room)
    return room

def add_member(db: Session, membership_data: dict) -> RoomMembership:
    membership = RoomMembership(**membership_data)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership

def remove_member(db: Session, membership: RoomMembership) -> RoomMembership:
    membership.is_active = False
    db.commit()
    db.refresh(membership)
    return membership

def get_membership(db: Session, room_id: UUID, doctor_id: UUID) -> Optional[RoomMembership]:
    return (
        db.query(RoomMembership)
        .filter(RoomMembership.room_id == room_id, RoomMembership.doctor_id == doctor_id)
        .first()
    )

def get_active_members(db: Session, room_id: UUID) -> List[RoomMembership]:
    return (
        db.query(RoomMembership)
        .options(joinedload(RoomMembership.doctor))
        .filter(RoomMembership.room_id == room_id, RoomMembership.is_active == True)
        .all()
    )

def save_message(db: Session, message_data: dict) -> ConsultationMessage:
    message = ConsultationMessage(**message_data)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

def get_messages(db: Session, room_id: UUID, limit: int = 50, before_id: Optional[UUID] = None) -> List[ConsultationMessage]:
    """
    Cursor-based pagination for messages.
    Returns messages in descending order (newest first).
    """
    query = (
        db.query(ConsultationMessage)
        .options(joinedload(ConsultationMessage.sender), joinedload(ConsultationMessage.attachment))
        .filter(ConsultationMessage.room_id == room_id)
    )

    if before_id:
        reference_msg = db.query(ConsultationMessage).filter(ConsultationMessage.id == before_id).first()
        if reference_msg:
            query = query.filter(ConsultationMessage.created_at < reference_msg.created_at)

    return query.order_by(ConsultationMessage.created_at.desc()).limit(limit).all()

def save_attachment(db: Session, attachment_data: dict) -> ConsultationAttachment:
    attachment = ConsultationAttachment(**attachment_data)
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment

def get_attachment_by_id(db: Session, attachment_id: UUID) -> Optional[ConsultationAttachment]:
    return db.query(ConsultationAttachment).filter(ConsultationAttachment.id == attachment_id).first()
