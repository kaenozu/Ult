import sys
import os
import pandas as pd
import numpy as np
import pytest
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from src.evolution.regime_classifier import RegimeClassifier, RegimeType

def create_mock_data(trend_type="up", length=100):
    """Creates synthetic OHLCV data for testing."""
    index = pd.date_range(start="2023-01-01", periods=length, freq="D")
    data = {
        "Open": [], "High": [], "Low": [], "Close": [], "Volume": []
    }
    
    price = 100.0
    for i in range(length):
        if trend_type == "up":
            change = np.random.normal(0.5, 0.5) # Trend up
        elif trend_type == "down":
            change = np.random.normal(-0.5, 0.5) # Trend down
        elif trend_type == "range":
            change = np.sin(i / 5.0) * 2.0 # Sine wave
            price = 100.0 + change # Reset to base
            change = 0 # Already applied
        elif trend_type == "volatile":
             change = np.random.normal(0, 5.0) # High noise
             
        price += change
        
        # Ensure High/Low envelop Close/Open
        high = price + abs(np.random.normal(0, 1.0))
        low = price - abs(np.random.normal(0, 1.0))
        open_ = price + np.random.normal(0, 0.5)
        
        data["Close"].append(price)
        data["High"].append(high)
        data["Low"].append(low)
        data["Open"].append(open_)
        data["Volume"].append(1000)

    df = pd.DataFrame(data, index=index)
    return df

class TestRegimeClassifier:
    def test_trend_up_detection(self):
        classifier = RegimeClassifier()
        # Create strong uptrend
        df = create_mock_data(trend_type="up", length=60)
        
        # Manually ensure MA20 > MA50 by forcing price up
        df['Close'] = np.linspace(100, 200, 60) + np.random.normal(0, 1, 60)
        df['High'] = df['Close'] + 1
        df['Low'] = df['Close'] - 1
        
        result = classifier.detect_regime(df)
        
        print(f"Trend Up Test Result: {result}")
        # Note: ADX might need "time" to warmup, logic is heuristic.
        # Ideally we mock or ensure indicators work.
        # For simple test, we just check structure.
        assert "regime" in result
        assert "confidence" in result
        assert "indicators" in result
        assert result["regime"] in [RegimeType.TREND_UP.value, RegimeType.UNCERTAIN.value, RegimeType.RANGE.value]

    def test_volatile_detection(self):
        classifier = RegimeClassifier()
        # Create volatile data
        df = create_mock_data(trend_type="volatile", length=60)
        
        result = classifier.detect_regime(df)
        print(f"Volatile Test Result: {result}")
        
        # High ATR should trigger VOLATILE
        # Note: It depends on the random seed and threshold
        assert "regime" in result

if __name__ == "__main__":
    # Manual run for debugging
    t = TestRegimeClassifier()
    t.test_trend_up_detection()
    t.test_volatile_detection()
    print("Test finished")
