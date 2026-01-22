
from src.strategies.base import Strategy
import pandas as pd
from ta.momentum import RSIIndicator

class RSIStrategy(Strategy):
    def __init__(self, name="RSI", window=14, oversold=30, overbought=70):
        super().__init__(name=name)
        self.window = window
        self.oversold = oversold
        self.overbought = overbought

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        if data.empty or len(data) < self.window:
            return pd.Series(0, index=data.index)

        rsi = RSIIndicator(close=data["Close"], window=self.window).rsi()
        signals = pd.Series(0, index=data.index)

        # Buy when RSI crosses below oversold
        signals[rsi < self.oversold] = 1
        # Sell when RSI crosses above overbought
        signals[rsi > self.overbought] = -1

        return signals
