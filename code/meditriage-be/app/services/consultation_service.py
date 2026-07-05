"""
Business logic and compliance enforcement for Consultation Chat Room feature.
Handles encryption boundary: all data passed down to repo is encrypted,
all data returned to controllers is decrypted.
"""
from typing import List, Tuple, Optional
from uuid import UUID, uuid4
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.models.user import User, UserRole
from app.models.consultation import ConsultationRoom, RoomStatus, MessageType, ConsultationMessage, ConsultationAttachment, RoomMembership
from app.models.clinical import EncounterStatus
from app.repositories import consultation_repo, encounter_repo
from app.services import auth_service
from app.schemas.consultation import MessageResponse, AttachmentResponse
from app.services import encryption_service
from app.core.config import get_settings

settings = get_settings()

def _build_message_response(message: ConsultationMessage) -> MessageResponse:
    """Helper to decrypt message content and build response schema."""
    decrypted_content = encryption_service.decrypt(message.content)
    
    attachment_resp = None
    if message.attachment:
        decrypted_filename = encryption_service.decrypt(message.attachment.original_filename)
        attachment_resp = AttachmentResponse(
            id=message.attachment.id,
            original_filename=decrypted_filename,
            mime_type=message.attachment.mime_type,
            file_size_bytes=message.attachment.file_size_bytes,
            download_url=f"{settings.API_V1_STR}/consultations/rooms/{message.room_id}/attachments/{message.attachment.id}"
        )

    return MessageResponse(
        id=message.id,
        room_id=message.room_id,
        sender_id=message.sender_id,
        sender_name=message.sender.full_name if message.sender else None,
        content=decrypted_content,
        message_type=message.message_type,
        created_at=message.created_at,
        attachment=attachment_resp
    )

def _save_system_message(db: Session, room_id: UUID, content: str) -> MessageResponse:
    """Helper to save and encrypt a system message."""
    encrypted_content = encryption_service.encrypt(content)
    msg = consultation_repo.save_message(
        db=db,
        message_data={
            "room_id": room_id,
            "sender_id": None,
            "content": encrypted_content,
            "message_type": MessageType.SYSTEM
        }
    )
    return _build_message_response(msg)

def create_room(db: Session, creator: User, encounter_id: UUID, title: str, doctor_ids: List[UUID]) -> ConsultationRoom:
    if creator.role != UserRole.DOCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors can create consultation rooms.")
    
    encounter = encounter_repo.get_encounter_by_id(db, encounter_id)
    if not encounter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical encounter not found.")


    # Validate invited doctors
    unique_doctor_ids = set(doctor_ids)
    unique_doctor_ids.add(creator.id)
    
    for doc_id in unique_doctor_ids:
        doc = auth_service.get_user_by_id(doc_id, db)
        if not doc or doc.role != UserRole.DOCTOR:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {doc_id} is not a valid doctor.")

    # Create Room
    room = consultation_repo.create_room(db, {
        "encounter_id": encounter_id,
        "created_by_id": creator.id,
        "title": title
    })

    # Add Members
    for doc_id in unique_doctor_ids:
        consultation_repo.add_member(db, {
            "room_id": room.id,
            "doctor_id": doc_id,
            "added_by_id": creator.id if doc_id != creator.id else None
        })

    # System Message
    _save_system_message(db, room.id, f"Room created by {creator.full_name}")

    return room

def add_member(db: Session, requester: User, room_id: UUID, doctor_id: UUID) -> RoomMembership:
    room = consultation_repo.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
    if room.status != RoomStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is closed.")
    
    requester_membership = consultation_repo.get_membership(db, room_id, requester.id)
    if not requester_membership or not requester_membership.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be an active member to add others.")
    
    doc = auth_service.get_user_by_id(doctor_id, db)
    if not doc or doc.role != UserRole.DOCTOR:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a valid doctor.")

    existing_membership = consultation_repo.get_membership(db, room_id, doctor_id)
    if existing_membership:
        if existing_membership.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor is already an active member.")
        else:
            # Reactivate
            existing_membership.is_active = True
            existing_membership.added_by_id = requester.id
            db.commit()
            membership = existing_membership
    else:
        membership = consultation_repo.add_member(db, {
            "room_id": room_id,
            "doctor_id": doctor_id,
            "added_by_id": requester.id
        })

    _save_system_message(db, room_id, f"{doc.full_name} was added by {requester.full_name}")
    return membership

