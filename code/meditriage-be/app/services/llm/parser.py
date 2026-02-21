"""
Output parser for LLM responses.
Handles interview completion detection and SOAP note JSON parsing.
"""
import json
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# Signal that the AI uses to indicate interview is complete
INTERVIEW_COMPLETE_SIGNAL = "[INTERVIEW_COMPLETE]"


@dataclass
class InterviewResponse:
    """Parsed result of a triage interview message."""
    message: str
    is_complete: bool


@dataclass
class SOAPNote:
    """Parsed SOAP note from LLM output."""
    subjective: str
    objective: str
    assessment: str
    plan: str


class LLMOutputParser:
    """
    Parses raw LLM output into structured application objects.
    Handles edge cases and malformed responses gracefully.
    """

    def parse_interview_response(self, raw_response: str) -> InterviewResponse:
        """
        Parse a triage interview response.
        Detects if the interview is complete or returns the next question.

        Args:
            raw_response: Raw string from the LLM.

        Returns:
            InterviewResponse with message and completion flag.
        """
        cleaned = raw_response.strip()

        # Check for interview completion signal
        if INTERVIEW_COMPLETE_SIGNAL in cleaned:
            return InterviewResponse(
                message="The interview is now complete. Generating clinical summary...",
                is_complete=True
            )

        return InterviewResponse(
            message=cleaned,
            is_complete=False
        )

    def parse_soap_note(self, raw_response: str) -> SOAPNote:
        """
        Parse a SOAP note JSON response from the LLM.

        Args:
            raw_response: Raw JSON string from the LLM.

        Returns:
            SOAPNote dataclass with structured fields.

        Raises:
            ValueError: If the response cannot be parsed.
        """
        cleaned = raw_response.strip()

        # Strip markdown code blocks if present (```json ... ```)
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Remove first line (```json) and last line (```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse SOAP JSON: {e}\nRaw: {raw_response}")
            raise ValueError(
                f"LLM returned invalid JSON for SOAP note. Raw response: {raw_response[:200]}"
            )

        # Validate required fields
        required_fields = ["subjective", "objective", "assessment", "plan"]
        for field in required_fields:
            if field not in data:
                logger.warning(f"Missing field '{field}' in SOAP note, using empty string.")

        return SOAPNote(
            subjective=data.get("subjective", ""),
            objective=data.get("objective", ""),
            assessment=data.get("assessment", ""),
            plan=data.get("plan", ""),
        )
