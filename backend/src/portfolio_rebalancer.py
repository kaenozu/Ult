"""
ポートフォリオリバランスモジュール

週次で自動的にポートフォリオのバランスを調整
"""

import datetime
from typing import Dict, List

import pandas as pd


class PortfolioRebalancer:
    """ポートフォリオリバランスクラス"""

    def __init__(self, config: dict):
        self.config = config

        # リバランス設定
        rebalance_config = config.get("rebalance", {})
        self.max_single_position_pct = rebalance_config.get("max_single_position", 30.0)
        self.max_region_pct = rebalance_config.get("max_region", {"japan": 60.0, "us": 60.0, "europe": 30.0})
        self.rebalance_day = rebalance_config.get("rebalance_day", 6)  # 0=月曜, 6=日曜

    def should_rebalance_today(self) -> bool:
        """今日リバランスすべきか判定"""
        today = datetime.date.today()
        return today.weekday() == self.rebalance_day

    def analyze_portfolio(self, paper_trader, logger) -> Dict:
        """
        ポートフォリオを分析

        Returns:
            dict: 分析結果
        """
        positions = paper_trader.get_positions()
        balance = paper_trader.get_current_balance()

        if positions.empty:
            return {"needs_rebalance": False, "reason": "ポジションなし"}

        total_equity = balance["total_equity"]

        # 銘柄別比率
        position_ratios = {}
        for ticker in positions.index:
            if not ticker:
                if logger:
                    logger("⚠️ tickerが空のポジションをスキップ")
                continue

            pos = positions.loc[ticker]
            value = pos.get("current_price", 0) * pos.get("quantity", 0)
            if value <= 0 or total_equity <= 0:
                continue
            ratio = (value / total_equity) * 100
            position_ratios[ticker] = ratio

        # 地域別比率
        region_ratios = self._calculate_region_ratios(positions, total_equity)

        # リバランスが必要か判定
        needs_rebalance = False
        reasons = []

        # 1. 単一銘柄の比率チェック
        for ticker, ratio in position_ratios.items():
            if ratio > self.max_single_position_pct:
                needs_rebalance = True
                reasons.append(f"{ticker}: {ratio:.1f}% (上限: {self.max_single_position_pct}%)")

        # 2. 地域別比率チェック
        for region, ratio in region_ratios.items():
            max_ratio = self.max_region_pct.get(region, 100.0)
            if ratio > max_ratio:
                needs_rebalance = True
                reasons.append(f"{region}株: {ratio:.1f}% (上限: {max_ratio}%)")

        return {
            "needs_rebalance": needs_rebalance,
            "reasons": reasons,
            "position_ratios": position_ratios,
            "region_ratios": region_ratios,
        }

    def generate_rebalance_signals(self, paper_trader, logger) -> List[Dict]:
        """
        リバランスシグナルを生成

        Returns:
            list: 売却シグナルのリスト
        """
        analysis = self.analyze_portfolio(paper_trader, logger)

        if not analysis["needs_rebalance"]:
            return []

        logger(f"📊 リバランス実行: {', '.join(analysis['reasons'])}")

        positions = paper_trader.get_positions()
        balance = paper_trader.get_current_balance()
        total_equity = balance["total_equity"]

        signals = []

        # 比率が高すぎる銘柄を一部売却
        for ticker, ratio in analysis["position_ratios"].items():
            if ratio > self.max_single_position_pct:
                if ticker not in positions.index:
                    continue

                pos = positions.loc[ticker]
                current_quantity = pos.get("quantity", 0)
                current_price = pos.get("current_price", 0)
                if current_quantity is None or current_quantity <= 0 or current_price is None or current_price <= 0:
                    continue

                # 目標比率まで減らす
                target_ratio = self.max_single_position_pct * 0.9  # 少し余裕を持たせる
                target_value = total_equity * (target_ratio / 100)
                target_quantity = int(target_value / current_price)

                sell_quantity = current_quantity - target_quantity

                if sell_quantity > 0:
                    signals.append(
                        {
                            "ticker": ticker,
                            "action": "SELL",
                            "confidence": 1.0,
                            "price": current_price,
                            "quantity": sell_quantity,
                            "strategy": "Rebalance",
                            "reason": f"リバランス（比率: {ratio:.1f}% → {target_ratio:.1f}%）",
                        }
                    )

                    logger(f"  {ticker}: {sell_quantity}株売却（{ratio:.1f}% → {target_ratio:.1f}%）")

        return signals

    def _calculate_region_ratios(self, positions: pd.DataFrame, total_equity: float) -> Dict[str, float]:
        """地域別の比率を計算"""
        from src.constants import NIKKEI_225_TICKERS, SP500_TICKERS, STOXX50_TICKERS

        japan_value = 0
        us_value = 0
        europe_value = 0

        for ticker in positions.index:
            if not ticker:
                continue

            pos = positions.loc[ticker]
            value = pos.get("current_price", 0) * pos.get("quantity", 0)
            if value <= 0:
                continue

            if ticker in NIKKEI_225_TICKERS:
                japan_value += value
            elif ticker in SP500_TICKERS:
                us_value += value
            elif ticker in STOXX50_TICKERS:
                europe_value += value

        return {
            "japan": (japan_value / total_equity) * 100 if total_equity > 0 else 0,
            "us": (us_value / total_equity) * 100 if total_equity > 0 else 0,
            "europe": (europe_value / total_equity) * 100 if total_equity > 0 else 0,
        }
