"""
Patient management API endpoints.
Handles patient CRUD operations, search, and encounter history.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from app.db.session import get_db
from app.api.dependencies import allow_staff, allow_admin, RoleChecker
from app.models.user import User, UserRole
from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    EncounterSummary,
)
from app.schemas.common import DeleteResponse
from app.services import patient_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/patients", tags=["Patient Management"])

# Role checkers
allow_nurse_admin = RoleChecker([UserRole.NURSE, UserRole.ADMIN])


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_nurse_admin),
):
    """
    Register a new patient.
    Checks for duplicate national ID.
    
    **Required Role**: Nurse or Admin
    """
    logger.info(f"Creating patient: nic={data.national_id}, user={current_user.full_name}")
    patient = patient_service.create_patient(data, db)
    return patient


@router.get("/search", response_model=List[PatientResponse])
def search_patients(
    nic: Optional[str] = Query(None, description="National ID for exact match"),
    name: Optional[str] = Query(None, description="Name for partial match"),
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff),
):
    """
    Search for patients by national ID (exact) or name (partial).
    At least one search parameter must be provided.
    
    **Required Role**: Nurse or Doctor
    """
    if not nic and not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one search parameter (nic or name) must be provided"
        )
    
    logger.info(f"Searching patients: nic={nic}, name={name}, user={current_user.full_name}")
    patients = patient_service.search_patients(nic=nic, name=name, db=db)
    return patients


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff),
):
    """
    Get patient details by ID.
    
    **Required Role**: Nurse or Doctor
    """
    logger.debug(f"Fetching patient: id={patient_id}, user={current_user.full_name}")
    patient = patient_service.get_patient_by_id(patient_id, db)
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: UUID,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_nurse_admin),
):
    """
    Update patient information.
    
    **Required Role**: Nurse or Admin
    """
    logger.info(f"Updating patient: id={patient_id}, user={current_user.full_name}")
    patient = patient_service.update_patient(patient_id, data, db)
    return patient


@router.delete("/{patient_id}", response_model=DeleteResponse)
def delete_patient(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin),
):
    """
    Soft delete a patient record.
    
    **Required Role**: Admin only
    """
    logger.warning(f"Deleting patient: id={patient_id}, admin={current_user.full_name}")
    success = patient_service.soft_delete_patient(patient_id, db)
    return DeleteResponse(success=success, id=str(patient_id))


@router.get("/{patient_id}/history", response_model=List[EncounterSummary])
def get_patient_history(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff),
):
    """
    Get encounter history for a patient.
    Returns summary of all past triage encounters with dates and chief complaints.
    
    **Required Role**: Nurse or Doctor
    """
    logger.info(f"Fetching patient history: id={patient_id}, user={current_user.full_name}")
    history = patient_service.get_patient_encounter_history(patient_id, db)
    return history
