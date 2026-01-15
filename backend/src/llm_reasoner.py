"""
LLM Reasoner Wrapper for backward compatibility.
Redirects to AIAnalyst in src/ai_analyst.py.
"""
import logging
from typing import Any, Dict, List, Optional
from src.ai_analyst import AIAnalyst

logger = logging.getLogger(__name__)

class LLMReasoner:
    def __init__(self):
        self.analyst = AIAnalyst()

    def ask(self, prompt: str) -> str:
        return self.analyst.generate_response("You are a helpful financial assistant.", prompt)

    def generate_json(self, prompt: str) -> Dict[str, Any]:
        import json
        resp = self.ask(prompt)
        try:
            if "```json" in resp:
                json_str = resp.split("```json")[1].split("```")[0]
            else:
                json_str = resp
            return json.loads(json_str)
        except Exception:
            return {"sentiment": "NEUTRAL", "reasoning": "Fallback due to parsing error."}

    def analyze_news_sentiment(self, news_list: list) -> Dict[str, Any]:
        return {
            "sentiment_score": 0,
            "sentiment_label": "NEUTRAL",
            "reasoning": "AI analysis simplified in this version.",
            "key_topics": [],
            "trading_implication": "Proceed with caution."
        }

_reasoner = None

def get_llm_reasoner() -> LLMReasoner:
    global _reasoner
    if _reasoner is None:
        _reasoner = LLMReasoner()
    return _reasoner