"""
Advanced Analytics Engine
Provides deep portfolio analysis, risk modeling, and performance attribution.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class AdvancedAnalytics:
    """
    Advanced portfolio analytics, risk metrics calculation, and factor attribution.
    """

    def __init__(self, portfolio_data: Optional[pd.DataFrame] = None):
        self.portfolio_data = portfolio_data

    def calculate_risk_metrics(self, returns: pd.Series) -> Dict[str, float]:
        """
        Calculates comprehensive risk metrics for a given return series.
        """
        if returns is None or returns.empty:
            return {}

        try:
            # Basic stats
            mean_ret = returns.mean()
            std_ret = returns.std()

            # Risk-adjusted ratios
            sharpe = mean_ret / std_ret if std_ret > 0 else 0

            downside_returns = returns[returns < 0]
            downside_std = downside_returns.std() if not downside_returns.empty else std_ret
            sortino = mean_ret / downside_std if downside_std > 0 else 0

            # Drawdown
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.expanding().max()
            drawdown = (cumulative - running_max) / running_max
            max_drawdown = drawdown.min()

            # Risk at Risk (95%)
            var_95 = returns.quantile(0.05)
            cvar_95 = returns[returns <= var_95].mean() if not returns[returns <= var_95].empty else var_95

            return {
                "mean_return": float(mean_ret),
                "volatility": float(std_ret),
                "sharpe_ratio": float(sharpe),
                "sortino_ratio": float(sortino),
                "max_drawdown": float(max_drawdown),
                "var_95": float(var_95),
                "cvar_95": float(cvar_95),
                "skewness": float(returns.skew()),
                "kurtosis": float(returns.kurtosis()),
            }
        except Exception as e:
            logger.error(f"Failed to calculate risk metrics: {e}")
            return {}

    def performance_attribution(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> Dict[str, float]:
        """
        Attributes performance against a benchmark using Alpha/Beta analysis.
        """
        common_idx = portfolio_returns.index.intersection(benchmark_returns.index)
        if common_idx.empty:
            return {}

        p_ret = portfolio_returns.loc[common_idx]
        b_ret = benchmark_returns.loc[common_idx]

        try:
            # Beta calculation
            cov = np.cov(p_ret, b_ret)[0, 1]
            b_var = b_ret.var()
            beta = cov / b_var if b_var > 0 else 1.0

            # Alpha
            alpha = p_ret.mean() - (beta * b_ret.mean())

            # Tracking error & Info ratio
            tracking_diff = p_ret - b_ret
            te = tracking_diff.std()
            ir = tracking_diff.mean() / te if te > 0 else 0

            return {
                "alpha": float(alpha),
                "beta": float(beta),
                "tracking_error": float(te),
                "information_ratio": float(ir),
                "correlation": float(p_ret.corr(b_ret)),
            }
        except Exception as e:
            logger.error(f"Performance attribution failed: {e}")
            return {}

    def get_sector_exposure(self, holdings: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculates percentage exposure per sector."""
        if not holdings:
            return {}

        sector_map = {}
        total_val = sum(h.get("value", 0) for h in holdings)

        if total_val == 0:
            return {}

        for h in holdings:
            s = h.get("sector", "Others")
            sector_map[s] = sector_map.get(s, 0) + h.get("value", 0)

        return {s: (v / total_val * 100) for s, v in sector_map.items()}

    def generate_monte_carlo(
        self, returns: pd.Series, initial_value: float, days: int = 252, simulations: int = 1000
    ) -> Dict[str, Any]:
        """Runs a Monte Carlo simulation for future portfolio projection."""
        if returns.empty:
            return {}

        mu = returns.mean()
        sigma = returns.std()

        results = []
        for _ in range(simulations):
            daily_rets = np.random.normal(mu, sigma, days)
            final_val = initial_value * (1 + daily_rets).cumprod()[-1]
            results.append(final_val)

        results = np.array(results)

        return {
            "mean_projection": float(results.mean()),
            "median_projection": float(np.median(results)),
            "percentile_5": float(np.percentile(results, 5)),
            "percentile_95": float(np.percentile(results, 95)),
            "loss_probability": float((results < initial_value).mean()),
        }


class CustomReportGenerator:
    """Helper for generating formatted reports from analytics data."""

    def __init__(self, analytics: AdvancedAnalytics):
        self.analytics = analytics

    def generate_text_summary(self, data: Dict[str, Any]) -> str:
        """Creates a readable text summary of analytics."""
        metrics = data.get("risk_metrics", {})

        lines = [
            "📊 AGStock Advanced Analysis Report",
            f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "=" * 40,
            f"Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.2f}",
            f"Max Drawdown: {metrics.get('max_drawdown', 0) * 100:.2f}%",
            f"Volatility:   {metrics.get('volatility', 0) * 100:.2f}%",
            "-" * 40,
            "💡 AI Insights:",
        ]

        sharpe = metrics.get("sharpe_ratio", 0)
        if sharpe > 1.5:
            lines.append("- リスクに対して非常に効率的なリターンが得られています。")
        elif sharpe < 0.5:
            lines.append("- リスク調整後リターンが低めです。戦略のボラティリティ抑制を検討してください。")

        if metrics.get("max_drawdown", 0) < -0.15:
            lines.append("- ドローダウンが警戒水域（15%）に達しています。")

        return "\n".join(lines)
