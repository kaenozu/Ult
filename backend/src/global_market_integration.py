#!/usr/bin/env python3
"""
Global Market Integration System
24時間世界市場監視と為差・コモディティ統合
"""

import asyncio
import aiohttp
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import pytz
import time


# 市場タイムゾーン
class MarketTimezone(Enum):
    NEW_YORK = "America/New_York"
    LONDON = "Europe/London"
    TOKYO = "Asia/Tokyo"
    HONG_KONG = "Asia/Hong_Kong"
    SYDNEY = "Australia/Sydney"


# 市場ステータス
class MarketStatus(Enum):
    OPEN = "open"
    CLOSED = "closed"
    PRE_MARKET = "pre_market"
    AFTER_HOURS = "after_hours"


@dataclass
class MarketInfo:
    """市場情報"""

    name: str
    timezone: str
    open_time: str  # "09:30"
    close_time: str  # "16:00"
    currency: str
    current_status: MarketStatus
    last_update: datetime


@dataclass
class GlobalAsset:
    """グローバル資産情報"""

    symbol: str
    name: str
    asset_type: str  # "stock", "forex", "commodity", "crypto"
    primary_market: str
    price: float
    change: float
    change_pct: float
    volume: Optional[float]
    market_cap: Optional[float]
    last_update: datetime


@dataclass
class CorrelationData:
    """相関データ"""

    asset1: str
    asset2: str
    correlation: float
    p_value: float
    period_days: int
    last_update: datetime


