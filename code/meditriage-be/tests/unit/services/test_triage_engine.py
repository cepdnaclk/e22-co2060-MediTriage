import pytest
import uuid
from datetime import date, datetime, timedelta
from unittest.mock import patch, MagicMock, AsyncMock

from app.models.clinical import (
    MedicalEncounter,
    TriageInteraction,
    ClinicalNote,
    EncounterStatus,
    SenderType,
)
from app.models.patient import Patient, Gender
from app.models.user import User, UserRole
from app.schemas.chat import (
    StartInterviewRequest,
    ChatMessageRequest,
    StartInterviewResponse,
    ChatMessageResponse,
)
from app.services.llm.parser import InterviewResponse, SOAPNote
from app.services.triage_engine import (
    _calculate_age,
    _build_chat_history,
    _build_transcript,
    start_interview,
    process_message,
    force_finish_interview,
)


@pytest.fixture
def anyio_backend():
    return 'asyncio'


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def create_patient_helper(db, national_id="199012345678", dob=date(1990, 1, 1)):
    p = Patient(
        national_id=national_id,
        first_name="John",
        last_name="Doe",
        date_of_birth=dob,
        gender=Gender.MALE
    )
    db.add(p)
    db.flush()
    return p


def create_nurse_helper(db, full_name="Nurse Ratched"):
    u = User(role=UserRole.NURSE, full_name=full_name)
    db.add(u)
    db.flush()
    return u


# -----------------------------------------------------------------------------
# _calculate_age Tests (1-3)
# -----------------------------------------------------------------------------

def test_calculate_age_standard():
    """Correct age calculated from date of birth."""
    with patch("app.services.triage_engine.date") as mock_date:
        mock_date.today.return_value = date(2026, 7, 6)
        assert _calculate_age(date(1990, 1, 1)) == 36


def test_calculate_age_birthday_today():
    """Person whose birthday is today gets correct age."""
    with patch("app.services.triage_engine.date") as mock_date:
        mock_date.today.return_value = date(2026, 7, 6)
        assert _calculate_age(date(1990, 7, 6)) == 36


def test_calculate_age_birthday_not_yet():
    """Person whose birthday is later gets current_year - birth_year - 1."""
    with patch("app.services.triage_engine.date") as mock_date:
        mock_date.today.return_value = date(2026, 7, 6)
        assert _calculate_age(date(1990, 7, 7)) == 35


# -----------------------------------------------------------------------------
# _build_chat_history Tests (4-7)
# -----------------------------------------------------------------------------

def test_build_chat_history_ai_mapped_to_assistant():
    """TriageInteraction sender_type=AI mapped to role 'assistant'."""
    interaction = TriageInteraction(sender_type=SenderType.AI, message_content="Hello")
    history = _build_chat_history([interaction])
    assert history == [{"role": "assistant", "content": "Hello"}]


def test_build_chat_history_patient_mapped_to_user():
    """TriageInteraction sender_type=PATIENT mapped to role 'user'."""
    interaction = TriageInteraction(sender_type=SenderType.PATIENT, message_content="I feel sick")
    history = _build_chat_history([interaction])
    assert history == [{"role": "user", "content": "I feel sick"}]


def test_build_chat_history_nurse_mapped_to_user():
    """TriageInteraction sender_type=NURSE mapped to role 'user'."""
    interaction = TriageInteraction(sender_type=SenderType.NURSE, message_content="Patient looks pale")
    history = _build_chat_history([interaction])
    assert history == [{"role": "user", "content": "Patient looks pale"}]


def test_build_chat_history_preserves_order():
    """Output list maintains chronological order of input."""
    interactions = [
        TriageInteraction(sender_type=SenderType.AI, message_content="AI 1"),
        TriageInteraction(sender_type=SenderType.PATIENT, message_content="Patient 2"),
        TriageInteraction(sender_type=SenderType.AI, message_content="AI 3")
    ]
    history = _build_chat_history(interactions)
    assert history[0]["content"] == "AI 1"
    assert history[1]["content"] == "Patient 2"
    assert history[2]["content"] == "AI 3"


# -----------------------------------------------------------------------------
# _build_transcript Tests (8-9)
# -----------------------------------------------------------------------------

def test_build_transcript_format():
    """Transcript is formatted as SENDER_TYPE: message_content."""
    interactions = [
        TriageInteraction(sender_type=SenderType.AI, message_content="Hello"),
        TriageInteraction(sender_type=SenderType.PATIENT, message_content="Hi")
    ]
    transcript = _build_transcript(interactions)
    assert transcript == "AI: Hello\nPATIENT: Hi"


def test_build_transcript_empty_list():
    """Empty interaction list produces an empty string."""
    assert _build_transcript([]) == ""


# -----------------------------------------------------------------------------
# start_interview Tests (10-12)
# -----------------------------------------------------------------------------

