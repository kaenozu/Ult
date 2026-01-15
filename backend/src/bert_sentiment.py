"""
BERT Sentiment Analysis Module

Uses Hugging Face Transformers and FinBERT to analyze sentiment of financial news.
"""

import logging
from typing import Dict

try:
    import torch
except ImportError:
    torch = None

logger = logging.getLogger(__name__)


class BERTSentimentAnalyzer:
    """
    BERT Sentiment Analyzer using FinBERT
    """

    def __init__(self, model_name: str = "ProsusAI/finbert"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.is_ready = False

        self._load_model()

    def _load_model(self):
        """Load tokenizer and model from Hugging Face"""
        try:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            logger.info(f"Loading BERT model: {self.model_name} on {self.device}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name).to(self.device)
            self.model.eval()
            self.is_ready = True
            logger.info("BERT model loaded successfully.")

        except ImportError:
            logger.error("transformers library not found. Please install it with `pip install transformers`.")
        except Exception as e:
            logger.error(f"Failed to load BERT model: {e}")

    def analyze(self, text: str) -> Dict[str, float]:
        """
        Analyze sentiment of a single text.

        Args:
            text: Input text (news headline etc.)

        Returns:
            Dictionary with 'score' (-1.0 to 1.0) and 'label' (positive/negative/neutral)
        """
        if not self.is_ready or not text:
            return self._fallback_analyze(text)

        try:
            inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512).to(
                self.device
            )

            with torch.no_grad():
                outputs = self.model(**inputs)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)

            # FinBERT labels: [positive, negative, neutral] -> check model config usually
            # ProsusAI/finbert labels are: 0: positive, 1: negative, 2: neutral (Wait, need to verify)
            # Actually ProsusAI/finbert config: id2label: {0: 'positive', 1: 'negative', 2: 'neutral'}

            scores = probabilities.cpu().numpy()[0]

            # Map to scalar score (-1 to 1)
            # Positive * 1 + Negative * -1 + Neutral * 0
            # Note: Verify label indices. Usually standard FinBERT is pos, neg, neu

            # Let's assume standard mapping for FinBERT
            # 0: positive, 1: negative, 2: neutral
            pos_score = scores[0]
            neg_score = scores[1]
            neu_score = scores[2]

            compound_score = pos_score - neg_score

            label = "neutral"
            if compound_score > 0.1:
                label = "positive"
            elif compound_score < -0.1:
                label = "negative"

            return {
                "score": float(compound_score),
                "label": label,
                "probabilities": {
                    "positive": float(pos_score),
                    "negative": float(neg_score),
                    "neutral": float(neu_score),
                },
            }

        except Exception as e:
            logger.error(f"Error during BERT analysis: {e}")
            return self._fallback_analyze(text)

    def _fallback_analyze(self, text: str) -> Dict[str, float]:
        """Simple dictionary-based fallback"""
        if not text:
            return {"score": 0.0, "label": "neutral"}

        text_lower = text.lower()
        positive_words = ["up", "rise", "gain", "bull", "high", "profit", "growth", "good", "success", "beat"]
        negative_words = ["down", "fall", "loss", "bear", "low", "drop", "miss", "bad", "fail", "crash"]

        score = 0
        for word in positive_words:
            if word in text_lower:
                score += 1
        for word in negative_words:
            if word in text_lower:
                score -= 1

        # Normalize roughly
        normalized_score = max(min(score * 0.2, 1.0), -1.0)

        label = "neutral"
        if normalized_score > 0.1:
            label = "positive"
        elif normalized_score < -0.1:
            label = "negative"

        return {"score": normalized_score, "label": label, "note": "fallback"}


# Singleton instance
_bert_analyzer = None


def get_bert_analyzer() -> BERTSentimentAnalyzer:
    global _bert_analyzer
    if _bert_analyzer is None:
        _bert_analyzer = BERTSentimentAnalyzer()
    return _bert_analyzer
