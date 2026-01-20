import pandas as pd
import numpy as np
from typing import List, Dict, Any

class PerformanceAnalyzer:
    """
    Analyzes trade history to calculate performance metrics:
    - Win Rate
    - Profit Factor
    - Sharpe Ratio (Simplified)
    - Max Drawdown
    """

    def __init__(self, trades: List[Dict[str, Any]] = None):
        self.trades = trades or []
        self.df = pd.DataFrame(self.trades) if trades else pd.DataFrame()

    def load_trades(self, trades: List[Dict[str, Any]]):
        self.trades = trades
        self.df = pd.DataFrame(self.trades)

    def calculate_metrics(self) -> Dict[str, Any]:
        if self.df.empty:
            return self._empty_metrics()

        try:
            # Ensure PnL column exists and is numeric
            if 'pnl' not in self.df.columns:
                return self._empty_metrics()
            
            self.df['pnl'] = pd.to_numeric(self.df['pnl'], errors='coerce').fillna(0)
            
            # Basic Stats
            total_trades = len(self.df)
            winning_trades = self.df[self.df['pnl'] > 0]
            losing_trades = self.df[self.df['pnl'] <= 0]
            
            win_rate = len(winning_trades) / total_trades if total_trades > 0 else 0.0
            total_pnl = self.df['pnl'].sum()
            
            # Profit Factor
            gross_profit = winning_trades['pnl'].sum()
            gross_loss = abs(losing_trades['pnl'].sum())
            profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf') if gross_profit > 0 else 0.0

            # Max Drawdown (Hypothetical on Equity Curve)
            # Assuming starting equity isn't tracked per trade, we check PnL drawdown from peak
            self.df['cumulative_pnl'] = self.df['pnl'].cumsum()
            self.df['peak_pnl'] = self.df['cumulative_pnl'].cummax()
            self.df['drawdown'] = self.df['cumulative_pnl'] - self.df['peak_pnl']
            max_drawdown = self.df['drawdown'].min() # Negative value

            # Sharpe Ratio (Simplified Daily)
            # Resample to daily if timestamps exist, else uses raw trade distribution
            # Creating a mock 'returns' series based on PnL vs assumed capital (e.g., 1M)
            assumed_capital = 1_000_000
            returns = self.df['pnl'] / assumed_capital
            std_dev = returns.std()
            avg_return = returns.mean()
            
            # Annualized Sharpe (assuming 252 trading days multiplier approx if data was daily)
            # Since this is per-trade, we just return the raw risk-adjusted return metric
            sharpe_ratio = (avg_return / std_dev) if std_dev > 0 else 0.0

            return {
                "total_trades": total_trades,
                "win_rate": round(win_rate * 100, 2),
                "total_pnl": round(total_pnl, 2),
                "profit_factor": round(profit_factor, 2),
                "max_drawdown": round(max_drawdown, 2),
                "sharpe_ratio": round(sharpe_ratio, 4),
                "best_trade": round(self.df['pnl'].max(), 2),
                "worst_trade": round(self.df['pnl'].min(), 2)
            }

        except Exception as e:
            print(f"Error calculating metrics: {e}")
            return self._empty_metrics()

    def _empty_metrics(self):
        return {
            "total_trades": 0,
            "win_rate": 0.0,
            "total_pnl": 0.0,
            "profit_factor": 0.0,
            "max_drawdown": 0.0,
            "sharpe_ratio": 0.0
        }
