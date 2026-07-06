"""
API Endpoints and WebSocket routes for Consultation Chat Room.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from jose import JWTError
import json

from app.api.dependencies import get_current_user, allow_doctor
from app.db.session import get_db
from app.models.user import User
from app.models.consultation import RoomStatus
from app.core.security import decode_access_token
from app.core.connection_manager import manager
from app.repositories import consultation_repo
from app.services import consultation_service, auth_service
from app.schemas.consultation import (
    CreateRoomRequest,
    AddMemberRequest,
    SendMessageRequest,
    RoomSummaryResponse,
    RoomDetailResponse,
    MemberResponse,
    MessageResponse
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/consultations/rooms", tags=["Consultations"])


# --- REST Routes ---

@router.post("", response_model=RoomSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    request: CreateRoomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Create a new consultation room."""
    room = consultation_service.create_room(db, current_user, request.encounter_id, request.title, request.doctor_ids)
    return RoomSummaryResponse(
        id=room.id,
        title=room.title,
        status=room.status,
        encounter_id=room.encounter_id,
        created_at=room.created_at,
        member_count=len(room.memberships)
    )

@router.get("", response_model=List[RoomSummaryResponse])
def get_my_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Get all rooms the current doctor is an active member of."""
    rooms = consultation_repo.get_rooms_for_doctor(db, current_user.id)
    return [
        RoomSummaryResponse(
            id=room.id,
            title=room.title,
            status=room.status,
            encounter_id=room.encounter_id,
            created_at=room.created_at,
            member_count=len(room.memberships)
        )
        for room in rooms
    ]

@router.get("/{room_id}", response_model=RoomDetailResponse)
def get_room_details(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Get detailed information about a room, including its members."""
    membership = consultation_repo.get_membership(db, room_id, current_user.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this room.")
    
    room = consultation_repo.get_room_by_id(db, room_id)
    active_members = consultation_repo.get_active_members(db, room_id)
    
    return RoomDetailResponse(
        id=room.id,
        title=room.title,
        status=room.status,
        encounter_id=room.encounter_id,
        created_at=room.created_at,
        member_count=len(active_members),
        created_by=MemberResponse(
            doctor_id=room.creator.id,
            full_name=room.creator.full_name,
            license_number=room.creator.license_number,
            joined_at=room.created_at,
            is_active=True
        ),
        members=[
            MemberResponse(
                doctor_id=m.doctor.id,
                full_name=m.doctor.full_name,
                license_number=m.doctor.license_number,
                joined_at=m.joined_at,
                is_active=m.is_active
            ) for m in active_members
        ]
    )

@router.post("/{room_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    room_id: UUID,
    request: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Add a new doctor to the room."""
    consultation_service.add_member(db, current_user, room_id, request.doctor_id)
    return {"message": "Member added successfully"}

@router.delete("/{room_id}/members/{doctor_id}")
def remove_member(
    room_id: UUID,
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Remove a doctor from the room (Creator only)."""
    consultation_service.remove_member(db, current_user, room_id, doctor_id)
    return {"message": "Member removed successfully"}

@router.patch("/{room_id}/close")
def close_room(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Close the room permanently (Creator only)."""
    room = consultation_service.close_room(db, current_user, room_id)
    return {"status": room.status.value, "closed_at": room.closed_at}

@router.get("/{room_id}/messages", response_model=List[MessageResponse])
def get_messages(
    room_id: UUID,
    limit: int = 50,
    before_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Get paginated message history."""
    return consultation_service.get_messages(db, current_user, room_id, limit, before_id)


# --- File Upload/Download ---

@router.post("/{room_id}/attachments", response_model=MessageResponse)
async def upload_attachment(
    room_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Upload an encrypted attachment to the room."""
    message_resp, _ = await consultation_service.upload_attachment(db, current_user, room_id, file)
    
    # Broadcast to websocket clients
    await manager.broadcast(room_id, {
        "type": "attachment",
        "data": message_resp.model_dump(mode="json")
    })
    
    return message_resp

@router.get("/{room_id}/attachments/{attachment_id}")
def download_attachment(
    room_id: UUID,
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor)
):
    """Download a decrypted attachment."""
    file_bytes, filename, mime_type = consultation_service.download_attachment(db, current_user, room_id, attachment_id)
    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# --- WebSocket Route ---

@router.websocket("/{room_id}/ws")
async def websocket_endpoint(websocket: WebSocket, room_id: UUID, token: str = Query(...)):
    """Real-time chat connection."""
    db = next(get_db())
    
    # Authenticate token
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=4001, reason="Invalid token")
            return
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        await websocket.close(code=4001, reason="Invalid token")
        return
        
    user = auth_service.get_user_by_id(user_id, db)
    if not user or user.role.value != "DOCTOR":
        await websocket.close(code=4001, reason="Unauthorized. Doctor role required.")
        return

    # Check room membership and status
    room = consultation_repo.get_room_by_id(db, room_id)
    if not room:
        await websocket.close(code=4004, reason="Room not found")
        return
    if room.status != RoomStatus.OPEN:
        await websocket.close(code=4002, reason="Room is closed")
        return
        
    membership = consultation_repo.get_membership(db, room_id, user.id)
    if not membership or not membership.is_active:
        await websocket.close(code=4001, reason="Not an active member of this room")
        return

    # Accept connection
    await manager.connect(room_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            if payload.get("type") == "message":
                content = payload.get("content")
                if content:
                    msg_resp = consultation_service.send_message(db, user, room_id, content)
                    await manager.broadcast(room_id, {
                        "type": "message",
                        "data": msg_resp.model_dump(mode="json")
                    })
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(room_id, websocket)
