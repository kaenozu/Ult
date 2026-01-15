import pandas as pd
import numpy as np
import sqlite3
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PortfolioAnalytics:
    """
    Portfolio Analytics (Phase 72)
    Calculates performance metrics for visualization.
    """

    def __init__(self, db_path: str = "paper_trading.db"):
        self.db_path = db_path

    def get_equity_curve_data(self) -> pd.DataFrame:
        """
        Fetch equity data from DB and calculate drawdown.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            df = pd.read_sql_query("SELECT date, total_equity FROM balance ORDER BY date ASC", conn)
            conn.close()

            if df.empty:
                return pd.DataFrame()

            df["date"] = pd.to_datetime(df["date"])
            df.set_index("date", inplace=True)

            # Calculate Drawdown
            df["peak"] = df["total_equity"].cummax()
            df["drawdown"] = (df["total_equity"] - df["peak"]) / df["peak"] * 100

            return df
        except Exception as e:
            logger.error(f"Error calculating equity curve: {e}")
            return pd.DataFrame()

    def get_monthly_returns(self) -> pd.DataFrame:
        """
        Calculate monthly returns for a heatmap.
        """
        try:
            curve = self.get_equity_curve_data()
            if curve.empty:
                return pd.DataFrame()

            monthly = curve["total_equity"].resample("ME").last()
            returns = monthly.pct_change().fillna(0) * 100

            # Reshape for heatmap
            ret_df = returns.to_frame()
            ret_df["year"] = ret_df.index.year
            ret_df["month"] = ret_df.index.month

            pivot = ret_df.pivot(index="year", columns="month", values="total_equity")
            return pivot
        except Exception as e:
            logger.error(f"Error calculating monthly returns: {e}")
            return pd.DataFrame()

    def get_performance_summary(self) -> Dict[str, Any]:
        """
        Get high-level statistics.
        """
        curve = self.get_equity_curve_data()
        if curve.empty:
            return {}

        total_return = (
            (curve["total_equity"].iloc[-1] - curve["total_equity"].iloc[0]) / curve["total_equity"].iloc[0] * 100
        )
        max_drawdown = curve["drawdown"].min()

        # Sharpe Ratio (Simple)
        returns = curve["total_equity"].pct_change().dropna()
        sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if len(returns) > 1 and returns.std() != 0 else 0.0

        return {
            "total_return_pct": total_return,
            "max_drawdown_pct": max_drawdown,
            "sharpe_ratio": sharpe,
            "current_equity": curve["total_equity"].iloc[-1],
        }
