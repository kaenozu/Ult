#!/usr/bin/env python3
"""
Yuutai (Shareholder Benefits) Strategy System
日本株優待戦略システム
"""

import asyncio
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json
import logging
from pathlib import Path

from .japan_stock_data import JapanStockDataCollector, YuutaiInfo, JapanStockData


@dataclass
class YuutaiStrategy:
    """優待戦略"""

    strategy_name: str
    description: str
    min_dividend_yield: float
    max_pe_ratio: float
    min_yuutai_value: float
    max_holding_period: int
    risk_tolerance: str  # "conservative", "moderate", "aggressive"


@dataclass
class YuutaiScore:
    """優待スコア"""

    symbol: str
    company_name: str
    current_price: float
    yuutai_value: float
    yuutai_yield: float  # 優待利回り
    dividend_yield: float
    pe_ratio: float
    required_shares: int
    total_investment: float
    annual_return: float
    risk_score: float
    recommendation: str  # "Strong Buy", "Buy", "Hold", "Sell"


class YuutaiStrategySystem:
    """優待戦略システム"""

    def __init__(self, config_path: str = "config/yuutai_strategy.json"):
        self.config = self._load_config(config_path)
        self.logger = self._setup_logger()
        self.data_collector = JapanStockDataCollector()
        self.strategies = self._init_strategies()

    def _load_config(self, config_path: str) -> Dict:
        """設定ファイル読み込み"""
        default_config = {
            "strategies": {
                "conservative": {
                    "min_dividend_yield": 2.0,
                    "max_pe_ratio": 15.0,
                    "min_yuutai_value": 2000,
                    "max_holding_period": 12,
                },
                "moderate": {
                    "min_dividend_yield": 1.5,
                    "max_pe_ratio": 20.0,
                    "min_yuutai_value": 1500,
                    "max_holding_period": 18,
                },
                "aggressive": {
                    "min_dividend_yield": 1.0,
                    "max_pe_ratio": 25.0,
                    "min_yuutai_value": 1000,
                    "max_holding_period": 24,
                },
            },
            "risk_weights": {
                "price_volatility": 0.3,
                "sector_stability": 0.2,
                "dividend_consistency": 0.3,
                "yuutai_reliability": 0.2,
            },
            "filters": {
                "min_market_cap": 1000000000,  # 100億円
                "exclude_sectors": ["不動産", "建設業"],
                "min_trading_volume": 10000,
            },
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
        logger = logging.getLogger("yuutai_strategy")
        logger.setLevel(logging.INFO)

        handler = logging.FileHandler("logs/yuutai_strategy.log", encoding="utf-8")
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def _init_strategies(self) -> Dict[str, YuutaiStrategy]:
        """戦略初期化"""
        strategies = {}

        for strategy_name, config in self.config["strategies"].items():
            strategies[strategy_name] = YuutaiStrategy(
                strategy_name=strategy_name,
                description=self._get_strategy_description(strategy_name),
                min_dividend_yield=config["min_dividend_yield"],
                max_pe_ratio=config["max_pe_ratio"],
                min_yuutai_value=config["min_yuutai_value"],
                max_holding_period=config["max_holding_period"],
                risk_tolerance=strategy_name,
            )

        return strategies

    def _get_strategy_description(self, strategy_name: str) -> str:
        """戦略説明取得"""
        descriptions = {
            "conservative": "安定重視の優待戦略。配当利回り2%以上、PER15倍以下",
            "moderate": "バランス型優待戦略。配当利回り1.5%以上、PER20倍以下",
            "aggressive": "成長重視の優待戦略。配当利回り1%以上、PER25倍以下",
        }
        return descriptions.get(strategy_name, "カスタム優待戦略")

    async def analyze_yuutai_opportunities(self, strategy: str = "moderate") -> List[YuutaiScore]:
        """優待機会分析"""
        if strategy not in self.strategies:
            raise ValueError(f"Unknown strategy: {strategy}")

        # 優待銘柄リスト取得
        yuutai_list = await self.data_collector.get_yuutai_list()

        # 各銘柄のスコア計算
        scores = []
        for yuutai in yuutai_list:
            try:
                score = await self._calculate_yuutai_score(yuutai, strategy)
                if score:
                    scores.append(score)
            except Exception as e:
                self.logger.error(f"Error analyzing {yuutai.symbol}: {e}")

        # スコアでソート
        scores.sort(key=lambda x: x.annual_return, reverse=True)

        self.logger.info(f"Analyzed {len(scores)} yuutai opportunities with {strategy} strategy")
        return scores

    async def _calculate_yuutai_score(self, yuutai: YuutaiInfo, strategy: str) -> Optional[YuutaiScore]:
        """優待スコア計算"""
        strategy_config = self.strategies[strategy]

        # 株価データ取得
        quotes = await self.data_collector.get_realtime_quotes([yuutai.symbol])
        if not quotes:
            return None

        quote = quotes[0]

        # フィルター適用
        if not self._pass_filters(quote, strategy_config):
            return None

        # 優待利回り計算
        yuutai_yield = (yuutai.estimated_value / quote.price) * 100

        # 総投資額
        total_investment = quote.price * yuutai.required_shares

        # 年間リターン計算
        annual_dividend = quote.price * (quote.dividend_yield / 100) * yuutai.required_shares
        annual_return = ((yuutai.estimated_value + annual_dividend) / total_investment) * 100

        # リスクスコア計算
        risk_score = self._calculate_risk_score(quote, yuutai)

        # レコメンデーション判定
        recommendation = self._get_recommendation(annual_return, risk_score, strategy_config)

        return YuutaiScore(
            symbol=yuutai.symbol,
            company_name=yuutai.company_name,
            current_price=quote.price,
            yuutai_value=yuutai.estimated_value,
            yuutai_yield=yuutai_yield,
            dividend_yield=quote.dividend_yield,
            pe_ratio=quote.pe_ratio,
            required_shares=yuutai.required_shares,
            total_investment=total_investment,
            annual_return=annual_return,
            risk_score=risk_score,
            recommendation=recommendation,
        )

    def _pass_filters(self, quote: JapanStockData, strategy: YuutaiStrategy) -> bool:
        """フィルター適用"""
        # 戦略条件チェック
        if quote.dividend_yield < strategy.min_dividend_yield:
            return False
        if quote.pe_ratio > strategy.max_pe_ratio:
            return False

        # 基本フィルター
        if quote.market_cap < self.config["filters"]["min_market_cap"]:
            return False
        if quote.sector in self.config["filters"]["exclude_sectors"]:
            return False
        if quote.volume < self.config["filters"]["min_trading_volume"]:
            return False

        return True

    def _calculate_risk_score(self, quote: JapanStockData, yuutai: YuutaiInfo) -> float:
        """リスクスコア計算（0-100、低いほど低リスク）"""
        weights = self.config["risk_weights"]

        # 価格変動性（簡易計算）
        volatility_score = min(50, abs(quote.pe_ratio - 15) * 2)

        # セクター安定性
        sector_stability = self._get_sector_stability(quote.sector)

        # 配当一貫性（簡易評価）
        dividend_consistency = 30 if quote.dividend_yield > 2.0 else 60

        # 優待信頼性
        yuutai_reliability = self._get_yuutai_reliability(yuutai)

        # 加重平均
        risk_score = (
            volatility_score * weights["price_volatility"]
            + sector_stability * weights["sector_stability"]
            + dividend_consistency * weights["dividend_consistency"]
            + yuutai_reliability * weights["yuutai_reliability"]
        )

        return min(100, max(0, risk_score))

    def _get_sector_stability(self, sector: str) -> float:
        """セクター安定性スコア"""
        stability_scores = {
            "情報・通信業": 40,
            "電気機器": 35,
            "輸送用機器": 30,
            "医薬品": 25,
            "銀行業": 45,
            "不動産": 60,
            "建設業": 55,
            "小売業": 50,
        }
        return stability_scores.get(sector, 40)

    def _get_yuutai_reliability(self, yuutai: YuutaiInfo) -> float:
        """優待信頼性スコア"""
        reliability_score = 20  # ベーススコア

        # 優待価値が高いほど信頼性が高い傾向
        if yuutai.estimated_value > 5000:
            reliability_score -= 10
        elif yuutai.estimated_value < 1000:
            reliability_score += 20

        # 保有期間が短いほど信頼性が高い
        if yuutai.holding_period <= 6:
            reliability_score -= 10
        elif yuutai.holding_period >= 24:
            reliability_score += 15

        return reliability_score

    def _get_recommendation(self, annual_return: float, risk_score: float, strategy: YuutaiStrategy) -> str:
        """レコメンデーション判定"""
        # リスク調整リターン
        risk_adjusted_return = annual_return / (risk_score / 50)  # リスク50を基準

        if risk_adjusted_return > 15 and risk_score < 40:
            return "Strong Buy"
        elif risk_adjusted_return > 10 and risk_score < 60:
            return "Buy"
        elif risk_adjusted_return > 5 and risk_score < 80:
            return "Hold"
        else:
            return "Sell"

    def generate_portfolio_recommendation(self, scores: List[YuutaiScore], budget: float = 1000000) -> Dict:
        """ポートフォリオ推奨生成"""
        if not scores:
            return {"error": "No yuutai opportunities available"}

        # トップ銘柄選択
        top_scores = [s for s in scores if s.recommendation in ["Strong Buy", "Buy"]][:10]

        if not top_scores:
            return {"error": "No recommended yuutai stocks found"}

        # 予算配分
        portfolio = self._allocate_budget(top_scores, budget)

        # ポートフォリオサマリー
        total_investment = sum(item["investment"] for item in portfolio)
        total_annual_return = sum(item["annual_return_amount"] for item in portfolio)
        avg_yuutai_yield = sum(item["yuutai_yield"] for item in portfolio) / len(portfolio)

        return {
            "portfolio": portfolio,
            "summary": {
                "total_investment": total_investment,
                "total_annual_return": total_annual_return,
                "portfolio_return_rate": (total_annual_return / total_investment) * 100,
                "avg_yuutai_yield": avg_yuutai_yield,
                "diversification_score": self._calculate_diversification_score(portfolio),
                "risk_level": self._assess_portfolio_risk(portfolio),
            },
            "recommendations": self._generate_portfolio_advice(portfolio),
        }

    def _allocate_budget(self, scores: List[YuutaiScore], budget: float) -> List[Dict]:
        """予算配分"""
        portfolio = []
        remaining_budget = budget

        for score in scores:
            if remaining_budget <= 0:
                break

            # 最小投資額計算
            min_investment = score.total_investment

            if min_investment > remaining_budget:
                continue

            # 投資額決定（等配分）
            max_investment = min(min_investment, remaining_budget / len(scores))
            investment = min_investment

            # ポートフォリオアイテム作成
            shares = investment // score.current_price
            annual_return_amount = (score.annual_return / 100) * investment

            portfolio.append(
                {
                    "symbol": score.symbol,
                    "company_name": score.company_name,
                    "investment": investment,
                    "shares": int(shares),
                    "annual_return_rate": score.annual_return,
                    "annual_return_amount": annual_return_amount,
                    "yuutai_yield": score.yuutai_yield,
                    "dividend_yield": score.dividend_yield,
                    "risk_score": score.risk_score,
                    "recommendation": score.recommendation,
                }
            )

            remaining_budget -= investment

        return portfolio

    def _calculate_diversification_score(self, portfolio: List[Dict]) -> float:
        """分散投資スコア計算"""
        if len(portfolio) >= 8:
            return 100
        elif len(portfolio) >= 5:
            return 80
        elif len(portfolio) >= 3:
            return 60
        else:
            return 30

    def _assess_portfolio_risk(self, portfolio: List[Dict]) -> str:
        """ポートフォリオリスク評価"""
        avg_risk = sum(item["risk_score"] for item in portfolio) / len(portfolio)

        if avg_risk < 30:
            return "Low"
        elif avg_risk < 60:
            return "Medium"
        else:
            return "High"

    def _generate_portfolio_advice(self, portfolio: List[Dict]) -> List[str]:
        """ポートフォリオ助言生成"""
        advice = []

        # 分散投資助言
        if len(portfolio) < 5:
            advice.append("より分散投資を推奨します。最低5銘柄以上の投資を検討してください。")

        # リスク助言
        high_risk_count = sum(1 for item in portfolio if item["risk_score"] > 70)
        if high_risk_count > len(portfolio) * 0.3:
            advice.append("高リスク銘柄の割合が高いです。バランスの取れた銘柄構成を検討してください。")

        # 優待利回り助言
        avg_yuutai_yield = sum(item["yuutai_yield"] for item in portfolio) / len(portfolio)
        if avg_yuutai_yield < 3.0:
            advice.append("優待利回りが低めです。より魅力的な優待銘柄の追加を検討してください。")

        return advice

    async def close(self):
        """クリーンアップ"""
        await self.data_collector.close()


# 使用例
async def main():
    """メイン実行関数"""
    strategy_system = YuutaiStrategySystem()

    try:
        # 優待機会分析
        print("🎯 優待機会を分析中...")
        scores = await strategy_system.analyze_yuutai_opportunities("moderate")

        print(f"\n📊 発見された優待機会: {len(scores)}件")
        for score in scores[:5]:  # トップ5表示
            print(f"{score.symbol} {score.company_name}: 年率{score.annual_return:.1f}% ({score.recommendation})")

        # ポートフォリオ推奨
        if scores:
            print("\n💼 ポートフォリオ推奨を作成中...")
            recommendation = strategy_system.generate_portfolio_recommendation(scores, 1000000)

            if "portfolio" in recommendation:
                print(f"推奨ポートフォリオ: {len(recommendation['portfolio'])}銘柄")
                print(f"予想リターン: {recommendation['summary']['portfolio_return_rate']:.1f}%")
                print(f"リスクレベル: {recommendation['summary']['risk_level']}")
            else:
                print(recommendation.get("error", "ポートフォリオ作成エラー"))

    finally:
        await strategy_system.close()


if __name__ == "__main__":
    asyncio.run(main())
