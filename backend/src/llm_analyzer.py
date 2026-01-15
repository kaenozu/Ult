"""
LLM Analyzer Wrapper for backward compatibility.
Redirects to AIAnalyst in src/ai_analyst.py.
"""
import logging
from typing import Any, Dict, List, Optional
from src.ai_analyst import AIAnalyst

logger = logging.getLogger(__name__)

class LLMAnalyzer:
    def __init__(self, api_key: Optional[str] = None):
        self.analyst = AIAnalyst(api_key=api_key)

    def analyze_news(self, ticker: str, news_data: List[str]) -> Dict[str, Any]:
        """
        Analyze news sentiment using AIAnalyst.
        """
        if not news_data:
            return {"score": 0.5, "sentiment": "Neutral", "reasoning": "No news data provided."}

        system_prompt = f"You are a financial analyst. Analyze the following news for {ticker} and provide a sentiment score (0.0 to 1.0) and brief reasoning."
        user_prompt = "\n".join(news_data[:5]) if isinstance(news_data, list) else str(news_data)

        try:
            response = self.analyst.generate_response(system_prompt, user_prompt)
            score = 0.5
            if "positive" in response.lower() or "buy" in response.lower():
                score = 0.8
            elif "negative" in response.lower() or "sell" in response.lower():
                score = 0.2
            
            return {
                "score": score,
                "sentiment": "Positive" if score > 0.6 else "Negative" if score < 0.4 else "Neutral",
                "reasoning": response
            }
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            return {"score": 0.5, "sentiment": "Neutral", "reasoning": "Analysis failed."}

    def generate_text(self, prompt: str) -> str:
        return self.analyst.generate_response("You are a helpful financial assistant.", prompt)