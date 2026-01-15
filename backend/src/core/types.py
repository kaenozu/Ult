"""
Type Definitions for AGStock
Provides type aliases, protocols, and typed dictionaries for type safety.
"""

from typing import Protocol, TypedDict, Literal, List, Dict
import numpy as np
import pandas as pd


# Action types
Action = Literal["BUY", "SELL", "HOLD"]
SignalStrength = Literal["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]


# TypedDicts for structured data
class TradeSignal(TypedDict):
    """Trade signal from a strategy."""

    ticker: str
    action: Action
    confidence: float
    price: float
    quantity: int
    strategy_name: str
    timestamp: str


class PortfolioPosition(TypedDict):
    """Portfolio position information."""

    ticker: str
    quantity: int
    entry_price: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_pct: float


class BalanceInfo(TypedDict):
    """Account balance information."""

    cash: float
    total_equity: float
    invested_amount: float
    unrealized_pnl: float
    daily_pnl: float


class MarketRegime(TypedDict):
    """Market regime information."""

    regime: str
    confidence: float
    vix_level: float
    trend: str
    volatility: str


class PerformanceMetrics(TypedDict):
    """Performance metrics for backtesting."""

    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    total_trades: int


# Protocols for duck typing
class Predictor(Protocol):
    """Protocol for prediction models."""

    def fit(self, X: pd.DataFrame, y: pd.Series) -> None:
        """Train the model."""
        ...

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Make predictions."""
        ...


class Strategy(Protocol):
    """Protocol for trading strategies."""

    name: str

    def generate_signals(self, data: pd.DataFrame, **kwargs) -> List[TradeSignal]:
        """Generate trading signals."""
        ...


class RiskManager(Protocol):
    """Protocol for risk management."""

    def check_risk(
        self,
        signal: TradeSignal,
        portfolio: Dict[str, PortfolioPosition],
        balance: BalanceInfo,
    ) -> bool:
        """Check if trade passes risk checks."""
        ...


# Type aliases
TickerData = Dict[str, pd.DataFrame]
FeatureDict = Dict[str, float]
ModelWeights = Dict[str, float]
