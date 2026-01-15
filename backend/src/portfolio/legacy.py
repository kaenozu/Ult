"""Portfolio Manager - legacy implementation"""

import logging
from typing import Any, Dict, List
import pandas as pd

logger = logging.getLogger(__name__)


class PortfolioManager:
    """Legacy Portfolio Manager for backward compatibility."""

    def __init__(
        self,
        initial_capital: float = 10000000,
        commission: float = 0.001,
        slippage: float = 0.001,
    ):
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage = slippage

    def calculate_correlation(self, data_map: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """Calculates the correlation matrix of daily returns for the given stocks."""
        close_prices = {}
        for ticker, df in data_map.items():
            if df is not None and not df.empty:
                close_prices[ticker] = df["Close"]
        if not close_prices:
            return pd.DataFrame()
        prices_df = pd.DataFrame(close_prices)
        returns = prices_df.pct_change().dropna()
        return returns.corr()

    def simulate_portfolio(
        self, data_map: Dict[str, pd.DataFrame], signals_map: Dict[str, Any], tickers: List[str]
    ) -> Dict[str, Any]:
        """Simulate portfolio performance (stub)."""
        logger.warning("PortfolioManager.simulate_portfolio is a stub")
        return {
            "final_equity": self.initial_capital,
            "total_return": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "trades": [],
            "equity_curve": [],
        }

    def optimize_portfolio(self, returns: pd.DataFrame) -> Dict[str, float]:
        """Optimize portfolio weights (stub)."""
        if returns.empty:
            return {}
        n = len(returns.columns)
        equal_weight = 1.0 / n if n > 0 else 0
        return {col: equal_weight for col in returns.columns}

    def rebalance_portfolio(
        self, current_holdings: Dict[str, float], target_weights: Dict[str, float], total_value: float
    ) -> Dict[str, Dict[str, float]]:
        """Calculate rebalancing trades (stub)."""
        trades = {}
        for ticker, target in target_weights.items():
            current = current_holdings.get(ticker, 0)
            target_value = total_value * target
            diff = target_value - current
            if abs(diff) > 100:  # Minimum trade threshold
                trades[ticker] = {"action": "BUY" if diff > 0 else "SELL", "value": abs(diff)}
        return trades
