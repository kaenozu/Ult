import pandas as pd
from typing import Dict, Any, Optional

from src.evolution.regime_classifier import RegimeClassifier, RegimeType
from src.strategies import LightGBMStrategy
from src.strategies.range_strategy import RangeStrategy
from src.strategies.volatility_strategy import VolatilityStrategy

class StrategyRouter:
    """
    The Commander: Switches strategies based on Market Regime.
    """
    def __init__(self):
        self.regime_classifier = RegimeClassifier()
        
        # The Arsenal
        self.sniper = LightGBMStrategy()     # TREND
        self.guerilla = RangeStrategy()      # RANGE
        self.storm_chaser = VolatilityStrategy() # VOLATILE
        
    def get_signal(self, ticker: str, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Detects regime and routes to appropriate strategy.
        """
        if df is None or df.empty:
             return {"signal": 0, "confidence": 0.0, "reason": "No Data"}

        # 1. Detect Regime
        regime_result = self.regime_classifier.detect_regime(df)
        regime = regime_result.get("regime", RegimeType.UNCERTAIN.value)
        regime_reason = regime_result.get("reason", "")
        
        # 2. Select Strategy
        selected_strategy = None
        
        if regime in [RegimeType.TREND_UP.value, RegimeType.TREND_DOWN.value]:
            selected_strategy = self.sniper
            strategy_type = "TREND (Sniper)"
        elif regime == RegimeType.RANGE.value:
            selected_strategy = self.guerilla
            strategy_type = "RANGE (Guerilla)"
        elif regime == RegimeType.VOLATILE.value:
            selected_strategy = self.storm_chaser
            strategy_type = "VOLATILE (Storm Chaser)"
        else:
            # UNCERTAIN -> Default to defensive or sniper?
            # Let's use Sniper but maybe lower confidence?
            selected_strategy = self.sniper
            strategy_type = "UNCERTAIN (Default to Sniper)"
            
        # 3. Execute Strategy
        try:
            strategy_result = selected_strategy.analyze(df)
        except Exception as e:
            # Fallback
            return {"signal": 0, "confidence": 0.0, "reason": f"Strategy Error: {e}"}
            
        # 4. Combine Results
        return {
            "signal": strategy_result.get("signal", 0),
            "confidence": strategy_result.get("confidence", 0.0),
            "target_price": strategy_result.get("target_price"),
            "strategy": strategy_type,
            "regime": regime,
            "explanation": f"[{strategy_type}] {strategy_result.get('explanation', '')} ({regime_reason})",
            # Maintain backward compatibility if needed
            "strategy_name": getattr(selected_strategy, "name", "Unknown")
        }
