import pytest
import uuid
from fastapi import HTTPException

from app.models.user import User, UserRole
from app.models.auth import Auth
from app.schemas.user import UserProfileUpdate
from app.services.user_service import (
    list_users,
    list_active_doctors,
    update_user_profile,
    deactivate_user,
)


def create_mock_user(db, role: UserRole, full_name: str, username: str, email: str, is_active: bool = True, license_number: str = None) -> User:
    """Helper to create a user with a linked Auth record."""
    user = User(
        role=role,
        full_name=full_name,
        license_number=license_number
    )
    db.add(user)
    db.flush()

    auth = Auth(
        user_id=user.id,
        username=username,
        email=email,
        hashed_password="somehashedpassword",
        is_active=is_active
    )
    db.add(auth)
    db.flush()
    return user


def test_list_users_returns_paginated_results(db_session):
    """Returns correct slice of users based on pagination params."""
    # Create 5 users
    for i in range(5):
        create_mock_user(
            db_session,
            role=UserRole.NURSE,
            full_name=f"Nurse {i}",
            username=f"nurse{i}",
            email=f"nurse{i}@example.com"
        )
    db_session.commit()

    # Get page 1 (skip=0, limit=2)
    users_page_1 = list_users(skip=0, limit=2, db=db_session)
    assert len(users_page_1) == 2
    assert users_page_1[0].full_name == "Nurse 0"
    assert users_page_1[1].full_name == "Nurse 1"

    # Get page 2 (skip=2, limit=2)
    users_page_2 = list_users(skip=2, limit=2, db=db_session)
    assert len(users_page_2) == 2
    assert users_page_2[0].full_name == "Nurse 2"
    assert users_page_2[1].full_name == "Nurse 3"

    # Get page 3 (skip=4, limit=2)
    users_page_3 = list_users(skip=4, limit=2, db=db_session)
    assert len(users_page_3) == 1
    assert users_page_3[0].full_name == "Nurse 4"


def test_list_users_empty_database(db_session):
    """Returns empty list when no users exist."""
    users = list_users(skip=0, limit=10, db=db_session)
    assert users == []


def test_list_active_doctors_only_doctors(db_session):
    """Returns only users with role=DOCTOR and is_active=True."""
    # Active doctor
    doctor = create_mock_user(
        db_session,
        role=UserRole.DOCTOR,
        full_name="Dr. House",
        username="drhouse",
        email="drhouse@example.com",
        is_active=True
    )
    # Active nurse
    create_mock_user(
        db_session,
        role=UserRole.NURSE,
        full_name="Nurse Ratched",
        username="nurseratched",
        email="nurseratched@example.com",
        is_active=True
    )
    db_session.commit()

    active_doctors = list_active_doctors(db=db_session)
    assert len(active_doctors) == 1
    assert active_doctors[0].id == doctor.id
    assert active_doctors[0].full_name == "Dr. House"


def test_list_active_doctors_excludes_inactive(db_session):
    """Doctors with is_active=False are excluded."""
    # Inactive doctor
    create_mock_user(
        db_session,
        role=UserRole.DOCTOR,
        full_name="Dr. Death",
        username="drdeath",
        email="drdeath@example.com",
        is_active=False
    )
    db_session.commit()

    active_doctors = list_active_doctors(db=db_session)
    assert len(active_doctors) == 0


def test_list_active_doctors_excludes_nurses(db_session):
    """Users with role=NURSE are excluded even if active."""
    # Active nurse
    create_mock_user(
        db_session,
        role=UserRole.NURSE,
        full_name="Nurse Joy",
        username="nursejoy",
        email="nursejoy@example.com",
        is_active=True
    )
    db_session.commit()

    active_doctors = list_active_doctors(db=db_session)
    assert len(active_doctors) == 0


def test_update_user_profile_success(db_session):
    """Updates provided fields, leaves others unchanged."""
    user = create_mock_user(
        db_session,
        role=UserRole.DOCTOR,
        full_name="Dr. Strange",
        username="drstrange",
        email="drstrange@example.com",
        license_number="LIC111"
    )
    db_session.commit()

    # Update only full_name
    update_data = UserProfileUpdate(full_name="Dr. Stephen Strange")
    updated_user = update_user_profile(user_id=user.id, data=update_data, db=db_session)

    assert updated_user.full_name == "Dr. Stephen Strange"
    assert updated_user.license_number == "LIC111"  # Unchanged


def test_update_user_profile_not_found(db_session):
    """Raises HTTPException 404 for non-existent user_id."""
    non_existent_id = uuid.uuid4()
    update_data = UserProfileUpdate(full_name="Ghost Name")

    with pytest.raises(HTTPException) as exc_info:
        update_user_profile(user_id=non_existent_id, data=update_data, db=db_session)

    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail


def test_deactivate_user_success(db_session):
    """Sets auth.is_active to False for the specified user."""
    user = create_mock_user(
        db_session,
        role=UserRole.NURSE,
        full_name="Nurse Jackie",
        username="nursejackie",
        email="nursejackie@example.com",
        is_active=True
    )
    db_session.commit()

    # Confirm user is active initially
    assert user.auth.is_active is True

    result = deactivate_user(user_id=user.id, db=db_session)
    assert result is True
    
    db_session.refresh(user.auth)
    assert user.auth.is_active is False


def test_deactivate_user_not_found(db_session):
    """Raises HTTPException 404 for non-existent user_id."""
    non_existent_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        deactivate_user(user_id=non_existent_id, db=db_session)

    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail


def test_deactivate_user_no_auth_record(db_session):
    """Raises HTTPException 500 when user has no associated Auth record."""
    # Create user WITHOUT auth record
    user = User(
        role=UserRole.NURSE,
        full_name="Orphan User"
    )
    db_session.add(user)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        deactivate_user(user_id=user.id, db=db_session)

    assert exc_info.value.status_code == 500
    assert "authentication record not found" in exc_info.value.detail