class GlobalMarketMonitor:
    """グローバル市場監視システム"""

    def __init__(self):
        self.markets = self.initialize_markets()
        self.global_assets = {}
        self.correlations = {}
        self.news_feeds = {}
        self.session = None
        self.monitoring_active = False
        self.update_interval = 60  # 秒

    def initialize_markets(self) -> Dict[str, MarketInfo]:
        """市場情報初期化"""
        return {
            "NYSE": MarketInfo(
                name="New York Stock Exchange",
                timezone="America/New_York",
                open_time="09:30",
                close_time="16:00",
                currency="USD",
                current_status=MarketStatus.CLOSED,
                last_update=datetime.now(),
            ),
            "NASDAQ": MarketInfo(
                name="NASDAQ",
                timezone="America/New_York",
                open_time="09:30",
                close_time="16:00",
                currency="USD",
                current_status=MarketStatus.CLOSED,
                last_update=datetime.now(),
            ),
            "LSE": MarketInfo(
                name="London Stock Exchange",
                timezone="Europe/London",
                open_time="08:00",
                close_time="16:30",
                currency="GBP",
                current_status=MarketStatus.CLOSED,
                last_update=datetime.now(),
            ),
            "TSE": MarketInfo(
                name="Tokyo Stock Exchange",
                timezone="Asia/Tokyo",
                open_time="09:00",
                close_time="15:00",
                currency="JPY",
                current_status=MarketStatus.CLOSED,
                last_update=datetime.now(),
            ),
            "HKEX": MarketInfo(
                name="Hong Kong Stock Exchange",
                timezone="Asia/Hong_Kong",
                open_time="09:30",
                close_time="16:00",
                currency="HKD",
                current_status=MarketStatus.CLOSED,
                last_update=datetime.now(),
            ),
            "ASX": MarketInfo(
                name="Australian Securities Exchange",
                timezone="Australia/Sydney",
                open_time="10:00",
                close_time="16:00",
                currency="AUD",
                current_status=MarketStatus.CLOSED,
                last_update=datetime.now(),
            ),
        }

    async def start_monitoring(self):
        """監視開始"""
        self.monitoring_active = True
        self.session = aiohttp.ClientSession()

        print("グローバル市場監視を開始します...")

        while self.monitoring_active:
            try:
                # 市場ステータス更新
                await self.update_market_statuses()

                # グローバル資産データ更新
                await self.update_global_assets()

                # 相関分析更新
                await self.update_correlations()

                # ニュースフィード更新
                await self.update_news_feeds()

                # 結果表示
                self.display_global_overview()

                # 次の更新まで待機
                await asyncio.sleep(self.update_interval)

            except Exception as e:
                print(f"監視エラー: {e}")
                await asyncio.sleep(10)

    async def stop_monitoring(self):
        """監視停止"""
        self.monitoring_active = False
        if self.session:
            await self.session.close()
        print("グローバル市場監視を停止しました。")

    async def update_market_statuses(self):
        """市場ステータス更新"""
        current_time = datetime.now(pytz.UTC)

        for market_id, market in self.markets.items():
            try:
                # 市場のタイムゾーンで現在時刻を取得
                market_tz = pytz.timezone(market.timezone)
                market_time = current_time.astimezone(market_tz)

                # 営業時間チェック
                open_hour, open_min = map(int, market.open_time.split(":"))
                close_hour, close_min = map(int, market.close_time.split(":"))

                market_open = market_time.replace(hour=open_hour, minute=open_min, second=0, microsecond=0)
                market_close = market_time.replace(hour=close_hour, minute=close_min, second=0, microsecond=0)

                if market_open <= market_time <= market_close:
                    market.current_status = MarketStatus.OPEN
                elif market_time < market_open:
                    market.current_status = MarketStatus.PRE_MARKET
                else:
                    market.current_status = MarketStatus.AFTER_HOURS

                market.last_update = datetime.now()

            except Exception as e:
                print(f"市場 {market_id} ステータス更新エラー: {e}")

    async def update_global_assets(self):
        """グローバル資産データ更新"""
        # 主要株式
        await self.update_stock_assets()

        # 為替
        await self.update_forex_assets()

        # コモディティ
        await self.update_commodity_assets()

        # 暗号資産
        await self.update_crypto_assets()

    async def update_stock_assets(self):
        """株式資産更新"""
        # 主要株式指数
        stock_indices = {
            "SPY": {"name": "S&P 500 ETF", "market": "NYSE"},
            "QQQ": {"name": "NASDAQ 100 ETF", "market": "NASDAQ"},
            "DIA": {"name": "Dow Jones ETF", "market": "NYSE"},
            "EWJ": {"name": "Japan ETF", "market": "TSE"},
            "FXI": {"name": "China ETF", "market": "HKEX"},
            "EWA": {"name": "Australia ETF", "market": "ASX"},
            "EWU": {"name": "UK ETF", "market": "LSE"},
        }

        for symbol, info in stock_indices.items():
            # デモデータ生成（実際はAPIから取得）
            base_price = 100 + hash(symbol) % 200
            change = np.random.normal(0, 2)
            change_pct = (change / base_price) * 100

            self.global_assets[symbol] = GlobalAsset(
                symbol=symbol,
                name=info["name"],
                asset_type="stock",
                primary_market=info["market"],
                price=base_price + change,
                change=change,
                change_pct=change_pct,
                volume=np.random.randint(1000000, 10000000),
                market_cap=base_price * 1000000000,  # デモ値
                last_update=datetime.now(),
            )

    async def update_forex_assets(self):
        """為替資産更新"""
        forex_pairs = {
            "EUR/USD": {"name": "Euro/US Dollar"},
            "GBP/USD": {"name": "British Pound/US Dollar"},
            "USD/JPY": {"name": "US Dollar/Japanese Yen"},
            "USD/CHF": {"name": "US Dollar/Swiss Franc"},
            "AUD/USD": {"name": "Australian Dollar/US Dollar"},
            "USD/CAD": {"name": "US Dollar/Canadian Dollar"},
            "NZD/USD": {"name": "New Zealand Dollar/US Dollar"},
        }

        for pair, info in forex_pairs.items():
            # デモ為替レート
            base_rate = 1.0 + hash(pair) % 100 / 100
            change = np.random.normal(0, 0.01)
            change_pct = (change / base_rate) * 100

            self.global_assets[pair] = GlobalAsset(
                symbol=pair,
                name=info["name"],
                asset_type="forex",
                primary_market="FOREX",
                price=base_rate + change,
                change=change,
                change_pct=change_pct,
                volume=np.random.randint(100000000, 1000000000),
                market_cap=None,
                last_update=datetime.now(),
            )

    async def update_commodity_assets(self):
        """コモディティ資産更新"""
        commodities = {
            "GC=F": {"name": "Gold Futures", "unit": "USD/oz"},
            "SI=F": {"name": "Silver Futures", "unit": "USD/oz"},
            "CL=F": {"name": "Crude Oil Futures", "unit": "USD/barrel"},
            "NG=F": {"name": "Natural Gas Futures", "unit": "USD/MMBtu"},
            "HG=F": {"name": "Copper Futures", "unit": "USD/lb"},
        }

        for symbol, info in commodities.items():
            # デモコモディティ価格
            base_price = 50 + hash(symbol) % 200
            change = np.random.normal(0, 1)
            change_pct = (change / base_price) * 100

            self.global_assets[symbol] = GlobalAsset(
                symbol=symbol,
                name=info["name"],
                asset_type="commodity",
                primary_market="COMEX",
                price=base_price + change,
                change=change,
                change_pct=change_pct,
                volume=np.random.randint(10000, 1000000),
                market_cap=None,
                last_update=datetime.now(),
            )

    async def update_crypto_assets(self):
        """暗号資産更新"""
        cryptocurrencies = {
            "BTC": {"name": "Bitcoin"},
            "ETH": {"name": "Ethereum"},
            "BNB": {"name": "Binance Coin"},
            "SOL": {"name": "Solana"},
            "ADA": {"name": "Cardano"},
            "XRP": {"name": "Ripple"},
            "DOT": {"name": "Polkadot"},
        }

        for symbol, info in cryptocurrencies.items():
            # デモ暗号資産価格
            base_price = 1000 + hash(symbol) % 50000
            change = np.random.normal(0, base_price * 0.05)
            change_pct = (change / base_price) * 100

            self.global_assets[symbol] = GlobalAsset(
                symbol=symbol,
                name=info["name"],
                asset_type="crypto",
                primary_market="CRYPTO",
                price=base_price + change,
                change=change,
                change_pct=change_pct,
                volume=np.random.randint(1000000, 1000000000),
                market_cap=base_price * 19000000,  # デモ時価総額
                last_update=datetime.now(),
            )

    async def update_correlations(self):
        """相関分析更新"""
        # 主要資産の相関を計算
        major_assets = list(self.global_assets.keys())[:10]

        for i, asset1 in enumerate(major_assets):
            for asset2 in major_assets[i + 1 :]:
                if asset1 in self.global_assets and asset2 in self.global_assets:
                    # デモ相関データ（実際はヒストリカルデータから計算）
                    correlation = np.random.uniform(-0.8, 0.8)
                    p_value = np.random.uniform(0.01, 0.5)

                    self.correlations[f"{asset1}-{asset2}"] = CorrelationData(
                        asset1=asset1,
                        asset2=asset2,
                        correlation=correlation,
                        p_value=p_value,
                        period_days=30,
                        last_update=datetime.now(),
                    )

    async def update_news_feeds(self):
        """ニュースフィード更新"""
        # デモニュースデータ
        news_sources = {
            "Bloomberg": [
                {"title": "Fed Signals Rate Pause", "impact": "high", "region": "US"},
                {
                    "title": "Asian Markets Rally on Tech",
                    "impact": "medium",
                    "region": "Asia",
                },
                {"title": "European Stocks Mixed", "impact": "low", "region": "Europe"},
            ],
            "Reuters": [
                {
                    "title": "Oil Prices Surge on Supply",
                    "impact": "high",
                    "region": "Global",
                },
                {
                    "title": "Gold Safe Haven Demand",
                    "impact": "medium",
                    "region": "Global",
                },
                {
                    "title": "Crypto Market Volatility",
                    "impact": "medium",
                    "region": "Global",
                },
            ],
        }

        for source, news_list in news_sources.items():
            self.news_feeds[source] = [
                {
                    **news,
                    "timestamp": datetime.now() - timedelta(minutes=np.random.randint(1, 120)),
                }
                for news in news_list
            ]

    def display_global_overview(self):
        """グローバル概要表示"""
        print("\n" + "=" * 60)
        print("🌍 グローバル市場概要")
        print("=" * 60)

        # 市場ステータス
        print("\n📊 市場ステータス:")
        for market_id, market in self.markets.items():
            status_icon = "🟢" if market.current_status == MarketStatus.OPEN else "🔴"
            print(f"  {status_icon} {market.name}: {market.current_status.value}")

        # 主要資産パフォーマンス
        print("\n💰 主要資産パフォーマンス:")
        asset_types = ["stock", "forex", "commodity", "crypto"]

        for asset_type in asset_types:
            type_assets = [a for a in self.global_assets.values() if a.asset_type == asset_type]
            if type_assets:
                print(f"\n  {asset_type.upper()}:")
                for asset in sorted(type_assets, key=lambda x: abs(x.change_pct), reverse=True)[:3]:
                    change_icon = "📈" if asset.change > 0 else "📉"
                    print(f"    {change_icon} {asset.symbol}: {asset.price:.4f} ({asset.change_pct:+.2f}%)")

        # 高相関ペア
        print("\n🔗 高相関資産:")
        high_correlations = [corr for corr in self.correlations.values() if abs(corr.correlation) > 0.7]

        for corr in sorted(high_correlations, key=lambda x: abs(x.correlation), reverse=True)[:5]:
            print(f"  {corr.asset1} ↔ {corr.asset2}: {corr.correlation:.3f}")

        # 重要ニュース
        print("\n📰 重要ニュース:")
        for source, news_list in self.news_feeds.items():
            high_impact_news = [n for n in news_list if n["impact"] == "high"]
            if high_impact_news:
                print(f"  {source}: {high_impact_news[0]['title']}")

    def get_arbitrage_opportunities(self) -> List[Dict]:
        """裁定機会検出"""
        opportunities = []

        # 為替裁定
        forex_assets = [a for a in self.global_assets.values() if a.asset_type == "forex"]
        for asset in forex_assets:
            if abs(asset.change_pct) > 1.0:  # 1%以上の変動
                opportunities.append(
                    {
                        "type": "forex_arbitrage",
                        "asset": asset.symbol,
                        "potential_return": abs(asset.change_pct) * 0.5,
                        "risk_level": "medium",
                        "reason": f"為替変動が大きい: {asset.change_pct:.2f}%",
                    }
                )

        # 時間差裁定（異なる市場間）
        open_markets = [m for m in self.markets.values() if m.current_status == MarketStatus.OPEN]
        if len(open_markets) > 1:
            opportunities.append(
                {
                    "type": "time_arbitrage",
                    "markets": [m.name for m in open_markets],
                    "potential_return": 0.2,
                    "risk_level": "low",
                    "reason": f"複数市場が開いている: {len(open_markets)}市場",
                }
            )

        return opportunities

    def calculate_global_sentiment(self) -> Dict[str, float]:
        """グローバルセンチメント計算"""
        sentiment_scores = {}

        # 資産別センチメント
        for asset_type in ["stock", "forex", "commodity", "crypto"]:
            type_assets = [a for a in self.global_assets.values() if a.asset_type == asset_type]
            if type_assets:
                avg_change = np.mean([a.change_pct for a in type_assets])
                sentiment_scores[asset_type] = np.tanh(avg_change / 2.0)  # -1~1に正規化

        # 地域別センチメント
        region_sentiment = {}
        for market_id, market in self.markets.items():
            market_assets = [a for a in self.global_assets.values() if a.primary_market == market_id]
            if market_assets:
                avg_change = np.mean([a.change_pct for a in market_assets])
                region_sentiment[market_id] = np.tanh(avg_change / 2.0)

        sentiment_scores["regions"] = region_sentiment

        return sentiment_scores