def remove_member(db: Session, requester: User, room_id: UUID, doctor_id: UUID) -> RoomMembership:
    room = consultation_repo.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
    if room.status != RoomStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is closed.")
    if room.created_by_id != requester.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the room creator can remove members.")
    if requester.id == doctor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Creator cannot be removed. Close the room instead.")

    membership = consultation_repo.get_membership(db, room_id, doctor_id)
    if not membership or not membership.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor is not an active member.")

    membership = consultation_repo.remove_member(db, membership)
    doc = auth_service.get_user_by_id(doctor_id, db)
    
    _save_system_message(db, room_id, f"{doc.full_name} was removed by {requester.full_name}")
    return membership

def close_room(db: Session, requester: User, room_id: UUID) -> ConsultationRoom:
    room = consultation_repo.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
    if room.status != RoomStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is already closed.")
    if room.created_by_id != requester.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the room creator can close it.")

    room = consultation_repo.close_room(db, room, datetime.utcnow())
    _save_system_message(db, room_id, f"Room closed by {requester.full_name}")
    return room

def send_message(db: Session, sender: User, room_id: UUID, content: str) -> MessageResponse:
    room = consultation_repo.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
    if room.status != RoomStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is closed.")
    
    membership = consultation_repo.get_membership(db, room_id, sender.id)
    if not membership or not membership.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be an active member to send messages.")

    encrypted_content = encryption_service.encrypt(content)
    msg = consultation_repo.save_message(db, {
        "room_id": room_id,
        "sender_id": sender.id,
        "content": encrypted_content,
        "message_type": MessageType.TEXT
    })

    return _build_message_response(msg)

async def upload_attachment(db: Session, uploader: User, room_id: UUID, file: UploadFile) -> Tuple[MessageResponse, ConsultationAttachment]:
    room = consultation_repo.get_room_by_id(db, room_id)
    if not room or room.status != RoomStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is not open.")
    
    membership = consultation_repo.get_membership(db, room_id, uploader.id)
    if not membership or not membership.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an active member.")

    ALLOWED_MIMES = ["image/jpeg", "image/png", "image/gif", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported file type.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 10MB limit.")

    # Encrypt bytes
    encrypted_bytes = encryption_service.encrypt_file(file_bytes)
    
    # Save to disk
    stored_filename = f"{uuid4().hex}.enc"
    room_dir = os.path.join(settings.CONSULTATION_MEDIA_PATH, str(room_id))
    os.makedirs(room_dir, exist_ok=True)
    file_path = os.path.join(room_dir, stored_filename)
    
    with open(file_path, 'wb') as out_file:
        out_file.write(encrypted_bytes)

    # Save to DB
    encrypted_original_name = encryption_service.encrypt(file.filename)
    encrypted_placeholder = encryption_service.encrypt("[ATTACHMENT]")
    
    msg = consultation_repo.save_message(db, {
        "room_id": room_id,
        "sender_id": uploader.id,
        "content": encrypted_placeholder,
        "message_type": MessageType.ATTACHMENT
    })

    attachment = consultation_repo.save_attachment(db, {
        "message_id": msg.id,
        "room_id": room_id,
        "uploader_id": uploader.id,
        "original_filename": encrypted_original_name,
        "stored_filename": stored_filename,
        "mime_type": file.content_type,
        "file_size_bytes": len(file_bytes)
    })

    # Reload message to include attachment
    msg = consultation_repo.get_messages(db, room_id, limit=1, before_id=None)[0]
    return _build_message_response(msg), attachment

def get_messages(db: Session, requester: User, room_id: UUID, limit: int = 50, before_id: Optional[UUID] = None) -> List[MessageResponse]:
    membership = consultation_repo.get_membership(db, room_id, requester.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this room.")

    messages = consultation_repo.get_messages(db, room_id, limit, before_id)
    return [_build_message_response(msg) for msg in messages]

def download_attachment(db: Session, requester: User, room_id: UUID, attachment_id: UUID) -> Tuple[bytes, str, str]:
    membership = consultation_repo.get_membership(db, room_id, requester.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member.")

    attachment = consultation_repo.get_attachment_by_id(db, attachment_id)
    if not attachment or attachment.room_id != room_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")

    file_path = os.path.join(settings.CONSULTATION_MEDIA_PATH, str(room_id), attachment.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk.")

    with open(file_path, "rb") as f:
        encrypted_bytes = f.read()

    decrypted_bytes = encryption_service.decrypt_file(encrypted_bytes)
    decrypted_filename = encryption_service.decrypt(attachment.original_filename)
    
    return decrypted_bytes, decrypted_filename, attachment.mime_type
