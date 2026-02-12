"""
Auth model for authentication credentials.
Handles login, account status, and authentication-related data.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base


class Auth(Base):
    """
    Authentication model for managing login credentials.
    One-to-one relationship with User for profile data.
    """
    __tablename__ = "auths"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Key (One-to-One with User)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # Authentication Credentials
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Account Status
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Audit Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    # One-to-one with User
    user = relationship("User", back_populates="auth", uselist=False)

    def __repr__(self):
        return f"<Auth(id={self.id}, username={self.username}, user_id={self.user_id})>"
