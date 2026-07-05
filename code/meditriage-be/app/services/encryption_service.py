"""
Encryption service for Consultation Chat Room.
Handles AES-256 (Fernet) encryption for messages and attachments.
"""
from cryptography.fernet import Fernet
import base64
from app.core.config import get_settings

settings = get_settings()

def _get_fernet() -> Fernet:
    """Helper to initialize Fernet with the current key."""
    key = settings.CONSULTATION_ENCRYPTION_KEY
    if not key or len(key) < 10:
        # Derive a consistent dev-only key from exactly 32 bytes
        key = base64.urlsafe_b64encode(b"meditriage_enc_dev_key_32_bytes!").decode()
    return Fernet(key.encode())

def encrypt(plaintext: str) -> str:
    """Encrypts a string and returns a base64 encoded ciphertext string."""
    f = _get_fernet()
    encrypted_bytes = f.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt(ciphertext: str) -> str:
    """Decrypts a base64 encoded ciphertext string back to plaintext."""
    f = _get_fernet()
    decrypted_bytes = f.decrypt(ciphertext.encode("utf-8"))
    return decrypted_bytes.decode("utf-8")

def encrypt_file(file_bytes: bytes) -> bytes:
    """Encrypts raw file bytes and returns encrypted bytes."""
    f = _get_fernet()
    return f.encrypt(file_bytes)

def decrypt_file(encrypted_bytes: bytes) -> bytes:
    """Decrypts encrypted file bytes back to raw file bytes."""
    f = _get_fernet()
    return f.decrypt(encrypted_bytes)