@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
@patch("app.services.triage_engine.create_encounter")
async def test_start_interview_creates_encounter(mock_create_encounter, mock_get_pipeline, db_session):
    """start_interview() calls create_encounter() correctly."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    
    mock_enc = MedicalEncounter(
        id=uuid.uuid4(),
        patient_id=patient.id,
        nurse_id=nurse.id,
        chief_complaint="cough",
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    mock_create_encounter.return_value = mock_enc
    
    mock_pipeline = MagicMock()
    mock_pipeline.get_initial_greeting.return_value = "Hello"
    mock_get_pipeline.return_value = mock_pipeline

    request = StartInterviewRequest(patient_id=patient.id, chief_complaint="cough")
    await start_interview(request, nurse.id, db_session)

    mock_create_encounter.assert_called_once_with(
        patient_id=patient.id,
        nurse_id=nurse.id,
        chief_complaint="cough",
        db=db_session
    )


@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_start_interview_saves_ai_greeting(mock_get_pipeline, db_session):
    """AI's initial greeting is saved as a TriageInteraction."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.get_initial_greeting.return_value = "AI greeting response"
    mock_get_pipeline.return_value = mock_pipeline

    request = StartInterviewRequest(patient_id=patient.id, chief_complaint="cough")
    response = await start_interview(request, nurse.id, db_session)

    interaction = db_session.query(TriageInteraction).filter(
        TriageInteraction.encounter_id == response.encounter_id
    ).first()
    assert interaction is not None
    assert interaction.sender_type == SenderType.AI
    assert interaction.message_content == "AI greeting response"


@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_start_interview_returns_response(mock_get_pipeline, db_session):
    """Returns StartInterviewResponse with encounter_id, ai_message, status."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.get_initial_greeting.return_value = "Hello"
    mock_get_pipeline.return_value = mock_pipeline

    request = StartInterviewRequest(patient_id=patient.id, chief_complaint="cough")
    response = await start_interview(request, nurse.id, db_session)

    assert isinstance(response, StartInterviewResponse)
    assert response.encounter_id is not None
    assert response.ai_message == "Hello"
    assert response.status == "TRIAGE_IN_PROGRESS"


# -----------------------------------------------------------------------------
# process_message Tests (13-20)
# -----------------------------------------------------------------------------

@pytest.mark.anyio
async def test_process_message_encounter_not_found(db_session):
    """Raises ValueError when encounter_id does not exist."""
    request = ChatMessageRequest(encounter_id=uuid.uuid4(), message="hello")
    with pytest.raises(ValueError) as exc_info:
        await process_message(request, db_session)
    assert "not found" in str(exc_info.value)


@pytest.mark.anyio
async def test_process_message_wrong_status(db_session):
    """Raises ValueError when encounter is not in TRIAGE_IN_PROGRESS."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.COMPLETED
    )
    db_session.add(encounter)
    db_session.commit()

    request = ChatMessageRequest(encounter_id=encounter.id, message="hello")
    with pytest.raises(ValueError) as exc_info:
        await process_message(request, db_session)
    assert "not in TRIAGE_IN_PROGRESS status" in str(exc_info.value)


@pytest.mark.anyio
async def test_process_message_deleted_encounter(db_session):
    """Raises ValueError when encounter has been soft-deleted."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
        deleted_at=datetime.utcnow()
    )
    db_session.add(encounter)
    db_session.commit()

    request = ChatMessageRequest(encounter_id=encounter.id, message="hello")
    with pytest.raises(ValueError) as exc_info:
        await process_message(request, db_session)
    assert "cancelled" in str(exc_info.value).lower()


@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_process_message_saves_patient_message(mock_get_pipeline, db_session):
    """Patient's message is saved as a TriageInteraction."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    db_session.add(encounter)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.process_message = AsyncMock(
        return_value=InterviewResponse(message="AI reply", is_complete=False)
    )
    mock_get_pipeline.return_value = mock_pipeline

    request = ChatMessageRequest(encounter_id=encounter.id, message="Patient test message")
    await process_message(request, db_session)

    patient_msg = db_session.query(TriageInteraction).filter(
        TriageInteraction.encounter_id == encounter.id,
        TriageInteraction.sender_type == SenderType.PATIENT
    ).first()
    assert patient_msg is not None
    assert patient_msg.message_content == "Patient test message"


@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_process_message_saves_ai_response(mock_get_pipeline, db_session):
    """AI's response is saved as a TriageInteraction."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    db_session.add(encounter)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.process_message = AsyncMock(
        return_value=InterviewResponse(message="AI reply", is_complete=False)
    )
    mock_get_pipeline.return_value = mock_pipeline

    request = ChatMessageRequest(encounter_id=encounter.id, message="Patient message")
    await process_message(request, db_session)

    ai_msg = db_session.query(TriageInteraction).filter(
        TriageInteraction.encounter_id == encounter.id,
        TriageInteraction.sender_type == SenderType.AI
    ).first()
    assert ai_msg is not None
    assert ai_msg.message_content == "AI reply"


@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_process_message_returns_chat_response(mock_get_pipeline, db_session):
    """Returns a ChatMessageResponse with ai_message and complete flag."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    db_session.add(encounter)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.process_message = AsyncMock(
        return_value=InterviewResponse(message="Hello", is_complete=False)
    )
    mock_get_pipeline.return_value = mock_pipeline

    request = ChatMessageRequest(encounter_id=encounter.id, message="Hi")
    response = await process_message(request, db_session)

    assert isinstance(response, ChatMessageResponse)
    assert response.ai_message == "Hello"
    assert response.is_interview_complete is False
    assert response.soap_note is None


