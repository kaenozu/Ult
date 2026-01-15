"""
動的リバランサー

ポートフォリオの自動リバランス機能を提供します。
- 閾値ベースリバランス
- 定期リバランス
- 取引コスト考慮
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class DynamicRebalancer:
    """
    動的ポートフォリオリバランサー

    設定した条件に基づいて自動的にポートフォリオをリバランスします。
    """

    def __init__(
        self,
        rebalance_threshold: float = 0.05,  # 5%のズレでリバランス
        rebalance_frequency: str = "monthly",  # 'daily', 'weekly', 'monthly', 'quarterly'
        transaction_cost_pct: float = 0.001,  # 0.1%の取引コスト
    ):
        """
        Args:
            rebalance_threshold: リバランスを実行する閾値（ウェイトのズレ）
            rebalance_frequency: リバランス頻度
            transaction_cost_pct: 取引コストの割合
        """
        self.rebalance_threshold = rebalance_threshold
        self.rebalance_frequency = rebalance_frequency
        self.transaction_cost_pct = transaction_cost_pct
        self.last_rebalance_date = None

        logger.info(f"DynamicRebalancer initialized: threshold={rebalance_threshold}, frequency={rebalance_frequency}")

    def calculate_current_weights(self, portfolio: Dict[str, Dict]) -> Dict[str, float]:
        """
        現在のポートフォリオウェイトを計算

        Args:
            portfolio: ポートフォリオ辞書 {ticker: {'quantity': float, 'current_price': float}}

        Returns:
            現在のウェイト辞書
        """
        total_value = sum(holdings["quantity"] * holdings["current_price"] for holdings in portfolio.values())

        if total_value == 0:
            return {ticker: 0.0 for ticker in portfolio.keys()}

        current_weights = {
            ticker: (holdings["quantity"] * holdings["current_price"]) / total_value
            for ticker, holdings in portfolio.items()
        }

        return current_weights

    def needs_rebalancing(self, portfolio: Dict[str, Dict], target_weights: Dict[str, float]) -> bool:
        """
        リバランスが必要かどうかを判定

        Args:
            portfolio: 現在のポートフォリオ
            target_weights: 目標ウェイト

        Returns:
            リバランスが必要ならTrue
        """
        current_weights = self.calculate_current_weights(portfolio)

        # 最大ズレを計算
        max_deviation = 0.0
        for ticker in target_weights.keys():
            current_weight = current_weights.get(ticker, 0.0)
            target_weight = target_weights[ticker]
            deviation = abs(current_weight - target_weight)
            max_deviation = max(max_deviation, deviation)

        return max_deviation > self.rebalance_threshold

    def generate_rebalance_orders(
        self,
        portfolio: Dict[str, Dict],
        target_weights: Dict[str, float],
        total_value: Optional[float] = None,
    ) -> List[Dict]:
        """
        リバランス注文を生成

        Args:
            portfolio: 現在のポートフォリオ
            target_weights: 目標ウェイト
            total_value: ポートフォリオ総額（Noneの場合は現在値を使用）

        Returns:
            注文リスト
        """
        # ポートフォリオ総額を計算
        if total_value is None:
            total_value = sum(holdings["quantity"] * holdings["current_price"] for holdings in portfolio.values())

        orders = []

        for ticker, target_weight in target_weights.items():
            if ticker not in portfolio:
                # 新規銘柄
                target_value = total_value * target_weight
                current_price = 0  # 価格情報が必要
                continue

            current_price = portfolio[ticker]["current_price"]
            current_quantity = portfolio[ticker]["quantity"]
            current_quantity * current_price

            # 目標数量を計算
            target_value = total_value * target_weight
            target_quantity = target_value / current_price if current_price > 0 else 0

            # 差分
            quantity_diff = target_quantity - current_quantity

            if abs(quantity_diff) < 0.01:  # 0.01株未満は無視
                continue

            if quantity_diff > 0:
                # 買い注文
                orders.append(
                    {
                        "ticker": ticker,
                        "action": "BUY",
                        "quantity": abs(quantity_diff),
                        "price": current_price,
                    }
                )
            else:
                # 売り注文
                orders.append(
                    {
                        "ticker": ticker,
                        "action": "SELL",
                        "quantity": abs(quantity_diff),
                        "price": current_price,
                    }
                )

        logger.info(f"Generated {len(orders)} rebalance orders")
        return orders

    def calculate_transaction_costs(self, orders: List[Dict]) -> float:
        """
        取引コストを計算

        Args:
            orders: 注文リスト

        Returns:
            総取引コスト
        """
        total_cost = 0.0

        for order in orders:
            order_value = order["quantity"] * order["price"]
            cost = order_value * self.transaction_cost_pct
            total_cost += cost

        return total_cost

    def should_rebalance_by_time(self, current_date: datetime) -> bool:
        """
        時間ベースでリバランスすべきかどうかを判定

        Args:
            current_date: 現在日時

        Returns:
            リバランスすべきならTrue
        """
        if self.last_rebalance_date is None:
            return True

        time_diff = current_date - self.last_rebalance_date

        if self.rebalance_frequency == "daily":
            return time_diff >= timedelta(days=1)
        elif self.rebalance_frequency == "weekly":
            return time_diff >= timedelta(days=7)
        elif self.rebalance_frequency == "monthly":
            return time_diff >= timedelta(days=30)
        elif self.rebalance_frequency == "quarterly":
            return time_diff >= timedelta(days=90)

        return False


if __name__ == "__main__":
    # 簡単なテスト
    logging.basicConfig(level=logging.INFO)

    # サンプルポートフォリオ
    portfolio = {
        "AAPL": {"quantity": 100, "current_price": 150.0},
        "GOOGL": {"quantity": 50, "current_price": 140.0},
        "MSFT": {"quantity": 75, "current_price": 350.0},
    }

    # 目標ウェイト
    target_weights = {"AAPL": 0.4, "GOOGL": 0.3, "MSFT": 0.3}

    # Rebalancer作成
    rebalancer = DynamicRebalancer(rebalance_threshold=0.05)

    # 現在のウェイト
    current_weights = rebalancer.calculate_current_weights(portfolio)
    print(f"Current Weights: {current_weights}")

    # リバランスが必要か
    needs_rebal = rebalancer.needs_rebalancing(portfolio, target_weights)
    print(f"Needs Rebalancing: {needs_rebal}")

    # リバランス注文
    if needs_rebal:
        orders = rebalancer.generate_rebalance_orders(portfolio, target_weights)
        print("\nRebalance Orders:")
        for order in orders:
            print(f"  {order['action']} {order['quantity']:.2f} shares of {order['ticker']}")

        # 取引コスト
        cost = rebalancer.calculate_transaction_costs(orders)
        print(f"\nTransaction Cost: ${cost:.2f}")
