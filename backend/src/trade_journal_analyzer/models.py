"""
Trade Journal Models

Defines data models for journal analysis.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List


class TradeStatus(Enum):
    """Trade status enumeration"""
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


@dataclass
class JournalEntry:
    """Represents a trading journal entry"""
    id: str
    timestamp: datetime
    symbol: str
    entry_price: float
    exit_price: float
    profit: float
    profit_percent: float
    signal_type: str  # MANUAL, RSI, MACD, etc.
    indicator: str
    status: TradeStatus  # Changed from str to TradeStatus Enum
    notes: str = ""

    @property
    def is_closed(self) -> bool:
        """Check if trade is closed"""
        return self.status == TradeStatus.CLOSED

    @property
    def is_profitable(self) -> bool:
        """Check if trade is profitable"""
        return self.profit > 0


@dataclass
class TradePattern:
    """Represents a discovered trading pattern"""
    description: str
    win_rate: float
    total_trades: int
    avg_profit_percent: float
    confidence: float  # 0.0 to 1.0
    factors: dict  # Key pattern factors

    def __str__(self) -> str:
        return f"{self.description} (Win: {self.win_rate:.1f}%, Trades: {self.total_trades})"


@dataclass
class BiasAlert:
    """Represents a psychological bias alert"""
    bias_type: str  # overtrading, chasing_losses, revenge_trading, etc.
    severity: str  # low, medium, high
    message: str
    recommendations: List[str]  # Changed from list[str] to List[str] for consistency

    def __str__(self) -> str:
        return f"[{self.severity.upper()}] {self.bias_type}: {self.message}"
