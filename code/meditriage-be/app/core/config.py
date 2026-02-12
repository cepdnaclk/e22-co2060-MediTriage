"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Central configuration loaded from environment variables."""

    # Application
    PROJECT_NAME: str = "Medi-Triage API"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "meditriage"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/meditriage"

    # Security
    SECRET_KEY: str = "supersecretkeyrequiredforjwttokens"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI Services — Cloud Reasoning
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ACTIVE_LLM: str = "DEEPSEEK"  # Toggle: DEEPSEEK | OPENAI

    # AI Services — Local PII Scrubbing (Ollama)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_SCRUBBER_MODEL: str = "llama3.2:1b"  # lightweight model for PII removal

    # Logging
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FILE: str = "logs/meditriage.log"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance to avoid re-reading .env on every call."""
    return Settings()
