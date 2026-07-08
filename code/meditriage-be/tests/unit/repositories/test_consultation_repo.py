import uuid

from app.models.consultation import ConsultationRoom, RoomMembership, RoomStatus
from app.models.user import User, UserRole
from app.repositories import consultation_repo


def test_repo_create_room(db_session):
    creator = User(role=UserRole.DOCTOR, full_name="Dr. Creator")
    db_session.add(creator)
    db_session.flush()

    room = consultation_repo.create_room(
        db_session,
        {
            "encounter_id": uuid.uuid4(),
            "created_by_id": creator.id,
            "title": "MDT Review",
        },
    )

    assert isinstance(room, ConsultationRoom)
    assert room.title == "MDT Review"
    assert room.created_by_id == creator.id


def test_repo_get_active_members(db_session):
    creator = User(role=UserRole.DOCTOR, full_name="Dr. Creator")
    db_session.add(creator)
    db_session.flush()

    room = consultation_repo.create_room(
        db_session,
        {
            "encounter_id": uuid.uuid4(),
            "created_by_id": creator.id,
            "title": "MDT Review",
        },
    )

    active_membership = consultation_repo.add_member(
        db_session,
        {
            "room_id": room.id,
            "doctor_id": creator.id,
            "added_by_id": None,
            "is_active": True,
        },
    )
    inactive_membership = consultation_repo.add_member(
        db_session,
        {
            "room_id": room.id,
            "doctor_id": uuid.uuid4(),
            "added_by_id": creator.id,
            "is_active": False,
        },
    )

    members = consultation_repo.get_active_members(db_session, room.id)

    assert len(members) == 1
    assert members[0].id == active_membership.id
    assert inactive_membership.is_active is False


def test_repo_get_rooms_for_doctor(db_session):
    doctor = User(role=UserRole.DOCTOR, full_name="Dr. One")
    db_session.add(doctor)
    db_session.flush()

    room = consultation_repo.create_room(
        db_session,
        {
            "encounter_id": uuid.uuid4(),
            "created_by_id": doctor.id,
            "title": "MDT Review",
        },
    )
    consultation_repo.add_member(
        db_session,
        {
            "room_id": room.id,
            "doctor_id": doctor.id,
            "added_by_id": None,
            "is_active": True,
        },
    )

    rooms = consultation_repo.get_rooms_for_doctor(db_session, doctor.id)

    assert len(rooms) == 1
    assert rooms[0].id == room.id


def test_repo_get_membership(db_session):
    doctor = User(role=UserRole.DOCTOR, full_name="Dr. One")
    db_session.add(doctor)
    db_session.flush()

    room = consultation_repo.create_room(
        db_session,
        {
            "encounter_id": uuid.uuid4(),
            "created_by_id": doctor.id,
            "title": "MDT Review",
        },
    )
    membership = consultation_repo.add_member(
        db_session,
        {
            "room_id": room.id,
            "doctor_id": doctor.id,
            "added_by_id": None,
            "is_active": True,
        },
    )

    fetched_membership = consultation_repo.get_membership(db_session, room.id, doctor.id)

    assert fetched_membership is not None
    assert fetched_membership.id == membership.id
