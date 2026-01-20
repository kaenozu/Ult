import sys
import os
import logging
import pandas as pd
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from src.agents.consensus_engine import ConsensusEngine

# Setup logging
logging.basicConfig(level=logging.INFO)

def verify_vision_integration():
    print("\n--- Testing Phase 16: Vision Consensus Integration ---")
    
    # Init Engine
    engine = ConsensusEngine()
    
    # Mock Tech Agent (Signal 1, Conf 0.5 -> Vote 0.5)
    # Tech Weight 0.4 * 0.5 = 0.2
    engine.tech_agent.get_signal = MagicMock(return_value={"signal": 1, "confidence": 0.5, "strategy": "MockTech"})
    
    # Mock News Agent (Neutral)
    engine.news_agent.analyze_headlines = MagicMock(return_value=0.0)
    
    # Mock Risk Agent (Safe -> Vote 1.0)
    # Risk Weight 0.1 * 1.0 = 0.1
    engine.risk_agent.analyze = MagicMock(return_value={"risk_score": 0.0, "is_veto": False, "reasons": []})
    
    # Mock Data
    df = pd.DataFrame({'Close': [100, 101, 102]})
    ticker = "TEST"
    
    print("\n[Case 1] Vision is BULLISH (1.0)")
    # Vision Weight 0.2 * 1.0 = 0.2
    # Total Expected: Tech(0.2) + News(0) + Risk(0.1) + Vision(0.2) = 0.5
    engine.vision_agent.analyze = MagicMock(return_value=1.0)
    
    result = engine.deliberate(ticker, df)
    score = result["consensus_score"]
    print(f"Score: {score:.3f} (Expect 0.500)")
    
    if 0.49 <= score <= 0.51:
        print("✅ Case 1 Passed")
    else:
        print(f"❌ Case 1 Failed (Got {score})")
        
    print("\n[Case 2] Vision is BEARISH (-1.0)")
    # Vision Weight 0.2 * -1.0 = -0.2
    # Total Expected: Tech(0.2) + News(0) + Risk(0.1) + Vision(-0.2) = 0.1
    engine.vision_agent.analyze = MagicMock(return_value=-1.0)
    
    result = engine.deliberate(ticker, df)
    score = result["consensus_score"]
    print(f"Score: {score:.3f} (Expect 0.100)")
    
    if 0.09 <= score <= 0.11:
        print("✅ Case 2 Passed")
    else:
        print(f"❌ Case 2 Failed (Got {score})")

    # Verify Details
    det = result["details"]
    if "vision_vote" in det and det["vision_vote"] == -1.0:
        print("✅ Details contain vision_vote")
    else:
        print("❌ Details missing vision_vote")

if __name__ == "__main__":
    verify_vision_integration()
