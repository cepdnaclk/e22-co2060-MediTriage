"""
User/Staff management API controller.
Handles staff listing and account management (Admin functions).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.db.session import get_db
from app.api.dependencies import allow_admin, allow_all_authenticated
from app.models.user import User, UserRole
from app.schemas.user import UserListResponse, DoctorResponse, UserProfileUpdate
from app.schemas.common import DeleteResponse
from app.services import user_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated),
):
    """
    Get list of all active doctors.
    For dropdowns and triage assignment.

    **Required Role**: Any authenticated user (Nurse, Doctor, Admin)
    """
    logger.info(f"Listing active doctors, user={current_user.full_name}")
    doctors = user_service.list_active_doctors(db)
    return doctors


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


@router.patch("/{user_id}", response_model=UserListResponse)
def update_user(
    user_id: UUID,
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated),
):
    """
    Update a user's profile (display name, license number).

    **Authorization**: Users may only update their own profile.
    Admins may update any user's profile.

    **Required Role**: Any authenticated user (self-update), or Admin (any user)
    """
    # Enforce self-update unless the caller is an Admin
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        logger.warning(
            f"Forbidden profile update attempt: caller_id={current_user.id}, "
            f"target_id={user_id}, role={current_user.role.value}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )

    logger.info(
        f"Updating user profile: target_id={user_id}, "
        f"caller_id={current_user.id}, role={current_user.role.value}"
    )

    updated_user = user_service.update_user_profile(user_id, data, db)

    logger.info(f"User profile updated successfully: user_id={user_id}")

    return UserListResponse(
        id=updated_user.id,
        username=updated_user.auth.username,
        email=updated_user.auth.email,
        full_name=updated_user.full_name,
        role=updated_user.role,
        license_number=updated_user.license_number,
        is_active=updated_user.auth.is_active,
        created_at=updated_user.created_at,
    )


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
