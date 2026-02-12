"""
Pydantic schemas for user/staff management.
Handles user listing, profile updates, and administrative functions.
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


class UserProfileUpdate(BaseModel):
    """Request schema for updating user's own profile."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    license_number: Optional[str] = Field(None, max_length=50)


class UserListResponse(BaseModel):
    """Response schema for user list (admin dashboard)."""
    id: UUID
    username: str
    email: str
    full_name: str
    role: UserRole
    license_number: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
