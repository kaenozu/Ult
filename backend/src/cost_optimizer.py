"""
手数料最適化エンジン - 個人投資家向け

取引コストを最小化し、実質リターンを最大化
"""

from typing import Dict, Tuple

import pandas as pd


class CostOptimizer:
    """取引コスト最適化クラス"""

    # 主要証券会社の手数料設定（2024年現在）
    BROKER_FEES = {
        "sbi": {
            "name": "SBI証券（スタンダードプラン）",
            "tiers": [
                (50000, 55),  # 5万円まで: 55円
                (100000, 99),  # 10万円まで: 99円
                (200000, 115),  # 20万円まで: 115円
                (500000, 275),  # 50万円まで: 275円
                (1000000, 535),  # 100万円まで: 535円
                (3000000, 1013),  # 300万円まで: 1013円
                (float("inf"), 1070),  # 300万円超: 1070円
            ],
        },
        "rakuten": {
            "name": "楽天証券（超割コース）",
            "tiers": [
                (50000, 55),
                (100000, 99),
                (200000, 115),
                (500000, 275),
                (1000000, 535),
                (3000000, 1013),
                (float("inf"), 1070),
            ],
        },
        "matsui": {
            "name": "松井証券（ボックスレート）",
            "tiers": [
                (500000, 0),  # 50万円まで: 無料
                (1000000, 1100),  # 100万円まで: 1100円
                (2000000, 2200),  # 200万円まで: 2200円
                (float("inf"), 0.0011),  # 200万円超: 0.11%（率）
            ],
        },
    }

    def __init__(self, broker: str = "sbi"):
        """
        Args:
            broker: 証券会社（"sbi", "rakuten", "matsui"）
        """
        if broker not in self.BROKER_FEES:
            raise ValueError(f"Unknown broker: {broker}. Choose from {list(self.BROKER_FEES.keys())}")

        self.broker = broker
        self.broker_config = self.BROKER_FEES[broker]

    def calculate_fee(self, amount: float) -> float:
        """
        取引金額から手数料を計算

        Args:
            amount: 取引金額（円）

        Returns:
            手数料（円）
        """
        for threshold, fee in self.broker_config["tiers"]:
            if amount <= threshold:
                # 定額の場合
                if isinstance(fee, int):
                    return fee
                # 比率の場合（松井証券の200万円超）
                else:
                    return amount * fee

        return 0

    def calculate_break_even(self, entry_price: float, shares: int) -> Dict:
        """
        損益分岐点を計算

        Args:
            entry_price: 取得単価（円）
            shares: 株数

        Returns:
            Dict {
                "break_even_price": 損益分岐点価格,
                "required_return": 必要リターン率,
                "buy_fee": 買い手数料,
                "sell_fee": 売り手数料（想定）,
                "total_cost": 総コスト
            }
        """
        investment = entry_price * shares

        # 買い手数料
        buy_fee = self.calculate_fee(investment)

        # 売り手数料（同額と想定）
        sell_fee = self.calculate_fee(investment)

        # 総コスト
        total_cost = buy_fee + sell_fee

        # 損益分岐点価格
        break_even_price = entry_price + (total_cost / shares)

        # 必要リターン率
        required_return = (break_even_price - entry_price) / entry_price

        return {
            "break_even_price": break_even_price,
            "required_return": required_return,
            "buy_fee": buy_fee,
            "sell_fee": sell_fee,
            "total_cost": total_cost,
        }

    def should_take_profit(self, position: Dict, current_price: float) -> Tuple[bool, str]:
        """
        利確すべきか判断（手数料考慮）

        Args:
            position: ポジション情報 {
                "entry_price": 取得単価,
                "shares": 株数,
                "investment": 投資額
            }
            current_price: 現在価格

        Returns:
            (should_sell, reason)
        """
        entry_price = position["entry_price"]
        shares = position["shares"]
        investment = position["investment"]

        # 含み益
        gross_profit = (current_price - entry_price) * shares

        # 売却時の手数料
        sell_fee = self.calculate_fee(current_price * shares)

        # 純利益
        net_profit = gross_profit - sell_fee
        net_return = net_profit / investment if investment > 0 else 0

        # 判断基準
        if net_return > 0.05:  # 純利益5%以上
            return True, f"利確推奨（純利益: {net_return:.2%}）"
        elif net_return > 0.03:  # 純利益3%以上
            return True, f"利確可（純利益: {net_return:.2%}）"
        elif gross_profit > 0 and net_profit < 0:  # 含み益あるが手数料負け
            return (
                False,
                f"手数料負けのため保留（含み益: {gross_profit:,.0f}円, 手数料: {sell_fee:,.0f}円）",
            )
        else:
            return False, f"継続保有（純利益: {net_return:.2%}）"

    def optimize_order_size(self, signal: Dict, available_capital: float) -> Dict:
        """
        手数料を考慮した最適な取引株数を計算

        Args:
            signal: シグナル情報 {"price": 現在価格}
            available_capital: 利用可能資金

        Returns:
            Dict {
                "recommended_shares": 推奨株数,
                "investment": 投資額,
                "fee": 手数料,
                "fee_rate": 手数料率,
                "reason": 理由
            }
        """
        price = signal["price"]

        # 手数料率が下がる金額帯（松井証券は50万円まで無料）
        if self.broker == "matsui":
            optimal_amounts = [490000, 990000, 1990000]
        else:
            # SBI/楽天は手数料率が下がるポイント
            optimal_amounts = [95000, 195000, 495000, 995000, 2990000]

        best_option = None

        for target_amount in optimal_amounts:
            if target_amount <= available_capital:
                # この金額で買える株数
                shares = int(target_amount / price)

                if shares > 0:
                    # 100株単位に調整（単元株の場合）
                    if shares >= 100:
                        shares = (shares // 100) * 100

                    actual_investment = shares * price
                    fee = self.calculate_fee(actual_investment)
                    fee_rate = fee / actual_investment if actual_investment > 0 else 0

                    if best_option is None or fee_rate < best_option["fee_rate"]:
                        best_option = {
                            "recommended_shares": shares,
                            "investment": actual_investment,
                            "fee": fee,
                            "fee_rate": fee_rate,
                            "reason": f"手数料率 {fee_rate:.3%} に最適化",
                        }

        # オプションがない場合は最小単位
        if best_option is None:
            shares = int(available_capital / price)
            if shares >= 100:
                shares = (shares // 100) * 100
            elif shares > 0:
                shares = 1  # 単元未満株
            else:
                shares = 0

            actual_investment = shares * price
            fee = self.calculate_fee(actual_investment) if shares > 0 else 0
            fee_rate = fee / actual_investment if actual_investment > 0 else 0

            best_option = {
                "recommended_shares": shares,
                "investment": actual_investment,
                "fee": fee,
                "fee_rate": fee_rate,
                "reason": "資金に基づく最大購入可能数",
            }

        return best_option

    def compare_brokers(self, amount: float) -> pd.DataFrame:
        """
        証券会社間で手数料を比較

        Args:
            amount: 取引金額

        Returns:
            比較表DataFrame
        """
        comparisons = []

        for broker_name, config in self.BROKER_FEES.items():
            temp_optimizer = CostOptimizer(broker_name)
            fee = temp_optimizer.calculate_fee(amount)
            fee_rate = fee / amount if amount > 0 else 0

            comparisons.append(
                {
                    "証券会社": config["name"],
                    "手数料（円）": f"¥{fee:,.0f}",
                    "手数料率": f"{fee_rate:.3%}",
                    "往復手数料": f"¥{fee * 2:,.0f}",
                }
            )

        df = pd.DataFrame(comparisons)
        return df.sort_values("手数料率")

    def get_fee_saving_tips(self) -> list:
        """
        手数料節約のアドバイス

        Returns:
            アドバイスリスト
        """
        tips = [
            "💡 松井証券: 50万円まで手数料無料（最もお得）",
            "💡 まとめ買い: 細かく分けずに1度にまとめて購入",
            "💡 長期保有: 頻繁な売買を避け、手数料を削減",
            "💡 単元株: 100株単位の方が手数料率が低い",
            "💡 手数料率の確認: 購入前に必ず確認",
            f"💡 現在の証券会社: {self.broker_config['name']}",
        ]

        return tips


def main():
    """使用例"""
    print("=" * 60)
    print("手数料最適化エンジン デモ")
    print("=" * 60)
    print()

    # SBI証券で最適化
    optimizer = CostOptimizer("sbi")

    # 例: トヨタ株（7203.T）を買いたい
    signal = {"price": 2500}  # 2500円/株
    available_capital = 500000  # 50万円

    print("■ 最適な注文サイズの計算")
    print(f"銘柄価格: ¥{signal['price']:,}/株")
    print(f"利用可能資金: ¥{available_capital:,}")
    print()

    optimal = optimizer.optimize_order_size(signal, available_capital)
    print(f"推奨株数: {optimal['recommended_shares']}株")
    print(f"投資額: ¥{optimal['investment']:,.0f}")
    print(f"手数料: ¥{optimal['fee']:,.0f} ({optimal['fee_rate']:.3%})")
    print(f"理由: {optimal['reason']}")
    print()

    # 損益分岐点
    print("=" * 60)
    print("■ 損益分岐点の計算")
    print()

    entry_price = 2500
    shares = optimal["recommended_shares"]

    break_even = optimizer.calculate_break_even(entry_price, shares)
    print(f"取得単価: ¥{entry_price:,}/株")
    print(f"株数: {shares}株")
    print(f"買い手数料: ¥{break_even['buy_fee']:,.0f}")
    print(f"売り手数料（想定）: ¥{break_even['sell_fee']:,.0f}")
    print(f"総コスト: ¥{break_even['total_cost']:,.0f}")
    print(f"損益分岐点価格: ¥{break_even['break_even_price']:,.2f}/株")
    print(f"必要リターン: {break_even['required_return']:.3%}")
    print()

    # 証券会社比較
    print("=" * 60)
    print("■ 証券会社の手数料比較")
    print()

    comparison = optimizer.compare_brokers(optimal["investment"])
    print(comparison.to_string(index=False))
    print()

    # アドバイス
    print("=" * 60)
    print("■ 手数料節約のコツ")
    print()

    for tip in optimizer.get_fee_saving_tips():
        print(tip)


if __name__ == "__main__":
    main()
