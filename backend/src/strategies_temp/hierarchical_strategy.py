"""
Hierarchical Strategy (Multi-Timeframe)

This strategy uses a hierarchical approach:
    pass
1. Check long-term trend (Weekly/Monthly)
2. If long-term is bullish, look for short-term (Daily) buy signals.
3. If long-term is bearish, avoid buying or look for short opportunities.
"""

import logging

import pandas as pd

from src.multi_timeframe import MultiTimeframeAnalyzer
from src.strategies import Strategy

logger = logging.getLogger(__name__)


class HierarchicalStrategy(Strategy):
    def __init__(self, name: str = "Hierarchical MTF", trend_period: int = 200):
        super().__init__(name, trend_period)
        self.mtf_analyzer = MultiTimeframeAnalyzer()

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df is None or df.empty or "Close" not in df.columns:
            return pd.Series(dtype=int)

        # 1. Add MTF features
        try:
            df_mtf = self.mtf_analyzer.add_mtf_features(df.copy())
        except Exception as e:
            logger.error(f"Error adding MTF features: {e}")
            return pd.Series(0, index=df.index)

        signals = pd.Series(0, index=df.index)

        # Check if we have enough data for MTF features
        if "W_Trend" not in df_mtf.columns or "M_Trend" not in df_mtf.columns:
            logger.warning("MTF features not available (not enough data?)")
            return signals

        # 2. Define Logic

        # Long-term Trend (Weekly)
        # W_Trend is 1 if Close > SMA20, -1 otherwise
        weekly_bullish = df_mtf["W_Trend"] == 1
        weekly_bearish = df_mtf["W_Trend"] == -1

        # Short-term Signals (Daily)
        # Daily MACD
        if "MACD" not in df_mtf.columns:
            import ta

            macd = ta.trend.MACD(df_mtf["Close"])
            df_mtf["MACD"] = macd.macd()
            df_mtf["MACD_Signal"] = macd.macd_signal()

        # MACD Crossover/Crossunder
        macd_cross_up = (df_mtf["MACD"] > df_mtf["MACD_Signal"]) & (
            df_mtf["MACD"].shift(1) <= df_mtf["MACD_Signal"].shift(1)
        )
        macd_cross_down = (df_mtf["MACD"] < df_mtf["MACD_Signal"]) & (
            df_mtf["MACD"].shift(1) >= df_mtf["MACD_Signal"].shift(1)
        )

        # RSI for overbought/oversold check
        if "RSI" not in df_mtf.columns:
            import ta

            df_mtf["RSI"] = ta.momentum.RSIIndicator(df_mtf["Close"], window=14).rsi()

            # 3. Combine

            # Buy Signal:
        # Weekly is Bullish AND (MACD Cross Up OR RSI < 45)
        # Relaxed entry to catch trends
        signals.loc[weekly_bullish & (macd_cross_up | (df_mtf["RSI"] < 45))] = 1

        # Sell Signal (Exit Long):
        #             pass
        # Weekly turns Bearish OR MACD Cross Down (if RSI is high)
        signals.loc[weekly_bearish | (macd_cross_down & (df_mtf["RSI"] > 60))] = -1

        # Short Signal (Optional - for now just exit)
        # signals.loc[weekly_bearish & macd_cross_down] = -1

        return signals

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "週足が上昇トレンドで、日足で押し目買いのチャンスです。"
        elif signal == -1:
            return "短期的な過熱感があるか、トレンドが転換する可能性があります。"
        return "長期トレンドと短期シグナルが一致していません。"
