"""
PII Scrubber using a local Ollama LLM.
Ensures sensitive patient data NEVER leaves the hospital network.
The local LLM analyzes text and strips Names, Phone Numbers,
National IDs (NIC), and other PII before data is sent to any cloud LLM.

Uses: Ollama with a lightweight model (e.g., Llama 3.2 1B).
Fallback: Regex-based scrubbing if Ollama is unavailable.
"""
import re
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage
from app.core.config import get_settings
from app.core.logging import get_logger
from .prompts import PII_SCRUBBING_PROMPT

logger = get_logger(__name__)

# ── Regex fallback patterns (used when Ollama is unavailable) ──────────────
# Sri Lankan NIC: old (9 digits + V/X) and new (12 digits)
NIC_PATTERN = re.compile(r'\b\d{9}[VvXx]\b|\b\d{12}\b')
# Sri Lankan phone: 0771234567, +94771234567, etc.
PHONE_PATTERN = re.compile(r'(?:\+94|0)\s*\d{2}[\s-]?\d{3}[\s-]?\d{4}')
# Email addresses
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')


class PIIScrubber:
    """
    Strips PII from text using a LOCAL Ollama LLM before sending to cloud.
    Falls back to regex-based scrubbing if Ollama is not available.
    """

    def __init__(self):
        settings = get_settings()
        self._ollama_available = False
        try:
            self.llm = ChatOllama(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_SCRUBBER_MODEL,
                temperature=0.0,  # deterministic for consistent redaction
                num_predict=1024,
            )
            self._ollama_available = True
            logger.info(
                f"PIIScrubber initialized with Ollama: "
                f"model={settings.OLLAMA_SCRUBBER_MODEL}, "
                f"url={settings.OLLAMA_BASE_URL}"
            )
        except Exception as e:
            logger.warning(
                f"Ollama not available, falling back to regex scrubbing: {e}"
            )

    async def scrub(self, text: str) -> str:
        """
        Remove PII from the given text.
        Uses local Ollama LLM if available, otherwise falls back to regex.

        Args:
            text: Raw input text potentially containing PII.

        Returns:
            Sanitized text with PII replaced by redaction tags.
        """
        if self._ollama_available:
            return await self._scrub_with_llm(text)
        return self._scrub_with_regex(text)

    async def _scrub_with_llm(self, text: str) -> str:
        """Scrub PII using the local Ollama LLM."""
        try:
            prompt = PII_SCRUBBING_PROMPT.format(text=text)
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            sanitized = response.content.strip()

            if not sanitized:
                logger.warning("Ollama returned empty response, using regex fallback.")
                return self._scrub_with_regex(text)

            logger.info("PII scrubbed via local Ollama LLM.")
            return sanitized

        except Exception as e:
            logger.error(f"Ollama scrubbing failed, falling back to regex: {e}")
            return self._scrub_with_regex(text)

    def _scrub_with_regex(self, text: str) -> str:
        """Fallback: Scrub PII using regex patterns."""
        original = text
        text = NIC_PATTERN.sub("[NIC_REDACTED]", text)
        text = PHONE_PATTERN.sub("[PHONE_REDACTED]", text)
        text = EMAIL_PATTERN.sub("[EMAIL_REDACTED]", text)

        if text != original:
            logger.info("PII scrubbed via regex fallback.")

        return text
