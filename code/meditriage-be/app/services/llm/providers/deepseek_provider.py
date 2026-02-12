"""
DeepSeek provider adapter (MVP Phase).
Uses LangChain's ChatOpenAI since DeepSeek is OpenAI API-compatible.
"""
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from .base_provider import BaseReasoningProvider

logger = logging.getLogger(__name__)


class DeepSeekProvider(BaseReasoningProvider):
    """
    DeepSeek LLM adapter using LangChain.
    Implements the BaseReasoningProvider interface for the MVP phase.
    """

    def __init__(self, api_key: str, base_url: str, model: str):
        self.llm = ChatOpenAI(
            api_key=api_key,
            base_url=base_url,
            model=model,
            temperature=0.3,  # low temperature for medical precision
            max_tokens=1024,
        )
        logger.info(f"DeepSeek provider initialized: model={model}")

    def _build_messages(
        self, system_prompt: str, chat_history: list[dict], user_message: str
    ) -> list:
        """Convert chat history dicts to LangChain message objects."""
        messages = [SystemMessage(content=system_prompt)]

        for msg in chat_history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "assistant" or role == "ai":
                messages.append(AIMessage(content=content))
            elif role == "user" or role == "human":
                messages.append(HumanMessage(content=content))

        # Add the latest user message
        messages.append(HumanMessage(content=user_message))
        return messages

    async def generate_response(
        self,
        system_prompt: str,
        chat_history: list[dict],
        user_message: str
    ) -> str:
        """Generate a conversational response for triage interview."""
        messages = self._build_messages(system_prompt, chat_history, user_message)

        try:
            response = await self.llm.ainvoke(messages)
            return response.content.strip()
        except Exception as e:
            logger.error(f"DeepSeek response generation failed: {e}")
            raise

    async def generate_structured_output(
        self,
        system_prompt: str,
        user_content: str
    ) -> str:
        """Generate structured SOAP note output."""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content),
        ]

        try:
            response = await self.llm.ainvoke(messages)
            return response.content.strip()
        except Exception as e:
            logger.error(f"DeepSeek structured output failed: {e}")
            raise
