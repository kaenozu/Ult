from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from ta.trend import ADXIndicator


class MarketRegime(Enum):
    BULL = "Bull (強気)"
    BEAR = "Bear (弱気)"
    SIDEWAYS = "Sideways (レンジ)"
    VOLATILE = "Volatile (高ボラティリティ)"
    UNCERTAIN = "Uncertain (不透明)"
    TRENDING_UP = "Trending Up"
    TRENDING_DOWN = "Trending Down"
    HIGH_VOLATILITY = "High Volatility"
    LOW_VOLATILITY = "Low Volatility"
    RANGING = "Ranging"
    CRASH = "CRASH (市場崩壊警報)"

    # Add helper to detect drawdown
    @staticmethod
    def _is_crash(volatility, trend):
        return volatility == "high" and trend == "down"


class RegimeDetector:
    """
    Detects the current market regime based on technical indicators.
    Used to adjust trading strategies dynamically.
    """

    def __init__(
        self, window_short: int = 50, window_long: int = 200, adx_threshold: int = 20, vix_threshold: float = 25.0
    ):
        self.window_short = window_short
        self.window_long = window_long
        self.adx_threshold = adx_threshold
        self.vix_threshold = vix_threshold
        self.regimes = {r.name.lower(): r for r in MarketRegime}
        self.current_regime: Optional[str] = None
        self.regime_history: List[Dict] = []

    def detect_regime(self, df: pd.DataFrame, vix_value: Optional[float] = None) -> str:
        """
        Analyzes DataFrame to determine market regime.
        df requires: 'Close', 'High', 'Low'
        """
        trend = self._detect_trend_fallback(df, self.window_short)
        volatility = self._detect_volatility_fallback(df, self.window_short, vix_value)
        regime = self._classify_regime(trend, volatility)

        self.current_regime = regime
        self.regime_history.append(
            {
                "timestamp": pd.Timestamp.utcnow().isoformat(),
                "regime": regime,
                "trend": trend,
                "volatility": volatility,
            }
        )
        return regime

    def calculate_confidence(self, df: pd.DataFrame, regime: str) -> float:
        """
        Calculates confidence score (0.0 - 1.0) for the detected regime.

        Logic:
        - Trending: Uses ADX strength.
        - Volatile: Uses volatility percentile or proximity to threshold.
        - Ranging: Inverse of ADX/Volatility.
        """
        if df is None or df.empty or len(df) < 20:
            return 0.5

        confidence = 0.5

        try:
            # ADX for Trend Strength
            adx_indicator = ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=14)
            adx = adx_indicator.adx().iloc[-1]

            # Volatility
            returns = df["Close"].pct_change().dropna()
            vol = returns.rolling(self.window_short).std().iloc[-1] * np.sqrt(252)

            if regime in ["trending_up", "trending_down"]:
                # Trend confidence heavily relies on ADX
                # ADX > 25 is trend, maxes out around 60-70 usually
                confidence = min(max((adx - 15) / 40.0, 0.2), 0.95)

            elif regime in ["high_volatility", "CRASH (市場崩壊警報)"]:
                # High volatility confidence
                # If vol > 0.4 (threshold), how much higher?
                confidence = min(max((vol - 0.3) / 0.4, 0.4), 0.95)

            elif regime == "ranging":
                # Ranging means low ADX and normal volatility
                adx_score = 1.0 - min(adx / 30.0, 1.0) # Lower ADX = Higher confidence
                confidence = max(adx_score, 0.3)

            elif regime == "low_volatility":
                 # Low volatility confidence
                 confidence = min(max((0.2 - vol) / 0.15, 0.3), 0.9)

        except Exception as e:
            # Fallback
            pass

        return round(float(confidence), 2)

    def detect_regime_with_confidence(self, df: pd.DataFrame, vix_value: Optional[float] = None) -> Tuple[str, float]:
        """
        Returns both regime and calculated confidence.
        """
        regime = self.detect_regime(df, vix_value)
        confidence = self.calculate_confidence(df, regime)
        return regime, confidence

    def get_regime_signal(self, df: pd.DataFrame, vix_value: Optional[float] = None) -> Dict:
        """
        Returns regime detection result as a dictionary.
        Compatibility wrapper for detect_regime.
        """
        regime = self.detect_regime(df, vix_value)
        strategy = self.get_regime_strategy(regime)
        return {
            "regime": regime,
            "strategy": strategy.get("strategy", "unknown"),
            "position_size": strategy.get("position_size", 1.0),
            "stop_loss": strategy.get("stop_loss", 0.02),
            "take_profit": strategy.get("take_profit", 0.05),
        }

    def _detect_trend_fallback(self, df: pd.DataFrame, window: int) -> str:
        if df is None or df.empty or len(df) < window:
            return "ranging"

        close = df["Close"].squeeze()
        sma_short = close.rolling(window=window).mean()
        sma_long = close.rolling(window=window * 2).mean()

        if len(sma_long.dropna()) == 0:
            return "ranging"

        if sma_short.iloc[-1] > sma_long.iloc[-1]:
            return "up"
        if sma_short.iloc[-1] < sma_long.iloc[-1]:
            return "down"
        return "ranging"

    def _detect_volatility_fallback(self, df: pd.DataFrame, window: int, vix_value: Optional[float] = None) -> str:
        if vix_value is not None:
            if vix_value > self.vix_threshold:
                return "high"
            if vix_value < max(0, self.vix_threshold / 2):
                return "low"

        if df is None or df.empty or len(df) < window:
            return "normal"

        returns = df["Close"].pct_change().dropna()
        vol = returns.rolling(window).std().iloc[-1] * np.sqrt(252)

        if vol > 0.4:
            return "high"
        if vol < 0.15:
            return "low"
        return "normal"

    def _classify_regime(self, trend: str, volatility: str) -> str:
        """
        Classifies the market regime based on trend and volatility signals.
        
        Args:
            trend (str): The detected trend direction ('up', 'down', 'ranging').
            volatility (str): The detected volatility level ('high', 'low', 'normal').
            
        Returns:
            str: The classification string corresponding to MarketRegime values.
        """
        # Crash Detection Priority
        if MarketRegime._is_crash(volatility, trend):
            return MarketRegime.CRASH.value

        if volatility == "high":
            return "high_volatility"
        if volatility == "low":
            return "low_volatility"

        if trend == "up":
            return "trending_up"
        if trend == "down":
            return "trending_down"
        return "ranging"

    def get_regime_strategy(self, regime: Optional[str] = None) -> Dict:
        regime = regime or self.current_regime or "ranging"
        strategy_map = {
            "trending_up": {
                "strategy": "trend_following",
                "stop_loss": 0.03,
                "take_profit": 0.15,
                "position_size": 1.0,
            },
            "trending_down": {
                "strategy": "counter_trend",
                "stop_loss": 0.02,
                "take_profit": 0.08,
                "position_size": 0.5,
            },
            "ranging": {"strategy": "mean_reversion", "stop_loss": 0.02, "take_profit": 0.05, "position_size": 0.7},
            "high_volatility": {
                "strategy": "volatility_breakout",
                "stop_loss": 0.05,
                "take_profit": 0.20,
                "position_size": 0.3,
            },
            "CRASH (市場崩壊警報)": {
                "strategy": "CIRCUIT_BREAKER",
                "stop_loss": 0.0,
                "take_profit": 0.0,
                "position_size": 0.0,
            },
            "low_volatility": {
                "strategy": "range_trading",
                "stop_loss": 0.02,
                "take_profit": 0.06,
                "position_size": 0.5,
            },
        }
        return strategy_map.get(regime, strategy_map["ranging"])

    def get_regime_history(self, n: Optional[int] = None) -> List[Dict]:
        if n is None or n >= len(self.regime_history):
            return list(self.regime_history)
        return self.regime_history[-n:]

    def get_regime_statistics(self) -> Dict:
        if not self.regime_history:
            return {"message": "No regime data available"}

        counts = {}
        for h in self.regime_history:
            counts[h["regime"]] = counts.get(h["regime"], 0) + 1

        total = len(self.regime_history)
        percentages = {k: v / total for k, v in counts.items()}
        most_common = max(counts, key=counts.get)

        return {
            "current_regime": self.current_regime,
            "total_observations": total,
            "regime_counts": counts,
            "regime_percentages": percentages,
            "most_common_regime": most_common,
        }


# Backward-compatible alias expected by tests
class MarketRegimeDetector(RegimeDetector):
    """Alias for legacy references."""
