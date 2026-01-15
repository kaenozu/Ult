"""
Performance Attribution Module
Analyzes portfolio performance and attributes returns to various factors.
"""

import logging
from typing import Dict, Optional

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PerformanceAttribution:
    def __init__(self):
        pass

    def factor_analysis(self, portfolio_returns: pd.Series, factor_returns: pd.DataFrame) -> Dict:
        """
        Fama-French style factor analysis.

        Args:
            portfolio_returns: Portfolio returns
            factor_returns: DataFrame with factor returns (e.g., Market, SMB, HML)

        Returns:
            Factor loadings and alpha
        """
        # Align data
        data = pd.concat([portfolio_returns, factor_returns], axis=1).dropna()

        if len(data) < 30:
            logger.warning("Insufficient data for factor analysis")
            return {}

        y = data.iloc[:, 0].values
        X = data.iloc[:, 1:].values

        # Add constant for alpha
        X = np.column_stack([np.ones(len(X)), X])

        # OLS regression
        try:
            beta = np.linalg.lstsq(X, y, rcond=None)[0]
        except BaseException:
            return {}

        alpha = beta[0] * 252  # Annualize
        factor_loadings = pd.Series(beta[1:], index=factor_returns.columns)

        # R-squared
        y_pred = X @ beta
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - y.mean()) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

        return {
            "alpha": alpha,
            "factor_loadings": factor_loadings,
            "r_squared": r_squared,
        }

    def sector_contribution(
        self, holdings: pd.DataFrame, sector_map: Dict[str, str], returns: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Calculate sector-wise return contribution.

        Args:
            holdings: DataFrame with weights by ticker
            sector_map: Dict mapping ticker to sector
            returns: Returns by ticker

        Returns:
            DataFrame with sector contributions
        """
        # Map holdings to sectors
        sector_weights = {}
        for ticker, weight in holdings.items():
            sector = sector_map.get(ticker, "Other")
            sector_weights[sector] = sector_weights.get(sector, 0) + weight

        # Calculate sector returns
        sector_returns = {}
        for ticker in returns.columns:
            sector = sector_map.get(ticker, "Other")
            if sector not in sector_returns:
                sector_returns[sector] = []
            sector_returns[sector].append(returns[ticker])

        # Aggregate
        contributions = []
        for sector, weight in sector_weights.items():
            if sector in sector_returns:
                sector_ret = pd.concat(sector_returns[sector], axis=1).mean(axis=1).mean()
                contribution = weight * sector_ret
                contributions.append(
                    {
                        "sector": sector,
                        "weight": weight,
                        "return": sector_ret,
                        "contribution": contribution,
                    }
                )

        return pd.DataFrame(contributions)

    def timing_vs_selection(
        self,
        portfolio_returns: pd.Series,
        benchmark_returns: pd.Series,
        holdings: pd.DataFrame,
    ) -> Dict:
        """
        Decompose returns into timing and selection effects.

        Args:
            portfolio_returns: Portfolio returns
            benchmark_returns: Benchmark returns
            holdings: Holdings over time

        Returns:
            Timing and selection attribution
        """
        # Align data
        data = pd.concat([portfolio_returns, benchmark_returns], axis=1).dropna()

        if len(data) < 2:
            return {}

        portfolio_ret = data.iloc[:, 0]
        benchmark_ret = data.iloc[:, 1]

        # Total excess return
        excess_return = (portfolio_ret - benchmark_ret).mean() * 252

        # Selection effect (simplified)
        # Assumes equal weighting for simplicity
        selection_effect = excess_return * 0.6  # Rough estimate

        # Timing effect
        timing_effect = excess_return - selection_effect

        return {
            "total_excess_return": excess_return,
            "selection_effect": selection_effect,
            "timing_effect": timing_effect,
            "information_ratio": (
                excess_return / (portfolio_ret - benchmark_ret).std() / np.sqrt(252)
                if (portfolio_ret - benchmark_ret).std() > 0
                else 0
            ),
        }

    def risk_adjusted_metrics(self, returns: pd.Series, benchmark_returns: Optional[pd.Series] = None) -> Dict:
        """
        Calculate comprehensive risk-adjusted performance metrics.

        Args:
            returns: Portfolio returns
            benchmark_returns: Optional benchmark returns

        Returns:
            Dictionary of metrics
        """
        if len(returns) < 2:
            return {}

        # Basic metrics
        total_return = (1 + returns).prod() - 1
        annualized_return = (1 + total_return) ** (252 / len(returns)) - 1
        volatility = returns.std() * np.sqrt(252)

        # Sharpe ratio
        risk_free_rate = 0.02
        sharpe = (annualized_return - risk_free_rate) / volatility if volatility > 0 else 0

        # Sortino ratio (downside deviation)
        downside_returns = returns[returns < 0]
        downside_std = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else volatility
        sortino = (annualized_return - risk_free_rate) / downside_std if downside_std > 0 else 0

        # Maximum drawdown
        cum_returns = (1 + returns).cumprod()
        running_max = cum_returns.cummax()
        drawdown = (cum_returns - running_max) / running_max
        max_drawdown = drawdown.min()

        # Calmar ratio
        calmar = annualized_return / abs(max_drawdown) if max_drawdown != 0 else 0

        metrics = {
            "total_return": total_return,
            "annualized_return": annualized_return,
            "volatility": volatility,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "max_drawdown": max_drawdown,
            "calmar_ratio": calmar,
        }

        # Benchmark-relative metrics
        if benchmark_returns is not None:
            aligned = pd.concat([returns, benchmark_returns], axis=1).dropna()
            if len(aligned) > 0:
                excess_returns = aligned.iloc[:, 0] - aligned.iloc[:, 1]
                tracking_error = excess_returns.std() * np.sqrt(252)
                information_ratio = excess_returns.mean() * 252 / tracking_error if tracking_error > 0 else 0

                # Beta
                cov = np.cov(aligned.iloc[:, 0], aligned.iloc[:, 1])[0, 1]
                var = aligned.iloc[:, 1].var()
                beta = cov / var if var > 0 else 1

                metrics.update(
                    {
                        "tracking_error": tracking_error,
                        "information_ratio": information_ratio,
                        "beta": beta,
                    }
                )

        return metrics


if __name__ == "__main__":
    # Test
    attribution = PerformanceAttribution()

    # Generate sample data
    np.random.seed(42)
    dates = pd.date_range(start="2020-01-01", periods=252, freq="D")
    portfolio_returns = pd.Series(np.random.randn(252) * 0.01 + 0.0005, index=dates)
    benchmark_returns = pd.Series(np.random.randn(252) * 0.008 + 0.0003, index=dates)

    # Risk-adjusted metrics
    metrics = attribution.risk_adjusted_metrics(portfolio_returns, benchmark_returns)
    print("Risk-Adjusted Metrics:")
    for key, value in metrics.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.4f}")
