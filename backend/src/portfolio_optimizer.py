"""
Portfolio Optimizer Module
Implements various portfolio optimization techniques including Markowitz,
Risk Parity, and Black-Litterman models.
"""

import logging
from typing import Dict, Optional

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PortfolioOptimizer:
    def __init__(self, risk_free_rate: float = 0.02):
        """
        Args:
            risk_free_rate: Annual risk-free rate
        """
        self.risk_free_rate = risk_free_rate

    def markowitz_optimization(
        self,
        returns: pd.DataFrame,
        target_return: Optional[float] = None,
        max_weight: float = 0.4,
    ) -> Dict:
        """
        Markowitz mean-variance optimization.

        Args:
            returns: DataFrame of asset returns
            target_return: Target portfolio return (if None, maximize Sharpe)
            max_weight: Maximum weight per asset

        Returns:
            Optimal weights and metrics
        """
        try:
            import cvxpy as cp
        except ImportError:
            logger.error("cvxpy not installed. Run: pip install cvxpy")
            return {}

        n_assets = len(returns.columns)
        mean_returns = returns.mean() * 252  # Annualize
        cov_matrix = returns.cov() * 252  # Annualize

        # Define optimization variables
        weights = cp.Variable(n_assets)

        # Portfolio return and risk
        portfolio_return = mean_returns.values @ weights
        portfolio_risk = cp.quad_form(weights, cov_matrix.values)

        # Constraints
        constraints = [
            cp.sum(weights) == 1,  # Fully invested
            weights >= 0,  # Long only
            weights <= max_weight,  # Max position size
        ]

        if target_return is not None:
            # Minimize risk for target return
            constraints.append(portfolio_return >= target_return)
            objective = cp.Minimize(portfolio_risk)
        else:
            # Maximize Sharpe ratio (approximation)
            objective = cp.Maximize(portfolio_return - 0.5 * portfolio_risk)

        # Solve
        problem = cp.Problem(objective, constraints)
        problem.solve()

        if weights.value is None:
            logger.warning("Optimization failed")
            return {}

        optimal_weights = pd.Series(weights.value, index=returns.columns)

        # Calculate metrics
        portfolio_ret = (optimal_weights * mean_returns).sum()
        portfolio_vol = np.sqrt(optimal_weights @ cov_matrix @ optimal_weights)
        sharpe = (portfolio_ret - self.risk_free_rate) / portfolio_vol if portfolio_vol > 0 else 0

        return {
            "weights": optimal_weights,
            "expected_return": portfolio_ret,
            "volatility": portfolio_vol,
            "sharpe_ratio": sharpe,
        }

    def risk_parity(self, returns: pd.DataFrame) -> Dict:
        """
        Risk parity optimization (equal risk contribution).

        Args:
            returns: DataFrame of asset returns

        Returns:
            Risk parity weights
        """
        cov_matrix = returns.cov() * 252

        # Initial equal weights
        n_assets = len(returns.columns)
        weights = np.ones(n_assets) / n_assets

        # Iterative optimization
        for _ in range(100):
            portfolio_vol = np.sqrt(weights @ cov_matrix @ weights)
            marginal_contrib = cov_matrix @ weights / portfolio_vol
            risk_contrib = weights * marginal_contrib

            # Target: equal risk contribution
            target_risk = portfolio_vol / n_assets

            # Adjust weights
            weights = weights * (target_risk / risk_contrib)
            weights = weights / weights.sum()  # Normalize

        weights_series = pd.Series(weights, index=returns.columns)

        # Calculate metrics
        mean_returns = returns.mean() * 252
        portfolio_ret = (weights_series * mean_returns).sum()
        portfolio_vol = np.sqrt(weights @ cov_matrix @ weights)
        sharpe = (portfolio_ret - self.risk_free_rate) / portfolio_vol if portfolio_vol > 0 else 0

        return {
            "weights": weights_series,
            "expected_return": portfolio_ret,
            "volatility": portfolio_vol,
            "sharpe_ratio": sharpe,
        }

    def black_litterman(
        self,
        returns: pd.DataFrame,
        market_caps: pd.Series,
        views: Dict[str, float],
        view_confidence: float = 0.5,
    ) -> Dict:
        """
        Black-Litterman model combining market equilibrium with investor views.

        Args:
            returns: Historical returns
            market_caps: Market capitalizations
            views: Dict of {ticker: expected_return}
            view_confidence: Confidence in views (0-1)

        Returns:
            Black-Litterman weights
        """
        # Market equilibrium weights
        market_weights = market_caps / market_caps.sum()

        # Covariance matrix
        cov_matrix = returns.cov() * 252

        # Implied equilibrium returns (reverse optimization)
        risk_aversion = 2.5
        pi = risk_aversion * cov_matrix @ market_weights

        # Incorporate views
        P = np.zeros((len(views), len(returns.columns)))
        Q = np.zeros(len(views))

        for i, (ticker, view_return) in enumerate(views.items()):
            if ticker in returns.columns:
                idx = returns.columns.get_loc(ticker)
                P[i, idx] = 1
                Q[i] = view_return

        # View uncertainty
        tau = view_confidence
        omega = np.diag(np.diag(P @ (tau * cov_matrix) @ P.T))

        # Posterior returns
        M_inv = np.linalg.inv(np.linalg.inv(tau * cov_matrix) + P.T @ np.linalg.inv(omega) @ P)
        posterior_returns = M_inv @ (np.linalg.inv(tau * cov_matrix) @ pi + P.T @ np.linalg.inv(omega) @ Q)

        # Optimize with posterior returns
        try:
            import cvxpy as cp

            weights = cp.Variable(len(returns.columns))
            objective = cp.Maximize(
                posterior_returns @ weights - 0.5 * risk_aversion * cp.quad_form(weights, cov_matrix.values)
            )
            constraints = [cp.sum(weights) == 1, weights >= 0]

            problem = cp.Problem(objective, constraints)
            problem.solve()

            if weights.value is None:
                return {}

            optimal_weights = pd.Series(weights.value, index=returns.columns)

        except ImportError:
            # Fallback: use market weights
            optimal_weights = market_weights

        # Calculate metrics
        portfolio_ret = (optimal_weights * posterior_returns).sum()
        portfolio_vol = np.sqrt(optimal_weights @ cov_matrix @ optimal_weights)
        sharpe = (portfolio_ret - self.risk_free_rate) / portfolio_vol if portfolio_vol > 0 else 0

        return {
            "weights": optimal_weights,
            "expected_return": portfolio_ret,
            "volatility": portfolio_vol,
            "sharpe_ratio": sharpe,
            "posterior_returns": pd.Series(posterior_returns, index=returns.columns),
        }

    def efficient_frontier(self, returns: pd.DataFrame, n_points: int = 50) -> pd.DataFrame:
        """
        Calculate efficient frontier.

        Args:
            returns: Asset returns
            n_points: Number of points on frontier

        Returns:
            DataFrame with frontier points
        """
        mean_returns = returns.mean() * 252
        min_return = mean_returns.min()
        max_return = mean_returns.max()

        target_returns = np.linspace(min_return, max_return, n_points)
        frontier = []

        for target in target_returns:
            result = self.markowitz_optimization(returns, target_return=target)
            if result:
                frontier.append(
                    {
                        "return": result["expected_return"],
                        "volatility": result["volatility"],
                        "sharpe": result["sharpe_ratio"],
                    }
                )

        return pd.DataFrame(frontier)

    def quantum_hybrid_optimization(
        self,
        returns: pd.DataFrame,
        risk_aversion: float = 0.5,
        target_assets: int = 10
    ) -> Dict:
        """
        Quantum-inspired hybrid optimization.
        
        Args:
            returns: DataFrame of asset returns
            risk_aversion: Risk aversion parameter (0-1)
            target_assets: Number of assets to select via QUBO
            
        Returns:
            Optimal weights and metrics
        """
        try:
            from src.optimization.quantum_engine import QuantumPortfolioOptimizer
            
            optimizer = QuantumPortfolioOptimizer()
            weights_dict = optimizer.solve_hybrid_optimization(
                {col: pd.DataFrame({"Close": [0, 1], "Return": [0, 0]}) for col in returns.columns}, # Dummy structure for compatibility if needed
                risk_aversion=risk_aversion,
                target_assets=target_assets
            )
            
            # Re-implementing logic here for direct DataFrame access
            mu = returns.mean().values * 252
            sigma = returns.cov().values * 252
            tickers = returns.columns.tolist()
            
            # Use data directly
            data_map = {ticker: pd.DataFrame({"Close": np.cumprod(1 + returns[ticker])}) for ticker in returns.columns}
            weights_dict = optimizer.solve_hybrid_optimization(data_map, risk_aversion=risk_aversion, target_assets=target_assets)
            
            weights_series = pd.Series(weights_dict).reindex(returns.columns).fillna(0)
            
            # Calculate metrics
            portfolio_ret = (weights_series * mu).sum()
            portfolio_vol = np.sqrt(weights_series @ sigma @ weights_series)
            sharpe = (portfolio_ret - self.risk_free_rate) / portfolio_vol if portfolio_vol > 0 else 0
            
            return {
                "weights": weights_series,
                "expected_return": portfolio_ret,
                "volatility": portfolio_vol,
                "sharpe_ratio": sharpe,
                "method": "Quantum Hybrid"
            }
        except Exception as e:
            logger.error(f"Quantum optimization failed: {e}")
            return self.markowitz_optimization(returns)


if __name__ == "__main__":
    # Test
    optimizer = PortfolioOptimizer()

    # Generate sample returns
    np.random.seed(42)
    dates = pd.date_range(start="2020-01-01", periods=252, freq="D")
    returns = pd.DataFrame(
        {
            "Stock_A": np.random.randn(252) * 0.02,
            "Stock_B": np.random.randn(252) * 0.015,
            "Stock_C": np.random.randn(252) * 0.025,
        },
        index=dates,
    )

    # Markowitz optimization
    result = optimizer.markowitz_optimization(returns)
    print("Markowitz Optimization:")
    print(f"  Weights: {result['weights'].to_dict()}")
    print(f"  Expected Return: {result['expected_return']:.2%}")
    print(f"  Volatility: {result['volatility']:.2%}")
    print(f"  Sharpe Ratio: {result['sharpe_ratio']:.2f}")

    # Risk parity
    rp_result = optimizer.risk_parity(returns)
    print("\nRisk Parity:")
    print(f"  Weights: {rp_result['weights'].to_dict()}")
    print(f"  Sharpe Ratio: {rp_result['sharpe_ratio']:.2f}")
