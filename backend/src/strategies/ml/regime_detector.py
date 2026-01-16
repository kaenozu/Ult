from enum import Enum
import pandas as pd
import numpy as np
from typing import Dict, Any

class Regime(Enum):
    STABLE = "STABLE"
    VOLATILE = "VOLATILE"
    CRASH = "CRASH"
    RALLY = "RALLY"

class RegimeDetector:
    """
    Adaptive Regime Detector
    Classifies market state based on volatility and drawdown to adjust risk parameters.
    Part of the 'Adaptive Regime' backend feature.
    """
    
    def __init__(self, volatility_window: int = 20, crash_threshold: float = -0.10, vol_threshold: float = 0.02):
        self.vol_window = volatility_window
        self.crash_threshold = crash_threshold
        self.vol_threshold = vol_threshold

    def detect_regime(self, df: pd.DataFrame) -> Regime:
        """
        Detects the current market regime based on historical data.
        Assumes df has 'close' column.
        """
        if df.empty or len(df) < self.vol_window:
            return Regime.STABLE # Default to stable if not enough data

        # Calculate Returns
        df['returns'] = df['close'].pct_change()
        
        # Calculate Rolling Volatility (Std Dev)
        current_vol = df['returns'].rolling(window=self.vol_window).std().iloc[-1]
        
        # Calculate Drawdown from recent peak
        # Using a longer window for peak detection (e.g., 50 days)
        rolling_max = df['close'].rolling(window=50, min_periods=1).max()
        current_drawdown = (df['close'] / rolling_max - 1.0).iloc[-1]
        
        # Logic for Classification
        
        # 1. CRASH Detection (Priority)
        if current_drawdown < self.crash_threshold:
            return Regime.CRASH
            
        # 2. VOLATILE Detection
        if current_vol > self.vol_threshold:
            # Check direction for Rally vs Volatile?
            # For now, high vol is just VOLATILE (Caution)
            return Regime.VOLATILE
            
        # 3. RALLY Detection (Optional extension)
        # If returns are consistently positive and vol is moderate? 
        # Keeping it simple for now.
        
        return Regime.STABLE

    def get_risk_adjustment(self, regime: Regime) -> float:
        """
        Returns a risk multiplier (0.0 to 1.0) based on the regime.
        """
        if regime == Regime.CRASH:
            return 0.0 # Circuit Breaker: Stop Trading
        elif regime == Regime.VOLATILE:
            return 0.5 # Reduce size by half
        else:
            return 1.0 # Normal sizing
