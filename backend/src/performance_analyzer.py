"""
パフォーマンス分析モジュール

システムの実績を分析・可視化
"""

from typing import Dict, Tuple

import numpy as np
import pandas as pd


class PerformanceAnalyzer:
    """パフォーマンス分析クラス"""

    def __init__(self, paper_trader):
        self.pt = paper_trader

    def calculate_metrics(self) -> Dict:
        """
        主要なパフォーマンス指標を計算

        Returns:
            dict: 各種指標
        """
        equity_history = self.pt.get_equity_history()
        trade_history = self.pt.get_trade_history()

        if equity_history.empty:
            return self._empty_metrics()

        # 基本統計
        initial_capital = self.pt.initial_capital
        current_equity = equity_history.iloc[-1]["total_equity"]
        total_return = (current_equity - initial_capital) / initial_capital

        # 日次リターン計算
        equity_history["daily_return"] = equity_history["total_equity"].pct_change()
        daily_returns = equity_history["daily_return"].dropna()

        # シャープレシオ（年率換算）
        if len(daily_returns) > 1 and daily_returns.std() > 0:
            sharpe_ratio = (daily_returns.mean() / daily_returns.std()) * np.sqrt(252)
        else:
            sharpe_ratio = 0.0

        # 最大ドローダウン
        max_drawdown = self._calculate_max_drawdown(equity_history)

        # 勝率・損益比
        win_rate, win_loss_ratio = self._calculate_win_metrics(trade_history)

        # 月次リターン
        monthly_returns = self._calculate_monthly_returns(equity_history)

        # 週次リターン
        weekly_returns = self._calculate_weekly_returns(equity_history)

        return {
            "total_return": total_return,
            "total_return_pct": total_return * 100,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown": max_drawdown,
            "max_drawdown_pct": max_drawdown * 100,
            "win_rate": win_rate,
            "win_loss_ratio": win_loss_ratio,
            "total_trades": len(trade_history),
            "current_equity": current_equity,
            "initial_capital": initial_capital,
            "monthly_returns": monthly_returns,
            "weekly_returns": weekly_returns,
            "daily_returns": daily_returns,
        }

    def _empty_metrics(self) -> Dict:
        """空のメトリクスを返す"""
        return {
            "total_return": 0.0,
            "total_return_pct": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "max_drawdown_pct": 0.0,
            "win_rate": 0.0,
            "win_loss_ratio": 0.0,
            "total_trades": 0,
            "current_equity": self.pt.initial_capital,
            "initial_capital": self.pt.initial_capital,
            "monthly_returns": pd.Series(),
            "weekly_returns": pd.Series(),
            "daily_returns": pd.Series(),
        }

    def _calculate_max_drawdown(self, equity_history: pd.DataFrame) -> float:
        """最大ドローダウンを計算"""
        equity = equity_history["total_equity"]
        cummax = equity.cummax()
        drawdown = (equity - cummax) / cummax
        return drawdown.min()

    def _calculate_win_metrics(self, trade_history: pd.DataFrame) -> Tuple[float, float]:
        """勝率と損益比を計算"""
        if trade_history.empty or "realized_pnl" not in trade_history.columns:
            return 0.0, 0.0

        closed_trades = trade_history[trade_history["realized_pnl"] != 0]

        if closed_trades.empty:
            return 0.0, 0.0

        wins = closed_trades[closed_trades["realized_pnl"] > 0]
        losses = closed_trades[closed_trades["realized_pnl"] < 0]

        win_rate = len(wins) / len(closed_trades) if len(closed_trades) > 0 else 0.0

        if len(wins) > 0 and len(losses) > 0:
            avg_win = wins["realized_pnl"].mean()
            avg_loss = abs(losses["realized_pnl"].mean())
            win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else 0.0
        else:
            win_loss_ratio = 0.0

        return win_rate, win_loss_ratio

    def _calculate_monthly_returns(self, equity_history: pd.DataFrame) -> pd.Series:
        """月次リターンを計算"""
        if equity_history.empty:
            return pd.Series()

        equity_history = equity_history.copy()
        equity_history["month"] = pd.to_datetime(equity_history["date"]).dt.to_period("M")

        monthly = equity_history.groupby("month")["total_equity"].last()
        monthly_returns = monthly.pct_change()

        return monthly_returns

    def _calculate_weekly_returns(self, equity_history: pd.DataFrame) -> pd.Series:
        """週次リターンを計算"""
        if equity_history.empty:
            return pd.Series()

        equity_history = equity_history.copy()
        equity_history["week"] = pd.to_datetime(equity_history["date"]).dt.to_period("W")

        weekly = equity_history.groupby("week")["total_equity"].last()
        weekly_returns = weekly.pct_change()

        return weekly_returns

    def compare_to_benchmark(self, benchmark_ticker: str = "^N225") -> Dict:
        """
        ベンチマークとの比較

        Args:
            benchmark_ticker: ベンチマーク銘柄（デフォルト: 日経平均）

        Returns:
            dict: 比較結果
        """
        try:
            import yfinance as yf

            equity_history = self.pt.get_equity_history()
            if equity_history.empty:
                return {}

            # ベンチマークデータ取得
            start_date = equity_history.iloc[0]["date"]
            end_date = equity_history.iloc[-1]["date"]

            benchmark = yf.Ticker(benchmark_ticker)
            benchmark_data = benchmark.history(start=start_date, end=end_date)

            if benchmark_data.empty:
                return {}

            # ベンチマークのリターン計算
            benchmark_return = (benchmark_data["Close"].iloc[-1] - benchmark_data["Close"].iloc[0]) / benchmark_data[
                "Close"
            ].iloc[0]

            # 自分のリターン
            my_return = (
                equity_history.iloc[-1]["total_equity"] - equity_history.iloc[0]["total_equity"]
            ) / equity_history.iloc[0]["total_equity"]

            # アウトパフォーマンス
            outperformance = my_return - benchmark_return

            return {
                "benchmark_ticker": benchmark_ticker,
                "benchmark_return": benchmark_return,
                "benchmark_return_pct": benchmark_return * 100,
                "my_return": my_return,
                "my_return_pct": my_return * 100,
                "outperformance": outperformance,
                "outperformance_pct": outperformance * 100,
            }

        except Exception as e:
            return {"error": str(e)}

    def get_strategy_performance(self) -> pd.DataFrame:
        """戦略別のパフォーマンスを取得"""
        trade_history = self.pt.get_trade_history()

        if trade_history.empty or "strategy" not in trade_history.columns:
            return pd.DataFrame()

        # 戦略別に集計
        strategy_stats = (
            trade_history.groupby("strategy")
            .agg({"realized_pnl": ["count", "sum", "mean"], "ticker": "count"})
            .round(2)
        )

        strategy_stats.columns = ["取引回数", "累計損益", "平均損益", "銘柄数"]

        return strategy_stats