# メイン実行関数
async def main():
    """メイン実行"""
    print("Global Market Integration System 起動中...")

    monitor = GlobalMarketMonitor()

    try:
        # 監視開始（デモでは10回ループ）
        for i in range(3):
            await monitor.update_market_statuses()
            await monitor.update_global_assets()
            await monitor.update_correlations()
            await monitor.update_news_feeds()

            monitor.display_global_overview()

            # 裁定機会表示
            opportunities = monitor.get_arbitrage_opportunities()
            if opportunities:
                print("\n⚡ 裁定機会:")
                for opp in opportunities:
                    print(f"  {opp['type']}: {opp['reason']}")

            # グローバルセンチメント
            sentiment = monitor.calculate_global_sentiment()
            print("\n💭 グローバルセンチメント:")
            for asset_type, score in sentiment.items():
                if asset_type != "regions":
                    sentiment_icon = "😊" if score > 0.2 else "😐" if score > -0.2 else "😟"
                    print(f"  {asset_type}: {score:.3f} {sentiment_icon}")

            if i < 2:
                print(f"\n次回更新まで待機中... ({i + 1}/3)")
                await asyncio.sleep(2)

    except KeyboardInterrupt:
        print("\n監視を中断します")

    finally:
        await monitor.stop_monitoring()
        print("\nGlobal Market Integration System 完了！")


if __name__ == "__main__":
    asyncio.run(main())
