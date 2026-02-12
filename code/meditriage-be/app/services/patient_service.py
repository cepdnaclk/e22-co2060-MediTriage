"""
Patient service layer.
Business logic for patient management, search, and encounter history.
"""
from uuid import UUID
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.patient import Patient
from app.models.clinical import MedicalEncounter
from app.schemas.patient import PatientCreate, PatientUpdate, EncounterSummary
from app.core.logging import get_logger

logger = get_logger(__name__)


def create_patient(data: PatientCreate, db: Session) -> Patient:
    """
    Create a new patient record.
    Checks for duplicate national_id before creation.
    
    Args:
        data: Patient creation data
        db: Database session
        
    Returns:
        Created Patient object
        
    Raises:
        HTTPException: 409 if national_id already exists
    """
    # Check for duplicate national ID
    existing_patient = db.query(Patient).filter(
        Patient.national_id == data.national_id
    ).first()
    
    if existing_patient:
        logger.warning(f"Attempted to create duplicate patient with NIC: {data.national_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Patient with national ID {data.national_id} already exists"
        )
    
    try:
        # Create new patient
        patient = Patient(
            national_id=data.national_id,
            first_name=data.first_name,
            last_name=data.last_name,
            date_of_birth=data.date_of_birth,
            contact_number=data.contact_number,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        
        logger.info(f"Patient created: id={patient.id}, nic={data.national_id}, name={data.first_name} {data.last_name}")
        return patient
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error during patient creation: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create patient due to database constraint"
        )


def search_patients(
    nic: Optional[str] = None,
    name: Optional[str] = None,
    db: Session = None
) -> List[Patient]:
    """
    Search for patients by national ID (exact match) or name (partial match).
    
    Args:
        nic: National ID for exact match
        name: Name for partial match (searches first_name and last_name)
        db: Database session
        
    Returns:
        List of matching patients
    """
    query = db.query(Patient)
    
    if nic:
        # Exact match on national ID (high precision)
        query = query.filter(Patient.national_id == nic)
        logger.debug(f"Searching patients by NIC: {nic}")
    elif name:
        # Partial match on first_name OR last_name (high recall)
        search_pattern = f"%{name}%"
        query = query.filter(
            (Patient.first_name.ilike(search_pattern)) |
            (Patient.last_name.ilike(search_pattern))
        )
        logger.debug(f"Searching patients by name: {name}")
    
    patients = query.all()
    logger.info(f"Patient search returned {len(patients)} results")
    return patients


def get_patient_by_id(patient_id: UUID, db: Session) -> Patient:
    """
    Get a patient by ID.
    
    Args:
        patient_id: Patient UUID
        db: Database session
        
    Returns:
        Patient object
        
    Raises:
        HTTPException: 404 if patient not found
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        logger.warning(f"Patient not found: id={patient_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found"
        )
    
    return patient


def update_patient(patient_id: UUID, data: PatientUpdate, db: Session) -> Patient:
    """
    Update patient information.
    
    Args:
        patient_id: Patient UUID
        data: Patient update data
        db: Database session
        
    Returns:
        Updated Patient object
        
    Raises:
        HTTPException: 404 if patient not found
    """
    patient = get_patient_by_id(patient_id, db)
    
    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    
    db.commit()
    db.refresh(patient)
    
    logger.info(f"Patient updated: id={patient_id}, fields={list(update_data.keys())}")
    return patient


def soft_delete_patient(patient_id: UUID, db: Session) -> bool:
    """
    Soft delete a patient (mark as inactive).
    Note: Requires adding 'is_active' field to Patient model if not exists.
    
    Args:
        patient_id: Patient UUID
        db: Database session
        
    Returns:
        True if successful
        
    Raises:
        HTTPException: 404 if patient not found
    """
    patient = get_patient_by_id(patient_id, db)
    
    # For now, we'll use hard delete since Patient model doesn't have is_active field
    # TODO: Add is_active field to Patient model and implement soft delete
    db.delete(patient)
    db.commit()
    
    logger.info(f"Patient deleted: id={patient_id}")
    return True


def get_patient_encounter_history(patient_id: UUID, db: Session) -> List[EncounterSummary]:
    """
    Get encounter history for a patient.
    Returns summary view with dates, chief complaints, and statuses.
    
    Args:
        patient_id: Patient UUID
        db: Database session
        
    Returns:
        List of EncounterSummary objects
        
    Raises:
        HTTPException: 404 if patient not found
    """
    # Verify patient exists
    get_patient_by_id(patient_id, db)
    
    # Fetch all encounters for this patient with related data
    encounters = db.query(MedicalEncounter).filter(
        MedicalEncounter.patient_id == patient_id
    ).order_by(MedicalEncounter.encounter_timestamp.desc()).all()
    
    # Build summary list
    history = []
    for enc in encounters:
        summary = EncounterSummary(
            id=enc.id,
            encounter_timestamp=enc.encounter_timestamp,
            chief_complaint=enc.chief_complaint,
            status=enc.status.value,
            risk_score=enc.risk_score.value if enc.risk_score else None,
            nurse_name=enc.nurse.full_name if enc.nurse else "Unknown",
            doctor_name=enc.doctor.full_name if enc.doctor else None,
        )
        history.append(summary)
    
    logger.info(f"Retrieved {len(history)} encounters for patient: id={patient_id}")
    return history
