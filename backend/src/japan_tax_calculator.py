#!/usr/bin/env python3
"""
Japanese Tax Calculation System
日本税金計算システム
"""

import asyncio
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import json
import logging
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP


@dataclass
class TaxTransaction:
    """税金計算用取引"""

    symbol: str
    transaction_type: str  # "buy", "sell", "dividend"
    date: datetime
    quantity: int
    price: float
    commission: float = 0.0
    tax_withheld: float = 0.0  # 源泉徴収税額


@dataclass
class TaxPosition:
    """税務上の建玉"""

    symbol: str
    quantity: int
    avg_purchase_price: float
    total_purchase_cost: float
    commission: float


@dataclass
class TaxResult:
    """税金計算結果"""

    fiscal_year: str

    # 損益計算
    total_gains: float = 0.0
    total_losses: float = 0.0
    net_gains: float = 0.0

    # 税金計算
    taxable_income: float = 0.0
    income_tax: float = 0.0
    residence_tax: float = 0.0
    total_tax: float = 0.0

    # NISA関連
    nisa_gains: float = 0.0
    nisa_losses: float = 0.0
    taxable_nisa_gains: float = 0.0

    # 特定口座
    specific_gains: float = 0.0
    specific_losses: float = 0.0
    carried_losses: float = 0.0

    # 配当金
    dividend_income: float = 0.0
    dividend_tax_withheld: float = 0.0
    net_dividend_income: float = 0.0


