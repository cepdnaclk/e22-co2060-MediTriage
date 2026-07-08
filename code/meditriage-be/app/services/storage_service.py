import os
import httpx
from typing import Optional
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

class StorageService:
    """Abstraction for file storage supporting both Local Disk and Supabase Storage."""

    def __init__(self):
        self.provider = os.getenv("STORAGE_PROVIDER", "LOCAL").upper()  # LOCAL | SUPABASE
        self.supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", ""))
        self.bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "meditriage-media")
        
        if self.provider == "SUPABASE":
            if not self.supabase_url or not self.supabase_key:
                logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set when STORAGE_PROVIDER=SUPABASE. Falling back to LOCAL storage.")
                self.provider = "LOCAL"
            else:
                logger.info(f"Storage service initialized with SUPABASE provider (bucket: {self.bucket}).")
        else:
            logger.info("Storage service initialized with LOCAL disk provider.")

    async def upload_file(self, file_path: str, content: bytes, content_type: str) -> bool:
        """
        Uploads encrypted file bytes.
        file_path is relative (e.g. "room_uuid/filename.enc").
        """
        if self.provider == "SUPABASE":
            # API endpoint: POST /storage/v1/object/{bucket}/{path}
            url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{file_path}"
            headers = {
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": content_type
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, content=content, headers=headers)
                    if response.status_code == 200:
                        logger.info(f"Successfully uploaded {file_path} to Supabase Storage.")
                        return True
                    else:
                        logger.error(f"Failed to upload {file_path} to Supabase: {response.status_code} - {response.text}")
                        return False
            except Exception as e:
                logger.error(f"Error uploading file to Supabase: {e}")
                return False
        else:
            # Local Storage
            abs_path = os.path.join(settings.CONSULTATION_MEDIA_PATH, file_path)
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            try:
                with open(abs_path, 'wb') as out_file:
                    out_file.write(content)
                logger.info(f"Successfully wrote {file_path} to local disk.")
                return True
            except Exception as e:
                logger.error(f"Error saving file to local disk: {e}")
                return False

    async def download_file(self, file_path: str) -> Optional[bytes]:
        """
        Downloads encrypted file bytes.
        file_path is relative (e.g. "room_uuid/filename.enc").
        """
        if self.provider == "SUPABASE":
            # API endpoint: GET /storage/v1/object/authenticated/{bucket}/{path}
            url = f"{self.supabase_url}/storage/v1/object/authenticated/{self.bucket}/{file_path}"
            headers = {
                "Authorization": f"Bearer {self.supabase_key}"
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url, headers=headers)
                    if response.status_code == 200:
                        logger.info(f"Successfully downloaded {file_path} from Supabase Storage.")
                        return response.content
                    else:
                        logger.error(f"Failed to download {file_path} from Supabase: {response.status_code} - {response.text}")
                        return None
            except Exception as e:
                logger.error(f"Error downloading file from Supabase: {e}")
                return None
        else:
            # Local Storage
            abs_path = os.path.join(settings.CONSULTATION_MEDIA_PATH, file_path)
            if not os.path.exists(abs_path):
                logger.warning(f"File {file_path} not found on local disk.")
                return None
            try:
                with open(abs_path, "rb") as f:
                    content = f.read()
                return content
            except Exception as e:
                logger.error(f"Error reading file from local disk: {e}")
                return None

# Singleton instance
storage_service = StorageService()
