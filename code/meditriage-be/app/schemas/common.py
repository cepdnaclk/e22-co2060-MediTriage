"""
Common response schemas used across the API.
"""
from typing import Optional
from pydantic import BaseModel, Field


class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool = Field(default=True, description="Operation success status")
    message: Optional[str] = Field(None, description="Optional message")


class DeleteResponse(BaseModel):
    """Response for delete operations."""
    success: bool = Field(..., description="Deletion success status")
    id: str = Field(..., description="ID of deleted resource")
