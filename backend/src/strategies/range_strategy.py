import pandas as pd
import ta
from .base import Strategy

class RangeStrategy(Strategy):
    """
    The Guerilla Strategy: Range Trading with Bollinger Bands & RSI
    Best for: RANGE Regime
    Logic:
    - Buy: Price < Lower Band (2.0) AND RSI < 30 (Oversold)
    - Sell: Price > Upper Band (2.0) AND RSI > 70 (Overbought)
    - Exit: Middle Band (Mean Reversion)
    """
    def __init__(self, bb_window=20, bb_std=2.0, rsi_window=14):
        super().__init__("RangeStrategy (The Guerilla)")
        self.bb_window = bb_window
        self.bb_std = bb_std
        self.rsi_window = rsi_window

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df.empty or len(df) < max(self.bb_window, self.rsi_window):
            return pd.Series(0, index=df.index)

        # Calculate Indicators
        bollinger = ta.volatility.BollingerBands(close=df["Close"], window=self.bb_window, window_dev=self.bb_std)
        lower_band = bollinger.bollinger_lband()
        upper_band = bollinger.bollinger_hband()
        mid_band = bollinger.bollinger_mavg()
        
        rsi = ta.momentum.RSIIndicator(close=df["Close"], window=self.rsi_window).rsi()
        
        signals = pd.Series(0, index=df.index)
        
        # Entry Logic
        # Buy: Close below lower band AND RSI < 30
        buy_condition = (df["Close"] < lower_band) & (rsi < 30)
        
        # Sell (Short): Close above upper band AND RSI > 70
        sell_condition = (df["Close"] > upper_band) & (rsi > 70)
        
        signals[buy_condition] = 1
        signals[sell_condition] = -1
        
        # Exit Logic (Simple Mean Reversion)
        # Note: In a real system, exit is handled by position management. 
        # Here we just mark entry points. 
        # Ideally, we should implement a "Flat" signal (0) but that's default.
        
        return signals

    def analyze(self, df: pd.DataFrame):
        signal_series = self.generate_signals(df)
        last_signal = int(signal_series.iloc[-1]) if not signal_series.empty else 0
        
        # Confidence based on RSI depth
        rsi = ta.momentum.RSIIndicator(close=df["Close"], window=self.rsi_window).rsi().iloc[-1]
        confidence = 0.0
        
        if last_signal == 1:
            # Lower RSI = Higher Confidence (e.g. RSI 20 is better than 29)
            confidence = max(0.5, 1.0 - (rsi / 30.0)) 
        elif last_signal == -1:
             # Higher RSI = Higher Confidence
            confidence = max(0.5, (rsi - 70.0) / 30.0)

        # Target Price = Middle Band
        bollinger = ta.volatility.BollingerBands(close=df["Close"], window=self.bb_window, window_dev=self.bb_std)
        target_price = bollinger.bollinger_mavg().iloc[-1]

        return {
            "signal": last_signal,
            "confidence": round(float(confidence), 2),
            "target_price": round(float(target_price), 1),
            "strategy_name": self.name
        }

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "レンジ下限到達かつ売られすぎ(RSI<30)。平均回帰を狙った買い。"
        elif signal == -1:
            return "レンジ上限到達かつ買われすぎ(RSI>70)。平均回帰を狙った売り。"
        return "レンジ内のため様子見"
