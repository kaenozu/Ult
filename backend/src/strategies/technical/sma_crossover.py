import pandas as pd
from .base import TechnicalStrategy

class SMACrossoverStrategy(TechnicalStrategy):
    def __init__(self, short_window: int = 5, long_window: int = 25, trend_period: int = 200) -> None:
        super().__init__(f"SMA Crossover ({short_window}/{long_window})", trend_period)
        self.short_window = short_window
        self.long_window = long_window

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if not self._validate_dataframe(df):
            return pd.Series(dtype=int)

        signals = self._create_signals_series(df)

        short_sma = df["Close"].rolling(window=self.short_window).mean()
        long_sma = df["Close"].rolling(window=self.long_window).mean()

        # Golden Cross
        signals.loc[(short_sma > long_sma) & (short_sma.shift(1) <= long_sma.shift(1))] = 1
        # Dead Cross
        signals.loc[(short_sma < long_sma) & (short_sma.shift(1) >= long_sma.shift(1))] = -1

        return self._apply_standard_trend_filter(df, signals)

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "短期移動平均線が長期移動平均線を上抜けました（ゴールデンクロス）。上昇トレンドの始まりを示唆しています。"
        elif signal == -1:
            return (
                "短期移動平均線が長期移動平均線を下抜けました（デッドクロス）。下落トレンドの始まりを示唆しています。"
            )
        return "明確なトレンド転換シグナルは出ていません。"
