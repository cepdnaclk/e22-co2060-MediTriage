import pytest
import uuid
from unittest.mock import patch
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.models.user import User, UserRole
from app.models.auth import Auth
from app.core.security import verify_password
from app.schemas.auth import UserRegisterRequest
from app.services.auth_service import register_user, authenticate_user, get_user_by_id


def test_register_user_success(db_session):
    """Verify that a new user is created with User and Auth records with correct fields."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE,
        license_number="LIC12345"
    )
    user = register_user(data, db_session)
    
    assert user is not None
    assert isinstance(user.id, uuid.UUID)
    assert user.full_name == "Test User"
    assert user.role == UserRole.NURSE
    assert user.license_number == "LIC12345"
    
    # Verify Auth record is created in the database and linked to User
    auth = db_session.query(Auth).filter(Auth.user_id == user.id).first()
    assert auth is not None
    assert auth.username == "testuser"
    assert auth.email == "test@example.com"


def test_register_user_password_is_hashed(db_session):
    """Verify that the stored Auth record has a hashed password."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE,
        license_number="LIC12345"
    )
    user = register_user(data, db_session)
    
    auth = db_session.query(Auth).filter(Auth.user_id == user.id).first()
    assert auth is not None
    # Hashed password should not equal plain password
    assert auth.hashed_password != "securepassword123"
    # Should be successfully verified
    assert verify_password("securepassword123", auth.hashed_password) is True


def test_register_user_duplicate_username(db_session):
    """Verify that attempting to register with an existing username raises HTTPException 400."""
    data1 = UserRegisterRequest(
        username="testuser",
        email="test1@example.com",
        password="securepassword123",
        full_name="Test User 1",
        role=UserRole.NURSE
    )
    register_user(data1, db_session)
    
    data2 = UserRegisterRequest(
        username="testuser",  # Duplicate username
        email="test2@example.com",
        password="securepassword456",
        full_name="Test User 2",
        role=UserRole.DOCTOR
    )
    with pytest.raises(HTTPException) as exc_info:
        register_user(data2, db_session)
    
    assert exc_info.value.status_code == 400
    assert "Username already registered" in exc_info.value.detail


def test_register_user_duplicate_email(db_session):
    """Verify that attempting to register with an existing email raises HTTPException 400."""
    data1 = UserRegisterRequest(
        username="testuser1",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User 1",
        role=UserRole.NURSE
    )
    register_user(data1, db_session)
    
    data2 = UserRegisterRequest(
        username="testuser2",
        email="test@example.com",  # Duplicate email
        password="securepassword456",
        full_name="Test User 2",
        role=UserRole.DOCTOR
    )
    with pytest.raises(HTTPException) as exc_info:
        register_user(data2, db_session)
        
    assert exc_info.value.status_code == 400
    assert "Email already registered" in exc_info.value.detail


def test_register_user_integrity_error_rollback(db_session):
    """Verify that on database IntegrityError, the transaction rolls back and HTTP 400 is raised."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE
    )
    
    # Mock commit to raise IntegrityError
    with patch.object(db_session, "commit", side_effect=IntegrityError("mock statement", "mock params", Exception())):
        with pytest.raises(HTTPException) as exc_info:
            register_user(data, db_session)
            
        assert exc_info.value.status_code == 400
        assert "Registration failed due to database constraint" in exc_info.value.detail

    # Verify that the transaction rolled back and no records were written
    users = db_session.query(User).all()
    auths = db_session.query(Auth).all()
    assert len(users) == 0
    assert len(auths) == 0


def test_authenticate_user_success(db_session):
    """Verify that a valid username + password returns the associated User object."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE
    )
    user = register_user(data, db_session)
    
    authenticated_user = authenticate_user("testuser", "securepassword123", db_session)
    assert authenticated_user is not None
    assert authenticated_user.id == user.id
    assert authenticated_user.full_name == "Test User"


def test_authenticate_user_updates_last_login(db_session):
    """Verify that successful authentication updates the auth.last_login timestamp."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE
    )
    user = register_user(data, db_session)
    
    auth_before = db_session.query(Auth).filter(Auth.user_id == user.id).first()
    assert auth_before.last_login is None
    
    authenticated_user = authenticate_user("testuser", "securepassword123", db_session)
    assert authenticated_user is not None
    
    auth_after = db_session.query(Auth).filter(Auth.user_id == user.id).first()
    assert auth_after.last_login is not None
    
    # Check that last_login is very recent (within 5 seconds)
    from datetime import datetime
    time_diff = (datetime.utcnow() - auth_after.last_login).total_seconds()
    assert abs(time_diff) < 5


def test_authenticate_user_wrong_password(db_session):
    """Verify that correct username but wrong password returns None."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE
    )
    register_user(data, db_session)
    
    authenticated_user = authenticate_user("testuser", "wrongpassword", db_session)
    assert authenticated_user is None


def test_authenticate_user_nonexistent_username(db_session):
    """Verify that a username that doesn't exist returns None."""
    authenticated_user = authenticate_user("nonexistent", "somepassword", db_session)
    assert authenticated_user is None


def test_authenticate_user_inactive_account(db_session):
    """Verify that a valid login for a deactivated account returns None."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE
    )
    user = register_user(data, db_session)
    
    # Set the account status to inactive
    auth = db_session.query(Auth).filter(Auth.user_id == user.id).first()
    auth.is_active = False
    db_session.commit()
    
    authenticated_user = authenticate_user("testuser", "securepassword123", db_session)
    assert authenticated_user is None


def test_get_user_by_id_found(db_session):
    """Verify that a valid user_id returns the correct User object."""
    data = UserRegisterRequest(
        username="testuser",
        email="test@example.com",
        password="securepassword123",
        full_name="Test User",
        role=UserRole.NURSE
    )
    user = register_user(data, db_session)
    
    fetched_user = get_user_by_id(user.id, db_session)
    assert fetched_user is not None
    assert fetched_user.id == user.id
    assert fetched_user.full_name == "Test User"


def test_get_user_by_id_not_found(db_session):
    """Verify that a non-existent user_id returns None."""
    random_id = uuid.uuid4()
    fetched_user = get_user_by_id(random_id, db_session)
    assert fetched_user is None
