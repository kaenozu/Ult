import logging
import google.generativeai as genai
from typing import Dict, Any

logger = logging.getLogger(__name__)


class MorningStrategyMemo:
    """
    Synthesizes Nightwatch data into a concrete plan for the Japanese market.
    """

    def __init__(self, api_key: str = None):
        if api_key:
            genai.configure(api_key=api_key)

    def generate_memo(self, night_data: Dict[str, Any]) -> str:
        """Uses LLM to interpret US data for Japan."""
        if "error" in night_data:
            return "米国市場データの取得に失敗しました。通常通りのリスク管理を継続してください。"


# try:
#             model = genai.GenerativeModel("gemini-1.5-flash") # Use flash for speed
