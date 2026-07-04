import pytest
from unittest.mock import MagicMock, AsyncMock
from app.services.llm.chain_factory import TriagePipeline
from app.services.llm.parser import InterviewResponse, SOAPNote

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.fixture
def mock_provider():
    provider = MagicMock()
    provider.generate_response = AsyncMock(return_value="AI response")
    provider.generate_structured_output = AsyncMock(return_value='{"subjective": "S1"}')
    return provider

def test_get_initial_greeting_contains_complaint(mock_provider):
    """get_initial_greeting() returns a string that contains the complaint"""
    pipeline = TriagePipeline(provider=mock_provider)
    res = pipeline.get_initial_greeting("severe chest pain")
    assert "severe chest pain" in res

def test_pipeline_accepts_custom_provider(mock_provider):
    """TriagePipeline can be initialized with a custom BaseReasoningProvider instance"""
    pipeline = TriagePipeline(provider=mock_provider)
    assert pipeline.provider is mock_provider

@pytest.mark.anyio
async def test_process_message_calls_scrubber(mock_provider):
    """During process_message(), the PII scrubber's scrub() method is called with raw input message"""
    pipeline = TriagePipeline(provider=mock_provider)

    pipeline.scrubber = MagicMock()
    pipeline.scrubber.scrub = AsyncMock(return_value="Scrubbed message")

    pipeline.parser = MagicMock()
    pipeline.parser.parse_interview_response = MagicMock(return_value=MagicMock())

    await pipeline.process_message(
        message="Raw message",
        chat_history=[],
        patient_context={"age": 30, "gender": "male", "chief_complaint": "cough"}
    )
    pipeline.scrubber.scrub.assert_called_once_with("Raw message")

@pytest.mark.anyio
async def test_process_message_calls_provider_with_scrubbed_text(mock_provider):
    """The LLM provider's generate_response() receives the scrubbed message"""
    pipeline = TriagePipeline(provider=mock_provider)

    pipeline.scrubber = MagicMock()
    pipeline.scrubber.scrub = AsyncMock(return_value="Scrubbed message")

    pipeline.parser = MagicMock()
    pipeline.parser.parse_interview_response = MagicMock(return_value=MagicMock())

    await pipeline.process_message(
        message="Raw message",
        chat_history=[],
        patient_context={"age": 30, "gender": "male", "chief_complaint": "cough"}
    )
    mock_provider.generate_response.assert_called_once()
    kwargs = mock_provider.generate_response.call_args.kwargs
    assert kwargs["user_message"] == "Scrubbed message"

@pytest.mark.anyio
async def test_process_message_calls_parser(mock_provider):
    """The parser's parse_interview_response() is called with the LLM's raw output"""
    mock_provider.generate_response = AsyncMock(return_value="Raw LLM output")
    pipeline = TriagePipeline(provider=mock_provider)

    pipeline.scrubber = MagicMock()
    pipeline.scrubber.scrub = AsyncMock(return_value="Scrubbed message")

    pipeline.parser = MagicMock()
    pipeline.parser.parse_interview_response = MagicMock(return_value=MagicMock())

    await pipeline.process_message(
        message="Raw message",
        chat_history=[],
        patient_context={"age": 30, "gender": "male", "chief_complaint": "cough"}
    )
    pipeline.parser.parse_interview_response.assert_called_once_with("Raw LLM output")

@pytest.mark.anyio
async def test_process_message_returns_interview_response(mock_provider):
    """process_message() returns an InterviewResponse object"""
    pipeline = TriagePipeline(provider=mock_provider)

    pipeline.scrubber = MagicMock()
    pipeline.scrubber.scrub = AsyncMock(return_value="Scrubbed message")

    expected_response = InterviewResponse(message="Next question?", is_complete=False)
    pipeline.parser = MagicMock()
    pipeline.parser.parse_interview_response = MagicMock(return_value=expected_response)

    res = await pipeline.process_message(
        message="Raw message",
        chat_history=[],
        patient_context={"age": 30, "gender": "male", "chief_complaint": "cough"}
    )
    assert res is expected_response

@pytest.mark.anyio
async def test_process_message_passes_patient_context(mock_provider):
    """The system prompt passed to the provider includes patient context"""
    pipeline = TriagePipeline(provider=mock_provider)

    pipeline.scrubber = MagicMock()
    pipeline.scrubber.scrub = AsyncMock(return_value="Scrubbed message")

    pipeline.parser = MagicMock()
    pipeline.parser.parse_interview_response = MagicMock(return_value=MagicMock())

    await pipeline.process_message(
        message="Raw message",
        chat_history=[],
        patient_context={"age": 35, "gender": "Female", "chief_complaint": "chest pain"}
    )

    kwargs = mock_provider.generate_response.call_args.kwargs
    system_prompt = kwargs["system_prompt"]
    assert "35" in system_prompt
    assert "Female" in system_prompt
    assert "chest pain" in system_prompt

@pytest.mark.anyio
async def test_generate_soap_note_calls_provider(mock_provider):
    """generate_soap_note() calls the provider's generate_structured_output() method"""
    pipeline = TriagePipeline(provider=mock_provider)

    pipeline.parser = MagicMock()
    pipeline.parser.parse_soap_note = MagicMock(return_value=MagicMock())

    await pipeline.generate_soap_note(
        conversation_transcript="Transcript text",
        patient_context={"age": 30, "gender": "male", "chief_complaint": "cough"}
    )
    mock_provider.generate_structured_output.assert_called_once()
    kwargs = mock_provider.generate_structured_output.call_args.kwargs
    assert "Transcript text" in kwargs["system_prompt"]

@pytest.mark.anyio
async def test_generate_soap_note_returns_soap_note(mock_provider):
    """generate_soap_note() returns a SOAPNote dataclass"""
    pipeline = TriagePipeline(provider=mock_provider)

    expected_note = SOAPNote(subjective="S1", objective="O1", assessment="A1", plan="P1")
    pipeline.parser = MagicMock()
    pipeline.parser.parse_soap_note = MagicMock(return_value=expected_note)

    res = await pipeline.generate_soap_note(
        conversation_transcript="Transcript text",
        patient_context={"age": 30, "gender": "male", "chief_complaint": "cough"}
    )
    assert res is expected_note
