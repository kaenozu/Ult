import io
import logging
from pathlib import Path
from typing import BinaryIO, List, Optional, Union

from pypdf import PdfReader

logger = logging.getLogger(__name__)


PdfSource = Union[str, Path, BinaryIO, bytes, bytearray]


class PDFLoader:
    """PDF content extractor shared by RAG/earnings features."""

    @staticmethod
    def _open_reader(source: PdfSource) -> PdfReader:
        """Normalize source into PdfReader."""
        if source is None:
            raise ValueError("No PDF source provided")

        # Streamlit's UploadedFile behaves like a BinaryIO
        if hasattr(source, "read"):
            try:
                source.seek(0)
            except Exception:
                pass
            return PdfReader(source)

        if isinstance(source, (bytes, bytearray)):
            return PdfReader(io.BytesIO(source))

        return PdfReader(str(source))

    @classmethod
    def extract_text(
        cls, source: PdfSource, max_pages: Optional[int] = None, return_error_message: bool = False
    ) -> str:
        """
        Extract text from any supported PDF source.

        Args:
            source: Path, bytes, or file-like object.
            max_pages: Optional max pages to read (useful for quick previews).
            return_error_message: If True, returns a user-facing error string instead of blank on failure.
        """
        if not source:
            return ""

        try:
            reader = cls._open_reader(source)
            text_parts: List[str] = []

            for idx, page in enumerate(reader.pages):
                if max_pages is not None and idx >= max_pages:
                    break
                page_text = page.extract_text() or ""
                page_text = page_text.strip()
                if page_text:
                    text_parts.append(page_text)

            return "\n\n".join(text_parts).strip()
        except Exception as e:
            logger.error(f"Error extracting PDF: {e}")
            if return_error_message:
                return f"Error extracting PDF: {str(e)}"
            return ""

    @classmethod
    def extract_text_from_file(cls, uploaded_file) -> str:
        """Extract text from a Streamlit UploadedFile object."""
        return cls.extract_text(uploaded_file, return_error_message=True)

    @classmethod
    def extract_text_from_path(cls, file_path: Union[str, Path]) -> str:
        """Extract text from a local file path."""
        return cls.extract_text(file_path, return_error_message=True)

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> List[str]:
        """Split long text into slightly overlapping chunks for RAG/LLM prompts."""
        if not text:
            return []

        if chunk_size <= overlap:
            raise ValueError("chunk_size must be greater than overlap")

        cleaned = text.replace("\r\n", "\n").strip()
        chunks: List[str] = []
        start = 0

        # Guard against runaway loops in case of bad parameters
        max_iters = max(1, (len(cleaned) // max(chunk_size - overlap, 1)) + 2)
        for _ in range(max_iters):
            if start >= len(cleaned):
                break
            end = min(len(cleaned), start + chunk_size)
            chunk = cleaned[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - overlap
        return chunks
