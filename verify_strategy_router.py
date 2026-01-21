import pandas as pd
import numpy as np
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from src.strategies.strategy_router import StrategyRouter
from src.evolution.regime_classifier import RegimeType

def create_mock_data(regime_type: str, n_days=200):
    """Create dummy OHLCV data for specific regimes"""
    dates = pd.date_range(end=pd.Timestamp.now(), periods=n_days)
    close = [100.0]
    
    if regime_type == "TREND_UP":
        for i in range(1, n_days):
            close.append(close[-1] * (1.002 + np.random.normal(0, 0.005)))
    elif regime_type == "RANGE":
        for i in range(1, n_days):
            # Mean reverting around 100
            close.append(close[-1] + (100 - close[-1]) * 0.1 + np.random.normal(0, 0.5))
    elif regime_type == "VOLATILE":
        for i in range(1, n_days):
            close.append(close[-1] * (1.0 + np.random.normal(0, 0.05)))
    else:
        for i in range(1, n_days):
            close.append(close[-1] * (1.0 + np.random.normal(0, 0.005)))
            
    df = pd.DataFrame({
        "Open": close,
        "High": [p * 1.01 for p in close],
        "Low": [p * 0.99 for p in close],
        "Close": close,
        "Volume": [1000000 for _ in close]
    }, index=dates)
    return df

def verify_router():
    router = StrategyRouter()
    regimes_to_test = ["TREND_UP", "RANGE", "VOLATILE"]
    
    print("=== Strategy Router Verification ===")
    
    for r_type in regimes_to_test:
        print(f"\nTesting Regime: {r_type}")
        df = create_mock_data(r_type)
        
        # We need to monkeypatch or ensure RegimeClassifier actually detects this
        # For simple verification, we just check if it returns a strategy field
        result = router.get_signal("TEST_TICKER", df)
        
        print(f"Detected Regime: {result.get('regime')}")
        print(f"Selected Strategy: {result.get('strategy')}")
        print(f"Signal: {result.get('signal')}, Confidence: {result.get('confidence')}")
        
    print("\n✅ Verification script finished.")

if __name__ == "__main__":
    verify_router()
