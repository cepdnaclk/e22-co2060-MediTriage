import pytest
from unittest.mock import patch
from app.services.llm.scrubber import PIIScrubber

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.fixture
def scrubber_no_ollama():
    # Patch ChatOllama initialization to fail, forcing regex fallback
    with patch("app.services.llm.scrubber.ChatOllama", side_effect=Exception("Ollama offline")):
        return PIIScrubber()

def test_regex_scrub_nic_old_format(scrubber_no_ollama):
    """Old-format Sri Lankan NIC is replaced with [NIC_REDACTED]"""
    raw = "NIC: 941234567V"
    assert scrubber_no_ollama._scrub_with_regex(raw) == "NIC: [NIC_REDACTED]"

def test_regex_scrub_nic_new_format(scrubber_no_ollama):
    """New-format Sri Lankan NIC is replaced with [NIC_REDACTED]"""
    raw = "NIC: 199412345678"
    assert scrubber_no_ollama._scrub_with_regex(raw) == "NIC: [NIC_REDACTED]"

def test_regex_scrub_nic_lowercase_v(scrubber_no_ollama):
    """NIC with lowercase 'v' suffix is detected and redacted"""
    raw = "NIC: 941234567v"
    assert scrubber_no_ollama._scrub_with_regex(raw) == "NIC: [NIC_REDACTED]"

def test_regex_scrub_phone_local_format(scrubber_no_ollama):
    """Local phone number is replaced with [PHONE_REDACTED]"""
    raw = "Phone: 0771234567"
    assert scrubber_no_ollama._scrub_with_regex(raw) == "Phone: [PHONE_REDACTED]"

def test_regex_scrub_phone_international_format(scrubber_no_ollama):
    """International format phone is replaced with [PHONE_REDACTED]"""
    raw = "Phone: +94771234567"
    assert scrubber_no_ollama._scrub_with_regex(raw) == "Phone: [PHONE_REDACTED]"

def test_regex_scrub_phone_with_spaces(scrubber_no_ollama):
    """Phone number with spaces is detected and redacted"""
    raw = "Phone: +94 77 123 4567"
    assert scrubber_no_ollama._scrub_with_regex(raw) == "Phone: [PHONE_REDACTED]"

def test_regex_scrub_email(scrubber_no_ollama):
    """Email address is replaced with [EMAIL_REDACTED]"""
    raw = "Email: patient@domain.com"
    assert scrubber_no_ollama._scrub_with_regex(raw) == "Email: [EMAIL_REDACTED]"

def test_regex_scrub_preserves_medical_text(scrubber_no_ollama):
    """Medical terms and symptom descriptions are NOT altered"""
    raw = "Patient has severe headache, fever and shortness of breath."
    assert scrubber_no_ollama._scrub_with_regex(raw) == raw

def test_regex_scrub_multiple_pii_types(scrubber_no_ollama):
    """Text containing NIC + phone + email simultaneously has all three redacted"""
    raw = "NIC: 941234567V, Phone: 0771234567, Email: test@test.com"
    expected = "NIC: [NIC_REDACTED], Phone: [PHONE_REDACTED], Email: [EMAIL_REDACTED]"
    assert scrubber_no_ollama._scrub_with_regex(raw) == expected

def test_regex_scrub_no_pii_present(scrubber_no_ollama):
    """Clean medical text with no PII is returned completely unchanged"""
    raw = "Clean medical text with no PII."
    assert scrubber_no_ollama._scrub_with_regex(raw) == raw

@pytest.mark.anyio
async def test_scrub_falls_back_to_regex_when_ollama_unavailable(scrubber_no_ollama):
    """When Ollama is not initialized, the scrub method uses regex-based fallback"""
    raw = "My phone is 0771234567"
    res = await scrubber_no_ollama.scrub(raw)
    assert res == "My phone is [PHONE_REDACTED]"
