import pytest
import logging
from app.services.llm.parser import LLMOutputParser, InterviewResponse, SOAPNote

@pytest.fixture
def parser():
    return LLMOutputParser()

def test_parse_normal_response(parser):
    """A regular question text is parsed as Interview Response with is_complete=False"""
    raw = "What is your main symptom?"
    res = parser.parse_interview_response(raw)
    assert isinstance(res, InterviewResponse)
    assert res.is_complete is False
    assert res.message == "What is your main symptom?"

def test_parse_complete_signal(parser):
    """Text containing the exact '[INTERVIEW_COMPLETE]' signal is parsed with is_complete=True"""
    raw = "[INTERVIEW_COMPLETE]"
    res = parser.parse_interview_response(raw)
    assert isinstance(res, InterviewResponse)
    assert res.is_complete is True
    assert res.message == "The interview is now complete. Generating clinical summary..."

def test_parse_complete_signal_with_surrounding_text(parser):
    """The completion signal embedded within other text is still detected correctly"""
    raw = "Thank you. [INTERVIEW_COMPLETE] Generating notes."
    res = parser.parse_interview_response(raw)
    assert isinstance(res, InterviewResponse)
    assert res.is_complete is True
    assert res.message == "The interview is now complete. Generating clinical summary..."

def test_parse_whitespace_response(parser):
    """A response with leading/trailing whitespace is trimmed properly"""
    raw = "   How are you feeling?   "
    res = parser.parse_interview_response(raw)
    assert res.is_complete is False
    assert res.message == "How are you feeling?"

def test_parse_empty_response(parser):
    """An empty string is parsed as is_complete=False with an empty message"""
    raw = ""
    res = parser.parse_interview_response(raw)
    assert res.is_complete is False
    assert res.message == ""

def test_parse_soap_valid_json(parser):
    """Valid JSON with all four SOAP fields is parsed into a correct SOAPNote dataclass"""
    raw = '{"subjective": "S1", "objective": "O1", "assessment": "A1", "plan": "P1"}'
    note = parser.parse_soap_note(raw)
    assert isinstance(note, SOAPNote)
    assert note.subjective == "S1"
    assert note.objective == "O1"
    assert note.assessment == "A1"
    assert note.plan == "P1"

def test_parse_soap_with_markdown_code_fences(parser):
    """JSON wrapped in markdown code fences is stripped and parsed correctly"""
    raw = '```json\n{"subjective": "S1", "objective": "O1", "assessment": "A1", "plan": "P1"}\n```'
    note = parser.parse_soap_note(raw)
    assert note.subjective == "S1"
    assert note.objective == "O1"

def test_parse_soap_missing_optional_fields(parser):
    """JSON missing 'assessment' and 'plan' fields defaults those to empty strings"""
    raw = '{"subjective": "S1", "objective": "O1"}'
    note = parser.parse_soap_note(raw)
    assert note.subjective == "S1"
    assert note.objective == "O1"
    assert note.assessment == ""
    assert note.plan == ""

def test_parse_soap_missing_required_fields(parser, caplog):
    """JSON missing 'subjective' defaults it to empty string and logs a warning"""
    raw = '{"objective": "O1", "assessment": "A1", "plan": "P1"}'
    with caplog.at_level(logging.WARNING):
        note = parser.parse_soap_note(raw)
    assert note.subjective == ""
    assert note.objective == "O1"
    assert any("Missing field 'subjective'" in record.message for record in caplog.records)

def test_parse_soap_invalid_json(parser):
    """Completely malformed non-JSON text raises a ValueError with a descriptive message"""
    raw = "not a json"
    with pytest.raises(ValueError) as exc_info:
        parser.parse_soap_note(raw)
    assert "invalid JSON" in str(exc_info.value)

def test_parse_soap_empty_string(parser):
    """An empty string input raises a ValueError"""
    raw = ""
    with pytest.raises(ValueError):
        parser.parse_soap_note(raw)
