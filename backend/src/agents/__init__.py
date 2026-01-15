import logging
from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np

from src.data_loader import fetch_macro_data
from src.llm_analyzer import LLMAnalyzer

logger = logging.getLogger(__name__)


@dataclass
class AgentVote:
    agent_name: str
    decision: str  # "BUY", "SELL", "HOLD"
    confidence: float  # 0.0 to 1.0
    reasoning: str


class Agent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    def vote(self, ticker: str, data: Dict[str, Any]) -> AgentVote:
        raise NotImplementedError


class TechnicalAnalyst(Agent):
    def __init__(self):
        super().__init__("Technical Analyst", "Analyzes price action and indicators.")

    def vote(self, ticker: str, data: Dict[str, Any]) -> AgentVote:
        df = data.get("stock_data")
        if df is None or df.empty:
            return AgentVote(self.name, "HOLD", 0.0, "No data available.")

        # Simple logic for demo: SMA Crossover + RSI
        # In a real system, this would use the sophisticated strategies from strategies.py
        close = df["Close"]
        sma20 = close.rolling(20).mean().iloc[-1]
        sma50 = close.rolling(50).mean().iloc[-1]

        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs)).iloc[-1]

        decision = "HOLD"
        confidence = 0.5
        reasons = []

        if sma20 > sma50:
            reasons.append("Golden Cross (SMA20 > SMA50)")
            if rsi < 70:
                decision = "BUY"
                confidence = 0.7 + (0.1 if rsi < 50 else 0)
                reasons.append(f"RSI is healthy ({rsi:.1f})")
            else:
                decision = "HOLD"
                reasons.append(f"RSI is overbought ({rsi:.1f})")
        else:
            reasons.append("Death Cross (SMA20 < SMA50)")
            if rsi > 30:
                decision = "SELL"
                confidence = 0.7
                reasons.append(f"RSI is neutral/high ({rsi:.1f})")
            else:
                decision = "HOLD"
                reasons.append(f"RSI is oversold ({rsi:.1f})")

        return AgentVote(self.name, decision, confidence, "; ".join(reasons))


class FundamentalAnalyst(Agent):
    def __init__(self):
        super().__init__("Fundamental Analyst", "Analyzes news and earnings using LLM.")
        self.llm = LLMAnalyzer()

    def vote(self, ticker: str, data: Dict[str, Any]) -> AgentVote:
        news = data.get("news_data", [])
        if not news:
            return AgentVote(self.name, "HOLD", 0.5, "No news found.")

        analysis = self.llm.analyze_news(ticker, news)

        score = analysis.get("score", 0.5)
        sentiment = analysis.get("sentiment", "Neutral")
        reasoning = analysis.get("reasoning", "No reasoning.")

        decision = "HOLD"
        if score >= 0.7:
            decision = "BUY"
        elif score <= 0.3:
            decision = "SELL"

        return AgentVote(
            self.name,
            decision,
            abs(score - 0.5) * 2,
            f"Sentiment: {sentiment}. {reasoning}",
        )


class MacroStrategist(Agent):
    def __init__(self):
        super().__init__("Macro Strategist", "Analyzes macro economic factors.")

    def vote(self, ticker: str, data: Dict[str, Any]) -> AgentVote:
        macro_df = data.get("macro_data")  # Expecting dict of DFs or a combined DF
        if not macro_df:
            # Try to fetch if not provided
            try:
                macro_dict = fetch_macro_data(period="1mo")
                # Simplify: just look at SP500 and USDJPY
                sp500 = macro_dict.get("SP500")
                usdjpy = macro_dict.get("USDJPY")
            except BaseException:
                return AgentVote(self.name, "HOLD", 0.5, "Macro data unavailable.")
        else:
            # Assuming data structure passed in
            sp500 = macro_df.get("SP500")
            usdjpy = macro_df.get("USDJPY")

        reasons = []
        score = 0

        if sp500 is not None and not sp500.empty:
            ret = (sp500["Close"].iloc[-1] - sp500["Close"].iloc[0]) / sp500["Close"].iloc[0]
            if ret > 0:
                score += 1
                reasons.append("S&P500 is uptrending")
            else:
                score -= 1
                reasons.append("S&P500 is downtrending")

        if usdjpy is not None and not usdjpy.empty:
            # Assuming weaker yen (higher USDJPY) is good for Japanese stocks (generalization)
            ret = (usdjpy["Close"].iloc[-1] - usdjpy["Close"].iloc[0]) / usdjpy["Close"].iloc[0]
            if ret > 0:
                score += 1
                reasons.append("USD/JPY is rising (Yen weakening)")
            else:
                score -= 0.5  # Not necessarily bad, but less tailwind
                reasons.append("USD/JPY is falling (Yen strengthening)")

        decision = "HOLD"
        confidence = 0.5
        if score >= 1.5:
            decision = "BUY"
            confidence = 0.8
        elif score <= -1:
            decision = "SELL"
            confidence = 0.7

        return AgentVote(self.name, decision, confidence, "; ".join(reasons))