@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_process_message_generates_soap_on_completion(mock_get_pipeline, db_session):
    """When AI signals complete, a ClinicalNote is created."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    db_session.add(encounter)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.process_message = AsyncMock(
        return_value=InterviewResponse(message="Done", is_complete=True)
    )
    mock_pipeline.generate_soap_note = AsyncMock(
        return_value=SOAPNote(
            subjective="Subj data",
            objective="Obj data",
            assessment="Asst data",
            plan="Plan data"
        )
    )
    mock_get_pipeline.return_value = mock_pipeline

    request = ChatMessageRequest(encounter_id=encounter.id, message="Done")
    await process_message(request, db_session)

    clinical_note = db_session.query(ClinicalNote).filter(
        ClinicalNote.encounter_id == encounter.id
    ).first()
    assert clinical_note is not None
    assert clinical_note.subjective == "Subj data"
    assert clinical_note.objective == "Obj data"
    assert clinical_note.assessment == ""
    assert clinical_note.plan == ""


@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_process_message_soap_note_schema_returned(mock_get_pipeline, db_session):
    """Response includes SOAPNoteSchema object on completion."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    db_session.add(encounter)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.process_message = AsyncMock(
        return_value=InterviewResponse(message="Done", is_complete=True)
    )
    mock_pipeline.generate_soap_note = AsyncMock(
        return_value=SOAPNote(
            subjective="S",
            objective="O",
            assessment="A",
            plan="P"
        )
    )
    mock_get_pipeline.return_value = mock_pipeline

    request = ChatMessageRequest(encounter_id=encounter.id, message="Done")
    response = await process_message(request, db_session)

    assert response.is_interview_complete is True
    assert response.soap_note is not None
    assert response.soap_note.subjective == "S"
    assert response.soap_note.objective == "O"
    assert response.soap_note.assessment == ""
    assert response.soap_note.plan == ""


# -----------------------------------------------------------------------------
# force_finish_interview Tests (21-25)
# -----------------------------------------------------------------------------

@pytest.mark.anyio
@patch("app.services.triage_engine._get_pipeline")
async def test_force_finish_interview_generates_soap(mock_get_pipeline, db_session):
    """force_finish_interview() generates a SOAP note."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    db_session.add(encounter)
    db_session.commit()

    mock_pipeline = MagicMock()
    mock_pipeline.generate_soap_note = AsyncMock(
        return_value=SOAPNote(
            subjective="Subj force",
            objective="Obj force",
            assessment="Asst force",
            plan="Plan force"
        )
    )
    mock_get_pipeline.return_value = mock_pipeline

    clinical_note = await force_finish_interview(encounter_id=encounter.id, db=db_session)
    assert clinical_note is not None
    assert clinical_note.subjective == "Subj force"
    assert clinical_note.objective == "Obj force"
    assert clinical_note.assessment == ""
    assert clinical_note.plan == ""


@pytest.mark.anyio
async def test_force_finish_existing_note_returns_it(db_session):
    """If ClinicalNote already exists, it is returned without regenerating."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS
    )
    db_session.add(encounter)
    db_session.flush()

    existing_note = ClinicalNote(
        encounter_id=encounter.id,
        subjective="Existing subjective",
        objective="Existing objective",
        assessment="",
        plan="",
        is_finalized=False,
        version=1
    )
    db_session.add(existing_note)
    db_session.commit()

    with patch("app.services.triage_engine._get_pipeline") as mock_get_pipeline:
        result_note = await force_finish_interview(encounter.id, db_session)
        assert result_note.id == existing_note.id
        assert result_note.subjective == "Existing subjective"
        mock_get_pipeline.assert_not_called()


@pytest.mark.anyio
async def test_force_finish_encounter_not_found(db_session):
    """Raises ValueError for non-existent encounter id."""
    with pytest.raises(ValueError) as exc_info:
        await force_finish_interview(uuid.uuid4(), db_session)
    assert "not found" in str(exc_info.value)


@pytest.mark.anyio
async def test_force_finish_wrong_status(db_session):
    """Raises ValueError when encounter is not in TRIAGE_IN_PROGRESS."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.COMPLETED
    )
    db_session.add(encounter)
    db_session.commit()

    with pytest.raises(ValueError) as exc_info:
        await force_finish_interview(encounter.id, db_session)
    assert "not in TRIAGE_IN_PROGRESS status" in str(exc_info.value)


@pytest.mark.anyio
async def test_force_finish_deleted_encounter(db_session):
    """Raises ValueError when encounter has been soft-deleted."""
    patient = create_patient_helper(db_session)
    nurse = create_nurse_helper(db_session)
    encounter = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
        deleted_at=datetime.utcnow()
    )
    db_session.add(encounter)
    db_session.commit()

    with pytest.raises(ValueError) as exc_info:
        await force_finish_interview(encounter.id, db_session)
    assert "cancelled" in str(exc_info.value)
