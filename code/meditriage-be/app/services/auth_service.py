"""
Authentication service layer.
Business logic for user registration, login, and token validation.
"""
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.user import User
from app.models.auth import Auth
from app.core.security import hash_password, verify_password
from app.schemas.auth import UserRegisterRequest
from app.core.logging import get_logger

logger = get_logger(__name__)


def register_user(data: UserRegisterRequest, db: Session) -> User:
    """
    Register a new user account.
    Creates both User and Auth records in a transaction.
    
    Args:
        data: User registration data
        db: Database session
        
    Returns:
        Created User object
        
    Raises:
        HTTPException: If username or email already exists
    """
    # Check if username already exists
    existing_auth = db.query(Auth).filter(Auth.username == data.username).first()
    if existing_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(Auth).filter(Auth.email == data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create User record
        user = User(
            role=data.role,
            full_name=data.full_name,
            license_number=data.license_number,
        )
        db.add(user)
        db.flush()  # Get user.id before creating Auth
        
        # Create Auth record
        auth = Auth(
            user_id=user.id,
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            is_active=True,
        )
        db.add(auth)
        db.commit()
        db.refresh(user)
        
        logger.info(f"User registered: {user.id} ({data.username})")
        return user
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed due to database constraint"
        )


def authenticate_user(username: str, password: str, db: Session) -> User | None:
    """
    Authenticate a user by username and password.
    Updates last_login timestamp on successful authentication.
    
    Args:
        username: Username
        password: Plain text password
        db: Database session
        
    Returns:
        User object if authentication succeeds, None otherwise
    """
    # Find Auth record by username
    auth = db.query(Auth).filter(Auth.username == username).first()
    
    if not auth:
        return None
    
    # Verify password
    if not verify_password(password, auth.hashed_password):
        return None
    
    # Check if account is active
    if not auth.is_active:
        return None
    
    # Update last_login
    auth.last_login = datetime.utcnow()
    db.commit()
    
    # Return the associated User
    return auth.user


def get_user_by_id(user_id: UUID, db: Session) -> User | None:
    """
    Get a user by ID.
    
    Args:
        user_id: User UUID
        db: Database session
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.id == user_id).first()
