"""
パフォーマンスメトリクス計算モジュール

すべてのパフォーマンス指標計算を統合。
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Union

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """パフォーマンスメトリクスのデータクラス"""
    total_return: float = 0.0
    annualized_return: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    max_drawdown: float = 0.0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    calmar_ratio: float = 0.0
    volatility: float = 0.0
    total_trades: int = 0
    
    def to_dict(self) -> Dict:
        return {
            "total_return": self.total_return,
            "annualized_return": self.annualized_return,
            "sharpe_ratio": self.sharpe_ratio,
            "sortino_ratio": self.sortino_ratio,
            "max_drawdown": self.max_drawdown,
            "win_rate": self.win_rate,
            "profit_factor": self.profit_factor,
            "calmar_ratio": self.calmar_ratio,
            "volatility": self.volatility,
            "total_trades": self.total_trades,
        }


def calculate_returns(prices: pd.Series) -> pd.Series:
    """価格系列からリターンを計算"""
    return prices.pct_change().dropna()


def calculate_sharpe_ratio(
    returns: Union[pd.Series, np.ndarray],
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252
) -> float:
    """
    シャープレシオを計算
    
    Args:
        returns: リターン系列
        risk_free_rate: 無リスク金利（年率）
        periods_per_year: 年間の期間数（日次=252, 月次=12）
    
    Returns:
        シャープレシオ
    """
    if isinstance(returns, np.ndarray):
        returns = pd.Series(returns)
    
    if returns.empty or returns.std() == 0:
        return 0.0
    
    excess_returns = returns - risk_free_rate / periods_per_year
    return float(np.sqrt(periods_per_year) * excess_returns.mean() / excess_returns.std())


def calculate_sortino_ratio(
    returns: Union[pd.Series, np.ndarray],
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252
) -> float:
    """
    ソルティノレシオを計算（下方リスクのみ考慮）
    
    Args:
        returns: リターン系列
        risk_free_rate: 無リスク金利（年率）
        periods_per_year: 年間の期間数
    
    Returns:
        ソルティノレシオ
    """
    if isinstance(returns, np.ndarray):
        returns = pd.Series(returns)
    
    if returns.empty:
        return 0.0
    
    excess_returns = returns - risk_free_rate / periods_per_year
    downside_returns = excess_returns[excess_returns < 0]
    
    if downside_returns.empty or downside_returns.std() == 0:
        return 0.0
    
    downside_std = downside_returns.std()
    return float(np.sqrt(periods_per_year) * excess_returns.mean() / downside_std)


def calculate_max_drawdown(equity_curve: Union[pd.Series, np.ndarray]) -> float:
    """
    最大ドローダウンを計算
    
    Args:
        equity_curve: 資産曲線
    
    Returns:
        最大ドローダウン（負の値）
    """
    if isinstance(equity_curve, np.ndarray):
        equity_curve = pd.Series(equity_curve)
    
    if equity_curve.empty:
        return 0.0
    
    rolling_max = equity_curve.cummax()
    drawdown = (equity_curve - rolling_max) / rolling_max
    return float(drawdown.min())


def calculate_win_rate(trades: List[Dict]) -> float:
    """
    勝率を計算
    
    Args:
        trades: 取引リスト（各取引に'return'キーが必要）
    
    Returns:
        勝率（0-1）
    """
    if not trades:
        return 0.0
    
    winning_trades = sum(1 for t in trades if t.get("return", 0) > 0)
    return winning_trades / len(trades)


def calculate_profit_factor(trades: List[Dict]) -> float:
    """
    プロフィットファクターを計算
    
    Args:
        trades: 取引リスト
    
    Returns:
        プロフィットファクター
    """
    if not trades:
        return 0.0
    
    gross_profit = sum(t.get("return", 0) for t in trades if t.get("return", 0) > 0)
    gross_loss = abs(sum(t.get("return", 0) for t in trades if t.get("return", 0) < 0))
    
    if gross_loss == 0:
        return float("inf") if gross_profit > 0 else 0.0
    
    return gross_profit / gross_loss


def calculate_calmar_ratio(
    returns: Union[pd.Series, np.ndarray],
    max_drawdown: Optional[float] = None,
    periods_per_year: int = 252
) -> float:
    """
    カルマーレシオを計算（年率リターン / 最大ドローダウン）
    
    Args:
        returns: リターン系列
        max_drawdown: 最大ドローダウン（省略時は計算）
        periods_per_year: 年間の期間数
    
    Returns:
        カルマーレシオ
    """
    if isinstance(returns, np.ndarray):
        returns = pd.Series(returns)
    
    if returns.empty:
        return 0.0
    
    annualized_return = returns.mean() * periods_per_year
    
    if max_drawdown is None:
        equity_curve = (1 + returns).cumprod()
        max_drawdown = calculate_max_drawdown(equity_curve)
    
    if max_drawdown == 0:
        return 0.0
    
    return float(annualized_return / abs(max_drawdown))


def calculate_volatility(
    returns: Union[pd.Series, np.ndarray],
    periods_per_year: int = 252
) -> float:
    """
    年率ボラティリティを計算
    
    Args:
        returns: リターン系列
        periods_per_year: 年間の期間数
    
    Returns:
        年率ボラティリティ
    """
    if isinstance(returns, np.ndarray):
        returns = pd.Series(returns)
    
    if returns.empty:
        return 0.0
    
    return float(returns.std() * np.sqrt(periods_per_year))


def calculate_all_metrics(
    equity_curve: pd.Series,
    trades: Optional[List[Dict]] = None,
    risk_free_rate: float = 0.0
) -> PerformanceMetrics:
    """
    すべてのパフォーマンスメトリクスを計算
    
    Args:
        equity_curve: 資産曲線
        trades: 取引リスト
        risk_free_rate: 無リスク金利
    
    Returns:
        PerformanceMetricsオブジェクト
    """
    returns = calculate_returns(equity_curve)
    
    total_return = (equity_curve.iloc[-1] / equity_curve.iloc[0] - 1) if len(equity_curve) > 1 else 0.0
    days = len(returns)
    annualized_return = (1 + total_return) ** (252 / max(days, 1)) - 1 if days > 0 else 0.0
    
    return PerformanceMetrics(
        total_return=total_return,
        annualized_return=annualized_return,
        sharpe_ratio=calculate_sharpe_ratio(returns, risk_free_rate),
        sortino_ratio=calculate_sortino_ratio(returns, risk_free_rate),
        max_drawdown=calculate_max_drawdown(equity_curve),
        win_rate=calculate_win_rate(trades or []),
        profit_factor=calculate_profit_factor(trades or []),
        calmar_ratio=calculate_calmar_ratio(returns),
        volatility=calculate_volatility(returns),
        total_trades=len(trades) if trades else 0,
    )
