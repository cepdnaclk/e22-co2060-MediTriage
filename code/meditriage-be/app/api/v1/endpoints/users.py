"""
User/Staff management API endpoints.
Handles staff listing and account management (Admin functions).
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.db.session import get_db
from app.api.dependencies import allow_admin
from app.models.user import User
from app.schemas.user import UserListResponse
from app.schemas.common import DeleteResponse
from app.services import user_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserListResponse])
def list_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Maximum records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin),
):
    """
    Get paginated list of all staff members.
    For admin dashboard.
    
    **Required Role**: Admin only
    """
    logger.info(f"Listing users: skip={skip}, limit={limit}, admin={current_user.full_name}")
    users = user_service.list_users(skip, limit, db)
    return users


@router.delete("/{user_id}", response_model=DeleteResponse)
def deactivate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin),
):
    """
    Soft delete (deactivate) a staff account.
    Sets auth.is_active = False.
    
    **Required Role**: Admin only
    """
    logger.warning(f"Deactivating user: id={user_id}, admin={current_user.full_name}")
    success = user_service.deactivate_user(user_id, db)
    return DeleteResponse(success=success, id=str(user_id))