class JapanTaxCalculator:
    """日本税金計算システム"""

    def __init__(self, config_path: str = "config/japan_tax.json"):
        self.config = self._load_config(config_path)
        self.logger = self._setup_logger()
        self.positions = {}  # 税務上の建玉管理

    def _load_config(self, config_path: str) -> Dict:
        """設定ファイル読み込み"""
        default_config = {
            "tax_rates": {
                "income_tax": {
                    "short_term": 0.153,  # 短期譲渡所得 15.315%
                    "long_term": 0.153,  # 長期譲渡所得 15.315%
                },
                "residence_tax": {
                    "short_term": 0.05,  # 住民税 5%
                    "long_term": 0.05,
                },
                "dividend": {
                    "withholding_rate": 0.20315,  # 源泉徴収税率 20.315%
                    "comprehensive_rate": 0.20,  # 総合課税率 20%
                },
            },
            "deductions": {
                "basic_deduction": 480000,  # 基礎控除
                "spouse_deduction": 380000,  # 配偶者控除
                "dependent_deduction": 380000,  # 扶養控除
                "social_insurance": 0.145,  # 社会保険料率
            },
            "nisa": {
                "general_limit": 1200000,  # 一般NISA 年間投資枠
                "growth_limit": 2400000,  # つみたてNISA 年間投資枠
                "non_taxable_years": 5,  # 非課税期間（年）
                "total_limit": 6000000,  # 総投資枠
            },
            "carried_losses": {"carry_forward_years": 3},  # 損失繰越期間（年）
        }

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                user_config = json.load(f)
                return {**default_config, **user_config}
        except FileNotFoundError:
            Path(config_path).parent.mkdir(exist_ok=True)
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            return default_config

    def _setup_logger(self) -> logging.Logger:
        """ロガー設定"""
        logger = logging.getLogger("japan_tax_calculator")
        logger.setLevel(logging.INFO)

        handler = logging.FileHandler("logs/japan_tax.log", encoding="utf-8")
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def add_transaction(self, transaction: TaxTransaction):
        """取引追加"""
        if transaction.transaction_type == "buy":
            self._process_buy_transaction(transaction)
        elif transaction.transaction_type == "sell":
            self._process_sell_transaction(transaction)
        elif transaction.transaction_type == "dividend":
            self._process_dividend_transaction(transaction)

        self.logger.info(f"Added {transaction.transaction_type} transaction for {transaction.symbol}")

    def _process_buy_transaction(self, transaction: TaxTransaction):
        """買付取引処理"""
        if transaction.symbol not in self.positions:
            self.positions[transaction.symbol] = TaxPosition(
                symbol=transaction.symbol,
                quantity=0,
                avg_purchase_price=0.0,
                total_purchase_cost=0.0,
                commission=0.0,
            )

        position = self.positions[transaction.symbol]

        # 平均買付価格計算（加重平均）
        new_cost = transaction.quantity * transaction.price + transaction.commission
        total_cost = position.total_purchase_cost + new_cost
        total_quantity = position.quantity + transaction.quantity

        position.quantity = total_quantity
        position.total_purchase_cost = total_cost
        position.avg_purchase_price = total_cost / total_quantity if total_quantity > 0 else 0.0
        position.commission += transaction.commission

    def _process_sell_transaction(self, transaction: TaxTransaction):
        """売付取引処理"""
        if transaction.symbol not in self.positions:
            self.logger.warning(f"No position found for {transaction.symbol}")
            return

        position = self.positions[transaction.symbol]

        if transaction.quantity > position.quantity:
            self.logger.error(f"Sell quantity exceeds position for {transaction.symbol}")
            return

        # 売却損益計算
        sale_proceeds = transaction.quantity * transaction.price - transaction.commission
        cost_basis = transaction.quantity * position.avg_purchase_price
        gain_loss = sale_proceeds - cost_basis

        # 建玉更新
        position.quantity -= transaction.quantity
        position.total_purchase_cost -= transaction.quantity * position.avg_purchase_price

        if position.quantity == 0:
            # ポジションクリア
            position.avg_purchase_price = 0.0
            position.total_purchase_cost = 0.0

        return gain_loss

    def _process_dividend_transaction(self, transaction: TaxTransaction):
        """配当金取引処理"""
        # 配当金はそのまま記録
        dividend_amount = transaction.quantity * transaction.price - transaction.tax_withheld

        self.logger.info(f"Dividend received for {transaction.symbol}: {dividend_amount:.2f}")
        return dividend_amount

    def calculate_annual_tax(self, fiscal_year: str, user_info: Optional[Dict] = None) -> TaxResult:
        """年間税金計算"""
        result = TaxResult(fiscal_year=fiscal_year)

        # ユーザー情報のデフォルト設定
        default_user_info = {
            "income": 5000000,  # 年収
            "marriage": False,  # 既婚
            "dependents": 0,  # 扶養家族数
            "social_insurance": True,  # 社会保険加入
        }

        if user_info:
            default_user_info.update(user_info)

        # 譲渡所得計算
        capital_gains = self._calculate_capital_gains(fiscal_year)

        result.total_gains = capital_gains["total_gains"]
        result.total_losses = abs(capital_gains["total_losses"])
        result.net_gains = capital_gains["net_gains"]

        # 配当所得計算
        dividend_income = self._calculate_dividend_income(fiscal_year)

        result.dividend_income = dividend_income["gross_income"]
        result.dividend_tax_withheld = dividend_income["tax_withheld"]
        result.net_dividend_income = dividend_income["net_income"]

        # 税金計算
        taxable_income = result.net_gains + result.net_dividend_income

        result.income_tax = self._calculate_income_tax(taxable_income, default_user_info)
        result.residence_tax = self._calculate_residence_tax(taxable_income)
        result.total_tax = result.income_tax + result.residence_tax

        return result

    def _calculate_capital_gains(self, fiscal_year: str) -> Dict:
        """譲渡所得計算"""
        gains = 0.0
        losses = 0.0

        # 年間の売買取引から損益を計算
        # ここでは簡易版として仮の値を使用
        # 実際には取引履歴から計算する必要がある

        return {
            "total_gains": gains,
            "total_losses": losses,
            "net_gains": gains - losses,
        }

    def _calculate_dividend_income(self, fiscal_year: str) -> Dict:
        """配当所得計算"""
        # 年間の配当金から所得を計算
        # ここでは簡易版として仮の値を使用

        gross_income = 50000.0  # 総配当金
        tax_withheld = gross_income * self.config["tax_rates"]["dividend"]["withholding_rate"]
        net_income = gross_income - tax_withheld

        return {
            "gross_income": gross_income,
            "tax_withheld": tax_withheld,
            "net_income": net_income,
        }

    def _calculate_income_tax(self, taxable_income: float, user_info: Dict) -> float:
        """所得税計算"""
        # 税率表（2023年時点）
        tax_brackets = [
            (1950000, 0.05),  # 195万円以下 5%
            (3300000, 0.10),  # 330万円以下 10%
            (6950000, 0.20),  # 695万円以下 20%
            (9000000, 0.23),  # 900万円以下 23%
            (18000000, 0.33),  # 1800万円以下 33%
            (40000000, 0.40),  # 4000万円以下 40%
            (float("inf"), 0.45),  # 4000万円超 45%
        ]

        # 控除額計算
        deductions = self._calculate_deductions(user_info)

        # 課税所得
        taxable_base = max(0, taxable_income - deductions)

        # 税額計算
        tax = 0.0
        remaining_income = taxable_base

        for limit, rate in tax_brackets:
            if remaining_income <= 0:
                break

            if taxable_base <= limit:
                tax += remaining_income * rate
                break
            else:
                if limit == float("inf"):
                    tax += remaining_income * rate
                else:
                    taxable_in_bracket = min(remaining_income, limit)
                    tax += taxable_in_bracket * rate
                    remaining_income -= taxable_in_bracket

        # 譲渡所得の税率（申告分離課税）
        if taxable_income > 0:
            capital_gains_tax = taxable_income * self.config["tax_rates"]["income_tax"]["short_term"]
            tax += capital_gains_tax

        return round(tax, 0)

    def _calculate_residence_tax(self, taxable_income: float) -> float:
        """住民税計算"""
        # 譲渡所得の住民税率
        if taxable_income > 0:
            capital_gains_residence_tax = taxable_income * self.config["tax_rates"]["residence_tax"]["short_term"]
            return round(capital_gains_residence_tax, 0)

        return 0.0

    def _calculate_deductions(self, user_info: Dict) -> float:
        """控除額計算"""
        deductions = 0.0

        # 基礎控除
        deductions += self.config["deductions"]["basic_deduction"]

        # 配偶者控除
        if user_info["marriage"]:
            deductions += self.config["deductions"]["spouse_deduction"]

        # 扶養控除
        deductions += user_info["dependents"] * self.config["deductions"]["dependent_deduction"]

        # 社会保険料
        if user_info["social_insurance"]:
            deductions += user_info["income"] * self.config["deductions"]["social_insurance"]

        return deductions

    def simulate_nisa_investment(self, monthly_amount: float, expected_return: float, years: int) -> Dict:
        """NISA投資シミュレーション"""
        nisa_config = self.config["nisa"]
        annual_investment = monthly_amount * 12

        # 年間投資枠チェック
        max_annual_investment = min(annual_investment, nisa_config["general_limit"])

        # 非課税期間中の成長シミュレーション
        total_investment = 0.0
        final_value = 0.0
        tax_savings = 0.0

        yearly_values = []

        for year in range(years):
            # 投資
            yearly_investment = min(max_annual_investment, nisa_config["general_limit"])
            total_investment += yearly_investment

            # 成長
            current_value = yearly_investment * (
                (1 + expected_return) ** min(year + 1, nisa_config["non_taxable_years"])
            )

            # 税金節約額計算
            if year < nisa_config["non_taxable_years"]:
                gains = current_value - yearly_investment
                if gains > 0:
                    tax_rate = (
                        self.config["tax_rates"]["income_tax"]["short_term"]
                        + self.config["tax_rates"]["residence_tax"]["short_term"]
                    )
                    tax_savings += gains * tax_rate

            final_value += current_value
            yearly_values.append(
                {
                    "year": year + 1,
                    "investment": yearly_investment,
                    "value": current_value,
                    "tax_savings": tax_savings if year < nisa_config["non_taxable_years"] else 0,
                }
            )

        total_gains = final_value - total_investment
        tax_savings_total = yearly_values[-1]["tax_savings"] if yearly_values else 0.0

        return {
            "total_investment": total_investment,
            "final_value": final_value,
            "total_gains": total_gains,
            "tax_savings": tax_savings_total,
            "effective_return": (total_gains / total_investment * 100) if total_investment > 0 else 0,
            "yearly_breakdown": yearly_values,
        }

    def generate_tax_report(self, fiscal_year: str, result: TaxResult) -> str:
        """税務報告書生成"""
        report = f"""
# 日本株式投資 税務報告書 {fiscal_year}

## 概要
- 課税年度: {fiscal_year}
- 総損益: {result.net_gains:,.0f}円
- 配当所得: {result.net_dividend_income:,.0f}円
- 合計税額: {result.total_tax:,.0f}円

## 損益詳細
- 売却益: {result.total_gains:,.0f}円
- 売却損: {result.total_losses:,.0f}円
- 純損益: {result.net_gains:,.0f}円

## 配当金詳細
- 総配当金: {result.dividend_income:,.0f}円
- 源泉徴収税: {result.dividend_tax_withheld:,.0f}円
- 手取配当金: {result.net_dividend_income:,.0f}円

## 税金内訳
- 所得税: {result.income_tax:,.0f}円
- 住民税: {result.residence_tax:,.0f}円
- 合計税額: {result.total_tax:,.0f}円

## 確定申告情報
- 申告分離課税: {result.net_gains:,.0f}円
- 配当金課税方式: 源泉徴収選択
- 申告期限: 翌年3月15日

## NISA活用提案
一般NISAとつみたてNISAの併用により、年間最大360万円の非課税投資が可能です。
詳細は証券会社のNISA窓口にてご確認ください。

## 注意事項
本計算はあくまで概算です。実際の税務計算は税理士または税務署にご相談ください。
"""

        return report

    def export_tax_data(self, fiscal_year: str, result: TaxResult) -> pd.DataFrame:
        """税務データエクスポート"""
        data = {
            "項目": [
                "売却益",
                "売却損",
                "純損益",
                "総配当金",
                "源泉徴収税",
                "手取配当金",
                "所得税",
                "住民税",
                "合計税額",
            ],
            "金額（円）": [
                result.total_gains,
                result.total_losses,
                result.net_gains,
                result.dividend_income,
                result.dividend_tax_withheld,
                result.net_dividend_income,
                result.income_tax,
                result.residence_tax,
                result.total_tax,
            ],
            "備考": [
                "申告分離課税対象",
                "繰越可能",
                "課税対象",
                "総合課税または源泉徴収選択",
                "源泉徴収",
                "手取金額",
                "申告分離課税",
                "申告分離課税",
                "納税合計額",
            ],
        }

        return pd.DataFrame(data)

    def get_tax_optimization_tips(self, result: TaxResult) -> List[str]:
        """税金最適化提案"""
        tips = []

        # 損益の状況に基づく提案
        if result.net_gains > 1000000:
            tips.append("高額な利益が出ています。NISA枠の活用を検討してください。")

        if result.total_losses > 0:
            tips.append("損失が発生しています。翌年以降に繰り越すことができます。")

        # 配当金に関する提案
        if result.dividend_income > 200000:
            tips.append("配当収入が高額です。総合課税と申告分離課税の有利判定を行ってください。")

        # NISA活用提案
        tips.extend(
            [
                "NISA枠を最大限活用することで税金を最適化できます。",
                "つみたてNISAは長期分散投資に最適です。",
                "一般NISAとつみたてNISAの併用も検討してください。",
            ]
        )

        return tips


