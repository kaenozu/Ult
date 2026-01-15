"""
Dynamic Trailing Stop (Phase 30-3)

This module implements advanced trailing stop logic:
    pass
1. ATR Trailing Stop: Adjust stop level based on volatility.
2. Profit Locking: Move stop to breakeven or profit zone after certain gain.
"""

import logging
from typing import Optional

import pandas as pd
import ta

logger = logging.getLogger(__name__)


class DynamicStopManager:
    def __init__(self, atr_period: int = 14, atr_multiplier: float = 2.0):
        self.atr_period = atr_period
        self.atr_multiplier = atr_multiplier
        self.stops = {}  # {ticker: stop_price}
        self.entry_prices = {}  # {ticker: entry_price}
        self.highest_prices = {}  # {ticker: highest_price_since_entry}

    def register_entry(self, ticker: str, entry_price: float, initial_stop: Optional[float] = None):
        """Register a new position entry."""
        self.entry_prices[ticker] = entry_price
        self.highest_prices[ticker] = entry_price

        if initial_stop:
            self.stops[ticker] = initial_stop
        else:
            # Default initial stop (e.g. 5% below entry if no ATR available yet)
            self.stops[ticker] = entry_price * 0.95

    def update_stop(self, ticker: str, current_price: float, df: pd.DataFrame) -> float:
        """
        Update trailing stop level.

        Args:
            ticker: Ticker symbol
            current_price: Current market price
            df: DataFrame with historical data (for ATR calculation)

        Returns:
            New stop price
        """
        if ticker not in self.entry_prices:
            return 0.0

        # Update highest price
        if current_price > self.highest_prices[ticker]:
            self.highest_prices[ticker] = current_price

        # Calculate ATR
        atr = 0.0
        try:
            if df is not None and len(df) > self.atr_period:
                # Calculate ATR on the fly or use existing column
                if "ATR" in df.columns:
                    atr = df["ATR"].iloc[-1]
                else:
                    high = df["High"]
                    low = df["Low"]
                    close = df["Close"]
                    atr_indicator = ta.volatility.AverageTrueRange(high, low, close, window=self.atr_period)
                    atr = atr_indicator.average_true_range().iloc[-1]
        except Exception as e:
            logger.warning(f"Error calculating ATR for {ticker}: {e}")

        # Determine new stop candidate
        if atr > 0:
            # ATR Trailing Stop
            # Stop is at Highest Price - ATR * Multiplier
            candidate_stop = self.highest_prices[ticker] - (atr * self.atr_multiplier)
        else:
            # Fallback: Percentage Trailing Stop (e.g. 5%)
            candidate_stop = self.highest_prices[ticker] * 0.95

        # Profit Locking Logic
        # If profit > 5%, move stop to Breakeven
        entry_price = self.entry_prices[ticker]
        profit_pct = (current_price - entry_price) / entry_price

        if profit_pct > 0.05:
            # Ensure stop is at least at breakeven (plus small buffer)
            breakeven_stop = entry_price * 1.005
            candidate_stop = max(candidate_stop, breakeven_stop)

        # Never move stop down (for long positions)
        current_stop = self.stops.get(ticker, 0.0)
        new_stop = max(current_stop, candidate_stop)

        self.stops[ticker] = new_stop
        return new_stop

    def check_exit(self, ticker: str, current_price: float) -> tuple[bool, str]:
        """Check if stop loss is hit."""
        stop_price = self.stops.get(ticker)
        if stop_price and current_price <= stop_price:
            return (
                True,
                f"Stop Loss Hit (Price: {current_price} <= Stop: {stop_price:.2f})",
            )
        return False, ""
