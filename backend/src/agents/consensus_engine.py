from typing import Dict, Any, Optional, List
import logging
import pandas as pd

from src.strategies.strategy_router import StrategyRouter
from src.agents.risk_agent import RiskAgent
from src.agents.news_agent import NewsAgent

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConsensusEngine:
    """
    The Hive: Mechanical Consensus Engine.
    Aggregates opinions from Tech, News, and Risk agents to form a final sovereign decision.
    """
    def __init__(self, strategy_params: Optional[Dict] = None):
        self.tech_agent = StrategyRouter(strategy_params=strategy_params)
        self.risk_agent = RiskAgent()
        self.news_agent = NewsAgent()
        
        # Weights (The "Personality" of the Hive)
        self.weights = {
            "tech": 0.5,
            "news": 0.3,
            "risk": 0.2
        }

    def deliberate(self, ticker: str, df: pd.DataFrame, external_data: Optional[Dict[str, pd.DataFrame]] = None, headlines: List[str] = None) -> Dict[str, Any]:
        """
        Conduct a debate and reach a consensus.
        
        Args:
            ticker: Ticker symbol
            df: Stock data (OHLCV)
            external_data: Market data (VIX, etc.) for RiskAgent
            headlines: List of news headline strings for NewsAgent
        """
        reasons = []
        
        # 1. Risk Analysis (The Guardian)
        risk_result = self.risk_agent.analyze(df, external_data)
        risk_score = risk_result["risk_score"]
        is_veto = risk_result["is_veto"]
        
        # Invert Risk for Voting (High Risk = Negative Vote)
        # Risk 0.0 -> Vote +1.0 (Safe)
        # Risk 0.5 -> Vote 0.0 (Neutral)
        # Risk 1.0 -> Vote -1.0 (Dangerous)
        risk_vote = 1.0 - (risk_score * 2.0)
        risk_vote = max(-1.0, min(1.0, risk_vote))
        
        reasons.extend(risk_result["reasons"])
        
        # 2. Veto Check
        if is_veto:
            logger.warning(f"Consensus VETOED by Risk Agent for {ticker}. Risk Score: {risk_score}")
            return {
                "signal": 0,
                "confidence": 1.0,
                "reason": f"VETO: Market Risk too high ({risk_score:.2f}). {', '.join(risk_result['reasons'])}",
                "consensus_score": -1.0, # Negative score implies bearish/wait
                "details": {"tech": 0, "news": 0, "risk": risk_score}
            }

        # 3. Technical Analysis (The Strategist)
        tech_result = self.tech_agent.get_signal(ticker, df)
        tech_signal = tech_result["signal"] # -1, 0, 1
        tech_conf = tech_result["confidence"]
        tech_vote = float(tech_signal) * tech_conf # Scale by confidence
        
        tech_str = tech_result.get("strategy", "Unknown")
        reasons.append(f"Tech ({tech_str}): Signal {tech_signal} (Conf {tech_conf:.2f})")

        # 4. News Analysis (The Observer)
        if headlines:
            news_vote = self.news_agent.analyze_headlines(ticker, headlines)
        else:
            # Fallback for verification/mocking if no headlines provided but agent exists
            # Or assume neutral if disconnected
            news_vote = 0.0
            
        if news_vote != 0:
            reasons.append(f"News: Sentiment {news_vote:.2f}")

        # 5. Weighted Voting (The Hive Mind)
        # Score = (Tech * 0.5) + (News * 0.3) + (Risk * 0.2)
        # Range: -1.0 to 1.0
        
        final_score = (tech_vote * self.weights["tech"]) + \
                      (news_vote * self.weights["news"]) + \
                      (risk_vote * self.weights["risk"])

        # 6. Final Decision
        final_signal = 0
        decision_reason = "HOLD"
        
        if final_score > 0.3:
            final_signal = 1
            decision_reason = "BUY"
        elif final_score < -0.3:
            final_signal = -1
            decision_reason = "SELL"
            
        reasons.append(f"Consensus Score: {final_score:.2f} -> {decision_reason}")

        return {
            "signal": final_signal,
            "confidence": abs(final_score), # Score magnitude is confidence
            "reason": "; ".join(reasons),
            "consensus_score": round(final_score, 3),
            "details": {
                "tech_vote": round(tech_vote, 2),
                "news_vote": round(news_vote, 2),
                "risk_vote": round(risk_vote, 2),
                "risk_score": risk_result["risk_score"]
            }
        }
