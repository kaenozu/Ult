"""
取引コスト計算モジュール

手数料・税金を考慮した正確な損益計算
"""

from typing import Dict


class TradingCostCalculator:
    """取引コスト計算クラス"""

    def __init__(self, config: dict):
        self.config = config

        # 手数料設定
        cost_config = config.get("trading_costs", {})

        # 日本株手数料（デフォルト: 約定代金の0.1%、最低100円）
        self.jp_commission_rate = cost_config.get("jp_commission_rate", 0.001)
        self.jp_min_commission = cost_config.get("jp_min_commission", 100)

        # 米国株手数料（デフォルト: 約定代金の0.45%、最低0ドル、上限20ドル）
        self.us_commission_rate = cost_config.get("us_commission_rate", 0.0045)
        self.us_min_commission = cost_config.get("us_min_commission", 0)
        self.us_max_commission = cost_config.get("us_max_commission", 20)

        # 税金（日本: 20.315%）
        self.tax_rate = cost_config.get("tax_rate", 0.20315)

    def calculate_commission(self, ticker: str, price: float, quantity: int) -> float:
        """
        手数料を計算

        Args:
            ticker: 銘柄コード
            price: 価格
            quantity: 数量

        Returns:
            float: 手数料
        """
        amount = price * quantity

        # 日本株か米国株か判定
        is_jp_stock = "." in ticker  # 例: 8308.T

        if is_jp_stock:
            commission = amount * self.jp_commission_rate
            commission = max(commission, self.jp_min_commission)
        else:
            commission = amount * self.us_commission_rate
            commission = max(commission, self.us_min_commission)
            commission = min(commission, self.us_max_commission)

        return commission

    def calculate_tax(self, profit: float) -> float:
        """
        税金を計算（利益が出た場合のみ）

        Args:
            profit: 利益

        Returns:
            float: 税金
        """
        if profit <= 0:
            return 0.0

        return profit * self.tax_rate

    def calculate_net_profit(self, ticker: str, entry_price: float, exit_price: float, quantity: int) -> Dict:
        """
        手数料・税金を考慮した純利益を計算

        Args:
            ticker: 銘柄コード
            entry_price: 購入価格
            exit_price: 売却価格
            quantity: 数量

        Returns:
            dict: 詳細な損益情報
        """
        # 購入手数料
        buy_commission = self.calculate_commission(ticker, entry_price, quantity)

        # 売却手数料
        sell_commission = self.calculate_commission(ticker, exit_price, quantity)

        # 総手数料
        total_commission = buy_commission + sell_commission

        # 粗利益（手数料前）
        gross_profit = (exit_price - entry_price) * quantity

        # 手数料控除後の利益
        profit_after_commission = gross_profit - total_commission

        # 税金
        tax = self.calculate_tax(profit_after_commission)

        # 純利益（手数料・税金控除後）
        net_profit = profit_after_commission - tax

        # 利益率
        total_cost = (entry_price * quantity) + buy_commission
        net_profit_pct = (net_profit / total_cost) * 100 if total_cost > 0 else 0

        return {
            "gross_profit": gross_profit,
            "buy_commission": buy_commission,
            "sell_commission": sell_commission,
            "total_commission": total_commission,
            "profit_after_commission": profit_after_commission,
            "tax": tax,
            "net_profit": net_profit,
            "net_profit_pct": net_profit_pct,
            "total_cost": total_cost,
        }

    def should_sell_for_profit(
        self,
        ticker: str,
        entry_price: float,
        current_price: float,
        quantity: int,
        min_profit_pct: float = 1.0,
    ) -> bool:
        """
        利確すべきか判定（手数料・税金を考慮）

        Args:
            ticker: 銘柄コード
            entry_price: 購入価格
            current_price: 現在価格
            quantity: 数量
            min_profit_pct: 最低利益率（%）

        Returns:
            bool: 売却すべきならTrue
        """
        result = self.calculate_net_profit(ticker, entry_price, current_price, quantity)

        # 純利益率が最低基準を超えているか
        return result["net_profit_pct"] >= min_profit_pct

    def get_breakeven_price(self, ticker: str, entry_price: float, quantity: int) -> float:
        """
        損益分岐点の価格を計算

        Args:
            ticker: 銘柄コード
            entry_price: 購入価格
            quantity: 数量

        Returns:
            float: 損益分岐点の価格
        """
        # 購入手数料
        buy_commission = self.calculate_commission(ticker, entry_price, quantity)

        # 総コスト
        total_cost = (entry_price * quantity) + buy_commission

        # 損益分岐点を逆算
        # (breakeven_price * quantity) - sell_commission - tax = total_cost
        # 簡易計算: 売却手数料と税金を考慮した係数
        is_jp_stock = "." in ticker

        if is_jp_stock:
            # 日本株の場合
            # breakeven_price = total_cost / (quantity * (1 - commission_rate - tax_rate))
            factor = 1 - self.jp_commission_rate - (self.tax_rate * (1 - self.jp_commission_rate))
        else:
            # 米国株の場合
            factor = 1 - self.us_commission_rate - (self.tax_rate * (1 - self.us_commission_rate))

        breakeven_price = total_cost / (quantity * factor)

        return breakeven_price
