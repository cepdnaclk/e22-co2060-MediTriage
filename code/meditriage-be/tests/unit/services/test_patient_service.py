import pytest
import uuid
from datetime import date, datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from unittest.mock import patch

from app.models.patient import Patient, Gender
from app.models.clinical import MedicalEncounter, EncounterStatus
from app.models.user import User, UserRole
from app.schemas.patient import PatientCreate, PatientUpdate, EncounterSummary
from app.services.patient_service import (
    create_patient,
    search_patients,
    get_patient_by_id,
    update_patient,
    soft_delete_patient,
    get_patient_encounter_history
)


def test_create_patient_success(db_session):
    """Verify that a new patient is created with correct details."""
    data = PatientCreate(
        national_id="199012345678",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        gender=Gender.MALE,
        contact_number="+94771234567"
    )
    patient = create_patient(data, db_session)
    
    assert patient is not None
    assert isinstance(patient.id, uuid.UUID)
    assert patient.national_id == "199012345678"
    assert patient.first_name == "John"
    assert patient.last_name == "Doe"
    assert patient.date_of_birth == date(1990, 1, 1)
    assert patient.gender == Gender.MALE
    assert patient.contact_number == "+94771234567"


def test_create_patient_duplicate_national_id(db_session):
    """Verify that creating patient with existing national_id raises HTTPException 409."""
    data1 = PatientCreate(
        national_id="199012345678",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        gender=Gender.MALE
    )
    create_patient(data1, db_session)

    data2 = PatientCreate(
        national_id="199012345678",  # duplicate NIC
        first_name="Jane",
        last_name="Smith",
        date_of_birth=date(1992, 2, 2),
        gender=Gender.FEMALE
    )
    with pytest.raises(HTTPException) as exc_info:
        create_patient(data2, db_session)
    
    assert exc_info.value.status_code == 409
    assert "already exists" in exc_info.value.detail


def test_create_patient_integrity_error(db_session):
    """Verify that a database IntegrityError results in rollback and HTTPException 400."""
    data = PatientCreate(
        national_id="199012345678",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        gender=Gender.MALE
    )
    
    with patch.object(db_session, "commit", side_effect=IntegrityError("mock statement", "mock params", Exception())):
        with pytest.raises(HTTPException) as exc_info:
            create_patient(data, db_session)
            
        assert exc_info.value.status_code == 400
        assert "Failed to create patient due to database constraint" in exc_info.value.detail

    # Verify rollback discarded the record
    patients = db_session.query(Patient).all()
    assert len(patients) == 0


