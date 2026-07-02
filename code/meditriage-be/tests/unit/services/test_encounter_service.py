import pytest
import uuid
from datetime import datetime, timedelta, date
from fastapi import HTTPException

from app.models.patient import Patient
from app.models.user import User, UserRole
from app.models.clinical import (
    MedicalEncounter, TriageInteraction, ClinicalNote,
    EncounterStatus, SenderType
)
from app.schemas.clinical import EncounterUpdateRequest, ClinicalNoteUpdate
from app.services.encounter_service import (
    create_encounter,
    get_active_encounters,
    get_encounter_with_messages,
    update_encounter,
    delete_encounter,
    get_clinical_note,
    update_clinical_note,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_patient(db, national_id="199012345678"):
    p = Patient(
        national_id=national_id,
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    db.add(p)
    db.flush()
    return p


def make_user(db, role=UserRole.NURSE, full_name="Test Nurse"):
    u = User(role=role, full_name=full_name)
    db.add(u)
    db.flush()
    return u


def make_encounter(db, patient, nurse, status=EncounterStatus.TRIAGE_IN_PROGRESS,
                   is_urgent=False, chief_complaint=None, doctor=None,
                   encounter_timestamp=None, deleted_at=None):
    enc = MedicalEncounter(
        patient_id=patient.id,
        nurse_id=nurse.id,
        doctor_id=doctor.id if doctor else None,
        status=status,
        is_urgent=is_urgent,
        chief_complaint=chief_complaint,
        encounter_timestamp=encounter_timestamp or datetime.utcnow(),
        deleted_at=deleted_at,
    )
    db.add(enc)
    db.flush()
    return enc


def make_note(db, encounter, version=1, is_finalized=False,
              subjective=None, objective=None, assessment=None, plan=None):
    note = ClinicalNote(
        encounter_id=encounter.id,
        subjective=subjective,
        objective=objective,
        assessment=assessment,
        plan=plan,
        version=version,
        is_finalized=is_finalized,
    )
    db.add(note)
    db.flush()
    return note


# ─────────────────────────────────────────────────────────────────────────────
# create_encounter
# ─────────────────────────────────────────────────────────────────────────────

def test_create_encounter_default_status(db_session):
    """A new encounter is created with status TRIAGE_IN_PROGRESS."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = create_encounter(patient.id, nurse.id, None, db_session)

    assert enc is not None
    assert enc.status == EncounterStatus.TRIAGE_IN_PROGRESS


def test_create_encounter_sets_patient_and_nurse(db_session):
    """Encounter has correct patient_id and nurse_id."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = create_encounter(patient.id, nurse.id, None, db_session)

    assert enc.patient_id == patient.id
    assert enc.nurse_id == nurse.id


def test_create_encounter_stores_chief_complaint(db_session):
    """The chief_complaint field is stored correctly."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = create_encounter(patient.id, nurse.id, "Severe chest pain", db_session)

    assert enc.chief_complaint == "Severe chest pain"


# ─────────────────────────────────────────────────────────────────────────────
# get_active_encounters
# ─────────────────────────────────────────────────────────────────────────────

def test_get_active_encounters_includes_correct_statuses(db_session):
    """Returns encounters with active statuses (TRIAGE_IN_PROGRESS, AWAITING_REVIEW, COMPLETED)."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc1 = make_encounter(db_session, patient, nurse, status=EncounterStatus.TRIAGE_IN_PROGRESS)
    enc2 = make_encounter(db_session, patient, nurse, status=EncounterStatus.AWAITING_REVIEW)
    db_session.commit()

    results = get_active_encounters(db_session)
    result_ids = [r.id for r in results]

    assert enc1.id in result_ids
    assert enc2.id in result_ids


def test_get_active_encounters_excludes_soft_deleted(db_session):
    """Soft-deleted encounters are excluded."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    active = make_encounter(db_session, patient, nurse, status=EncounterStatus.TRIAGE_IN_PROGRESS)
    deleted = make_encounter(db_session, patient, nurse, status=EncounterStatus.TRIAGE_IN_PROGRESS,
                             deleted_at=datetime.utcnow())
    db_session.commit()

    results = get_active_encounters(db_session)
    result_ids = [r.id for r in results]

    assert active.id in result_ids
    assert deleted.id not in result_ids


def test_get_active_encounters_urgent_first(db_session):
    """Urgent encounters appear before non-urgent ones."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    now = datetime.utcnow()
    non_urgent = make_encounter(db_session, patient, nurse, is_urgent=False,
                                encounter_timestamp=now - timedelta(minutes=10))
    urgent = make_encounter(db_session, patient, nurse, is_urgent=True,
                            encounter_timestamp=now)
    db_session.commit()

    results = get_active_encounters(db_session)
    result_ids = [r.id for r in results]

    assert result_ids.index(urgent.id) < result_ids.index(non_urgent.id)


def test_get_active_encounters_oldest_first_within_group(db_session):
    """Within urgency group, ordered oldest arrival first."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    now = datetime.utcnow()
    older = make_encounter(db_session, patient, nurse, is_urgent=False,
                           encounter_timestamp=now - timedelta(hours=2))
    newer = make_encounter(db_session, patient, nurse, is_urgent=False,
                           encounter_timestamp=now)
    db_session.commit()

    results = get_active_encounters(db_session)
    result_ids = [r.id for r in results]

    assert result_ids.index(older.id) < result_ids.index(newer.id)


# ─────────────────────────────────────────────────────────────────────────────
# get_encounter_with_messages
# ─────────────────────────────────────────────────────────────────────────────

def test_get_encounter_with_messages_found(db_session):
    """Returns MedicalEncounter and ordered TriageInteractions."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    db_session.commit()

    now = datetime.utcnow()
    msg1 = TriageInteraction(encounter_id=enc.id, sender_type=SenderType.AI,
                              message_content="Hello", timestamp=now - timedelta(minutes=2))
    msg2 = TriageInteraction(encounter_id=enc.id, sender_type=SenderType.PATIENT,
                              message_content="I have a headache", timestamp=now)
    db_session.add_all([msg1, msg2])
    db_session.commit()

    returned_enc, messages = get_encounter_with_messages(enc.id, db_session)

    assert returned_enc.id == enc.id
    assert len(messages) == 2
    assert messages[0].id == msg1.id   # oldest first
    assert messages[1].id == msg2.id


def test_get_encounter_messages_not_found(db_session):
    """A non-existent encounter_id raises HTTPException 404."""
    with pytest.raises(HTTPException) as exc_info:
        get_encounter_with_messages(uuid.uuid4(), db_session)

    assert exc_info.value.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# update_encounter
# ─────────────────────────────────────────────────────────────────────────────

def test_update_encounter_urgency_flag(db_session):
    """Setting is_urgent=True updates correctly."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse, is_urgent=False)
    db_session.commit()

    updated = update_encounter(enc.id, EncounterUpdateRequest(is_urgent=True), db_session)

    assert updated.is_urgent is True


def test_update_encounter_doctor_assignment(db_session):
    """Setting doctor_id updates correctly."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    doctor = make_user(db_session, role=UserRole.DOCTOR, full_name="Dr. House")
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    db_session.commit()

    updated = update_encounter(enc.id, EncounterUpdateRequest(doctor_id=doctor.id), db_session)

    assert updated.doctor_id == doctor.id


def test_update_encounter_status_change(db_session):
    """Changing the status updates correctly."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse, status=EncounterStatus.TRIAGE_IN_PROGRESS)
    db_session.commit()

    updated = update_encounter(
        enc.id, EncounterUpdateRequest(status=EncounterStatus.AWAITING_REVIEW), db_session
    )

    assert updated.status == EncounterStatus.AWAITING_REVIEW


def test_update_encounter_multiple_fields(db_session):
    """Updating multiple fields applies all changes."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    doctor = make_user(db_session, role=UserRole.DOCTOR, full_name="Dr. House")
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    db_session.commit()

    updated = update_encounter(
        enc.id,
        EncounterUpdateRequest(
            is_urgent=True,
            doctor_id=doctor.id,
            status=EncounterStatus.AWAITING_REVIEW
        ),
        db_session
    )

    assert updated.is_urgent is True
    assert updated.doctor_id == doctor.id
    assert updated.status == EncounterStatus.AWAITING_REVIEW


def test_update_encounter_not_found(db_session):
    """Updating a non-existent encounter raises HTTPException 404."""
    with pytest.raises(HTTPException) as exc_info:
        update_encounter(uuid.uuid4(), EncounterUpdateRequest(is_urgent=True), db_session)

    assert exc_info.value.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# delete_encounter
# ─────────────────────────────────────────────────────────────────────────────

def test_delete_encounter_triage_in_progress(db_session):
    """Encounter in TRIAGE_IN_PROGRESS is soft-deleted."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse, status=EncounterStatus.TRIAGE_IN_PROGRESS)
    db_session.commit()

    delete_encounter(enc.id, db_session)
    db_session.refresh(enc)

    assert enc.deleted_at is not None


def test_delete_encounter_awaiting_review_no_doctor(db_session):
    """Encounter in AWAITING_REVIEW with no doctor is soft-deleted."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse, status=EncounterStatus.AWAITING_REVIEW)
    db_session.commit()

    delete_encounter(enc.id, db_session)
    db_session.refresh(enc)

    assert enc.deleted_at is not None


def test_delete_encounter_completed_blocked(db_session):
    """Encounter in COMPLETED status raises HTTPException 409."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse, status=EncounterStatus.COMPLETED)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        delete_encounter(enc.id, db_session)

    assert exc_info.value.status_code == 409


def test_delete_encounter_awaiting_review_with_doctor_blocked(db_session):
    """Encounter in AWAITING_REVIEW with doctor raises HTTPException 409."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    doctor = make_user(db_session, role=UserRole.DOCTOR, full_name="Dr. House")
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse, status=EncounterStatus.AWAITING_REVIEW,
                         doctor=doctor)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        delete_encounter(enc.id, db_session)

    assert exc_info.value.status_code == 409


def test_delete_encounter_not_found(db_session):
    """Deleting a non-existent encounter raises HTTPException 404."""
    with pytest.raises(HTTPException) as exc_info:
        delete_encounter(uuid.uuid4(), db_session)

    assert exc_info.value.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# get_clinical_note
# ─────────────────────────────────────────────────────────────────────────────

def test_get_clinical_note_found(db_session):
    """Returns ClinicalNote object when it exists."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    note = make_note(db_session, enc, subjective="Patient reports pain")
    db_session.commit()

    result = get_clinical_note(enc.id, db_session)

    assert result is not None
    assert result.id == note.id
    assert result.subjective == "Patient reports pain"


def test_get_clinical_note_not_found(db_session):
    """Returns None when no clinical note exists."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    db_session.commit()

    result = get_clinical_note(enc.id, db_session)

    assert result is None


# ─────────────────────────────────────────────────────────────────────────────
# update_clinical_note
# ─────────────────────────────────────────────────────────────────────────────

def test_update_clinical_note_nurse_edits_fields(db_session):
    """Nurse can update subjective, objective, assessment, and plan fields."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    make_note(db_session, enc)
    db_session.commit()

    data = ClinicalNoteUpdate(
        subjective="Patient has fever",
        objective="Temp 39.1C",
        assessment="Likely viral infection",
        plan="Rest and fluids"
    )
    updated = update_clinical_note(enc.id, data, nurse, db_session)

    assert updated.subjective == "Patient has fever"
    assert updated.objective == "Temp 39.1C"
    assert updated.assessment == "Likely viral infection"
    assert updated.plan == "Rest and fluids"


def test_update_clinical_note_version_increments(db_session):
    """Each update increments version number by 1."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    note = make_note(db_session, enc, version=1)
    db_session.commit()

    data = ClinicalNoteUpdate(subjective="Updated subjective")
    updated = update_clinical_note(enc.id, data, nurse, db_session)

    assert updated.version == 2

    # Do another update
    updated2 = update_clinical_note(enc.id, ClinicalNoteUpdate(objective="Updated objective"), nurse, db_session)
    assert updated2.version == 3


def test_update_clinical_note_doctor_finalize(db_session):
    """Doctor can set is_finalized=True and COMPLETED status."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    doctor = make_user(db_session, role=UserRole.DOCTOR, full_name="Dr. House")
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    make_note(db_session, enc)
    db_session.commit()

    data = ClinicalNoteUpdate(is_finalized=True)
    updated = update_clinical_note(enc.id, data, doctor, db_session)

    assert updated.is_finalized is True
    # Also verify encounter status is set to COMPLETED
    db_session.refresh(enc)
    assert enc.status == EncounterStatus.COMPLETED
    assert enc.doctor_id == doctor.id


def test_update_clinical_note_nurse_cannot_finalize(db_session):
    """Nurse attempting to finalize raises HTTPException 403."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    make_note(db_session, enc)
    db_session.commit()

    data = ClinicalNoteUpdate(is_finalized=True)
    with pytest.raises(HTTPException) as exc_info:
        update_clinical_note(enc.id, data, nurse, db_session)

    assert exc_info.value.status_code == 403
    assert "Only doctors can finalize" in exc_info.value.detail


def test_update_clinical_note_already_finalized(db_session):
    """Editing already-finalized note raises HTTPException 403."""
    patient = make_patient(db_session)
    nurse = make_user(db_session)
    db_session.commit()

    enc = make_encounter(db_session, patient, nurse)
    make_note(db_session, enc, is_finalized=True)
    db_session.commit()

    data = ClinicalNoteUpdate(subjective="Trying to edit finalized note")
    with pytest.raises(HTTPException) as exc_info:
        update_clinical_note(enc.id, data, nurse, db_session)

    assert exc_info.value.status_code == 403
    assert "finalized" in exc_info.value.detail


def test_update_clinical_note_not_found(db_session):
    """Updating note for non-existent encounter raises HTTPException 404."""
    nurse = make_user(db_session)
    db_session.commit()

    data = ClinicalNoteUpdate(subjective="Some update")
    with pytest.raises(HTTPException) as exc_info:
        update_clinical_note(uuid.uuid4(), data, nurse, db_session)

    assert exc_info.value.status_code == 404
