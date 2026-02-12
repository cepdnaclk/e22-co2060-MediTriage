"""
Pipeline orchestrator for the AI triage system.
Chains: PII Scrubbing → LLM Reasoning → Output Parsing.

This is the single entry point for all AI interactions.
Business logic in triage_engine.py calls this module.
"""
from typing import Optional
from app.core.config import get_settings
from app.core.logging import get_logger
from .scrubber import PIIScrubber
from .parser import LLMOutputParser, InterviewResponse, SOAPNote
from .prompts import (
    TRIAGE_INTERVIEW_SYSTEM_PROMPT,
    SOAP_GENERATION_SYSTEM_PROMPT,
    INITIAL_GREETING_TEMPLATE,
)
from .providers.base_provider import BaseReasoningProvider
from .providers.deepseek_provider import DeepSeekProvider
from .providers.openai_provider import OpenAIProvider

logger = get_logger(__name__)


def _create_provider() -> BaseReasoningProvider:
    """
    Factory function: creates the active LLM provider based on config.
    Swap providers by changing ACTIVE_LLM in .env (DEEPSEEK | OPENAI).
    """
    settings = get_settings()
    active = settings.ACTIVE_LLM.upper()

    if active == "OPENAI":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in environment.")
        logger.info("Initializing OpenAI provider.")
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
        )
    else:
        # Default: DeepSeek
        if not settings.DEEPSEEK_API_KEY:
            raise ValueError("DEEPSEEK_API_KEY is not set in environment.")
        logger.info("Initializing DeepSeek provider.")
        return DeepSeekProvider(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            model=settings.DEEPSEEK_MODEL,
        )


class TriagePipeline:
    """
    The central AI pipeline orchestrator.

    Flow: Raw Input → PII Scrub → LLM Provider → Output Parse → Response

    Usage:
        pipeline = TriagePipeline()
        response = await pipeline.process_message(
            message="Patient says chest hurts",
            chat_history=[...],
            patient_context={"age": 45, "gender": "Male", "chief_complaint": "Chest Pain"}
        )
    """

    def __init__(self, provider: Optional[BaseReasoningProvider] = None):
        self.scrubber = PIIScrubber()
        self.parser = LLMOutputParser()
        self.provider = provider or _create_provider()
        logger.info("TriagePipeline initialized.")

    def get_initial_greeting(self, chief_complaint: str) -> str:
        """
        Generate the first AI message to kick off the interview.

        Args:
            chief_complaint: The patient's presenting complaint.

        Returns:
            Formatted greeting string.
        """
        return INITIAL_GREETING_TEMPLATE.format(chief_complaint=chief_complaint)

    async def process_message(
        self,
        message: str,
        chat_history: list[dict],
        patient_context: dict,
    ) -> InterviewResponse:
        """
        Process a single triage interview message through the full pipeline.

        Args:
            message: Raw patient/nurse input.
            chat_history: Previous messages [{"role": "user"|"assistant", "content": "..."}].
            patient_context: {"age": int, "gender": str, "chief_complaint": str}.

        Returns:
            InterviewResponse with the AI's next question or completion signal.
        """
        # Step 1: PII Scrubbing
        sanitized_message = await self.scrubber.scrub(message)
        logger.debug(f"Scrubbed message: {sanitized_message[:100]}...")

        # Step 2: Build system prompt with patient context
        system_prompt = TRIAGE_INTERVIEW_SYSTEM_PROMPT.format(
            age=patient_context.get("age", "unknown"),
            gender=patient_context.get("gender", "unknown"),
            chief_complaint=patient_context.get("chief_complaint", "unspecified"),
        )

        # Step 3: Call LLM provider
        raw_response = await self.provider.generate_response(
            system_prompt=system_prompt,
            chat_history=chat_history,
            user_message=sanitized_message,
        )
        logger.debug(f"LLM response: {raw_response[:100]}...")

        # Step 4: Parse output
        return self.parser.parse_interview_response(raw_response)

    async def generate_soap_note(
        self,
        conversation_transcript: str,
        patient_context: dict,
    ) -> SOAPNote:
        """
        Generate a structured SOAP note from the complete interview transcript.

        Args:
            conversation_transcript: Full text of the interview.
            patient_context: {"age": int, "gender": str, "chief_complaint": str}.

        Returns:
            SOAPNote dataclass with structured SOAP fields and risk score.
        """
        # Build system prompt with patient context and transcript
        system_prompt = SOAP_GENERATION_SYSTEM_PROMPT.format(
            age=patient_context.get("age", "unknown"),
            gender=patient_context.get("gender", "unknown"),
            chief_complaint=patient_context.get("chief_complaint", "unspecified"),
            transcript=conversation_transcript,
        )

        # Call LLM for structured output
        raw_response = await self.provider.generate_structured_output(
            system_prompt=system_prompt,
            user_content="Generate the SOAP note based on the transcript above.",
        )
        logger.info("SOAP note generated from LLM.")

        # Parse JSON output
        return self.parser.parse_soap_note(raw_response)
