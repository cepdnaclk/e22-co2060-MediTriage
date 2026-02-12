"""
Abstract base class for LLM provider adapters.
All providers (DeepSeek, OpenAI, etc.) must implement this interface.
This ensures vendor lock-in is avoided via the Adapter Pattern.
"""
from abc import ABC, abstractmethod


class BaseReasoningProvider(ABC):
    """
    Interface for LLM reasoning providers.
    Ensures any cloud LLM can be swapped in without changing business logic.
    """

    @abstractmethod
    async def generate_response(
        self,
        system_prompt: str,
        chat_history: list[dict],
        user_message: str
    ) -> str:
        """
        Generate a conversational response (for triage interview).

        Args:
            system_prompt: The system instruction for the LLM.
            chat_history: List of {"role": "...", "content": "..."} messages.
            user_message: The latest user/patient message.

        Returns:
            The AI's next response string.
        """
        ...

    @abstractmethod
    async def generate_structured_output(
        self,
        system_prompt: str,
        user_content: str
    ) -> str:
        """
        Generate a structured output (for SOAP note generation).

        Args:
            system_prompt: The system instruction with output format.
            user_content: The complete conversation transcript.

        Returns:
            Raw string response (expected to be JSON).
        """
        ...
