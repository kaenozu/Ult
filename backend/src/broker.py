from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List


@dataclass
class Position:
    ticker: str
    quantity: float
    average_entry_price: float
    current_price: float = 0.0
    unrealized_pnl: float = 0.0

    def to_dict(self):
        return {
            "ticker": self.ticker,
            "quantity": self.quantity,
            "average_entry_price": self.average_entry_price,
            "current_price": self.current_price,
            "unrealized_pnl": self.unrealized_pnl,
        }


@dataclass
class Order:
    ticker: str
    action: str  # "BUY" or "SELL"
    quantity: float
    order_type: str  # "MARKET", "LIMIT", "STOP"
    price: float = 0.0  # For limit/stop orders


class Broker(ABC):
    """
    Abstract base class for all broker implementations.
    Defines the interface that both PaperBroker and IBKRBroker must implement.
    """

    @abstractmethod
    def get_cash(self) -> float:
        """Returns available cash."""

    @abstractmethod
    def get_positions(self) -> Dict[str, Position]:
        """Returns current positions."""

    @abstractmethod
    def get_portfolio_value(self, current_prices: Dict[str, float]) -> float:
        """Returns total portfolio value (cash + positions)."""

    @abstractmethod
    def execute_order(self, order: Order, current_price: float, timestamp: datetime):
        """Executes an order."""

    @abstractmethod
    def get_trade_history(self) -> List[Dict[str, Any]]:
        """Returns trade history."""

    @abstractmethod
    def save_state(self):
        """Persists broker state."""

    @abstractmethod
    def load_state(self):
        """Loads broker state."""
