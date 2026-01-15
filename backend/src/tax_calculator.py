"""
Tax Calculator - 税務計算エンジン
損益通算、NISA枠管理、税金シミュレーション
"""

from dataclasses import dataclass
from typing import Dict, List

import pandas as pd


@dataclass
class TaxBracket:
    """税率区分"""

    min_income: float
    max_income: float
    rate: float
    deduction: float


class TaxCalculator:
    """税務計算クラス"""

    # 所得税率（2025年）
    TAX_BRACKETS = [
        TaxBracket(0, 1950000, 0.05, 0),
        TaxBracket(1950000, 3300000, 0.10, 97500),
        TaxBracket(3300000, 6950000, 0.20, 427500),
        TaxBracket(6950000, 9000000, 0.23, 636000),
        TaxBracket(9000000, 18000000, 0.33, 1536000),
        TaxBracket(18000000, 40000000, 0.40, 2796000),
        TaxBracket(40000000, float("inf"), 0.45, 4796000),
    ]

    # 住民税率
    RESIDENT_TAX_RATE = 0.10

    # 復興特別所得税率
    RECONSTRUCTION_TAX_RATE = 0.021

    # 株式譲渡所得税率
    CAPITAL_GAINS_TAX_RATE = 0.15
    CAPITAL_GAINS_RESIDENT_TAX_RATE = 0.05

    def __init__(self):
        pass

    def calculate_capital_gains_tax(self, profit: float, is_nisa: bool = False) -> Dict[str, float]:
        """
        株式譲渡所得税計算

        Args:
            profit: 利益
            is_nisa: NISA口座かどうか

        Returns:
            税金詳細
        """
        if is_nisa or profit <= 0:
            return {
                "profit": profit,
                "income_tax": 0.0,
                "resident_tax": 0.0,
                "reconstruction_tax": 0.0,
                "total_tax": 0.0,
                "net_profit": profit,
            }

        # 所得税
        income_tax = profit * self.CAPITAL_GAINS_TAX_RATE

        # 復興特別所得税
        reconstruction_tax = income_tax * self.RECONSTRUCTION_TAX_RATE

        # 住民税
        resident_tax = profit * self.CAPITAL_GAINS_RESIDENT_TAX_RATE

        # 合計税額
        total_tax = income_tax + reconstruction_tax + resident_tax

        # 税引後利益
        net_profit = profit - total_tax

        return {
            "profit": profit,
            "income_tax": income_tax,
            "resident_tax": resident_tax,
            "reconstruction_tax": reconstruction_tax,
            "total_tax": total_tax,
            "net_profit": net_profit,
            "effective_tax_rate": (total_tax / profit) if profit > 0 else 0,
        }

    def calculate_loss_offset(self, gains: List[float], losses: List[float]) -> Dict[str, float]:
        """
        損益通算計算

        Args:
            gains: 利益のリスト
            losses: 損失のリスト

        Returns:
            通算結果
        """
        total_gains = sum(gains)
        total_losses = abs(sum(losses))

        # 損益通算
        net_profit = total_gains - total_losses

        # 繰越控除可能額（3年間）
        carryforward_loss = max(0, total_losses - total_gains)

        # 税金計算
        tax_info = self.calculate_capital_gains_tax(max(0, net_profit))

        return {
            "total_gains": total_gains,
            "total_losses": -total_losses,
            "net_profit": net_profit,
            "carryforward_loss": carryforward_loss,
            **tax_info,
        }

    def optimize_loss_harvesting(self, positions: pd.DataFrame, target_loss: float = 0.0) -> List[Dict]:
        """
        税務損失収穫の最適化

        Args:
            positions: 保有ポジション
            target_loss: 目標損失額（0の場合は最大化）

        Returns:
            売却推奨リスト
        """
        if positions.empty:
            return []

        # 含み損のポジションを抽出
        positions = positions.copy()
        positions["unrealized_pnl"] = (positions["current_price"] - positions["entry_price"]) * positions["quantity"]

        loss_positions = positions[positions["unrealized_pnl"] < 0].copy()

        if loss_positions.empty:
            return []

        # 損失額でソート（大きい順）
        loss_positions = loss_positions.sort_values("unrealized_pnl")

        recommendations = []
        cumulative_loss = 0.0

        for _, pos in loss_positions.iterrows():
            loss = abs(pos["unrealized_pnl"])

            if target_loss > 0 and cumulative_loss >= target_loss:
                break

            recommendations.append(
                {
                    "ticker": pos["ticker"],
                    "quantity": pos["quantity"],
                    "entry_price": pos["entry_price"],
                    "current_price": pos["current_price"],
                    "unrealized_loss": -loss,
                    "tax_benefit": loss
                    * (
                        self.CAPITAL_GAINS_TAX_RATE
                        + self.CAPITAL_GAINS_RESIDENT_TAX_RATE
                        + self.CAPITAL_GAINS_TAX_RATE * self.RECONSTRUCTION_TAX_RATE
                    ),
                }
            )

            cumulative_loss += loss

        return recommendations

    def calculate_year_end_tax_strategy(self, realized_gains: float, unrealized_positions: pd.DataFrame) -> Dict:
        """
        年末税務戦略計算

        Args:
            realized_gains: 実現利益
            unrealized_positions: 未実現ポジション

        Returns:
            戦略提案
        """
        # 現在の税額
        current_tax = self.calculate_capital_gains_tax(realized_gains)

        # 損失収穫の推奨
        loss_harvest = self.optimize_loss_harvesting(unrealized_positions, target_loss=realized_gains)  # 利益を相殺

        total_harvestable_loss = sum([rec["unrealized_loss"] for rec in loss_harvest])
        total_tax_benefit = sum([rec["tax_benefit"] for rec in loss_harvest])

        # 損失収穫後の税額
        optimized_profit = realized_gains + total_harvestable_loss
        optimized_tax = self.calculate_capital_gains_tax(max(0, optimized_profit))

        return {
            "current_profit": realized_gains,
            "current_tax": current_tax["total_tax"],
            "harvestable_loss": total_harvestable_loss,
            "tax_benefit": total_tax_benefit,
            "optimized_profit": optimized_profit,
            "optimized_tax": optimized_tax["total_tax"],
            "tax_savings": current_tax["total_tax"] - optimized_tax["total_tax"],
            "recommendations": loss_harvest,
        }

    def simulate_tax_scenarios(self, base_profit: float, scenarios: List[Dict]) -> pd.DataFrame:
        """
        税金シミュレーション

        Args:
            base_profit: 基準利益
            scenarios: シナリオリスト [{'name': str, 'additional_profit': float}, ...]

        Returns:
            シミュレーション結果
        """
        results = []

        for scenario in scenarios:
            total_profit = base_profit + scenario.get("additional_profit", 0)
            tax_info = self.calculate_capital_gains_tax(total_profit)

            results.append(
                {
                    "scenario": scenario.get("name", "Unknown"),
                    "profit": total_profit,
                    "total_tax": tax_info["total_tax"],
                    "net_profit": tax_info["net_profit"],
                    "effective_rate": tax_info["effective_tax_rate"],
                }
            )

        return pd.DataFrame(results)


