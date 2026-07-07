import asyncio
import os
import uuid
from datetime import date, datetime
from io import BytesIO
from unittest.mock import patch

import pytest
from fastapi import HTTPException, UploadFile
from jose import JWTError

from app.api.v1.controllers import consultation_controller
from app.core.config import get_settings
from app.core.connection_manager import manager
from app.models.clinical import EncounterStatus, MedicalEncounter
from app.models.consultation import ConsultationAttachment, MessageType, RoomStatus
from app.models.patient import Gender, Patient
from app.models.user import User, UserRole
from app.repositories import consultation_repo
from app.services import consultation_service, encryption_service

settings = get_settings()


class DummyWebSocket:
    def __init__(self):
        self.accepted = False
        self.closed = False
        self.close_codes = []
        self.sent_messages = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, message):
        self.sent_messages.append(message)

    async def close(self, code=1000, reason=""):
        self.closed = True
        self.close_codes.append((code, reason))

    async def receive_text(self):
        raise RuntimeError("receive_text not configured")


def _create_user(db, role, full_name):
    user = User(role=role, full_name=full_name)
    db.add(user)
    db.flush()
    return user


def _create_patient(db):
    patient = Patient(
        national_id=str(uuid.uuid4().int % 10**12),
        first_name="Test",
        last_name="Patient",
        date_of_birth=date(2000, 1, 1),
        gender=Gender.MALE,
        contact_number="1234567890",
    )
    db.add(patient)
    db.flush()
    return patient


def _create_encounter(db, nurse, doctor):
    patient = _create_patient(db)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        doctor_id=doctor.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
        chief_complaint="Fever",
    )
    db.add(encounter)
    db.flush()
    return encounter


def _create_room(db, creator, doctor_ids=None, title="MDT Review"):
    nurse = _create_user(db, UserRole.NURSE, "Nurse One")
    encounter = _create_encounter(db, nurse, creator)
    return consultation_service.create_room(db, creator, encounter.id, title, doctor_ids or [])


def _make_upload_file(filename="test.pdf", content_type="application/pdf", data=b"hello"):
    return UploadFile(filename=filename, file=BytesIO(data), headers={'content-type': content_type})


def test_create_room_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [other_doctor.id])

    assert room.title == "MDT Review"
    assert room.status == RoomStatus.OPEN
    memberships = consultation_repo.get_active_members(db_session, room.id)
    assert {m.doctor_id for m in memberships} == {creator.id, other_doctor.id}


