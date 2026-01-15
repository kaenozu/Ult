"""税金最適化モジュール（Tax Loss Harvesting）

年末に向けた損益通算シミュレーション
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

# 日本の株式譲渡益税率
JP_TAX_RATE = 0.20315  # 20.315% (所得税15.315% + 住民税5%)


class HarvestingStrategy(Enum):
    """ハーベスティング戦略"""

    AGGRESSIVE = "aggressive"  # 積極的に損失確定
    BALANCED = "balanced"  # バランス型
    CONSERVATIVE = "conservative"  # 保守的


@dataclass
class TaxLot:
    """税務ロット（購入単位）"""

    ticker: str
    purchase_date: datetime
    quantity: int
    cost_basis: float  # 取得価格
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    holding_days: int
    is_long_term: bool  # 1年以上保有


@dataclass
class HarvestRecommendation:
    """ハーベスティング推奨"""

    ticker: str
    action: str  # "HARVEST_LOSS", "HARVEST_GAIN", "HOLD"
    quantity: int
    current_price: float
    unrealized_pnl: float
    tax_impact: float
    reason: str
    replacement_ticker: Optional[str] = None


class TaxOptimizer:
    """税金最適化クラス"""

    # 米国株のセクターETF代替（Wash Sale Rule対策）
    REPLACEMENT_MAP = {
        # Tech
        "AAPL": "XLK",
        "MSFT": "XLK",
        "GOOGL": "XLC",
        "NVDA": "SMH",
        # Finance
        "JPM": "XLF",
        "BAC": "XLF",
        # Healthcare
        "JNJ": "XLV",
        "PFE": "XLV",
        # 日本株
        "7203.T": "1305.T",  # トヨタ → TOPIX ETF
        "9984.T": "1305.T",  # ソフトバンク → TOPIX ETF
        "6758.T": "1305.T",  # ソニー → TOPIX ETF
    }

    def __init__(
        self,
        strategy: HarvestingStrategy = HarvestingStrategy.BALANCED,
        tax_rate: float = JP_TAX_RATE,
        min_loss_threshold: float = 10000,  # 最小損失確定閾値
        wash_sale_days: int = 30,  # ウォッシュセールルール日数
    ):
        """初期化

        Args:
            strategy: ハーベスティング戦略
            tax_rate: 税率
            min_loss_threshold: 最小損失確定閾値
            wash_sale_days: ウォッシュセールルール日数
        """
        self.strategy = strategy
        self.tax_rate = tax_rate
        self.min_loss_threshold = min_loss_threshold
        self.wash_sale_days = wash_sale_days

    def analyze_portfolio(
        self,
        positions: List[Dict[str, Any]],
        realized_gains_ytd: float = 0,
    ) -> Dict[str, Any]:
        """ポートフォリオの税務分析

        Args:
            positions: ポジションリスト
            realized_gains_ytd: 年初来の実現益

        Returns:
            分析結果
        """
        tax_lots = self._create_tax_lots(positions)

        # 未実現損益の集計
        total_unrealized_gains = sum(lot.unrealized_pnl for lot in tax_lots if lot.unrealized_pnl > 0)
        total_unrealized_losses = sum(lot.unrealized_pnl for lot in tax_lots if lot.unrealized_pnl < 0)

        # 推定税額
        estimated_tax = max(0, realized_gains_ytd + total_unrealized_gains) * self.tax_rate

        # ハーベスティング推奨
        recommendations = self._generate_recommendations(tax_lots, realized_gains_ytd)

        # 税金削減ポテンシャル
        potential_tax_savings = abs(total_unrealized_losses) * self.tax_rate

        return {
            "summary": {
                "realized_gains_ytd": realized_gains_ytd,
                "unrealized_gains": total_unrealized_gains,
                "unrealized_losses": total_unrealized_losses,
                "net_unrealized": total_unrealized_gains + total_unrealized_losses,
                "estimated_tax": estimated_tax,
                "potential_tax_savings": potential_tax_savings,
            },
            "tax_lots": [
                {
                    "ticker": lot.ticker,
                    "quantity": lot.quantity,
                    "cost_basis": lot.cost_basis,
                    "current_price": lot.current_price,
                    "unrealized_pnl": lot.unrealized_pnl,
                    "unrealized_pnl_pct": lot.unrealized_pnl_pct,
                    "holding_days": lot.holding_days,
                    "is_long_term": lot.is_long_term,
                }
                for lot in tax_lots
            ],
            "recommendations": [
                {
                    "ticker": rec.ticker,
                    "action": rec.action,
                    "quantity": rec.quantity,
                    "unrealized_pnl": rec.unrealized_pnl,
                    "tax_impact": rec.tax_impact,
                    "reason": rec.reason,
                    "replacement_ticker": rec.replacement_ticker,
                }
                for rec in recommendations
            ],
            "strategy": self.strategy.value,
            "analysis_date": datetime.now().isoformat(),
        }

    def _create_tax_lots(self, positions: List[Dict[str, Any]]) -> List[TaxLot]:
        """ポジションから税務ロットを作成"""
        tax_lots = []
        now = datetime.now()

        for pos in positions:
            ticker = pos.get("ticker", "")
            quantity = pos.get("quantity", 0)
            cost_basis = pos.get("avg_price", 0) or pos.get("cost_basis", 0)
            current_price = pos.get("current_price", cost_basis)
            purchase_date_str = pos.get("purchase_date")

            if purchase_date_str:
                try:
                    purchase_date = datetime.fromisoformat(purchase_date_str)
                except ValueError:
                    purchase_date = now - pd.Timedelta(days=180)  # デフォルト180日
            else:
                purchase_date = now - pd.Timedelta(days=180)

            holding_days = (now - purchase_date).days
            unrealized_pnl = (current_price - cost_basis) * quantity
            unrealized_pnl_pct = (current_price - cost_basis) / cost_basis * 100 if cost_basis > 0 else 0

            tax_lots.append(
                TaxLot(
                    ticker=ticker,
                    purchase_date=purchase_date,
                    quantity=quantity,
                    cost_basis=cost_basis,
                    current_price=current_price,
                    unrealized_pnl=unrealized_pnl,
                    unrealized_pnl_pct=unrealized_pnl_pct,
                    holding_days=holding_days,
                    is_long_term=holding_days >= 365,
                )
            )

        return tax_lots

    def _generate_recommendations(
        self,
        tax_lots: List[TaxLot],
        realized_gains_ytd: float,
    ) -> List[HarvestRecommendation]:
        """ハーベスティング推奨を生成"""
        recommendations = []

        # 損失ロットを抽出（損失額の大きい順）
        loss_lots = sorted([lot for lot in tax_lots if lot.unrealized_pnl < 0], key=lambda x: x.unrealized_pnl)

        # 利益ロットを抽出
        gain_lots = sorted(
            [lot for lot in tax_lots if lot.unrealized_pnl > 0], key=lambda x: x.unrealized_pnl, reverse=True
        )

        # 戦略に応じた閾値
        if self.strategy == HarvestingStrategy.AGGRESSIVE:
            loss_threshold_pct = -5
            max_harvests = 10
        elif self.strategy == HarvestingStrategy.BALANCED:
            loss_threshold_pct = -10
            max_harvests = 5
        else:  # CONSERVATIVE
            loss_threshold_pct = -20
            max_harvests = 3

        # 損失確定推奨
        harvested_count = 0
        for lot in loss_lots:
            if harvested_count >= max_harvests:
                break

            if lot.unrealized_pnl_pct > loss_threshold_pct:
                continue

            if abs(lot.unrealized_pnl) < self.min_loss_threshold:
                continue

            tax_impact = lot.unrealized_pnl * self.tax_rate
            replacement = self.REPLACEMENT_MAP.get(lot.ticker)

            recommendations.append(
                HarvestRecommendation(
                    ticker=lot.ticker,
                    action="HARVEST_LOSS",
                    quantity=lot.quantity,
                    current_price=lot.current_price,
                    unrealized_pnl=lot.unrealized_pnl,
                    tax_impact=tax_impact,
                    reason=f"{lot.unrealized_pnl_pct:.1f}%の損失。税金削減効果: ¥{abs(tax_impact):,.0f}",
                    replacement_ticker=replacement,
                )
            )
            harvested_count += 1

        # 利益確定推奨（実現損失がある場合）
        if realized_gains_ytd < 0:
            for lot in gain_lots:
                if lot.unrealized_pnl <= abs(realized_gains_ytd):
                    tax_impact = lot.unrealized_pnl * self.tax_rate
                    recommendations.append(
                        HarvestRecommendation(
                            ticker=lot.ticker,
                            action="HARVEST_GAIN",
                            quantity=lot.quantity,
                            current_price=lot.current_price,
                            unrealized_pnl=lot.unrealized_pnl,
                            tax_impact=tax_impact,
                            reason="実現損失と相殺可能。実質税金: ¥0",
                        )
                    )
                    break

        return recommendations

    def simulate_harvest(
        self,
        ticker: str,
        quantity: int,
        current_price: float,
        cost_basis: float,
        realized_gains_ytd: float,
    ) -> Dict[str, Any]:
        """ハーベスティングのシミュレーション

        Args:
            ticker: 銘柄
            quantity: 株数
            current_price: 現在価格
            cost_basis: 取得価格
            realized_gains_ytd: 年初来の実現益

        Returns:
            シミュレーション結果
        """
        pnl = (current_price - cost_basis) * quantity

        # ハーベスト前の税金
        tax_before = max(0, realized_gains_ytd) * self.tax_rate

        # ハーベスト後の税金
        new_realized = realized_gains_ytd + pnl
        tax_after = max(0, new_realized) * self.tax_rate

        # 税金削減効果
        tax_savings = tax_before - tax_after

        return {
            "ticker": ticker,
            "quantity": quantity,
            "pnl": pnl,
            "realized_gains_before": realized_gains_ytd,
            "realized_gains_after": new_realized,
            "tax_before": tax_before,
            "tax_after": tax_after,
            "tax_savings": tax_savings,
            "replacement_ticker": self.REPLACEMENT_MAP.get(ticker),
            "wash_sale_end_date": (datetime.now() + pd.Timedelta(days=self.wash_sale_days)).strftime("%Y-%m-%d"),
        }

    def get_year_end_summary(self, positions: List[Dict]) -> Dict[str, Any]:
        """年末税務サマリーを生成"""
        now = datetime.now()
        days_until_year_end = (datetime(now.year, 12, 31) - now).days

        analysis = self.analyze_portfolio(positions)

        return {
            "days_until_year_end": days_until_year_end,
            "urgency": "HIGH" if days_until_year_end <= 30 else "MEDIUM" if days_until_year_end <= 60 else "LOW",
            **analysis,
        }


# シングルトン
_optimizer: Optional[TaxOptimizer] = None


def get_tax_optimizer(strategy: HarvestingStrategy = HarvestingStrategy.BALANCED) -> TaxOptimizer:
    """シングルトンインスタンスを取得"""
    global _optimizer
    if _optimizer is None:
        _optimizer = TaxOptimizer(strategy=strategy)
    return _optimizer
