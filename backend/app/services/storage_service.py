import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Set, Tuple

from app.core.exceptions import (
    BadRequestError,
    PayloadTooLargeError,
    UnsupportedMediaTypeError,
)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_ATTACHMENTS_PER_COMPLAINT = 5

ALLOWED_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def verify_magic_bytes(content: bytes, content_type: str) -> bool:
    """Validate binary file signature (magic bytes) to verify actual file type."""
    if len(content) < 12:
        return False

    if content_type == "image/jpeg":
        return content[:3] == b"\xff\xd8\xff"
    elif content_type == "image/png":
        return content[:8] == b"\x89PNG\r\n\x1a\n"
    elif content_type == "image/webp":
        return content[:4] == b"RIFF" and content[8:12] == b"WEBP"

    return False


class BaseStorageService(ABC):
    @abstractmethod
    async def save_file(
        self,
        content: bytes,
        complaint_id: uuid.UUID,
        content_type: str,
        original_filename: str,
    ) -> Tuple[str, str]:
        """Save file content and return (stored_filename, storage_path)."""
        pass

    @abstractmethod
    def validate_file(self, content: bytes, content_type: str, filename: str) -> str:
        """Validate file size, MIME type, and magic bytes. Returns canonical file extension."""
        pass


class LocalStorageService(BaseStorageService):
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = Path(base_dir).resolve()
        else:
            # Default to backend/uploads
            current_file = Path(__file__).resolve()
            backend_root = current_file.parent.parent.parent
            self.base_dir = (backend_root / "uploads").resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, content: bytes, content_type: str, filename: str) -> str:
        if not content:
            raise BadRequestError("Uploaded file cannot be empty")

        if len(content) > MAX_FILE_SIZE:
            raise PayloadTooLargeError("File size exceeds 5MB limit")

        normalized_type = content_type.lower().strip()
        if normalized_type not in ALLOWED_MIME_TYPES:
            raise UnsupportedMediaTypeError(
                f"Unsupported media type '{content_type}'. Allowed types: JPEG, PNG, WebP"
            )

        if not verify_magic_bytes(content, normalized_type):
            raise BadRequestError(
                "File signature does not match the stated media type (invalid magic bytes)"
            )

        # Sanitize and ensure no path traversal in filename
        if ".." in filename or "/" in filename or "\\" in filename:
            raise BadRequestError("Invalid file name: path traversal detected")
        clean_name = os.path.basename(filename)
        if not clean_name:
            raise BadRequestError("Invalid file name: empty file name")

        return MIME_TO_EXT[normalized_type]

    async def save_file(
        self,
        content: bytes,
        complaint_id: uuid.UUID,
        content_type: str,
        original_filename: str,
    ) -> Tuple[str, str]:
        extension = self.validate_file(content, content_type, original_filename)

        # Safe server-side generated filename
        unique_id = uuid.uuid4().hex
        stored_filename = f"{unique_id}{extension}"

        # Complaint target folder
        complaint_folder = (self.base_dir / "complaints" / str(complaint_id)).resolve()
        # Verify path traversal containment
        if not str(complaint_folder).startswith(str(self.base_dir)):
            raise BadRequestError("Invalid destination path detected")

        complaint_folder.mkdir(parents=True, exist_ok=True)

        target_path = (complaint_folder / stored_filename).resolve()
        if not str(target_path).startswith(str(complaint_folder)):
            raise BadRequestError("Invalid file path resolution")

        # Write binary content
        target_path.write_bytes(content)

        # Return stored filename and relative storage path
        relative_path = f"complaints/{complaint_id}/{stored_filename}"
        return stored_filename, relative_path


# Global instance
storage_service = LocalStorageService()
