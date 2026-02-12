"""
User model for staff profile and role-based access control.
Handles NURSE, DOCTOR, and ADMIN roles.
Authentication credentials are managed in the Auth model.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base


class UserRole(enum.Enum):
    """User role enumeration for RBAC"""
    NURSE = "NURSE"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class User(Base):
    """
    User model representing medical staff profile.
    Handles role-based access control and professional information.
    Authentication is managed separately in the Auth model.
    """
    __tablename__ = "users"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Role & Profile
    role = Column(SQLEnum(UserRole), nullable=False)
    license_number = Column(String(50), nullable=True)
    full_name = Column(String(255), nullable=False)

    # Audit Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    # One-to-one with Auth
    auth = relationship("Auth", back_populates="user", uselist=False)

    # One nurse can conduct many encounters
    nurse_encounters = relationship(
        "MedicalEncounter",
        back_populates="nurse",
        foreign_keys="MedicalEncounter.nurse_id"
    )

    # One doctor can be assigned to many encounters
    doctor_encounters = relationship(
        "MedicalEncounter",
        back_populates="doctor",
        foreign_keys="MedicalEncounter.doctor_id"
    )

    def __repr__(self):
        return f"<User(id={self.id}, full_name={self.full_name}, role={self.role.value})>"
