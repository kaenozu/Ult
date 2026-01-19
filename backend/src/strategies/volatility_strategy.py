import pandas as pd
import ta
from typing import Dict, Any, Optional
from .base import Strategy

class VolatilityStrategy(Strategy):
    """
    The Storm Chaser Strategy: Volatility Breakout
    Best for: VOLATILE Regime
    Logic:
    - Buy: Close > Open + (K * ATR)  (Breakout)
    - Sell: Close < Open - (K * ATR) (Breakout Down)
    - Exit: Trailing Stop
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        super().__init__("VolatilityStrategy (The Storm Chaser)", params=params)
        self.atr_window = int(self.params.get("atr_window", 14))
        self.k = float(self.params.get("k", 1.5))

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df.empty or len(df) < self.atr_window:
            return pd.Series(0, index=df.index)

        # Calculate ATR
        atr = ta.volatility.AverageTrueRange(
            high=df["High"], low=df["Low"], close=df["Close"], window=self.atr_window
        ).average_true_range()
        
        signals = pd.Series(0, index=df.index)
        
        # Breakout Threshold
        # We compare Close to Open of the SAME DAY. 
        # Ideally, we should look at Previous High/Low for standard breakout.
        # Let's use: Close > Prev High + (0.5 * ATR) for stronger confirmation?
        # Or simple: Range Expansion.
        
        # Logic: Close > Previous Close + (K * ATR)
        prev_close = df["Close"].shift(1)
        
        buy_condition = df["Close"] > (prev_close + (self.k * atr))
        sell_condition = df["Close"] < (prev_close - (self.k * atr))
        
        signals[buy_condition] = 1
        signals[sell_condition] = -1
        
        return signals

    def analyze(self, df: pd.DataFrame):
        signal_series = self.generate_signals(df)
        last_signal = int(signal_series.iloc[-1]) if not signal_series.empty else 0
        
        # Confidence scales with Breakout Strength
        atr = ta.volatility.AverageTrueRange(
            high=df["High"], low=df["Low"], close=df["Close"], window=self.atr_window
        ).average_true_range().iloc[-1]
        
        prev_close = df["Close"].iloc[-2] if len(df) > 1 else df["Close"].iloc[-1]
        current_close = df["Close"].iloc[-1]
        
        confidence = 0.0
        target_price = None
        
        if last_signal == 1:
            # How much did it breakout?
            breakout_mag = (current_close - prev_close) / atr
            confidence = min(0.9, 0.5 + (breakout_mag * 0.1)) # Cap at 0.9
            target_price = current_close + (2 * atr) # Target 2ATRs away
            
        elif last_signal == -1:
            breakout_mag = (prev_close - current_close) / atr
            confidence = min(0.9, 0.5 + (breakout_mag * 0.1))
            target_price = current_close - (2 * atr)

        return {
            "signal": last_signal,
            "confidence": round(float(confidence), 2),
            "target_price": round(float(target_price), 1) if target_price else None,
            "strategy_name": self.name
        }

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return f"ATR（{self.k}倍）を超える急激な上昇ブレイクアウト発生。"
        elif signal == -1:
            return f"ATR（{self.k}倍）を超える急激な下落ブレイクアウト発生。"
        return "ブレイクアウト待ち"
