from enum import Enum
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
from ta.trend import ADXIndicator, SMAIndicator
from ta.volatility import BollingerBands, AverageTrueRange

class RegimeType(Enum):
    TREND_UP = "TREND_UP"
    TREND_DOWN = "TREND_DOWN"
    RANGE = "RANGE"
    VOLATILE = "VOLATILE"
    UNCERTAIN = "UNCERTAIN"

class RegimeClassifier:
    """
    Classifies market regime into TREND, RANGE, or VOLATILE using technical indicators.
    Currently uses V1 Heuristic Logic (Logic-based), upgradable to ML models later.
    """

    # Thresholds as class constants for easier tuning/overriding
    ADX_TREND_THRESHOLD = 25
    ADX_RANGE_THRESHOLD = 20
    ATR_HIGH_VOLATILITY = 2.0  # > 2% daily move implies high volatility
    MIN_DATA_POINTS = 50

    def __init__(self, custom_thresholds: Dict[str, float] = None):
        if custom_thresholds:
            self.ADX_TREND_THRESHOLD = custom_thresholds.get("adx_trend", self.ADX_TREND_THRESHOLD)
            self.ADX_RANGE_THRESHOLD = custom_thresholds.get("adx_range", self.ADX_RANGE_THRESHOLD)
            self.ATR_HIGH_VOLATILITY = custom_thresholds.get("atr_volatile", self.ATR_HIGH_VOLATILITY)

    def detect_regime(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Detects the current market regime based on OHLCV data.
        """
        if len(df) < self.MIN_DATA_POINTS:
            return {
                "regime": RegimeType.UNCERTAIN.value,
                "confidence": 0.0,
                "reason": f"Not enough data (min {self.MIN_DATA_POINTS} candles)"
            }

        # --- Indicator Calculation ---
        # 1. ADX (Trend Strength)
        adx_indicator = ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=14)
        adx = adx_indicator.adx().iloc[-1]
        
        # 2. Moving Averages (Trend Direction)
        sma_20 = SMAIndicator(close=df['Close'], window=20).sma_indicator().iloc[-1]
        sma_50 = SMAIndicator(close=df['Close'], window=50).sma_indicator().iloc[-1]
        
        # 3. Bollinger Bands (Range/Volatility)
        bb = BollingerBands(close=df['Close'], window=20, window_dev=2)
        bb_width = bb.bollinger_wband().iloc[-1]
        
        # 4. ATR (Volatility)
        atr_indicator = AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14)
        atr = atr_indicator.average_true_range().iloc[-1]
        atr_pct = (atr / df['Close'].iloc[-1]) * 100 # ATR as percentage of price

        # --- Logic V1 (Heuristic) ---
        regime = RegimeType.UNCERTAIN
        confidence = 0.5
        reason = ""

        # Thresholds
        ADX_TREND_THRESHOLD = 25
        ADX_RANGE_THRESHOLD = 20
        ATR_HIGH_VOLATILITY = 2.0 # > 2% daily move implies high volatility (adjust for asset class)
        
        # Classification Logic
        if atr_pct > ATR_HIGH_VOLATILITY:
            regime = RegimeType.VOLATILE
            confidence = min(0.7 + (min(atr_pct, 5.0) / 10.0), 1.0) # Higher ATR = Higher confidence
            reason = f"High Volatility (ATR: {atr_pct:.2f}%)"
            
        elif adx > ADX_TREND_THRESHOLD:
            if sma_20 > sma_50:
                regime = RegimeType.TREND_UP
                reason = f"Strong Uptrend (ADX: {adx:.1f}, SMA20 > SMA50)"
            else:
                regime = RegimeType.TREND_DOWN
                reason = f"Strong Downtrend (ADX: {adx:.1f}, SMA20 < SMA50)"
            confidence = min(adx / 50.0, 0.95) # Cap confidence at 0.95
            
        elif adx < ADX_RANGE_THRESHOLD:
            regime = RegimeType.RANGE
            confidence = 0.6 + ((ADX_RANGE_THRESHOLD - adx) / 20.0)
            reason = f"Range Market (Low ADX: {adx:.1f})"
            
        else:
            # Between 20-25 ADX, check BB width or other secondary signals
            regime = RegimeType.RANGE
            confidence = 0.4
            reason = "Weak signals (ADX neutral)"

        return {
            "regime": regime.value,
            "confidence": round(confidence, 2),
            "reason": reason,
            "indicators": {
                "adx": round(adx, 2),
                "atr_pct": round(atr_pct, 2),
                "sma_20": round(sma_20, 2),
                "sma_50": round(sma_50, 2),
                "bb_width": round(bb_width, 2)
            }
        }
