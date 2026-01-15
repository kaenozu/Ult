"""
Integrated Signal Generation Module

Combines multiple analysis signals (Technical, AI, MTF, Sentiment) to generate a final trading decision.
"""

import logging
from typing import Dict

import pandas as pd

from src.bert_sentiment import get_bert_analyzer
from src.multi_timeframe import get_mtf_analyzer
from src.strategies import CombinedStrategy

logger = logging.getLogger(__name__)


class SignalIntegrator:
    """
    Integrates signals from various sources to provide a comprehensive trading decision.
    """

    def __init__(self):
        self.mtf_analyzer = get_mtf_analyzer()
        self.bert_analyzer = get_bert_analyzer()
        self.technical_strategy = CombinedStrategy()

        # Weights for each component (Total 1.0)
        self.weights = {
            "technical": 0.3,
            "ai_prediction": 0.4,
            "mtf_trend": 0.2,
            "sentiment": 0.1,
        }

    def analyze(self, df: pd.DataFrame, ticker: str, ai_prediction: float = 0.0) -> Dict:
        """
        Analyze the latest data to generate a final signal.

        Args:
            df: Daily stock data with features
            ticker: Ticker symbol
            ai_prediction: Probability of price increase from AI model (0.0 to 1.0)

        Returns:
            Dictionary containing:
                pass
            - action: "BUY", "SELL", "HOLD"
            - confidence: 0.0 to 1.0
            - score: -1.0 (Strong Sell) to 1.0 (Strong Buy)
            - reasons: List of strings explaining the decision
            - details: Dictionary with individual component scores
        """
        if df is None or df.empty:
            return self._empty_result()

        df.index[-1]
        reasons = []

        # 1. Technical Analysis (Score: -1 to 1)
        # Use CombinedStrategy to get a base signal
        tech_signals = self.technical_strategy.generate_signals(df)
        tech_signal = tech_signals.iloc[-1]
        tech_score = float(tech_signal)  # -1, 0, 1

        if tech_score > 0:
            reasons.append("テクニカル指標が買いシグナルを示しています (RSI, MACD等)")
        elif tech_score < 0:
            reasons.append("テクニカル指標が売りシグナルを示しています")

        # 2. AI Prediction (Score: -1 to 1)
        # Map probability 0.5-1.0 to 0-1, 0.0-0.5 to -1-0
        ai_score = (ai_prediction - 0.5) * 2

        if ai_score > 0.4:
            reasons.append(f"AIモデルが上昇を予測しています (確信度: {ai_prediction:.1%})")
        elif ai_score < -0.4:
            reasons.append(f"AIモデルが下落を予測しています (確信度: {1 - ai_prediction:.1%})")

        # 3. Multi-Timeframe Analysis (Score: -1 to 1)
        mtf_res = self.mtf_analyzer.analyze(df)
        mtf_score = 0.0
        if mtf_res:
            w_trend = mtf_res.get("weekly_trend", "NEUTRAL")
            m_trend = mtf_res.get("monthly_trend", "NEUTRAL")

            if w_trend == "UPTREND":
                mtf_score += 0.5
                reasons.append("週足が上昇トレンドです")
            elif w_trend == "DOWNTREND":
                mtf_score -= 0.5
                reasons.append("週足が下落トレンドです")

            if m_trend == "UPTREND":
                mtf_score += 0.5
            elif m_trend == "DOWNTREND":
                mtf_score -= 0.5

            if w_trend == "UPTREND" and m_trend == "UPTREND":
                reasons.append("長期トレンドが非常に強い上昇傾向です")

        # 4. Sentiment Analysis (Score: -1 to 1)
        # Use the latest sentiment score from df if available, or fetch
        sent_score = 0.0
        if "Sentiment_Score" in df.columns:
            sent_score = df["Sentiment_Score"].iloc[-1]
            # Normalize if needed, assuming it's already -1 to 1 or similar
            # If it's raw BERT score (-1 to 1), use as is.

            if sent_score > 0.2:
                reasons.append("ニュース感情がポジティブです")
            elif sent_score < -0.2:
                reasons.append("ニュース感情がネガティブです")

        # Calculate Weighted Score
        final_score = (
            tech_score * self.weights["technical"]
            + ai_score * self.weights["ai_prediction"]
            + mtf_score * self.weights["mtf_trend"]
            + sent_score * self.weights["sentiment"]
        )

        # Determine Action
        action = "HOLD"
        if final_score > 0.3:
            action = "BUY"
        elif final_score < -0.3:
            action = "SELL"

        # Calculate Confidence (Absolute score normalized)
        confidence = min(abs(final_score) / 0.8, 1.0)  # 0.8 as a "very strong" threshold

        return {
            "action": action,
            "confidence": confidence,
            "score": final_score,
            "reasons": reasons,
            "details": {
                "technical": tech_score,
                "ai": ai_score,
                "mtf": mtf_score,
                "sentiment": sent_score,
            },
        }

    def _empty_result(self):
        return {
            "action": "HOLD",
            "confidence": 0.0,
            "score": 0.0,
            "reasons": ["データ不足のため判断できません"],
            "details": {},
        }


# Singleton
_integrator = None


def get_signal_integrator():
    global _integrator
    if _integrator is None:
        _integrator = SignalIntegrator()
    return _integrator
