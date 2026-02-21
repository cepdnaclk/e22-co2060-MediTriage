"""
Triage Engine Service.
Business logic layer for managing triage interviews.
Sits between API endpoints and the AI pipeline.
"""
from uuid import UUID
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.models.clinical import (
    MedicalEncounter,
    TriageInteraction,
    ClinicalNote,
    EncounterStatus,
    SenderType,
)
from app.services.llm.chain_factory import TriagePipeline
from app.services.llm.parser import SOAPNote
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    SOAPNoteSchema,
    StartInterviewRequest,
    StartInterviewResponse,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

# Module-level pipeline instance (created on first use)
_pipeline: TriagePipeline | None = None


def _get_pipeline() -> TriagePipeline:
    """Lazy initialization of the triage pipeline singleton."""
    global _pipeline
    if _pipeline is None:
        _pipeline = TriagePipeline()
    return _pipeline


def _calculate_age(dob: date) -> int:
    """Calculate age from date of birth."""
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _build_chat_history(interactions: list[TriageInteraction]) -> list[dict]:
    """
    Convert database TriageInteraction records into LangChain chat history format.
    Maps: AI → assistant, PATIENT/NURSE → user
    """
    history = []
    for interaction in interactions:
        if interaction.sender_type == SenderType.AI:
            role = "assistant"
        else:
            role = "user"
        history.append({"role": role, "content": interaction.message_content})
    return history


def _build_transcript(interactions: list[TriageInteraction]) -> str:
    """Build a readable transcript from interaction records."""
    lines = []
    for interaction in interactions:
        sender = interaction.sender_type.value
        lines.append(f"{sender}: {interaction.message_content}")
    return "\n".join(lines)


async def start_interview(
    request: StartInterviewRequest,
    db: Session
) -> StartInterviewResponse:
    """
    Start a triage interview for an encounter.
    Generates the AI's initial greeting and saves it as the first interaction.
    """
    # Fetch the encounter
    encounter = db.query(MedicalEncounter).filter(
        MedicalEncounter.id == request.encounter_id
    ).first()

    if not encounter:
        raise ValueError(f"Encounter {request.encounter_id} not found.")

    if encounter.status != EncounterStatus.TRIAGE_IN_PROGRESS:
        raise ValueError(f"Encounter {request.encounter_id} is not in TRIAGE_IN_PROGRESS status.")

    pipeline = _get_pipeline()

    # Generate initial greeting
    chief_complaint = encounter.chief_complaint or "unspecified symptoms"
    greeting = pipeline.get_initial_greeting(chief_complaint)

    # Save AI greeting as the first interaction
    ai_interaction = TriageInteraction(
        encounter_id=encounter.id,
        sender_type=SenderType.AI,
        message_content=greeting,
    )
    db.add(ai_interaction)
    db.commit()

    logger.info(f"Triage interview started for encounter {encounter.id}")

    return StartInterviewResponse(
        encounter_id=encounter.id,
        ai_message=greeting,
        status=encounter.status.value,
    )


async def process_message(
    request: ChatMessageRequest,
    db: Session
) -> ChatMessageResponse:
    """
    Process a single triage interview message.
    Saves the patient message, calls AI, saves AI response.
    If interview is complete, generates SOAP note.
    """
    # Fetch encounter with patient
    encounter = db.query(MedicalEncounter).filter(
        MedicalEncounter.id == request.encounter_id
    ).first()

    if not encounter:
        raise ValueError(f"Encounter {request.encounter_id} not found.")

    if encounter.status != EncounterStatus.TRIAGE_IN_PROGRESS:
        raise ValueError(f"Encounter is not in TRIAGE_IN_PROGRESS status.")

    # Save patient's message
    patient_interaction = TriageInteraction(
        encounter_id=encounter.id,
        sender_type=SenderType.PATIENT,
        message_content=request.message,
    )
    db.add(patient_interaction)
    db.flush()  # flush to get ordering right before querying history

    # Build chat history from all previous interactions
    interactions = db.query(TriageInteraction).filter(
        TriageInteraction.encounter_id == encounter.id
    ).order_by(TriageInteraction.timestamp.asc()).all()

    chat_history = _build_chat_history(interactions)

    # Build patient context
    patient = encounter.patient
    patient_context = {
        "age": _calculate_age(patient.date_of_birth) if patient.date_of_birth else "unknown",
        "gender": "unknown",  # gender field not in Patient model yet
        "chief_complaint": encounter.chief_complaint or "unspecified",
    }

    # Process through AI pipeline
    pipeline = _get_pipeline()
    ai_response = await pipeline.process_message(
        message=request.message,
        chat_history=chat_history,
        patient_context=patient_context,
    )

    # Save AI response
    ai_interaction = TriageInteraction(
        encounter_id=encounter.id,
        sender_type=SenderType.AI,
        message_content=ai_response.message,
    )
    db.add(ai_interaction)

    soap_note_schema = None

    # If interview is complete, generate SOAP note
    if ai_response.is_complete:
        logger.info(f"Interview complete for encounter {encounter.id}. Generating SOAP note...")

        # Build full transcript
        transcript = _build_transcript(interactions)

        # Generate SOAP note via AI
        soap_note = await pipeline.generate_soap_note(
            conversation_transcript=transcript,
            patient_context=patient_context,
        )

        # Save clinical note to database
        clinical_note = ClinicalNote(
            encounter_id=encounter.id,
            subjective=soap_note.subjective,
            objective=soap_note.objective,
            assessment=soap_note.assessment,
            plan=soap_note.plan,
            is_finalized=False,
            version=1,
        )
        db.add(clinical_note)

        # Update encounter status — nurse will set urgency manually
        encounter.status = EncounterStatus.AWAITING_REVIEW

        soap_note_schema = SOAPNoteSchema(
            subjective=soap_note.subjective,
            objective=soap_note.objective,
            assessment=soap_note.assessment,
            plan=soap_note.plan,
        )

        logger.info(f"SOAP note created for encounter {encounter.id}")

    db.commit()

    return ChatMessageResponse(
        ai_message=ai_response.message,
        is_interview_complete=ai_response.is_complete,
        soap_note=soap_note_schema,
    )
