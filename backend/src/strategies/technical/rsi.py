import pandas as pd
import ta
from .base import TechnicalStrategy

class RSIStrategy(TechnicalStrategy):
    def __init__(
        self,
        period: int = 5,       # Hyper sensitive
        lower: float = 48,     # Buying candidate if RSI < 48
        upper: float = 52,     # Selling candidate if RSI > 52
        trend_period: int = 200,
    ) -> None:
        super().__init__(f"RSI ({period}) Hyper", trend_period)
        self.period = period
        self.lower = lower
        self.upper = upper

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if not self._validate_dataframe(df):
            return pd.Series(dtype=int)

        rsi_indicator = ta.momentum.RSIIndicator(close=df["Close"], window=self.period)
        rsi = rsi_indicator.rsi()
        signals = self._create_signals_series(df)

        if rsi is None or rsi.isna().all():
            return signals

        # Level-based signals (more frequent than crossover)
        # Buy: RSI is in oversold territory (below 30)
        signals.loc[rsi < self.lower] = 1
        # Sell: RSI is in overbought territory (above 70)
        signals.loc[rsi > self.upper] = -1

        return self._apply_standard_trend_filter(df, signals)

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return f"RSIが{self.lower}を下回った後、回復しました。売られすぎからの反発を示唆しています。"
        elif signal == -1:
            return f"RSIが{self.upper}を上回った後、下落しました。買われすぎからの反落を示唆しています。"
        return "RSIは中立圏内で推移しています。"

    def analyze(self, df):
        """RSI値に基づいて信頼度を計算"""
        from typing import Dict, Any
        
        if not self._validate_dataframe(df) or len(df) < self.period + 1:
            return {"signal": 0, "confidence": 0.0}
        
        signals = self.generate_signals(df)
        if signals.empty:
            return {"signal": 0, "confidence": 0.0}
        
        last_signal = int(signals.iloc[-1])
        
        # Calculate RSI for confidence
        import ta
        rsi_indicator = ta.momentum.RSIIndicator(close=df["Close"], window=self.period)
        rsi = rsi_indicator.rsi()
        current_rsi = rsi.iloc[-1] if not rsi.isna().all() else 50
        
        # Calculate confidence based on RSI extremes
        if last_signal == 1:  # Buy signal
            # Confidence higher when RSI is very low (closer to 0)
            confidence = max(0.5, min(1.0, (30 - current_rsi) / 30 + 0.5))
        elif last_signal == -1:  # Sell signal
            # Confidence higher when RSI is very high (closer to 100)
            confidence = max(0.5, min(1.0, (current_rsi - 70) / 30 + 0.5))
        else:  # Hold
            # Show how close we are to a signal (distance from 50)
            distance_from_neutral = abs(current_rsi - 50) / 50
            confidence = distance_from_neutral * 0.4  # Max 0.4 for hold
            
        # Calculate Target Price (Heuristic)
        current_price = df["Close"].iloc[-1]
        sma_20 = df["Close"].rolling(window=20).mean().iloc[-1]
        
        target_price = current_price
        if last_signal == 1:
            # Target is SMA 20 (Mean Reversion) or +5% if SMA is below
            target_price = max(sma_20, current_price * 1.05)
        elif last_signal == -1:
            # Target is SMA 20 or -5%
            target_price = min(sma_20, current_price * 0.95)
        
        return {
            "signal": last_signal, 
            "confidence": round(confidence, 2),
            "target_price": round(float(target_price), 1)
        }