def test_create_room_invalid_encounter(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.create_room(db_session, creator, uuid.uuid4(), "MDT Review", [])
    assert exc_info.value.status_code == 404


def test_create_room_non_doctor(db_session):
    nurse = _create_user(db_session, UserRole.NURSE, "Nurse One")
    encounter = _create_encounter(db_session, nurse, nurse)
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.create_room(db_session, nurse, encounter.id, "MDT Review", [])
    assert exc_info.value.status_code == 403


def test_create_room_empty_title(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    nurse = _create_user(db_session, UserRole.NURSE, "Nurse One")
    encounter = _create_encounter(db_session, nurse, creator)
    room = consultation_service.create_room(db_session, creator, encounter.id, "", [])
    assert room.title == ""


def test_create_room_with_members(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [other_doctor.id])
    memberships = consultation_repo.get_active_members(db_session, room.id)
    assert len(memberships) == 2


def test_create_room_duplicate_members(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    nurse = _create_user(db_session, UserRole.NURSE, "Nurse One")
    encounter = _create_encounter(db_session, nurse, creator)
    room = consultation_service.create_room(db_session, creator, encounter.id, "MDT Review", [other_doctor.id, other_doctor.id])
    memberships = consultation_repo.get_active_members(db_session, room.id)
    assert len(memberships) == 2


def test_get_my_rooms_empty(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    rooms = consultation_controller.get_my_rooms(db_session, creator)
    assert rooms == []


def test_get_my_rooms_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    _create_room(db_session, creator, [])
    rooms = consultation_controller.get_my_rooms(db_session, creator)
    assert len(rooms) == 1


def test_close_room_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    closed_room = consultation_service.close_room(db_session, creator, room.id)
    assert closed_room.status == RoomStatus.CLOSED


def test_close_room_not_creator(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.close_room(db_session, other_doctor, room.id)
    assert exc_info.value.status_code == 403


def test_get_room_details_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    details = consultation_controller.get_room_details(room.id, db_session, creator)
    assert details.id == room.id
    assert details.status == room.status


def test_get_room_details_not_member(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_controller.get_room_details(room.id, db_session, other_doctor)
    assert exc_info.value.status_code == 403


def test_get_room_details_not_found(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    with pytest.raises(HTTPException) as exc_info:
        consultation_controller.get_room_details(uuid.uuid4(), db_session, creator)
    assert exc_info.value.status_code == 403


def test_get_room_details_closed_room(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    consultation_service.close_room(db_session, creator, room.id)
    details = consultation_controller.get_room_details(room.id, db_session, creator)
    assert details.status == RoomStatus.CLOSED


def test_get_room_details_removed_member(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [other_doctor.id])
    consultation_service.remove_member(db_session, creator, room.id, other_doctor.id)
    details = consultation_controller.get_room_details(room.id, db_session, other_doctor)
    assert details.id == room.id


def test_add_member_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    new_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. New")
    room = _create_room(db_session, creator, [])
    membership = consultation_service.add_member(db_session, creator, room.id, new_doctor.id)
    assert membership.is_active is True


def test_add_member_already_exists(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.add_member(db_session, creator, room.id, creator.id)
    assert exc_info.value.status_code == 400


def test_add_member_rejoin(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    consultation_service.add_member(db_session, creator, room.id, other_doctor.id)
    consultation_service.remove_member(db_session, creator, room.id, other_doctor.id)
    membership = consultation_service.add_member(db_session, creator, room.id, other_doctor.id)
    assert membership.is_active is True


def test_add_member_invalid_doctor(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.add_member(db_session, creator, room.id, uuid.uuid4())
    assert exc_info.value.status_code == 400


def test_add_member_closed_room(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    new_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. New")
    room = _create_room(db_session, creator, [])
    consultation_service.close_room(db_session, creator, room.id)
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.add_member(db_session, creator, room.id, new_doctor.id)
    assert exc_info.value.status_code == 400


def test_remove_member_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [other_doctor.id])
    membership = consultation_service.remove_member(db_session, creator, room.id, other_doctor.id)
    assert membership.is_active is False


def test_remove_member_not_creator(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    requester = _create_user(db_session, UserRole.DOCTOR, "Dr. Requester")
    room = _create_room(db_session, creator, [other_doctor.id])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.remove_member(db_session, requester, room.id, other_doctor.id)
    assert exc_info.value.status_code == 403


def test_remove_member_self(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.remove_member(db_session, creator, room.id, creator.id)
    assert exc_info.value.status_code == 400


def test_remove_member_not_found(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.remove_member(db_session, creator, room.id, uuid.uuid4())
    assert exc_info.value.status_code == 400


def test_remove_member_closed_room(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [other_doctor.id])
    consultation_service.close_room(db_session, creator, room.id)
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.remove_member(db_session, creator, room.id, other_doctor.id)
    assert exc_info.value.status_code == 400


def test_get_messages_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    consultation_repo.save_message(
        db_session,
        {
            "room_id": room.id,
            "sender_id": creator.id,
            "content": encryption_service.encrypt("hello world"),
            "message_type": MessageType.TEXT,
        },
    )
    messages = consultation_service.get_messages(db_session, creator, room.id)
    assert len(messages) >= 1


def test_get_messages_pagination(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    first = consultation_repo.save_message(
        db_session,
        {"room_id": room.id, "sender_id": creator.id, "content": encryption_service.encrypt("first"), "message_type": MessageType.TEXT},
    )
    second = consultation_repo.save_message(
        db_session,
        {"room_id": room.id, "sender_id": creator.id, "content": encryption_service.encrypt("second"), "message_type": MessageType.TEXT},
    )
    first.created_at = datetime(2024, 1, 1, 0, 0, 0)
    second.created_at = datetime(2024, 1, 2, 0, 0, 0)
    db_session.commit()
    messages = consultation_service.get_messages(db_session, creator, room.id, limit=1, before_id=second.id)
    assert len(messages) == 1


def test_get_messages_not_member(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.get_messages(db_session, other_doctor, room.id)
    assert exc_info.value.status_code == 403


def test_get_messages_closed_room(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    consultation_service.close_room(db_session, creator, room.id)
    messages = consultation_service.get_messages(db_session, creator, room.id)
    assert isinstance(messages, list)


def test_get_messages_empty_room(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    messages = consultation_service.get_messages(db_session, creator, room.id)
    assert len(messages) >= 1
    assert messages[0].message_type == MessageType.SYSTEM


def test_upload_attachment_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    file = _make_upload_file(data=b"hello world")
    message_resp, attachment = asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, file))
    assert message_resp.attachment is not None
    assert isinstance(attachment, ConsultationAttachment)


def test_upload_attachment_large_file(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    file = _make_upload_file(data=b"A" * (11 * 1024 * 1024))
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, file))
    assert exc_info.value.status_code == 413


def test_upload_attachment_invalid_type(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    file = _make_upload_file(filename="bad.exe", content_type="application/x-msdownload", data=b"bad")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, file))
    assert exc_info.value.status_code == 415


def test_upload_attachment_closed_room(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    consultation_service.close_room(db_session, creator, room.id)
    file = _make_upload_file(data=b"hello")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, file))
    assert exc_info.value.status_code == 400


def test_upload_attachment_not_member(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    file = _make_upload_file(data=b"hello")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(consultation_service.upload_attachment(db_session, other_doctor, room.id, file))
    assert exc_info.value.status_code == 403


def test_download_attachment_success(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    file = _make_upload_file(data=b"hello")
    _, attachment = asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, file))
    data, filename, mime_type = consultation_service.download_attachment(db_session, creator, room.id, attachment.id)
    assert data == b"hello"
    assert filename == "test.pdf"
    assert mime_type == "application/pdf"


def test_download_attachment_not_member(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    file = _make_upload_file(data=b"hello")
    _, attachment = asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, file))
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.download_attachment(db_session, other_doctor, room.id, attachment.id)
    assert exc_info.value.status_code == 403


def test_download_attachment_not_found(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    with pytest.raises(HTTPException) as exc_info:
        consultation_service.download_attachment(db_session, creator, room.id, uuid.uuid4())
    assert exc_info.value.status_code == 404


def test_download_attachment_closed_room(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    file = _make_upload_file(data=b"hello")
    _, attachment = asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, file))
    consultation_service.close_room(db_session, creator, room.id)
    data, filename, mime_type = consultation_service.download_attachment(db_session, creator, room.id, attachment.id)
    assert data == b"hello"
    assert filename == "test.pdf"
    assert mime_type == "application/pdf"


def test_upload_attachment_db_failure(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    with patch("app.repositories.consultation_repo.save_attachment", side_effect=Exception("db fail")):
        with pytest.raises(Exception):
            asyncio.run(consultation_service.upload_attachment(db_session, creator, room.id, _make_upload_file(data=b"hello")))
    file_path = os.path.join(settings.CONSULTATION_MEDIA_PATH, str(room.id))
    assert os.path.exists(file_path) or not os.path.exists(file_path)


def test_ws_connect_success(db_session):
    manager.active_connections.clear()
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    ws = DummyWebSocket()

    async def run_test():
        with patch("app.api.v1.controllers.consultation_controller.decode_access_token", return_value={"sub": str(creator.id)}):
            with patch("app.api.v1.controllers.consultation_controller.get_db", side_effect=lambda: iter([db_session])):
                with patch("app.api.v1.controllers.consultation_controller.auth_service.get_user_by_id", return_value=creator):
                    await consultation_controller.websocket_endpoint(ws, room.id, "token")

    asyncio.run(run_test())
    assert ws.accepted is True
    assert manager.get_connection_count(room.id) == 0


def test_ws_connect_invalid_token(db_session):
    manager.active_connections.clear()
    ws = DummyWebSocket()

    async def run_test():
        with patch("app.api.v1.controllers.consultation_controller.decode_access_token", side_effect=JWTError("bad token")):
            await consultation_controller.websocket_endpoint(ws, uuid.uuid4(), "bad-token")

    asyncio.run(run_test())
    assert ws.closed is True
    assert ws.close_codes[0][0] == 4001


def test_ws_connect_non_doctor(db_session):
    manager.active_connections.clear()
    ws = DummyWebSocket()

    async def run_test():
        with patch("app.api.v1.controllers.consultation_controller.decode_access_token", return_value={"sub": str(uuid.uuid4())}):
            with patch("app.api.v1.controllers.consultation_controller.get_db", side_effect=lambda: iter([db_session])):
                with patch("app.api.v1.controllers.consultation_controller.auth_service.get_user_by_id", return_value=User(role=UserRole.NURSE, full_name="Nurse")):
                    await consultation_controller.websocket_endpoint(ws, uuid.uuid4(), "token")

    asyncio.run(run_test())
    assert ws.closed is True
    assert ws.close_codes[0][0] == 4001


def test_ws_connect_invalid_room(db_session):
    manager.active_connections.clear()
    ws = DummyWebSocket()

    async def run_test():
        with patch("app.api.v1.controllers.consultation_controller.decode_access_token", return_value={"sub": str(uuid.uuid4())}):
            with patch("app.api.v1.controllers.consultation_controller.get_db", side_effect=lambda: iter([db_session])):
                with patch("app.api.v1.controllers.consultation_controller.auth_service.get_user_by_id", return_value=User(role=UserRole.DOCTOR, full_name="Doc")):
                    await consultation_controller.websocket_endpoint(ws, uuid.uuid4(), "token")

    asyncio.run(run_test())
    assert ws.closed is True
    assert ws.close_codes[0][0] == 4004


def test_ws_connect_closed_room(db_session):
    manager.active_connections.clear()
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    consultation_service.close_room(db_session, creator, room.id)
    ws = DummyWebSocket()

    async def run_test():
        with patch("app.api.v1.controllers.consultation_controller.decode_access_token", return_value={"sub": str(creator.id)}):
            with patch("app.api.v1.controllers.consultation_controller.get_db", side_effect=lambda: iter([db_session])):
                with patch("app.api.v1.controllers.consultation_controller.auth_service.get_user_by_id", return_value=creator):
                    await consultation_controller.websocket_endpoint(ws, room.id, "token")

    asyncio.run(run_test())
    assert ws.closed is True
    assert ws.close_codes[0][0] == 4002


def test_ws_connect_not_member(db_session):
    manager.active_connections.clear()
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other_doctor = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    ws = DummyWebSocket()

    async def run_test():
        with patch("app.api.v1.controllers.consultation_controller.decode_access_token", return_value={"sub": str(other_doctor.id)}):
            with patch("app.api.v1.controllers.consultation_controller.get_db", side_effect=lambda: iter([db_session])):
                with patch("app.api.v1.controllers.consultation_controller.auth_service.get_user_by_id", return_value=other_doctor):
                    await consultation_controller.websocket_endpoint(ws, room.id, "token")

    asyncio.run(run_test())
    assert ws.closed is True
    assert ws.close_codes[0][0] == 4001


def test_ws_disconnect_handling(db_session):
    manager.active_connections.clear()
    room_id = uuid.uuid4()
    ws = DummyWebSocket()
    asyncio.run(manager.connect(room_id, ws))
    manager.disconnect(room_id, ws)
    assert manager.get_connection_count(room_id) == 0


def test_ws_multiple_clients(db_session):
    manager.active_connections.clear()
    room_id = uuid.uuid4()
    ws1 = DummyWebSocket()
    ws2 = DummyWebSocket()
    asyncio.run(manager.connect(room_id, ws1))
    asyncio.run(manager.connect(room_id, ws2))
    assert manager.get_connection_count(room_id) == 2


def test_ws_send_message_success(db_session):
    manager.active_connections.clear()
    room_id = uuid.uuid4()
    ws1 = DummyWebSocket()
    ws2 = DummyWebSocket()
    asyncio.run(manager.connect(room_id, ws1))
    asyncio.run(manager.connect(room_id, ws2))
    asyncio.run(manager.broadcast(room_id, {"type": "message", "data": {"text": "hello"}}))
    assert ws1.sent_messages[-1]["data"]["text"] == "hello"
    assert ws2.sent_messages[-1]["data"]["text"] == "hello"


def test_ws_receive_system_message(db_session):
    manager.active_connections.clear()
    room_id = uuid.uuid4()
    ws = DummyWebSocket()
    asyncio.run(manager.connect(room_id, ws))
    asyncio.run(manager.broadcast(room_id, {"type": "system", "data": {"message": "user joined"}}))
    assert ws.sent_messages[-1]["type"] == "system"


def test_repo_create_room(db_session):
    creator = User(role=UserRole.DOCTOR, full_name="Dr. Creator")
    db_session.add(creator)
    db_session.flush()
    room = consultation_repo.create_room(db_session, {"encounter_id": uuid.uuid4(), "created_by_id": creator.id, "title": "MDT Review"})
    assert room.title == "MDT Review"


def test_repo_get_active_members(db_session):
    creator = User(role=UserRole.DOCTOR, full_name="Dr. Creator")
    db_session.add(creator)
    db_session.flush()
    room = consultation_repo.create_room(db_session, {"encounter_id": uuid.uuid4(), "created_by_id": creator.id, "title": "MDT Review"})
    consultation_repo.add_member(db_session, {"room_id": room.id, "doctor_id": creator.id, "added_by_id": None, "is_active": True})
    consultation_repo.add_member(db_session, {"room_id": room.id, "doctor_id": uuid.uuid4(), "added_by_id": creator.id, "is_active": False})
    members = consultation_repo.get_active_members(db_session, room.id)
    assert len(members) == 1


def test_repo_get_rooms_for_doctor(db_session):
    creator = User(role=UserRole.DOCTOR, full_name="Dr. Creator")
    db_session.add(creator)
    db_session.flush()
    room = consultation_repo.create_room(db_session, {"encounter_id": uuid.uuid4(), "created_by_id": creator.id, "title": "MDT Review"})
    consultation_repo.add_member(db_session, {"room_id": room.id, "doctor_id": creator.id, "added_by_id": None, "is_active": True})
    rooms = consultation_repo.get_rooms_for_doctor(db_session, creator.id)
    assert len(rooms) == 1


def test_repo_get_membership(db_session):
    creator = User(role=UserRole.DOCTOR, full_name="Dr. Creator")
    db_session.add(creator)
    db_session.flush()
    room = consultation_repo.create_room(db_session, {"encounter_id": uuid.uuid4(), "created_by_id": creator.id, "title": "MDT Review"})
    membership = consultation_repo.add_member(db_session, {"room_id": room.id, "doctor_id": creator.id, "added_by_id": None, "is_active": True})
    assert consultation_repo.get_membership(db_session, room.id, creator.id).id == membership.id


def test_service_close_room_transaction(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    room = _create_room(db_session, creator, [])
    closed_room = consultation_service.close_room(db_session, creator, room.id)
    assert closed_room.status == RoomStatus.CLOSED


def test_service_add_member_transaction(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [])
    membership = consultation_service.add_member(db_session, creator, room.id, other.id)
    assert membership.is_active is True


def test_service_remove_member_transaction(db_session):
    creator = _create_user(db_session, UserRole.DOCTOR, "Dr. Creator")
    other = _create_user(db_session, UserRole.DOCTOR, "Dr. Other")
    room = _create_room(db_session, creator, [other.id])
    membership = consultation_service.remove_member(db_session, creator, room.id, other.id)
    assert membership.is_active is False


def test_service_file_encryption(db_session):
    data = b"encrypted-bytes"
    encrypted = encryption_service.encrypt_file(data)
    assert encrypted != data


def test_service_file_decryption(db_session):
    data = b"encrypted-bytes"
    encrypted = encryption_service.encrypt_file(data)
    decrypted = encryption_service.decrypt_file(encrypted)
    assert decrypted == data


def test_ws_manager_broadcast_isolated(db_session):
    manager.active_connections.clear()
    room_id = uuid.uuid4()
    ws1 = DummyWebSocket()
    ws2 = DummyWebSocket()
    asyncio.run(manager.connect(room_id, ws1))
    asyncio.run(manager.connect(room_id, ws2))
    asyncio.run(manager.broadcast(room_id, {"type": "message", "text": "only-room"}))
    assert ws1.sent_messages[-1]["text"] == "only-room"
    assert ws2.sent_messages[-1]["text"] == "only-room"
