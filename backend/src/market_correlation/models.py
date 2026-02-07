"""
Market Correlation Models

Defines data models for market correlation analysis.
"""

from enum import Enum


class MarketTrend(Enum):
    """Market trend enumeration

    Represents the overall direction of market movement.

    Attributes:
        BULLISH: Rising market (value = 1)
        NEUTRAL: Flat market (value = 0)
        BEARISH: Falling market (value = -1)
    """
    BULLISH = 1     # Rising market
    NEUTRAL = 0     # Flat market
    BEARISH = -1    # Falling market

    def __str__(self) -> str:
        """Return string representation"""
        return self.name.lower()