# 使用例
def main():
    """メイン実行関数"""
    tax_calculator = JapanTaxCalculator()

    # サンプル取引追加
    sample_transactions = [
        TaxTransaction(
            symbol="7203",
            transaction_type="buy",
            date=datetime(2023, 1, 15),
            quantity=100,
            price=2500.0,
            commission=1000.0,
        ),
        TaxTransaction(
            symbol="7203",
            transaction_type="sell",
            date=datetime(2023, 6, 20),
            quantity=50,
            price=2800.0,
            commission=800.0,
        ),
        TaxTransaction(
            symbol="6758",
            transaction_type="dividend",
            date=datetime(2023, 3, 31),
            quantity=100,
            price=50.0,  # 1株あたり配当金
            tax_withheld=203.15,
        ),
    ]

    for transaction in sample_transactions:
        tax_calculator.add_transaction(transaction)

    # 年間税金計算
    user_info = {
        "income": 6000000,
        "marriage": True,
        "dependents": 1,
        "social_insurance": True,
    }

    result = tax_calculator.calculate_annual_tax("2023", user_info)

    print("📊 日本株式投資 税務計算結果")
    print(f"年度: {result.fiscal_year}")
    print(f"純損益: {result.net_gains:,.0f}円")
    print(f"配当所得: {result.net_dividend_income:,.0f}円")
    print(f"所得税: {result.income_tax:,.0f}円")
    print(f"住民税: {result.residence_tax:,.0f}円")
    print(f"合計税額: {result.total_tax:,.0f}円")

    # NISAシミュレーション
    nisa_result = tax_calculator.simulate_nisa_investment(monthly_amount=50000, expected_return=0.05, years=5)

    print(f"\n🎯 NISAシミュレーション結果")
    print(f"総投資額: {nisa_result['total_investment']:,.0f}円")
    print(f"最終評価額: {nisa_result['final_value']:,.0f}円")
    print(f"節税効果: {nisa_result['tax_savings']:,.0f}円")

    # 税務報告書生成
    report = tax_calculator.generate_tax_report("2023", result)
    with open("tax_report_2023.md", "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\n📄 税務報告書を保存しました: tax_report_2023.md")


if __name__ == "__main__":
    main()
