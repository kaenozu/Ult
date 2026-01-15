import pandas as pd
import ta
from ..technical.base import TechnicalStrategy

class CombinedStrategy(TechnicalStrategy):
    def __init__(
        self,
        rsi_period: int = 14,
        bb_length: int = 20,
        bb_std: float = 1.0,
        trend_period: int = 200,
    ) -> None:
        super().__init__("Combined (RSI + BB)", trend_period)
        self.rsi_period = rsi_period
        self.bb_length = bb_length
        self.bb_std = bb_std

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if not self._validate_dataframe(df):
            return pd.Series(dtype=int)

        # RSI
        rsi = ta.momentum.RSIIndicator(close=df["Close"], window=self.rsi_period).rsi()

        # BB
        bb = ta.volatility.BollingerBands(close=df["Close"], window=self.bb_length, window_dev=self.bb_std)
        lower_band = bb.bollinger_lband()
        upper_band = bb.bollinger_hband()

        signals = self._create_signals_series(df)

        # Buy: RSI < 10 AND Close < Lower Band
        signals.loc[(rsi < 10) & (df["Close"] < lower_band)] = 1

        # Sell: RSI > 90 AND Close > Upper Band
        signals.loc[(rsi > 90) & (df["Close"] > upper_band)] = -1

        return self._apply_standard_trend_filter(df, signals)

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "RSIとボリンジャーバンドの両方が「売られすぎ」を示しています。強い反発のチャンスです。"
        elif signal == -1:
            return "RSIとボリンジャーバンドの両方が「買われすぎ」を示しています。強い反落の警戒が必要です。"
        return "複数の指標による強いシグナルは出ていません。"
