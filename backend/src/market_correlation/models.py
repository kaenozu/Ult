"""
Market Correlation Models

Defines data models for market correlation analysis.
"""

from enum import Enum


class MarketTrend(Enum):
    """Market trend enumeration"""
    BULLISH = 1     # Rising market
    NEUTRAL = 0     # Flat market
    BEARISH = -1    # Falling market

    @property
    def value(self) -> int:
        """Return the numeric value of the trend"""
        return self._value_

    def __str__(self) -> str:
        """Return string representation"""
        return self.name.lower()
