"""
Supply/Demand Models

Defines data models for supply/demand analysis.
"""

from dataclasses import dataclass
from enum import Enum


class ZoneType(Enum):
    """Zone type enumeration"""
    SUPPORT = "support"      # Demand zone (price floor)
    RESISTANCE = "resistance"  # Supply zone (price ceiling)

    def __str__(self) -> str:
        """Return string representation"""
        return self.value


@dataclass
class Zone:
    """Represents a support or resistance zone"""
    price: float
    volume: int
    zone_type: ZoneType
    strength: float  # 0.0 to 1.0, higher is stronger

    def __str__(self) -> str:
        """Return string representation"""
        return f"{self.zone_type.value} @ {self.price:.2f} (strength: {self.strength:.2f})"


@dataclass
class BreakoutEvent:
    """Represents a breakout event"""
    direction: str  # "bullish" or "bearish"
    price: float
    zone: Zone
    volume: int
    is_confirmed: bool  # True if volume confirms the breakout
    timestamp: float = 0.0  # Unix timestamp

    def __str__(self) -> str:
        """Return string representation"""
        status = "confirmed" if self.is_confirmed else "unconfirmed"
        return f"{self.direction} breakout at {self.price:.2f} ({status})"
