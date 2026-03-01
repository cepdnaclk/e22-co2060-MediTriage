"""
Enhanced Triage interview API controller.
Thin controller layer — delegates to triage_engine and encounter_service.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.db.session import get_db
from app.api.dependencies import allow_nurse, allow_doctor, allow_staff
from app.models.user import User
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    StartInterviewRequest,
    StartInterviewResponse,
)
from app.schemas.clinical import (
    MessageResponse,
    EncounterUpdateRequest,
    EncounterResponse,
    EncounterListItem,
    ClinicalNoteResponse,
    ClinicalNoteUpdate,
)
from app.models.clinical import MedicalEncounter
from app.services import triage_engine, encounter_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/triage", tags=["Triage"])


@router.post("/start", response_model=StartInterviewResponse)
async def start_triage_interview(
    request: StartInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_nurse),
):
    """
    Start a new triage interview for a medical encounter.
    Returns the AI's initial greeting question.

    **Required Role**: Nurse
    """
    logger.info(f"Starting triage interview for patient_id={request.patient_id}, nurse={current_user.full_name}")
    try:
        response = await triage_engine.start_interview(request, current_user.id, db)
        logger.info(f"Triage interview started successfully for patient_id={request.patient_id}")
        return response
    except ValueError as e:
        logger.error(f"Patient not found or invalid status: patient_id={request.patient_id}, error={str(e)}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start interview for patient_id={request.patient_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to start interview: {str(e)}")


@router.post("/chat", response_model=ChatMessageResponse)
async def triage_chat(
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_nurse),
):
    """
    Process a triage interview message.
    Sends patient response to AI and returns the next question.
    When the interview is complete, returns a SOAP note draft.

    **Required Role**: Nurse
    """
    logger.debug(f"Processing chat message for encounter_id={request.encounter_id}")
    try:
        response = await triage_engine.process_message(request, db)

        if response.is_interview_complete:
            logger.info(f"Triage interview completed for encounter_id={request.encounter_id}, SOAP note generated")
        else:
            logger.debug(f"Chat message processed for encounter_id={request.encounter_id}")

        return response
    except ValueError as e:
        logger.error(f"Encounter not found or invalid: encounter_id={request.encounter_id}, error={str(e)}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to process message for encounter_id={request.encounter_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process message: {str(e)}")


@router.get("/encounters", response_model=List[EncounterListItem])
def list_active_encounters(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff),
):
    """
    Get the global active patient queue for Nurse/Doctor dashboards.
    Returns all encounters with status TRIAGE_IN_PROGRESS or AWAITING_REVIEW.
    Ordered: urgent encounters first, then by oldest arrival time.

    **Required Role**: Nurse or Doctor
    """
    logger.info(f"Active encounter list requested by user={current_user.full_name}")
    try:
        encounters = encounter_service.get_active_encounters(db)
        return [
            EncounterListItem(
                id=e.id,
                patient_id=e.patient_id,
                patient_name=f"{e.patient.first_name} {e.patient.last_name}" if e.patient else None,
                nurse_id=e.nurse_id,
                doctor_id=e.doctor_id,
                status=e.status,
                is_urgent=e.is_urgent,
                chief_complaint=e.chief_complaint,
                encounter_timestamp=e.encounter_timestamp,
            )
            for e in encounters
        ]
    except Exception as e:
        logger.error(f"Failed to fetch active encounters: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch active encounter queue"
        )



@router.get("/{encounter_id}/messages", response_model=List[MessageResponse])
def get_encounter_messages(
    encounter_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff),
):
    """
    Get full chat history for an encounter.
    Useful for reloading conversation on page refresh.

    **Required Role**: Nurse or Doctor
    """
    logger.info(f"Fetching messages for encounter_id={encounter_id}, user={current_user.full_name}")

    try:
        encounter, interactions = encounter_service.get_encounter_with_messages(encounter_id, db)

        # Convert to response format
        messages = [
            MessageResponse(
                id=msg.id,
                encounter_id=msg.encounter_id,
                sender_type=msg.sender_type,
                message_content=msg.message_content,
                timestamp=msg.timestamp,
            )
            for msg in interactions
        ]

        logger.debug(f"Retrieved {len(messages)} messages for encounter_id={encounter_id}")
        return messages

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch messages for encounter_id={encounter_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch chat history"
        )


@router.patch("/{encounter_id}", response_model=EncounterResponse)
def update_encounter(
    encounter_id: UUID,
    data: EncounterUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_nurse),
):
    """
    Update encounter fields: urgency, assigned doctor, and/or status.
    Called by the Clinical Summary modal when the nurse assigns a doctor
    and submits the "Add Patient" action.

    Accepts any combination of: is_urgent, doctor_id, status.

    **Required Role**: Nurse
    """
    logger.info(
        f"Updating encounter: encounter_id={encounter_id}, "
        f"doctor_id={data.doctor_id}, status={data.status}, "
        f"is_urgent={data.is_urgent}, nurse={current_user.full_name}"
    )

    try:
        if data.is_urgent is None and data.doctor_id is None and data.status is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        encounter = encounter_service.update_encounter(encounter_id, data, db)
        return encounter
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update encounter: encounter_id={encounter_id}, error={str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update encounter"
        )


@router.get("/{encounter_id}/note", response_model=ClinicalNoteResponse)
def get_clinical_note(
    encounter_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff),
):
    """
    Get clinical note (SOAP) for an encounter.

    **Required Role**: Nurse or Doctor
    """
    logger.info(f"Fetching clinical note for encounter_id={encounter_id}, user={current_user.full_name}")

    note = encounter_service.get_clinical_note(encounter_id, db)

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clinical note for encounter {encounter_id} not found"
        )

    return note


@router.put("/{encounter_id}/note", response_model=ClinicalNoteResponse)
def update_clinical_note(
    encounter_id: UUID,
    data: ClinicalNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor),
):
    """
    Update clinical note (Doctor edits/approves AI draft).
    Increments version and can finalize the note.
    When finalized, stamps the doctor_id on the encounter and sets
    encounter status to COMPLETED.

    **Required Role**: Doctor only
    """
    logger.info(f"Doctor updating clinical note: encounter_id={encounter_id}, doctor={current_user.full_name}")

    try:
        note = encounter_service.update_clinical_note(encounter_id, data, current_user, db)

        # Fetch encounter to attach its (possibly updated) status & doctor to the response
        encounter = db.query(MedicalEncounter).filter(
            MedicalEncounter.id == encounter_id
        ).first()

        # Build a flat ClinicalNoteResponse with the extra fields populated.
        # encounter_status and doctor_id are Optional on the schema so existing
        # frontend code reading other fields is unaffected.
        return ClinicalNoteResponse(
            id=note.id,
            encounter_id=note.encounter_id,
            subjective=note.subjective,
            objective=note.objective,
            assessment=note.assessment,
            plan=note.plan,
            is_finalized=note.is_finalized,
            version=note.version,
            created_at=note.created_at,
            updated_at=note.updated_at,
            encounter_status=encounter.status.value if encounter else None,
            doctor_id=encounter.doctor_id if encounter else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update clinical note: encounter_id={encounter_id}, error={str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update clinical note"
        )
