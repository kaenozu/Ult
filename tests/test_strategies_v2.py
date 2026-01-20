import sys
import os
import pandas as pd
import numpy as np
import pytest

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from src.strategies.range_strategy import RangeStrategy
from src.strategies.volatility_strategy import VolatilityStrategy
from src.strategies.strategy_router import StrategyRouter

def create_sine_wave_data(length=100, period=20):
    """Creates range-bound (sine wave) market data."""
    index = pd.date_range(start="2023-01-01", periods=length, freq="D")
    base_price = 100
    
    # Sine wave price (Amplitude 1.0 = ~1% daily move)
    prices = [base_price + 1.0 * np.sin(2 * np.pi * i / period) for i in range(length)]
    
    data = {
        "Open": prices,
        "High": [p + 0.5 for p in prices],
        "Low": [p - 0.5 for p in prices],
        "Close": prices,
        "Volume": [1000] * length
    }
    return pd.DataFrame(data, index=index)

def create_breakout_data(length=100):
    """Creates volatile breakout data."""
    index = pd.date_range(start="2023-01-01", periods=length, freq="D")
    prices = [100.0] * length
    
    # Flat then explosion
    for i in range(50, length):
        prices[i] = prices[i-1] + (5.0 if i % 2 == 0 else -1.0) # Huge upward moves
        
    data = {
        "Open": [p - 1 for p in prices],
        "High": [p + 5 for p in prices],
        "Low": [p - 2 for p in prices],
        "Close": prices,
        "Volume": [1000 + (i*100 if i > 50 else 0) for i in range(length)]
    }
    return pd.DataFrame(data, index=index)

class TestStrategies:
    def test_guerilla_range_strategy(self):
        print("\nTesting Guerilla (Range) Strategy...")
        strategy = RangeStrategy(params={"bb_window": 20, "rsi_window": 14})
        
        # Sine wave should trigger mean reversion signals
        df = create_sine_wave_data(length=200, period=25)
        
        result = strategy.analyze(df)
        print(f"Result: {result}")
        
        # Just check it runs and produces output
        assert "signal" in result
        assert "confidence" in result
        assert result["strategy_name"] == "RangeStrategy (The Guerilla)"

    def test_storm_chaser_volatility_strategy(self):
        print("\nTesting Storm Chaser (Volatility) Strategy...")
        strategy = VolatilityStrategy(params={"atr_window": 14, "k": 1.0})
        
        # Breakout data should trigger buy
        df = create_breakout_data(length=100)
        
        result = strategy.analyze(df)
        print(f"Result: {result}")
        
        assert "signal" in result
        assert result["strategy_name"] == "VolatilityStrategy (The Storm Chaser)"

    def test_strategy_router_logic(self):
        print("\nTesting Strategy Router...")
        router = StrategyRouter()
        
        # 1. Test Range Data -> Should pick Range Strategy
        df_range = create_sine_wave_data(length=100)
        # Note: Indicator warmup might affect initial regime detection
        res_range = router.get_signal("TEST", df_range)
        print(f"Range Data Router Result: {res_range['strategy']} / Confidence: {res_range['confidence']}")
        
        # 2. Test Volatile Data
        df_vol = create_breakout_data(length=100)
        res_vol = router.get_signal("TEST", df_vol)
        print(f"Volatile Data Router Result: {res_vol['strategy']} / Confidence: {res_vol['confidence']}")
        
        assert "strategy" in res_range

if __name__ == "__main__":
    t = TestStrategies()
    t.test_guerilla_range_strategy()
    t.test_storm_chaser_volatility_strategy()
    t.test_strategy_router_logic()
