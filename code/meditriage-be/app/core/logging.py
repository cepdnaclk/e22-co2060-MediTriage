"""
Centralized logging configuration for MediTriage backend.
Provides structured logging with console and file handlers.
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Optional
import os


class ColoredFormatter(logging.Formatter):
    """Custom formatter with color-coded log levels for console output."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        # Add color to levelname
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.RESET}"
        return super().format(record)


# Global flag to ensure setup_logging is called only once
_logging_configured = False


def setup_logging(
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    enable_console: bool = True,
    enable_file: bool = True,
) -> None:
    """
    Configure logging for the entire application.
    Should be called once at application startup.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (None to use default: logs/meditriage.log)
        enable_console: Enable console output
        enable_file: Enable file output with rotation
    """
    global _logging_configured
    
    if _logging_configured:
        return
    
    # Convert string level to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Clear any existing handlers
    root_logger.handlers.clear()
    
    # Create formatters
    console_format = "%(levelname)-8s | %(name)-30s | %(message)s"
    file_format = "%(asctime)s | %(levelname)-8s | %(name)-30s | %(funcName)-20s | %(message)s"
    
    console_formatter = ColoredFormatter(console_format)
    file_formatter = logging.Formatter(file_format, datefmt="%Y-%m-%d %H:%M:%S")
    
    # Console handler (with colors)
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(console_formatter)
        root_logger.addHandler(console_handler)
    
    # File handler (with rotation)
    if enable_file:
        if log_file is None:
            log_file = "logs/meditriage.log"
        
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Rotate when file reaches 10MB, keep 5 backup files
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8',
        )
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)
    
    # Suppress overly verbose third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    _logging_configured = True
    
    root_logger.info(f"Logging configured: level={log_level}, console={enable_console}, file={enable_file}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.
    
    Args:
        name: Logger name (typically __name__ of the calling module)
        
    Returns:
        Configured logger instance
        
    Example:
        >>> from app.core.logging import get_logger
        >>> logger = get_logger(__name__)
        >>> logger.info("This is an info message")
    """
    return logging.getLogger(name)


def get_log_level() -> str:
    """Get the current logging level as a string."""
    return logging.getLevelName(logging.getLogger().level)
