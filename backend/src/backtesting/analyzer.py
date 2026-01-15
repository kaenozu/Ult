"""バックテスト結果解析モジュール。

このモジュールは、バックテストの結果からパフォーマンス指標やリスク指標を計算する機能を提供します。
"""

from typing import Any, Dict, List

import numpy as np
import pandas as pd


def calculate_performance_metrics(
    equity_curve: pd.Series, trades: List[Dict[str, Any]], initial_capital: float
) -> Dict[str, float]:
    """バックテスト結果からパフォーマンス指標を計算します。

    Args:
        equity_curve (pd.Series): 株価曲線 (時間インデックス, 株価値)
        trades (List[Dict[str, Any]]): 取引履歴
        initial_capital (float): 初期資本金

    Returns:
        Dict[str, float]: パォーマンス指標の辞書
    """
    if equity_curve.empty:
        return {}

    # 総リターン
    total_return = (equity_curve.iloc[-1] - initial_capital) / initial_capital

    # 最終資産価値
    final_value = equity_curve.iloc[-1]

    # 勝率
    if trades:
        winning_trades = [t for t in trades if t.get("return", 0) > 0]
        win_rate = len(winning_trades) / len(trades)
        # 平均リターン
        avg_return = sum(t.get("return", 0) for t in trades) / len(trades)
    else:
        win_rate = 0.0
        avg_return = 0.0

    # 最大ドロークダウン
    running_max = equity_curve.expanding().max()
    drawdown = (running_max - equity_curve) / running_max
    max_drawdown = drawdown.max() if not drawdown.empty else 0.0

    # シャープ比
    daily_returns = equity_curve.pct_change().dropna()
    if len(daily_returns) > 0 and daily_returns.std() > 0:
        # 無リスクレートを0と仮定
        rf = 0.0
        excess_returns = daily_returns - rf
        sharpe_ratio = (np.sqrt(252) * excess_returns.mean()) / excess_returns.std()
    else:
        sharpe_ratio = 0.0

    # トータル取引数
    total_trades = len(trades)

    return {
        "total_return": total_return,
        "final_value": final_value,
        "win_rate": win_rate,
        "avg_return": avg_return,
        "max_drawdown": max_drawdown,
        "sharpe_ratio": sharpe_ratio,
        "total_trades": total_trades,
    }


def calculate_risk_metrics(equity_curve: pd.Series, trades: List[Dict[str, Any]]) -> Dict[str, float]:
    """バックテスト結果からリスク指標を計算します。

    Args:
        equity_curve (pd.Series): 株価曲線 (時間インデックス, 株価値)
        trades (List[Dict[str, Any]]): 取引履歴

    Returns:
        Dict[str, float]: リスク指標の辞書
    """
    if equity_curve.empty:
        return {}

    # Value at Risk (VaR) - 5% VaR (最も悪い5%の損失の期待値)
    daily_returns = equity_curve.pct_change().dropna()
    if not daily_returns.empty:
        var_5 = daily_returns.quantile(0.05)
    else:
        var_5 = 0.0

    # Conditional Value at Risk (CVaR) - 損失がVaRを超えた場合の平均損失
    if not daily_returns.empty:
        cvar_returns = daily_returns[daily_returns <= var_5]
        if not cvar_returns.empty:
            cvar_5 = cvar_returns.mean()
        else:
            # VaR以下のリターンがなかった場合、NaNを避けるため0
            cvar_5 = var_5
    else:
        cvar_5 = 0.0

    # 1取引当たりの平均損益
    if trades:
        avg_trade_pnl = sum(t.get("return", 0) for t in trades) / len(trades)
    else:
        avg_trade_pnl = 0.0

    # 損失取引の平均損失
    losing_trades = [t for t in trades if t.get("return", 0) < 0]
    if losing_trades:
        avg_loss_per_trade = sum(t.get("return", 0) for t in losing_trades) / len(losing_trades)
    else:
        avg_loss_per_trade = 0.0

    # 損失取引の最大損失
    if losing_trades:
        max_loss_per_trade = min(t.get("return", 0) for t in losing_trades)
    else:
        max_loss_per_trade = 0.0

    return {
        "var_5": var_5,
        "cvar_5": cvar_5,
        "avg_trade_pnl": avg_trade_pnl,
        "avg_loss_per_trade": avg_loss_per_trade,
        "max_loss_per_trade": max_loss_per_trade,
    }


def generate_backtest_report(performance_metrics: Dict[str, float], risk_metrics: Dict[str, float]) -> str:
    """バックテストレポートを生成します。

    Args:
        performance_metrics (Dict[str, float]): パフォーマンス指標
        risk_metrics (Dict[str, float]): リスクリスク指標

    Returns:
        str: バックテストレポート
    """
    report = []
    report.append("# バックテストレポート")
    report.append("")

    report.append("## パフォーマンス指標")
    report.append(f"- 総リターン: {performance_metrics.get('total_return', 0):.2%}")
    report.append(f"- 最終資産価値: {performance_metrics.get('final_value', 0):,.0f}円")
    report.append(f"- 勝率: {performance_metrics.get('win_rate', 0):.2%}")
    report.append(f"- 平均リターン: {performance_metrics.get('avg_return', 0):.2%}")
    report.append(f"- 最大ドロークダウン: {performance_metrics.get('max_drawdown', 0):.2%}")
    report.append(f"- シャープ比: {performance_metrics.get('sharpe_ratio', 0):.2f}")
    report.append(f"- トータル取引数: {performance_metrics.get('total_trades', 0)}")
    report.append("")

    report.append("## リスク指標")
    report.append(f"- 5% VaR: {risk_metrics.get('var_5', 0):.2%}")
    report.append(f"- 5% CVaR: {risk_metrics.get('cvar_5', 0):.2%}")
    report.append(f"- 平均取引損益: {risk_metrics.get('avg_trade_pnl', 0):.2%}")
    report.append(f"- 平均損失 (損失取引): {risk_metrics.get('avg_loss_per_trade', 0):.2%}")
    report.append(f"- 最大損失 (損失取引): {risk_metrics.get('max_loss_per_trade', 0):.2%}")
    report.append("")

    return "\n".join(report)
