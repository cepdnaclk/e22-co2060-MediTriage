"""
User service layer.
Business logic for staff management and profile updates.
"""
from uuid import UUID
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.auth import Auth
from app.schemas.user import UserProfileUpdate
from app.core.logging import get_logger

logger = get_logger(__name__)


def list_users(skip: int, limit: int, db: Session) -> List[User]:
    """
    Get paginated list of all staff members.
    For admin dashboard.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        
    Returns:
        List of User objects
    """
    users = db.query(User).offset(skip).limit(limit).all()
    logger.info(f"Retrieved {len(users)} users (skip={skip}, limit={limit})")
    return users


def update_user_profile(user_id: UUID, data: UserProfileUpdate, db: Session) -> User:
    """
    Update user's own profile information.
    Allows updating name, license number, etc.
    
    Args:
        user_id: User UUID
        data: Profile update data
        db: Database session
        
    Returns:
        Updated User object
        
    Raises:
        HTTPException: 404 if user not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        logger.warning(f"User not found for profile update: id={user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    logger.info(f"User profile updated: id={user_id}, fields={list(update_data.keys())}")
    return user


def deactivate_user(user_id: UUID, db: Session) -> bool:
    """
    Soft delete: deactivate a staff account.
    Sets auth.is_active = False.
    
    Args:
        user_id: User UUID
        db: Database session
        
    Returns:
        True if successful
        
    Raises:
        HTTPException: 404 if user not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        logger.warning(f"User not found for deactivation: id={user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    if not user.auth:
        logger.error(f"User has no auth record: id={user_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User authentication record not found"
        )
    
    # Soft delete: mark Auth as inactive
    user.auth.is_active = False
    db.commit()
    
    logger.info(f"User deactivated: id={user_id}, username={user.auth.username}")
    return True
