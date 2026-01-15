"""パフォーマンス計算モジュール

このモジュールは、トレードシミュレーション結果から各種パフォーマンス指標を計算する機能を提供します。
シミュレーションとパフォーマンス計算を分離し、単一責任の原則を適用します。
"""

from typing import Any, Dict, List

import numpy as np
import pandas as pd


class PerformanceCalculator:
    """パフォーマンス指標を計算するクラス（単一責任：パフォーマンス計算）"""

    def __init__(self):
        pass

    def calculate_total_return(self, initial_capital: float, final_capital: float) -> float:
        """総収益率を計算

        Args:
            initial_capital (float): 初期資本
            final_capital (float): 終了時資本

        Returns:
            float: 総収益率
        """
        if initial_capital == 0:
            return 0.0
        return (final_capital - initial_capital) / initial_capital

    def calculate_sharpe_ratio(self, returns: pd.Series, risk_free_rate: float = 0.0) -> float:
        """シャープ比を計算

        Args:
            returns (pd.Series): 日次リターン
            risk_free_rate (float): 無リスク金利

        Returns:
            float: シャープ比
        """
        if returns.empty:
            return 0.0

        excess_returns = returns - risk_free_rate
        mean_excess_return = excess_returns.mean()
        volatility = excess_returns.std()

        if volatility == 0:
            return 0.0

        return (mean_excess_return / volatility) * np.sqrt(252)  # 年率換算

    def calculate_max_drawdown(self, equity_curve: pd.Series) -> float:
        """最大ドローダンを計算

        Args:
            equity_curve (pd.Series): 株価曲線

        Returns:
            float: 最大ドローダン
        """
        if equity_curve.empty:
            return 0.0

        running_max = equity_curve.expanding().max()
        drawdown = (running_max - equity_curve) / running_max
        return drawdown.max() if not drawdown.empty else 0.0

    def calculate_win_rate(self, trades: List[Dict[str, Any]]) -> float:
        """勝率を計算

        Args:
            trades (List[Dict[str, Any]]): 取引記録のリスト

        Returns:
            float: 勝率
        """
        if not trades:
            return 0.0

        profitable_trades = sum(1 for trade in trades if trade.get("return", 0) > 0)
        return profitable_trades / len(trades)

    def calculate_average_return(self, trades: List[Dict[str, Any]]) -> float:
        """平均リターンを計算

        Args:
            trades (List[Dict[str, Any]]): 取引記録のリスト

        Returns:
            float: 平均リターン
        """
        if not trades:
            return 0.0

        returns = [trade.get("return", 0) for trade in trades]
        return np.mean(returns)

    def calculate_volatility(self, returns: pd.Series) -> float:
        """ボラティリティを計算

        Args:
            returns (pd.Series): リーターン系列

        Returns:
            float: ポ年化ボラティリティ
        """
        if returns.empty or len(returns) < 2:
            return 0.0

        daily_vol = returns.std()
        return daily_vol * np.sqrt(252)  # 年率換算

    def calculate_sortino_ratio(self, returns: pd.Series, target_return: float = 0.0) -> float:
        """ソルティノ比を計算

        Args:
            returns (pd.Series): 日次リターン
            target_return (float): 目標リターン

        Returns:
            float: ソルティノ比
        """
        if returns.empty:
            return 0.0

        downside_returns = returns[returns < target_return]
        if downside_returns.empty:
            downside_deviation = 0.0
        else:
            downside_deviation = np.sqrt((downside_returns**2).mean())

        if downside_deviation == 0:
            return 0.0

        excess_return = returns.mean() - target_return
        return (excess_return / downside_deviation) * np.sqrt(252)

    def calculate_var(self, returns: pd.Series, confidence_level: float = 0.05) -> float:
        """VaR(Value at Risk)を計算

        Args:
            returns (pd.Series): リーターン系列
            confidence_level (float): 信頼水準

        Returns:
            float: VaR
        """
        if returns.empty:
            return 0.0

        return returns.quantile(confidence_level)

    def calculate_calmar_ratio(self, total_return: float, max_drawdown: float) -> float:
        """カルマール比を計算

        Args:
            total_return (float): 総収益率
            max_drawdown (float): 最大ドローダン

        Returns:
            float: カルマール比
        """
        if max_drawdown == 0:
            return float("inf") if total_return >= 0 else float("-inf")
        return total_return / abs(max_drawdown)

    def calculate_all_metrics(
        self,
        initial_capital: float,
        final_capital: float,
        equity_curve: pd.Series,
        trades: List[Dict[str, Any]],
        daily_returns: pd.Series,
        risk_free_rate: float = 0.0,
        target_return: float = 0.0,
        var_confidence: float = 0.05,
    ) -> Dict[str, float]:
        """すべてのパフォーマンス指標を計算

        Args:
            initial_capital (float): 初期資本
            final_capital (float): 終了時資本
            equity_curve (pd.Series): 株価曲線
            trades (List[Dict[str, Any]]): 取引記録のリスト
            daily_returns (pd.Series): 日次リターン
            risk_free_rate (float): 無リスク金利
            target_return (float): 目標リターン
            var_confidence (float): VaRの信頼水準

        Returns:
            Dict[str, float]: パォーマンス指標の辞書
        """
        total_return = self.calculate_total_return(initial_capital, final_capital)
        sharpe_ratio = self.calculate_sharpe_ratio(daily_returns, risk_free_rate)
        max_drawdown = self.calculate_max_drawdown(equity_curve)
        win_rate = self.calculate_win_rate(trades)
        avg_return = self.calculate_average_return(trades)
        volatility = self.calculate_volatility(daily_returns)
        sortino_ratio = self.calculate_sortino_ratio(daily_returns, target_return)
        var = self.calculate_var(daily_returns, var_confidence)
        calmar_ratio = self.calculate_calmar_ratio(total_return, max_drawdown)

        return {
            "total_return": total_return,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown": max_drawdown,
            "win_rate": win_rate,
            "avg_return": avg_return,
            "volatility": volatility,
            "sortino_ratio": sortino_ratio,
            "var": var,
            "calmar_ratio": calmar_ratio,
            "total_trades": len(trades),
        }