def test_search_patients_by_nic_exact_match(db_session):
    """Verify that searching by NIC returns exact matching national_id patient."""
    p1 = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    p2 = Patient(
        national_id="222222222222",
        first_name="Jane",
        last_name="Smith",
        date_of_birth=date(1992, 2, 2)
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    results = search_patients(nic="111111111111", db=db_session)
    assert len(results) == 1
    assert results[0].id == p1.id


def test_search_patients_by_name_partial_match(db_session):
    """Verify that searching by name returns partially matching patients."""
    p1 = Patient(
        national_id="111111111111",
        first_name="Johnathon",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    p2 = Patient(
        national_id="222222222222",
        first_name="Jane",
        last_name="Smithson",
        date_of_birth=date(1992, 2, 2)
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # Search for "smith" (case-insensitive partial match on last name)
    res1 = search_patients(name="smith", db=db_session)
    assert len(res1) == 1
    assert res1[0].id == p2.id

    # Search for "john" (case-insensitive partial match on first name)
    res2 = search_patients(name="john", db=db_session)
    assert len(res2) == 1
    assert res2[0].id == p1.id

    # Search for "on" (partial match on both "Johnathon" and "Smithson")
    res3 = search_patients(name="on", db=db_session)
    assert len(res3) == 2


def test_search_patients_no_results(db_session):
    """Verify that a search with no matching criteria returns an empty list."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    db_session.add(p)
    db_session.commit()

    results = search_patients(name="NonExistentName", db=db_session)
    assert len(results) == 0
    assert results == []


def test_search_patients_no_criteria(db_session):
    """Verify that when neither nic nor name provided, all patients are returned."""
    p1 = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    p2 = Patient(
        national_id="222222222222",
        first_name="Jane",
        last_name="Smith",
        date_of_birth=date(1992, 2, 2)
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    results = search_patients(db=db_session)
    assert len(results) == 2


def test_get_patient_by_id_found(db_session):
    """Verify that a valid patient_id returns correct Patient object."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    db_session.add(p)
    db_session.commit()

    fetched = get_patient_by_id(p.id, db_session)
    assert fetched is not None
    assert fetched.id == p.id
    assert fetched.first_name == "John"


def test_get_patient_by_id_not_found(db_session):
    """Verify that a non-existent patient_id raises HTTPException 404."""
    random_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        get_patient_by_id(random_id, db_session)
    
    assert exc_info.value.status_code == 404
    assert f"Patient with ID {random_id} not found" in exc_info.value.detail


def test_update_patient_partial_fields(db_session):
    """Verify that only the fields provided in update request are changed."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        contact_number="12345"
    )
    db_session.add(p)
    db_session.commit()

    # Partially update contact number and last name
    update_data = PatientUpdate(
        last_name="Smith",
        contact_number="67890"
    )
    updated = update_patient(p.id, update_data, db_session)
    
    assert updated.last_name == "Smith"
    assert updated.contact_number == "67890"
    # Other fields should remain unchanged
    assert updated.first_name == "John"
    assert updated.national_id == "111111111111"
    assert updated.date_of_birth == date(1990, 1, 1)


def test_update_patient_not_found(db_session):
    """Verify that updating a non-existent patient raises HTTPException 404."""
    random_id = uuid.uuid4()
    update_data = PatientUpdate(first_name="Updated")
    with pytest.raises(HTTPException) as exc_info:
        update_patient(random_id, update_data, db_session)
        
    assert exc_info.value.status_code == 404


def test_soft_delete_patient_success(db_session):
    """Verify that deleting a patient removes it and returns True."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    db_session.add(p)
    db_session.commit()

    res = soft_delete_patient(p.id, db_session)
    assert res is True
    
    # Verify that the patient is deleted from database
    db_patient = db_session.query(Patient).filter(Patient.id == p.id).first()
    assert db_patient is None


def test_soft_delete_patient_not_found(db_session):
    """Verify that deleting a non-existent patient raises HTTPException 404."""
    random_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        soft_delete_patient(random_id, db_session)
        
    assert exc_info.value.status_code == 404


def test_get_patient_encounter_history(db_session):
    """Verify that it returns a list of EncounterSummary objects."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    nurse = User(
        role=UserRole.NURSE,
        full_name="Nurse Ratched"
    )
    doctor = User(
        role=UserRole.DOCTOR,
        full_name="Dr. House"
    )
    db_session.add_all([p, nurse, doctor])
    db_session.commit()

    enc = MedicalEncounter(
        patient_id=p.id,
        nurse_id=nurse.id,
        doctor_id=doctor.id,
        status=EncounterStatus.COMPLETED,
        is_urgent=True,
        chief_complaint="Severe headache"
    )
    db_session.add(enc)
    db_session.commit()

    history = get_patient_encounter_history(p.id, db_session)
    assert len(history) == 1
    summary = history[0]
    assert isinstance(summary, EncounterSummary)
    assert summary.id == enc.id
    assert summary.chief_complaint == "Severe headache"
    assert summary.status == "COMPLETED"
    assert summary.is_urgent is True
    assert summary.nurse_name == "Nurse Ratched"
    assert summary.doctor_name == "Dr. House"


def test_get_patient_encounter_history_excludes_deleted(db_session):
    """Verify that soft-deleted encounters are excluded from history."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    nurse = User(role=UserRole.NURSE, full_name="Nurse Ratched")
    db_session.add_all([p, nurse])
    db_session.commit()

    enc1 = MedicalEncounter(
        patient_id=p.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
        chief_complaint="Fever",
        deleted_at=datetime.utcnow()  # Soft-deleted
    )
    enc2 = MedicalEncounter(
        patient_id=p.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
        chief_complaint="Cough",
        deleted_at=None  # Not deleted
    )
    db_session.add_all([enc1, enc2])
    db_session.commit()

    history = get_patient_encounter_history(p.id, db_session)
    assert len(history) == 1
    assert history[0].id == enc2.id
    assert history[0].chief_complaint == "Cough"


def test_get_patient_encounter_history_ordered_by_timestamp(db_session):
    """Verify that encounters are returned in descending order (most recent first)."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    nurse = User(role=UserRole.NURSE, full_name="Nurse Ratched")
    db_session.add_all([p, nurse])
    db_session.commit()

    now = datetime.utcnow()
    enc_old = MedicalEncounter(
        patient_id=p.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
        encounter_timestamp=now - timedelta(days=2)
    )
    enc_new = MedicalEncounter(
        patient_id=p.id,
        nurse_id=nurse.id,
        status=EncounterStatus.TRIAGE_IN_PROGRESS,
        encounter_timestamp=now
    )
    db_session.add_all([enc_old, enc_new])
    db_session.commit()

    history = get_patient_encounter_history(p.id, db_session)
    assert len(history) == 2
    # Most recent should be first
    assert history[0].id == enc_new.id
    assert history[1].id == enc_old.id


def test_get_patient_encounter_history_empty(db_session):
    """Verify that a patient with no encounters returns an empty list."""
    p = Patient(
        national_id="111111111111",
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1)
    )
    db_session.add(p)
    db_session.commit()

    history = get_patient_encounter_history(p.id, db_session)
    assert history == []
