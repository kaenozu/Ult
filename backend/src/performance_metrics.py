"""
高度なパフォーマンスメトリクス

プロフェッショナルレベルのパフォーマンス指標を提供します。
- シャープレシオ、ソルティノレシオ、カルマーレシオ
- 最大ドローダウン、勝率、ペイオフレシオ
- 情報比率、オメガレシオ
"""

import logging
from typing import Dict, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class AdvancedMetrics:
    """
    高度なパフォーマンスメトリクス計算クラス
    """

    def __init__(self, returns: pd.Series, risk_free_rate: float = 0.02):
        """
        Args:
            returns: リターン系列（日次）
            risk_free_rate: リスクフリーレート（年率）
        """
        self.returns = returns
        self.risk_free_rate = risk_free_rate
        self.daily_rf_rate = (1 + risk_free_rate) ** (1 / 252) - 1
        self._drawdown_cache: Optional[np.ndarray] = None

    def sharpe_ratio(self, periods: int = 252) -> float:
        """シャープレシオを計算"""
        excess_returns = self.returns - self.daily_rf_rate
        if excess_returns.std() == 0:
            return 0.0
        return np.sqrt(periods) * excess_returns.mean() / excess_returns.std()

    def sortino_ratio(self, periods: int = 252) -> float:
        """ソルティノレシオを計算（下方リスクのみ考慮）"""
        excess_returns = self.returns - self.daily_rf_rate
        downside_returns = excess_returns[excess_returns < 0]

        if len(downside_returns) == 0 or downside_returns.std() == 0:
            return 0.0

        return np.sqrt(periods) * excess_returns.mean() / downside_returns.std()

    def calmar_ratio(self) -> float:
        """カルマーレシオを計算（リターン / 最大ドローダウン）"""
        max_dd = self.max_drawdown()
        if max_dd == 0:
            return 0.0

        annual_return = (1 + self.returns.mean()) ** 252 - 1
        return annual_return / abs(max_dd)

    def max_drawdown(self) -> float:
        """最大ドローダウンを計算"""
        drawdown = self._get_drawdown_array()
        return float(drawdown.min()) if drawdown.size > 0 else 0.0

    def max_drawdown_duration(self) -> int:
        """最大ドローダウン期間を計算（日数）"""
        drawdown = self._get_drawdown_array()
        drawdown_flags = drawdown < 0

        if not np.any(drawdown_flags):
            return 0

        changes = np.diff(drawdown_flags.astype(int))
        boundaries = np.concatenate(([0], np.flatnonzero(changes) + 1, [drawdown_flags.size]))

        max_duration = 0
        for start, end in zip(boundaries[:-1], boundaries[1:]):
            if drawdown_flags[start]:
                max_duration = max(max_duration, end - start)

        return int(max_duration)

    def win_rate(self) -> float:
        """勝率を計算"""
        winning_days = (self.returns > 0).sum()
        total_days = len(self.returns)
        return winning_days / total_days if total_days > 0 else 0.0

    def payoff_ratio(self) -> float:
        """ペイオフレシオを計算（平均利益 / 平均損失）"""
        gains = self.returns[self.returns > 0]
        losses = self.returns[self.returns < 0]

        if len(losses) == 0 or losses.mean() == 0:
            return 0.0

        avg_gain = gains.mean() if len(gains) > 0 else 0
        avg_loss = abs(losses.mean())

        return avg_gain / avg_loss

    def omega_ratio(self, threshold: float = 0.0) -> float:
        """オメガレシオを計算"""
        returns_above = self.returns[self.returns > threshold] - threshold
        returns_below = threshold - self.returns[self.returns < threshold]

        if returns_below.sum() == 0:
            return np.inf if returns_above.sum() > 0 else 0.0

        return returns_above.sum() / returns_below.sum()

    def information_ratio(self, benchmark_returns: pd.Series) -> float:
        """情報比率を計算"""
        active_returns = self.returns - benchmark_returns
        tracking_error = active_returns.std()

        if tracking_error == 0:
            return 0.0

        return np.sqrt(252) * active_returns.mean() / tracking_error

    def _get_drawdown_array(self) -> np.ndarray:
        """ドローダウン配列をキャッシュ付きで取得"""
        if self._drawdown_cache is None:
            cumulative = np.cumprod(1 + self.returns.to_numpy())
            running_max = np.maximum.accumulate(cumulative)
            self._drawdown_cache = (cumulative - running_max) / running_max
        return self._drawdown_cache

    def all_metrics(self, benchmark_returns: Optional[pd.Series] = None) -> Dict[str, float]:
        """すべてのメトリクスを計算"""
        metrics = {
            "total_return": (1 + self.returns).prod() - 1,
            "annual_return": (1 + self.returns.mean()) ** 252 - 1,
            "annual_volatility": self.returns.std() * np.sqrt(252),
            "sharpe_ratio": self.sharpe_ratio(),
            "sortino_ratio": self.sortino_ratio(),
            "calmar_ratio": self.calmar_ratio(),
            "max_drawdown": self.max_drawdown(),
            "max_dd_duration": self.max_drawdown_duration(),
            "win_rate": self.win_rate(),
            "payoff_ratio": self.payoff_ratio(),
            "omega_ratio": self.omega_ratio(),
        }

        if benchmark_returns is not None:
            metrics["information_ratio"] = self.information_ratio(benchmark_returns)

        return metrics


class TransactionCostModel:
    """取引コストモデル"""

    def __init__(
        self,
        commission_pct: float = 0.001,  # 0.1%
        slippage_pct: float = 0.0005,  # 0.05%
        market_impact_factor: float = 0.1,
    ):
        """
        Args:
            commission_pct: 手数料率
            slippage_pct: スリッページ率
            market_impact_factor: マーケットインパクト係数
        """
        self.commission_pct = commission_pct
        self.slippage_pct = slippage_pct
        self.market_impact_factor = market_impact_factor

    def calculate_cost(self, order_value: float, daily_volume: float, is_buy: bool = True) -> float:
        """
        取引コストを計算

        Args:
            order_value: 注文金額
            daily_volume: 日次出来高
            is_buy: 買い注文ならTrue

        Returns:
            総コスト
        """
        # 手数料
        commission = order_value * self.commission_pct

        # スリッページ
        slippage = order_value * self.slippage_pct

        # マーケットインパクト
        volume_participation = order_value / daily_volume if daily_volume > 0 else 0
        market_impact = order_value * self.market_impact_factor * (volume_participation**2)

        total_cost = commission + slippage + market_impact

        return total_cost


if __name__ == "__main__":
    # テスト
    logging.basicConfig(level=logging.INFO)

    np.random.seed(42)
    returns = pd.Series(np.random.randn(252) * 0.01 + 0.0005)

    metrics = AdvancedMetrics(returns)
    all_metrics = metrics.all_metrics()

    print("Performance Metrics:")
    for key, value in all_metrics.items():
        if "ratio" in key or "return" in key or "volatility" in key:
            print(f"{key}: {value:.2%}")
        else:
            print(f"{key}: {value:.2f}")