class RiskManager(Agent):
    def __init__(self):
        super().__init__("Risk Manager", "Evaluates volatility and downside risk.")

    def vote(self, ticker: str, data: Dict[str, Any]) -> AgentVote:
        df = data.get("stock_data")
        if df is None or df.empty:
            return AgentVote(self.name, "HOLD", 0.0, "No data.")

        # Calculate Volatility (Annualized)
        returns = df["Close"].pct_change().dropna()
        volatility = returns.std() * np.sqrt(252)

        # Calculate Max Drawdown from peak in the window
        rolling_max = df["Close"].cummax()
        drawdown = (df["Close"] - rolling_max) / rolling_max
        max_dd = drawdown.min()

        reasons = []
        decision = "HOLD"  # Risk manager usually says HOLD (approve) or SELL (reject/reduce)
        # They rarely say "BUY" aggressively, but "ALLOW" -> HOLD/BUY

        confidence = 0.5

        reasons.append(f"Volatility: {volatility:.1%}")
        reasons.append(f"Max Drawdown: {max_dd:.1%}")

        if volatility > 0.50:  # High volatility
            decision = "SELL"
            confidence = 0.9
            reasons.append("Volatility is too high (>50%)")
        elif max_dd < -0.20:  # Recent crash
            decision = "SELL"  # Or caution
            confidence = 0.7
            reasons.append("Significant recent drawdown (>20%)")
        else:
            decision = "BUY"  # "Safe to buy"
            confidence = 0.6
            reasons.append("Risk metrics are within acceptable limits")

        return AgentVote(self.name, decision, confidence, "; ".join(reasons))


class PortfolioManager(Agent):
    def __init__(self):
        super().__init__("Portfolio Manager", "Makes the final decision.")

    def make_decision(self, ticker: str, votes: List[AgentVote]) -> Dict[str, Any]:
        # Weighted voting
        # Tech: 1.0, Fund: 1.2, Macro: 0.8, Risk: 1.5 (Veto powerish)

        weights = {
            "Technical Analyst": 1.0,
            "Fundamental Analyst": 1.2,
            "Macro Strategist": 0.8,
            "Risk Manager": 1.5,
        }

        score = 0.0
        total_weight = 0.0

        summary_lines = []

        for vote in votes:
            w = weights.get(vote.agent_name, 1.0)
            s = 0
            if vote.decision == "BUY":
                s = 1
            elif vote.decision == "SELL":
                s = -1

            # Adjust by confidence
            weighted_score = s * vote.confidence * w
            score += weighted_score
            total_weight += w

            icon = "🟢" if vote.decision == "BUY" else "🔴" if vote.decision == "SELL" else "⚪"
            summary_lines.append(
                f"{icon} **{vote.agent_name}**: {vote.decision} (Conf: {vote.confidence:.2f}) - {vote.reasoning}"
            )

        # Normalize score (-1 to 1)
        # Max possible score is sum(weights) * 1.0
        # Min is sum(weights) * -1.0
        # But total_weight is sum(weights). So score / total_weight is roughly -1 to 1 (if conf is 1.0)

        final_score = score / total_weight if total_weight > 0 else 0

        final_decision = "HOLD"
        if final_score > 0.2:
            final_decision = "BUY"
        elif final_score < -0.2:
            final_decision = "SELL"

        # Risk Manager Veto check
        risk_vote = next((v for v in votes if v.agent_name == "Risk Manager"), None)
        if risk_vote and risk_vote.decision == "SELL" and risk_vote.confidence > 0.8:
            final_decision = "HOLD"  # Downgrade BUY to HOLD, or SELL to SELL
            if final_score > 0:
                final_decision = "HOLD"  # Veto BUY
                summary_lines.append("⚠️ **VETO**: Risk Manager blocked the BUY decision due to high risk.")
            else:
                final_decision = "SELL"  # Confirm SELL

        return {
            "ticker": ticker,
            "decision": final_decision,
            "score": final_score,
            "votes": votes,
            "summary": summary_lines,
        }
