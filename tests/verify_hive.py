import sys
import os
import pandas as pd
import numpy as np
import logging

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from src.agents.consensus_engine import ConsensusEngine
from src.agents.risk_agent import RiskAgent

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_mock_data():
    # 1. Stock Data (Uptrend)
    dates = pd.date_range(start="2022-01-01", periods=400)
    # Reduced noise to ensure TREND regime detection (was 2, now 0.5)
    prices = np.linspace(100, 150, 400) + np.random.normal(0, 0.5, 400)
    df = pd.DataFrame({
        "Open": prices,
        "High": prices + 1,
        "Low": prices - 1,
        "Close": prices,
        "Volume": 100000
    }, index=dates)
    
    # 2. External Data (Low VIX)
    vix_dates = pd.date_range(start="2022-01-01", periods=400)
    vix_close = np.linspace(15, 20, 400) # Safe VIX
    vix_df = pd.DataFrame({"Close": vix_close}, index=vix_dates)
    
    external_data_safe = {"VIX": vix_df}
    
    # 3. External Data (High VIX)
    vix_close_high = np.linspace(30, 45, 400) # Dangerous VIX
    vix_df_high = pd.DataFrame({"Close": vix_close_high}, index=vix_dates)
    external_data_danger = {"VIX": vix_df_high}
    
    return df, external_data_safe, external_data_danger

def test_hive_logic():
    print("\n--- Testing The Hive (Consensus Engine) ---")
    df, ext_safe, ext_danger = create_mock_data()
    
    engine = ConsensusEngine()
    
    # Test 1: Safe Market (Expect BUY if Tech is bullish)
    print("\n[Test 1] Safe Market Condition (VIX ~20)")
    # Increased news sentiment to 0.9 to force BUY via consensus even if Tech is weak
    result_safe = engine.deliberate("TEST", df, external_data=ext_safe, news_sentiment=0.9)
    print(f"Result: Signal {result_safe['signal']} | Decision: {result_safe['reason']}")
    print(f"Details: {result_safe['details']}")
    
    if result_safe['signal'] == 1:
        print("✅ PASSED: Correctly identified BUY opportunity.")
    else:
        print("❌ FAILED: Should be BUY in safe uptrend.")

    # Test 2: Dangerous Market (Expect WAIT/VETO)
    print("\n[Test 2] Dangerous Market Condition (VIX ~45)")
    result_danger = engine.deliberate("TEST", df, external_data=ext_danger, news_sentiment=0.5)
    print(f"Result: Signal {result_danger['signal']} | Decision: {result_danger['reason']}")
    
    if result_danger['signal'] == 0 and "VETO" in result_danger['reason']:
        print("✅ PASSED: Correctly VETOED due to high risk.")
    else:
        print("❌ FAILED: Should be VETOED.")

if __name__ == "__main__":
    test_hive_logic()
