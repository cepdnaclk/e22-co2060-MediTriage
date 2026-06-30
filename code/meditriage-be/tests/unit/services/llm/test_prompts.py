import pytest
from app.services.llm.prompts import (
    TRIAGE_INTERVIEW_SYSTEM_PROMPT,
    SOAP_GENERATION_SYSTEM_PROMPT,
    INITIAL_GREETING_TEMPLATE,
    PII_SCRUBBING_PROMPT,
)

def test_triage_prompt_accepts_all_placeholders():
    """TRIAGE_INTERVIEW_SYSTEM_PROMPT.format completes without KeyError"""
    try:
        TRIAGE_INTERVIEW_SYSTEM_PROMPT.format(
            age=45,
            gender="male",
            chief_complaint="chest pain"
        )
    except KeyError as e:
        pytest.fail(f"TRIAGE_INTERVIEW_SYSTEM_PROMPT failed with KeyError: {e}")

def test_triage_prompt_contains_patient_context():
    """The formatted prompt includes the provided age, gender, and chief complaint values"""
    age = "30"
    gender = "female"
    chief_complaint = "severe headache"
    
    formatted = TRIAGE_INTERVIEW_SYSTEM_PROMPT.format(
        age=age,
        gender=gender,
        chief_complaint=chief_complaint
    )
    
    assert age in formatted
    assert gender in formatted
    assert chief_complaint in formatted

def test_soap_prompt_accepts_all_placeholders():
    """SOAP_GENERATION_SYSTEM_PROMPT.format completes without KeyError"""
    try:
        SOAP_GENERATION_SYSTEM_PROMPT.format(
            age=50,
            gender="female",
            chief_complaint="shortness of breath",
            transcript="Nurse: Hello. Patient: I cannot breathe."
        )
    except KeyError as e:
        pytest.fail(f"SOAP_GENERATION_SYSTEM_PROMPT failed with KeyError: {e}")

def test_soap_prompt_contains_transcript():
    """The formatted SOAP prompt includes the provided transcript text"""
    transcript = "Patient reports palpitations."
    formatted = SOAP_GENERATION_SYSTEM_PROMPT.format(
        age=40,
        gender="male",
        chief_complaint="palpitations",
        transcript=transcript
    )
    assert transcript in formatted

def test_initial_greeting_contains_complaint():
    """INITIAL_GREETING_TEMPLATE.format includes the chief complaint"""
    chief_complaint = "back pain"
    formatted = INITIAL_GREETING_TEMPLATE.format(chief_complaint=chief_complaint)
    assert chief_complaint in formatted

def test_pii_prompt_accepts_text_placeholder():
    """PII_SCRUBBING_PROMPT.format completes without error"""
    try:
        PII_SCRUBBING_PROMPT.format(text="My name is John Doe")
    except KeyError as e:
        pytest.fail(f"PII_SCRUBBING_PROMPT failed with KeyError: {e}")
