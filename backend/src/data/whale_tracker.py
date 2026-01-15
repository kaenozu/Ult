import logging
import pandas as pd
from typing import Dict, Any

logger = logging.getLogger(__name__)


class WhaleTracker:
    """
    Monitors institutional liquidity flows, large-block trades,
    and unusual volume spikes.
    """

    def __init__(self, threshold_factor: float = 2.5):
        self.threshold_factor = threshold_factor  # Multiple of avg volume

    def detect_whale_movement(self, ticker: str, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyzes volume and price action to detect 'Whale' activity.
        """
        if df is None or len(df) < 20:
            return {"detected": False, "reason": "Insufficient data"}

        avg_volume = df["Volume"].tail(20).mean()
        latest_volume = df["Volume"].iloc[-1]

        # 1. Volume Spike Detection
        volume_ratio = latest_volume / avg_volume if avg_volume > 0 else 0
        is_spike = volume_ratio > self.threshold_factor

        # 2. Price Correlation
        price_change = (df["Close"].iloc[-1] - df["Open"].iloc[-1]) / df["Open"].iloc[-1]

        whale_detected = False
        action_type = "UNKNOWN"

        if is_spike:
            whale_detected = True
            if price_change > 0.02:
                action_type = "INSTITUTIONAL_ACCUMULATION"
            elif price_change < -0.02:
                action_type = "INSTITUTIONAL_DISTRIBUTION"
            else:
                action_type = "HEAVY_FIGHTING / CHURNING"

        return {
            "ticker": ticker,
            "detected": whale_detected,
            "action_type": action_type,
            "volume_ratio": round(volume_ratio, 2),
            "price_impact_pct": round(price_change * 100, 2),
        }
