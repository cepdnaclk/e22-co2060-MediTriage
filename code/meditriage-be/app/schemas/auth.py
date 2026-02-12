"""
Pydantic schemas for authentication requests and responses.
"""
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole


class UserRegisterRequest(BaseModel):
    """Request body for user registration."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    role: UserRole = Field(..., description="User role: NURSE, DOCTOR, or ADMIN")
    license_number: str | None = Field(default=None, max_length=50, description="Medical license number (optional)")


class UserLoginRequest(BaseModel):
    """Request body for user login."""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class TokenResponse(BaseModel):
    """Response body for successful login."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class UserResponse(BaseModel):
    """Response body for user data."""
    id: UUID
    username: str
    email: str
    full_name: str
    role: UserRole
    license_number: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2 (was orm_mode in v1)
