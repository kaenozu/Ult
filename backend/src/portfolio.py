from typing import Any, Dict

import numpy as np
import pandas as pd

from src.backtester import Backtester
from src.strategies import Strategy


class PortfolioManager:
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
        """
        Calculates the correlation matrix of daily returns for the given stocks.
        """
        close_prices = {}
        for ticker, df in data_map.items():
            if df is not None and not df.empty:
                close_prices[ticker] = df["Close"]

        if not close_prices:
            return pd.DataFrame()

        prices_df = pd.DataFrame(close_prices)
        # Calculate daily returns
        returns_df = prices_df.pct_change().dropna()
        # Calculate correlation
        return returns_df.corr()

    def simulate_portfolio(
        self,
        data_map: Dict[str, pd.DataFrame],
        strategies: Dict[str, Strategy],
        weights: Dict[str, float],
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Simulates a portfolio using the Unified Backtester Engine.
        This allows for shared capital and accurate portfolio-level metrics.

        Args:
            data_map: Dictionary of Ticker -> DataFrame
            strategies: Dictionary of Ticker -> Strategy instance
            weights: Dictionary of Ticker -> Target Allocation (used as position_size)
            **kwargs: Arguments passed to Backtester.run (e.g., stop_loss, take_profit)

        Returns:
            Dict containing 'equity_curve', 'total_return', 'max_drawdown', 'trades'
        """
        if not data_map or not strategies:
            return None

        # Initialize Unified Backtester
        # We use the weights as position_size limits for each asset
        bt = Backtester(
            initial_capital=self.initial_capital,
            commission=self.commission,
            slippage=self.slippage,
            position_size=weights,
        )

        # Run Backtest
        results = bt.run(data_map, strategies, **kwargs)

        if not results:
            return None

        # Add 'individual_results' placeholder if needed, or just return what we have
        # app.py expects 'individual_results' key to exist even if empty/unused
        results["individual_results"] = {}

        return results

    def optimize_portfolio(self, data_map: Dict[str, pd.DataFrame], risk_free_rate: float = 0.0) -> Dict[str, float]:
        """
        Optimizes portfolio weights using Mean-Variance Optimization to maximize Sharpe Ratio.
        """
        from scipy.optimize import minimize

        tickers = list(data_map.keys())
        if not tickers:
            return {}

        # Prepare data matrix (Daily Returns)
        close_prices = {}
        for ticker, df in data_map.items():
            if df is not None and not df.empty:
                close_prices[ticker] = df["Close"]

        if not close_prices:
            return {}

        prices_df = pd.DataFrame(close_prices)
        returns_df = prices_df.pct_change().dropna()

        if returns_df.empty:
            return {t: 1.0 / len(tickers) for t in tickers}

        mean_returns = returns_df.mean() * 252  # Annualized
        cov_matrix = returns_df.cov() * 252  # Annualized

        num_assets = len(tickers)

        def negative_sharpe(weights):
            portfolio_return = np.sum(mean_returns * weights)
            portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            if portfolio_volatility == 0:
                return 0
            sharpe = (portfolio_return - risk_free_rate) / portfolio_volatility
            return -sharpe

        constraints = {"type": "eq", "fun": lambda x: np.sum(x) - 1}
        bounds = tuple((0.0, 1.0) for _ in range(num_assets))
        initial_weights = num_assets * [
            1.0 / num_assets,
        ]

        result = minimize(
            negative_sharpe,
            initial_weights,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
        )

        optimized_weights = {}
        for i, ticker in enumerate(tickers):
            optimized_weights[ticker] = result.x[i]

        return optimized_weights

    def optimize_portfolio_quantum(
        self, data_map: Dict[str, pd.DataFrame], risk_aversion: float = 0.5
    ) -> Dict[str, float]:
        """
        Optimizes portfolio weights using Hybrid Quantum-Classical Optimization.
        """
        try:
            from src.optimization.quantum_engine import QuantumPortfolioOptimizer
            
            optimizer = QuantumPortfolioOptimizer()
            # Use Hybrid Optimization (Subset Selection + Weight Allocation)
            final_weights = optimizer.solve_hybrid_optimization(
                data_map, 
                risk_aversion=risk_aversion,
                target_assets=10 # Top 10 stocks selection
            )
            
            return final_weights
            
        except Exception as e:
            print(f"Quantum hybrid optimization error: {e}")
            return self.optimize_portfolio(data_map)

    def rebalance_portfolio(
        self,
        current_holdings: Dict[str, float],
        target_weights: Dict[str, float],
        total_equity: float,
    ) -> Dict[str, float]:
        """
        Calculates the amount to buy/sell for each asset to reach target weights.

        Args:
            current_holdings: Dict of Ticker -> Current Value (JPY)
            target_weights: Dict of Ticker -> Target Weight (0.0-1.0)
            total_equity: Total portfolio value (Cash + Holdings)

        Returns:
            Dict of Ticker -> Amount to Buy (positive) or Sell (negative) in JPY
        """
        trades = {}

        # Calculate target value for each asset
        for ticker, weight in target_weights.items():
            target_value = total_equity * weight
            current_value = current_holdings.get(ticker, 0.0)
            diff = target_value - current_value

            if abs(diff) > 1000:  # Ignore small changes (< 1000 JPY)
                trades[ticker] = diff

        # Handle assets to sell completely (not in target)
        for ticker, value in current_holdings.items():
            if ticker not in target_weights and value > 0:
                trades[ticker] = -value

        return trades

    def simulate_rebalancing(
        self,
        data_map: Dict[str, pd.DataFrame],
        initial_weights: Dict[str, float],
        rebalance_freq_days: int = 20,
    ) -> Dict[str, Any]:
        """
        Simulates portfolio performance with periodic rebalancing to initial weights.

        Args:
            data_map: Dictionary of Ticker -> DataFrame
            initial_weights: Target weights to rebalance to
            rebalance_freq_days: Number of trading days between rebalancing

        Returns:
            Dict containing performance metrics and equity curve
        """
        # 1. Align Data
        tickers = list(initial_weights.keys())
        if not tickers:
            return None

        # Create unified index
        all_dates = sorted(list(set().union(*[df.index for df in data_map.values() if df is not None])))
        full_index = pd.DatetimeIndex(all_dates)

        # Create price matrix (forward fill to handle missing days)
        prices = pd.DataFrame(index=full_index)
        for ticker in tickers:
            if ticker in data_map and data_map[ticker] is not None:
                prices[ticker] = data_map[ticker]["Close"].reindex(full_index).ffill()

        prices.dropna(inplace=True)  # Start from when all assets have data

        if prices.empty:
            return None

        # 2. Simulation Loop
        cash = self.initial_capital
        holdings = {t: 0.0 for t in tickers}  # Shares held
        equity_curve = []

        # Initial Allocation
        current_equity = cash
        for ticker, weight in initial_weights.items():
            target_val = current_equity * weight
            price = prices[ticker].iloc[0]
            shares = target_val / price
            holdings[ticker] = shares
            cash -= shares * price

        # Loop through days
        days_since_rebalance = 0

        for i in range(len(prices)):
            prices.index[i]
            current_prices = prices.iloc[i]

            # Calculate Equity
            portfolio_val = cash + sum(holdings[t] * current_prices[t] for t in tickers)
            equity_curve.append(portfolio_val)

            # Rebalance Check
            days_since_rebalance += 1
            if days_since_rebalance >= rebalance_freq_days:
                # Rebalance!
                current_equity = portfolio_val

                # Sell first to raise cash
                for ticker, weight in initial_weights.items():
                    target_val = current_equity * weight
                    current_val = holdings[ticker] * current_prices[ticker]
                    diff = target_val - current_val

                    if diff < 0:  # Sell
                        shares_to_sell = abs(diff) / current_prices[ticker]
                        holdings[ticker] -= shares_to_sell
                        cash += shares_to_sell * current_prices[ticker]

                # Buy next
                for ticker, weight in initial_weights.items():
                    target_val = current_equity * weight
                    current_val = holdings[ticker] * current_prices[ticker]
                    diff = target_val - current_val

                    if diff > 0:  # Buy
                        shares_to_buy = diff / current_prices[ticker]
                        # Check cash constraint (simplified)
                        cost = shares_to_buy * current_prices[ticker]
                        if cost <= cash:
                            holdings[ticker] += shares_to_buy
                            cash -= cost

                days_since_rebalance = 0

        # Results
        equity_series = pd.Series(equity_curve, index=prices.index)
        total_return = (equity_series.iloc[-1] - self.initial_capital) / self.initial_capital

        # Max Drawdown
        running_max = equity_series.cummax()
        drawdown = (equity_series - running_max) / running_max
        max_drawdown = drawdown.min()

        return {
            "equity_curve": equity_series,
            "total_return": total_return,
            "max_drawdown": max_drawdown,
        }
