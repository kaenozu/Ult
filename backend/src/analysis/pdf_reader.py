from src.prompts.earnings_prompts import EARNINGS_ANALYSIS_SYSTEM_PROMPT
import logging
from typing import Dict

from src.rag.pdf_loader import PDFLoader
from src.llm_reasoner import get_llm_reasoner

logger = logging.getLogger(__name__)


class PDFExtractor:
    """Extracts text from PDF files."""

    @staticmethod
    def extract_text(file_stream) -> str:
        """
        Extracts text from a PDF file stream.

        Args:
            file_stream: The uploaded file stream (e.g. from st.file_uploader)

        Returns:
            Extracted text content as string.
        """
        text = PDFLoader.extract_text(file_stream, return_error_message=True)
        if not text:
            logger.error("PDF extraction returned no text. The PDF may be image-based or corrupted.")
        return text


class EarningsAnalyzer:
    """Analyzes earnings reports using LLM."""

    def __init__(self):
        self.llm = get_llm_reasoner()

    def analyze_report(self, text: str) -> Dict[str, str]:
        """
        Generates structured analysis from raw text using Gemini.
        Returns a dictionary matching the schema in EARNINGS_ANALYSIS_SYSTEM_PROMPT.
        """
        # Truncate text to fit context window (approx 60k chars)
        max_chars = 60000
        if len(text) > max_chars:
            text = text[:max_chars] + "...(truncated)..."

        prompt = f"{EARNINGS_ANALYSIS_SYSTEM_PROMPT}\n\n## EARNINGS REPORT TEXT:\n{text}"

        try:
            return self.llm.generate_json(prompt)
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return {
                "score": 0,
                "summary": f"Analysis failed: {str(e)}",
                "bullish_factors": [],
                "bearish_factors": [],
                "key_metrics": {},
                "risk_assessment": "Analysis Error",
            }
