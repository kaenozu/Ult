from typing import Dict, Any, Optional, List
import logging
import pandas as pd

from src.strategies.strategy_router import StrategyRouter
from src.agents.risk_agent import RiskAgent
from src.agents.news_agent import NewsAgent
from src.agents.vision_agent import VisionAgent

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
        self.vision_agent = VisionAgent()
        
        # Weights (The "Personality" of the Hive)
        # Total must equal 1.0
        self.weights = {
            "tech": 0.4,
            "news": 0.3,
            "vision": 0.2,
            "risk": 0.1
        }

    def deliberate(self, ticker: str, df: pd.DataFrame, external_data: Optional[Dict[str, pd.DataFrame]] = None, headlines: List[str] = None, news_sentiment: Optional[float] = None, skip_vision: bool = False) -> Dict[str, Any]:
        """
        Conduct a debate and reach a consensus.
        """
        reasons = []
        
        # 1. Risk Analysis (The Guardian)
        risk_result = self.risk_agent.analyze(df, external_data)
        risk_score = risk_result["risk_score"]
        is_veto = risk_result["is_veto"]
        
        # Risk Voting
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
                "consensus_score": -1.0,
                "details": {"tech": 0, "news": 0, "risk": risk_score, "vision": 0},
                "individual_thoughts": risk_result["reasons"]
            }

        # 3. Technical Analysis (The Strategist)
        tech_result = self.tech_agent.get_signal(ticker, df)
        tech_signal = tech_result["signal"]
        tech_conf = tech_result["confidence"]
        tech_vote = float(tech_signal) * tech_conf
        
        tech_str = tech_result.get("strategy", "Unknown")
        reasons.append(f"Tech ({tech_str}): Signal {tech_signal} (Conf {tech_conf:.2f})")

        # 4. News Analysis (The Observer)
        news_vote = 0.0
        if news_sentiment is not None:
            news_vote = news_sentiment
            reasons.append(f"News (Injected): {news_vote:.2f}")
        elif headlines:
            news_vote = self.news_agent.analyze_headlines(ticker, headlines)
            if news_vote != 0:
                reasons.append(f"News (Agent): {news_vote:.2f}")

        # 5. Vision Analysis (The Seer)
        # Note: This is an expensive call (Latency).
        vision_vote = 0.0
        if not skip_vision:
            try:
                vision_vote = self.vision_agent.analyze(ticker, df)
                if vision_vote != 0:
                    reasons.append(f"Vision: {vision_vote:.2f}")
            except Exception as e:
                logger.warning(f"Vision analysis failed: {e}")
        else:
            logger.info(f"Skipping Vision analysis for {ticker} (Efficiency Mode)")

        # 6. Weighted Voting (The Hive Mind)
        # Score = (Tech*0.4) + (News*0.3) + (Vision*0.2) + (Risk*0.1)
        
        final_score = (tech_vote * self.weights["tech"]) + \
                      (news_vote * self.weights["news"]) + \
                      (vision_vote * self.weights["vision"]) + \
                      (risk_vote * self.weights["risk"])

        # 7. Final Decision
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
            "confidence": abs(final_score),
            "reason": "; ".join(reasons),
            "consensus_score": round(final_score, 3),
            "details": {
                "tech_vote": round(tech_vote, 2),
                "news_vote": round(news_vote, 2),
                "vision_vote": round(vision_vote, 2),
                "risk_vote": round(risk_vote, 2),
                "risk_score": risk_result["risk_score"]
            }
        }
