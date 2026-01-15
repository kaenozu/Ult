"""
Multi-Timeframe Analysis Module for AGStock

This module provides functions to:
    pass
1. Resample daily data to weekly/monthly timeframes.
2. Calculate technical indicators on higher timeframes.
3. Merge higher timeframe features back to the original daily dataframe.
"""

import logging

import numpy as np
import pandas as pd
import ta

logger = logging.getLogger(__name__)


class MultiTimeframeAnalyzer:
    def __init__(self):
        pass

    def resample_data(self, df: pd.DataFrame, rule: str) -> pd.DataFrame:
        """
        Resample daily data to a higher timeframe.

        Args:
            df: Daily dataframe with Open, High, Low, Close, Volume
            rule: Resampling rule ('W' for Weekly, 'M' for Monthly)

        Returns:
            Resampled dataframe
        """
        if df is None or df.empty:
            return pd.DataFrame()

        # Ensure index is datetime
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)

        agg_dict = {
            "Open": "first",
            "High": "max",
            "Low": "min",
            "Close": "last",
            "Volume": "sum",
        }

        # Handle extra columns if present (e.g. Adj Close)
        if "Adj Close" in df.columns:
            agg_dict["Adj Close"] = "last"

        resampled = df.resample(rule).agg(agg_dict)
        resampled.dropna(inplace=True)

        return resampled

    def calculate_mtf_indicators(self, df: pd.DataFrame, timeframe_prefix: str) -> pd.DataFrame:
        """
        Calculate technical indicators for a specific timeframe.

        Args:
            df: Dataframe for the specific timeframe
            timeframe_prefix: Prefix for column names (e.g., 'W_' or 'M_')

        Returns:
            Dataframe with added indicators
        """
        df = df.copy()

        # 1. Trend (SMA/EMA)
        df[f"{timeframe_prefix}SMA_20"] = ta.trend.SMAIndicator(df["Close"], window=20).sma_indicator()
        df[f"{timeframe_prefix}SMA_50"] = ta.trend.SMAIndicator(df["Close"], window=50).sma_indicator()

        # Trend Direction
        df[f"{timeframe_prefix}Trend"] = np.where(df["Close"] > df[f"{timeframe_prefix}SMA_20"], 1, -1)

        # 2. Momentum (RSI)
        df[f"{timeframe_prefix}RSI"] = ta.momentum.RSIIndicator(df["Close"], window=14).rsi()

        # 3. MACD
        macd = ta.trend.MACD(df["Close"])
        df[f"{timeframe_prefix}MACD"] = macd.macd()
        df[f"{timeframe_prefix}MACD_Signal"] = macd.macd_signal()
        df[f"{timeframe_prefix}MACD_Hist"] = macd.macd_diff()

        return df

    def merge_mtf_features(self, daily_df: pd.DataFrame, mtf_df: pd.DataFrame, prefix: str) -> pd.DataFrame:
        """
        Merge higher timeframe features into daily dataframe.

        Args:
            daily_df: Original daily dataframe
            mtf_df: Higher timeframe dataframe with indicators
            prefix: Prefix used for MTF columns

        Returns:
            Daily dataframe with MTF features (forward filled)
        """
        if daily_df is None or daily_df.empty or mtf_df is None or mtf_df.empty:
            return daily_df

        # Identify MTF feature columns (exclude OHLCV)
        feature_cols = [col for col in mtf_df.columns if col.startswith(prefix)]

        if not feature_cols:
            return daily_df

        mtf_features = mtf_df[feature_cols].copy()

        # Reindex to daily frequency to align with daily_df
        # We use forward fill to propagate the weekly/monthly value to subsequent days
        # until a new period starts.

        # First, ensure both have timezone-aware or timezone-naive indices matching
        if daily_df.index.tz is not None and mtf_features.index.tz is None:
            mtf_features.index = mtf_features.index.tz_localize(daily_df.index.tz)
        elif daily_df.index.tz is None and mtf_features.index.tz is not None:
            mtf_features.index = mtf_features.index.tz_localize(None)

        # Merge using asof or reindex+ffill
        # reindex with method='ffill' is simplest for this case
        aligned_features = mtf_features.reindex(daily_df.index, method="ffill")

        # Concatenate
        result_df = pd.concat([daily_df, aligned_features], axis=1)

        return result_df

    def add_mtf_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Main entry point: Add Weekly and Monthly features to daily data.
        """
        # Weekly
        weekly_df = self.resample_data(df, "W-FRI")
        weekly_df = self.calculate_mtf_indicators(weekly_df, "W_")
        df = self.merge_mtf_features(df, weekly_df, "W_")

        # Monthly
        monthly_df = self.resample_data(df, "M")
        monthly_df = self.calculate_mtf_indicators(monthly_df, "M_")
        df = self.merge_mtf_features(df, monthly_df, "M_")

        return df

    def analyze(self, df: pd.DataFrame) -> dict:
        """
        Analyze trends across timeframes.

        Args:
            df: Daily dataframe

        Returns:
            Dictionary with trend analysis
        """
        if df is None or df.empty:
            return {}

        # Add MTF features if not present
        if "W_Trend" not in df.columns:
            df = self.add_mtf_features(df)

        latest = df.iloc[-1]

        result = {"weekly_trend": "NEUTRAL", "monthly_trend": "NEUTRAL"}

        if "W_Trend" in df.columns:
            w_trend = latest["W_Trend"]
            if w_trend > 0:
                result["weekly_trend"] = "UPTREND"
            elif w_trend < 0:
                result["weekly_trend"] = "DOWNTREND"

        if "M_Trend" in df.columns:
            m_trend = latest["M_Trend"]
            if m_trend > 0:
                result["monthly_trend"] = "UPTREND"
            elif m_trend < 0:
                result["monthly_trend"] = "DOWNTREND"

        return result


_analyzer = None


def get_mtf_analyzer():
    global _analyzer
    if _analyzer is None:
        _analyzer = MultiTimeframeAnalyzer()
    return _analyzer