if __name__ == "__main__":
    # テスト
    calc = TaxCalculator()

    # 譲渡所得税計算
    tax = calc.calculate_capital_gains_tax(1000000)
    print(f"利益: ¥{tax['profit']:,.0f}")
    print(f"税金: ¥{tax['total_tax']:,.0f}")
    print(f"税引後: ¥{tax['net_profit']:,.0f}")
    print(f"実効税率: {tax['effective_tax_rate']:.2%}")

    # 損益通算
    offset = calc.calculate_loss_offset(gains=[500000, 300000], losses=[-200000, -100000])
    print("\n損益通算:")
    print(f"純利益: ¥{offset['net_profit']:,.0f}")
    print(f"税金: ¥{offset['total_tax']:,.0f}")

    # 損失収穫
    positions = pd.DataFrame(
        {
            "ticker": ["7203.T", "9984.T", "6758.T"],
            "quantity": [100, 50, 200],
            "entry_price": [1500, 3000, 2000],
            "current_price": [1400, 2800, 1900],
        }
    )

    harvest = calc.optimize_loss_harvesting(positions)
    print(f"\n損失収穫推奨: {len(harvest)}件")
    for rec in harvest:
        print(f"  {rec['ticker']}: 損失¥{rec['unrealized_loss']:,.0f}, 節税¥{rec['tax_benefit']:,.0f}")
