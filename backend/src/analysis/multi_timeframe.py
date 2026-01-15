"""
Multi-Timeframe Analyzer
Analyzes multiple timeframes for signal confirmation.
"""

import logging
from typing import Dict
import pandas as pd

from src.data_loader import fetch_stock_data
from src.exceptions import DataFetchError

logger = logging.getLogger(__name__)


class MultiTimeframeAnalyzer:
    """
    Analyzes price action across multiple timeframes.
    Helps filter false signals and improve entry timing.
    """

    def __init__(self):
        self.timeframes = {
            "hourly": "5d",  # 5 days of hourly data
            "daily": "3mo",  # 3 months of daily data
            "weekly": "2y",  # 2 years of weekly data
        }

    def analyze(self, ticker: str) -> Dict[str, str]:
        """
        Analyze ticker across multiple timeframes.

        Args:
            ticker: Ticker symbol

        Returns:
            Dictionary with trend analysis for each timeframe

        Example:
            {
                'daily': 'BULLISH',
                'weekly': 'BULLISH',
                'hourly': 'BULLISH',
                'alignment': True,
                'strength': 'STRONG'
            }
        """
        try:
            # Fetch data for each timeframe
            daily_data = fetch_stock_data([ticker], period="3mo", interval="1d")
            weekly_data = fetch_stock_data([ticker], period="2y", interval="1wk")

            daily_df = daily_data.get(ticker)
            weekly_df = weekly_data.get(ticker)

            if daily_df is None or daily_df.empty:
                raise DataFetchError(f"No daily data for {ticker}")

            # Analyze each timeframe
            daily_trend = self._get_trend(daily_df)
            weekly_trend = self._get_trend(weekly_df) if weekly_df is not None else "NEUTRAL"
            hourly_momentum = self._get_momentum(daily_df)  # Use daily for momentum

            # Check alignment
            alignment = self._check_alignment(daily_trend, weekly_trend)

            # Determine strength
            strength = self._determine_strength(daily_trend, weekly_trend, alignment)

            return {
                "daily": daily_trend,
                "weekly": weekly_trend,
                "hourly": hourly_momentum,
                "alignment": alignment,
                "strength": strength,
            }

        except Exception as e:
            logger.error(f"Multi-timeframe analysis failed for {ticker}: {e}")
            return {
                "daily": "NEUTRAL",
                "weekly": "NEUTRAL",
                "hourly": "NEUTRAL",
                "alignment": False,
                "strength": "WEAK",
            }

    def _get_trend(self, df: pd.DataFrame) -> str:
        """
        Determine trend direction using moving averages.

        Returns:
            'BULLISH', 'BEARISH', or 'NEUTRAL'
        """
        if df is None or df.empty or len(df) < 50:
            return "NEUTRAL"

        # Calculate moving averages
        df = df.copy()
        df["SMA_20"] = df["Close"].rolling(20).mean()
        df["SMA_50"] = df["Close"].rolling(50).mean()

        # Get latest values
        current_price = df["Close"].iloc[-1]
        sma_20 = df["SMA_20"].iloc[-1]
        sma_50 = df["SMA_50"].iloc[-1]

        # Determine trend
        if pd.isna(sma_20) or pd.isna(sma_50):
            return "NEUTRAL"

        if current_price > sma_20 > sma_50:
            return "BULLISH"
        elif current_price < sma_20 < sma_50:
            return "BEARISH"
        else:
            return "NEUTRAL"

    def _get_momentum(self, df: pd.DataFrame) -> str:
        """
        Determine short-term momentum using RSI.

        Returns:
            'BULLISH', 'BEARISH', or 'NEUTRAL'
        """
        if df is None or df.empty or len(df) < 14:
            return "NEUTRAL"

        # Calculate RSI
        df = df.copy()
        delta = df["Close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()

        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        current_rsi = rsi.iloc[-1]

        if pd.isna(current_rsi):
            return "NEUTRAL"

        if current_rsi > 60:
            return "BULLISH"
        elif current_rsi < 40:
            return "BEARISH"
        else:
            return "NEUTRAL"

    def _check_alignment(self, daily: str, weekly: str) -> bool:
        """
        Check if daily and weekly trends are aligned.

        Returns:
            True if aligned (both bullish or both bearish)
        """
        if daily == "NEUTRAL" or weekly == "NEUTRAL":
            return False

        return daily == weekly

    def _determine_strength(self, daily: str, weekly: str, alignment: bool) -> str:
        """
        Determine signal strength based on timeframe analysis.

        Returns:
            'STRONG', 'MODERATE', or 'WEAK'
        """
        if alignment and daily in ["BULLISH", "BEARISH"]:
            return "STRONG"
        elif daily in ["BULLISH", "BEARISH"]:
            return "MODERATE"
        else:
            return "WEAK"

    def should_trade(self, analysis: Dict[str, str]) -> bool:
        """
        Determine if signal is strong enough to trade.

        Args:
            analysis: Result from analyze()

        Returns:
            True if signal passes multi-timeframe filter
        """
        # Require at least moderate strength
        if analysis["strength"] == "WEAK":
            return False

        # Require alignment for strong signals
        if analysis["strength"] == "STRONG" and not analysis["alignment"]:
            return False

        return True
