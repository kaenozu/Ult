
import pandas as pd
from typing import Dict, Any, Optional
from .base import Strategy
from .range_strategy import RangeStrategy
from .volatility_strategy import VolatilityStrategy

class EnsembleStrategy(Strategy):
    """
    The Chimera Strategy: Multi-Strategy Ensemble
    Best for: MIXED / UNCERTAIN Regimes
    Logic:
    - Combines Range and Volatility signals using weighted voting.
    - Signal = (Range * w1 + Volatility * w2) / (w1 + w2)
    - Entry: |Signal| > threshold
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        super().__init__("EnsembleStrategy (The Chimera)", params=params)
        
        # Sub-strategy parameters (flattened for GA)
        self.range_params = {
            "bb_window": int(self.params.get("range_bb_window", 20)),
            "bb_std": float(self.params.get("range_bb_std", 2.0)),
            "rsi_window": int(self.params.get("range_rsi_window", 14))
        }
        self.vol_params = {
            "atr_window": int(self.params.get("vol_atr_window", 14)),
            "k": float(self.params.get("vol_k", 1.5))
        }
        
        # Ensemble weights
        self.w_range = float(self.params.get("w_range", 0.5))
        self.w_vol = float(self.params.get("w_vol", 0.5))
        self.threshold = float(self.params.get("threshold", 0.5))
        
        # Initialize sub-strategies
        self.range_strat = RangeStrategy(params=self.range_params)
        self.vol_strat = VolatilityStrategy(params=self.vol_params)

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df.empty:
            return pd.Series(0, index=df.index)

        # Get signals from sub-strategies
        s1 = self.range_strat.generate_signals(df)
        s2 = self.vol_strat.generate_signals(df)
        
        # Weighted Combination
        total_weight = self.w_range + self.w_vol
        if total_weight == 0:
            return pd.Series(0, index=df.index)
            
        combined_score = (s1 * self.w_range + s2 * self.w_vol) / total_weight
        
        signals = pd.Series(0, index=df.index)
        
        # Threshold Logic
        # Buy
        signals[combined_score > self.threshold] = 1
        # Sell
        signals[combined_score < -self.threshold] = -1
        
        return signals

    def analyze(self, df: pd.DataFrame):
        signal_series = self.generate_signals(df)
        last_signal = int(signal_series.iloc[-1]) if not signal_series.empty else 0
        
        # Analyze sub-components for confidence
        a1 = self.range_strat.analyze(df)
        a2 = self.vol_strat.analyze(df)
        
        # Weighted Confidence
        total_weight = self.w_range + self.w_vol
        confidence = 0.0
        if total_weight > 0:
             confidence = (a1["confidence"] * self.w_range + a2["confidence"] * self.w_vol) / total_weight
        
        target_price = None
        if last_signal != 0:
            # Use target price from the dominant strategy if available, or average
            if self.w_range > self.w_vol:
                target_price = a1.get("target_price")
            else:
                target_price = a2.get("target_price")

        return {
            "signal": last_signal,
            "confidence": round(float(confidence), 2),
            "target_price": target_price,
            "strategy_name": self.name,
            "components": {
                "range": a1,
                "volatility": a2
            }
        }

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return f"複合戦略買いシグナル (R:{self.w_range:.1f}, V:{self.w_vol:.1f})。閾値{self.threshold}を超過。"
        elif signal == -1:
             return f"複合戦略売りシグナル (R:{self.w_range:.1f}, V:{self.w_vol:.1f})。閾値{self.threshold}を下回る。"
        return "複合シグナル待ち"
