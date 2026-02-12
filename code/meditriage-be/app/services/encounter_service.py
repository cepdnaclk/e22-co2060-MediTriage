"""
Encounter service layer.
Business logic for medical encounters, clinical notes, and triage workflow management.
"""
from uuid import UUID
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.clinical import MedicalEncounter, TriageInteraction, ClinicalNote, EncounterStatus, SenderType
from app.models.user import User
from app.schemas.clinical import (
    EncounterCreate,
    EncounterUpdateRequest,
    ClinicalNoteUpdate
)
from app.core.logging import get_logger

logger = get_logger(__name__)


def create_encounter(
    patient_id: UUID,
    nurse_id: UUID,
    chief_complaint: Optional[str],
    db: Session
) -> MedicalEncounter:
    """
    Create a new medical encounter for triage.
    
    Args:
        patient_id: Patient UUID
        nurse_id: Nurse conducting the triage
        chief_complaint: Initial complaint/reason for visit
        db: Database session
        
    Returns:
        Created MedicalEncounter object
    """
    encounter = MedicalEncounter(
        patient_id=patient_id,
        nurse_id=nurse_id,
        chief_complaint=chief_complaint,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
    )
    db.add(encounter)
    db.commit()
    db.refresh(encounter)
    
    logger.info(f"Medical encounter created: id={encounter.id}, patient_id={patient_id}, nurse_id={nurse_id}")
    return encounter


def get_encounter_with_messages(encounter_id: UUID, db: Session) -> Tuple[MedicalEncounter, List[TriageInteraction]]:
    """
    Get encounter with all triage interactions (chat history).
    For reloading chat/conversation on refresh.
    
    Args:
        encounter_id: Encounter UUID
        db: Database session
        
    Returns:
        Tuple of (MedicalEncounter, List[TriageInteraction])
        
    Raises:
        HTTPException: 404 if encounter not found
    """
    encounter = db.query(MedicalEncounter).filter(
        MedicalEncounter.id == encounter_id
    ).first()
    
    if not encounter:
        logger.warning(f"Encounter not found: id={encounter_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Encounter with ID {encounter_id} not found"
        )
    
    # Get all interactions ordered by timestamp
    interactions = db.query(TriageInteraction).filter(
        TriageInteraction.encounter_id == encounter_id
    ).order_by(TriageInteraction.timestamp.asc()).all()
    
    logger.debug(f"Retrieved encounter with {len(interactions)} messages: id={encounter_id}")
    return encounter, interactions


def update_encounter_urgency(encounter_id: UUID, is_urgent: bool, db: Session) -> MedicalEncounter:
    """
    Manual urgency flag by nurse.
    Updates encounter with urgent status or risk assessment.
    
    Args:
        encounter_id: Encounter UUID
        is_urgent: Urgency flag
        db: Database session
        
    Returns:
        Updated MedicalEncounter
        
    Raises:
        HTTPException: 404 if encounter not found
    """
    encounter = db.query(MedicalEncounter).filter(
        MedicalEncounter.id == encounter_id
    ).first()
    
    if not encounter:
        logger.warning(f"Encounter not found for urgency update: id={encounter_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Encounter with ID {encounter_id} not found"
        )
    
    # Note: Adding is_urgent field requires model update
    # For now, we'll log this - actual field should be added to MedicalEncounter model
    logger.info(f"Encounter urgency flagged: id={encounter_id}, is_urgent={is_urgent}")
    
    # If risk_score needs to be updated based on urgency
    # encounter.risk_score = RiskScore.HIGH if is_urgent else encounter.risk_score
    
    db.commit()
    db.refresh(encounter)
    
    return encounter


def get_clinical_note(encounter_id: UUID, db: Session) -> Optional[ClinicalNote]:
    """
    Fetch SOAP note for an encounter.
    
    Args:
        encounter_id: Encounter UUID
        db: Database session
        
    Returns:
        ClinicalNote if exists, None otherwise
    """
    note = db.query(ClinicalNote).filter(
        ClinicalNote.encounter_id == encounter_id
    ).first()
    
    if note:
        logger.debug(f"Clinical note retrieved: encounter_id={encounter_id}, version={note.version}")
    else:
        logger.debug(f"No clinical note found for encounter: id={encounter_id}")
    
    return note


def update_clinical_note(
    encounter_id: UUID,
    data: ClinicalNoteUpdate,
    current_user: User,
    db: Session
) -> ClinicalNote:
    """
    Doctor edits/approves AI-generated SOAP note draft.
    Increments version and can finalize the note.
    
    Args:
        encounter_id: Encounter UUID
        data: Note update data
        current_user: Doctor making the update
        db: Database session
        
    Returns:
        Updated ClinicalNote
        
    Raises:
        HTTPException: 404 if note not found
        HTTPException: 403 if note already finalized
    """
    note = get_clinical_note(encounter_id, db)
    
    if not note:
        logger.warning(f"Clinical note not found for update: encounter_id={encounter_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clinical note for encounter {encounter_id} not found"
        )
    
    # Prevent editing if already finalized (optional business rule)
    if note.is_finalized and not data.is_finalized:  # Only block if trying to edit finalized note
        logger.warning(f"Attempted to edit finalized note: encounter_id={encounter_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit a finalized clinical note"
        )
    
    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "is_finalized" and value:
            # Mark as finalized
            note.is_finalized = True
            # Update encounter status to COMPLETED
            encounter = db.query(MedicalEncounter).filter(
                MedicalEncounter.id == encounter_id
            ).first()
            if encounter:
                encounter.status = EncounterStatus.COMPLETED
        else:
            setattr(note, field, value)
    
    # Increment version on update
    note.version += 1
    
    db.commit()
    db.refresh(note)
    
    logger.info(
        f"Clinical note updated: encounter_id={encounter_id}, version={note.version}, "
        f"finalized={note.is_finalized}, doctor={current_user.full_name}"
    )
    
    return note
