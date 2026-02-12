"""
Authentication API endpoints.
Handles user registration, login, and current user retrieval.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service
from app.core.security import create_access_token
from app.api.dependencies import get_current_user
from app.models.user import User
from app.core.logging import get_logger
from app.schemas.user import UserProfileUpdate
from app.services import user_service

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new user account.
    Creates both User and Auth records.
    
    Returns:
        Created user data (without password)
    """
    logger.info(f"Registration attempt for username: {data.username}")
    user = auth_service.register_user(data, db)
    
    logger.info(f"User registered successfully: user_id={user.id}, username={data.username}, role={user.role.value}")
    
    # Return user data with auth info
    return UserResponse(
        id=user.id,
        username=user.auth.username,
        email=user.auth.email,
        full_name=user.full_name,
        role=user.role,
        license_number=user.license_number,
        is_active=user.auth.is_active,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    data: UserLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and return JWT access token.
    
    Returns:
        JWT access token
    """
    logger.info(f"Login attempt for username: {data.username}")
    user = auth_service.authenticate_user(data.username, data.password, db)
    
    if not user:
        logger.warning(f"Failed login attempt for username: {data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"User authenticated successfully: user_id={user.id}, username={data.username}")
    
    # Create JWT token with user_id and role
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    logger.debug(f"JWT token generated for user_id={user.id}")
    
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user information.
    Requires valid JWT token in Authorization header.
    
    Returns:
        Current user data
    """
    logger.debug(f"Current user info requested: user_id={current_user.id}")
    return UserResponse(
        id=current_user.id,
        username=current_user.auth.username,
        email=current_user.auth.email,
        full_name=current_user.full_name,
        role=current_user.role,
        license_number=current_user.license_number,
        is_active=current_user.auth.is_active,
        created_at=current_user.created_at,
    )


@router.patch("/me", response_model=UserResponse)
def update_own_profile(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update own user profile.
    Allows updating display name and license number.
    
    **Required**: Any authenticated user
    """
    logger.info(f"User updating own profile: user_id={current_user.id}, username={current_user.auth.username}")
    
    # Use user service to update profile
    updated_user = user_service.update_user_profile(current_user.id, data, db)
    
    logger.info(f"Profile updated successfully: user_id={current_user.id}")
    
    return UserResponse(
        id=updated_user.id,
        username=updated_user.auth.username,
        email=updated_user.auth.email,
        full_name=updated_user.full_name,
        role=updated_user.role,
        license_number=updated_user.license_number,
        is_active=updated_user.auth.is_active,
        created_at=updated_user.created_at,
    )
