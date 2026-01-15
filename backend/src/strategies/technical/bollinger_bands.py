import pandas as pd
import ta
from .base import TechnicalStrategy

class BollingerBandsStrategy(TechnicalStrategy):
    def __init__(self, length: int = 20, std: float = 1.0, trend_period: int = 200) -> None:
        super().__init__(f"Bollinger Bands ({length}, {std})", trend_period)
        self.length = length
        self.std = std

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if not self._validate_dataframe(df):
            return pd.Series(dtype=int)

        bollinger = ta.volatility.BollingerBands(close=df["Close"], window=self.length, window_dev=self.std)
        lower_band = bollinger.bollinger_lband()
        upper_band = bollinger.bollinger_hband()

        signals = self._create_signals_series(df)

        # Buy: Touch Lower
        signals.loc[df["Close"] < lower_band] = 1
        # Sell: Touch Upper
        signals.loc[df["Close"] > upper_band] = -1

        return self._apply_standard_trend_filter(df, signals)

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "株価がボリンジャーバンドの下限にタッチしました。売られすぎからの反発が期待できます。"
        elif signal == -1:
            return "株価がボリンジャーバンドの上限にタッチしました。過熱感があり、反落の可能性があります。"
        return "バンド内での推移が続いています。"

    def analyze(self, df: pd.DataFrame):
        if not self._validate_dataframe(df) or len(df) < self.length:
            return {"signal": 0, "confidence": 0.0}
        
        signals = self.generate_signals(df)
        last_signal = int(signals.iloc[-1]) if not signals.empty else 0
        
        # Calculate distance from bands for confidence
        bollinger = ta.volatility.BollingerBands(close=df["Close"], window=self.length, window_dev=self.std)
        lower = bollinger.bollinger_lband()
        upper = bollinger.bollinger_hband()
        mavg = bollinger.bollinger_mavg()
        
        current_price = df["Close"].iloc[-1]
        
        if last_signal == 1:
            confidence = 0.8  # Strong signal on touch
            target_price = upper.iloc[-1]
        elif last_signal == -1:
            confidence = 0.8
            target_price = lower.iloc[-1]
        else:
            # How close to the bands?
            dist_lower = abs(current_price - lower.iloc[-1]) / (mavg.iloc[-1] - lower.iloc[-1])
            dist_upper = abs(current_price - upper.iloc[-1]) / (upper.iloc[-1] - mavg.iloc[-1])
            # Max confidence when near band
            confidence = max(0, 0.4 - min(dist_lower, dist_upper) * 0.4)
            target_price = mavg.iloc[-1] # Neutral target is moving average
            
        return {
            "signal": last_signal, 
            "confidence": round(float(confidence), 2),
            "target_price": round(float(target_price), 1)
        }
