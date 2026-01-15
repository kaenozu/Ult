"""
ポートフォリオリスク分析モジュール
Portfolio Risk Analysis Module

集中度、セクター分散、リスク警告を計算
"""

from functools import lru_cache
from typing import Dict, List

import pandas as pd
import yfinance as yf


class PortfolioRiskAnalyzer:
    """ポートフォリオのリスク特性を計算"""

    def __init__(self):
        self.concentration_threshold = 0.30  # 30%
        self.sector_threshold = 0.50  # 50%

    def calculate_concentration(self, positions: pd.DataFrame) -> Dict:
        """
        ポートフォリオの集中度を計算

        Args:
            positions: PaperTrader.get_positions()の戻り値

        Returns:
            dict: {
                'herfindahl_index': float,  # 0-1, 1に近いほど集中
                'top_position_pct': float,  # 最大ポジションの割合
                'top_ticker': str,          # 最大ポジションの銘柄
                'is_concentrated': bool     # 閾値超過フラグ
            }
        """
        if positions.empty:
            return {
                "herfindahl_index": 0.0,
                "top_position_pct": 0.0,
                "top_ticker": None,
                "is_concentrated": False,
            }

        # 時価評価額で計算
        if "market_value" not in positions.columns:
            positions["market_value"] = positions["current_price"] * positions["quantity"]

        total_value = positions["market_value"].sum()

        if total_value == 0:
            return {
                "herfindahl_index": 0.0,
                "top_position_pct": 0.0,
                "top_ticker": None,
                "is_concentrated": False,
            }

        # 各ポジションの割合
        positions["weight"] = positions["market_value"] / total_value

        # Herfindahl Index (HHI) = Σ(weight^2)
        hhi = (positions["weight"] ** 2).sum()

        # 最大ポジション
        top_idx = positions["market_value"].idxmax()
        top_position = positions.loc[top_idx]
        top_pct = top_position["weight"]

        return {
            "herfindahl_index": hhi,
            "top_position_pct": top_pct,
            "top_ticker": top_position["ticker"],
            "is_concentrated": top_pct > self.concentration_threshold,
        }

    @lru_cache(maxsize=128)
    def _get_sector(self, ticker: str) -> str:
        """
        銘柄のセクターを取得（キャッシュ付き）

        Args:
            ticker: 銘柄コード

        Returns:
            str: セクター名（取得失敗時は'Unknown'）
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            return info.get("sector", "Unknown")
        except Exception:
            return "Unknown"

    def check_sector_diversification(self, positions: pd.DataFrame) -> Dict:
        """
        セクター分散を評価

        Args:
            positions: PaperTrader.get_positions()の戻り値

        Returns:
            dict: {
                'sector_distribution': dict,  # {sector: percentage}
                'top_sector': str,
                'top_sector_pct': float,
                'is_sector_concentrated': bool,
                'num_sectors': int
            }
        """
        if positions.empty:
            return {
                "sector_distribution": {},
                "top_sector": None,
                "top_sector_pct": 0.0,
                "is_sector_concentrated": False,
                "num_sectors": 0,
            }

        # 時価評価額で計算
        if "market_value" not in positions.columns:
            positions["market_value"] = positions["current_price"] * positions["quantity"]

        total_value = positions["market_value"].sum()

        if total_value == 0:
            return {
                "sector_distribution": {},
                "top_sector": None,
                "top_sector_pct": 0.0,
                "is_sector_concentrated": False,
                "num_sectors": 0,
            }

        # セクター情報を取り得
        positions["sector"] = positions["ticker"].apply(self._get_sector)

        # セクター別集中
        sector_values = positions.groupby("sector")["market_value"].sum()
        sector_distribution = (sector_values / total_value).to_dict()

        # 最大セクター
        top_sector = sector_values.idxmax()
        top_sector_pct = sector_values.max() / total_value

        return {
            "sector_distribution": sector_distribution,
            "top_sector": top_sector,
            "top_sector_pct": top_sector_pct,
            "is_sector_concentrated": top_sector_pct > self.sector_threshold,
            "num_sectors": len(sector_distribution),
        }

    def get_risk_alerts(self, positions: pd.DataFrame) -> List[Dict]:
        """
        リスク警告を生成

        Args:
            positions: PaperTrader.get_positions()の戻り値

        Returns:
            list: [{'level': 'warning'|'info', 'message': str}, ...]
        """
        alerts = []

        if positions.empty:
            return alerts

        # 集中度チェック
        concentration = self.calculate_concentration(positions)
        if concentration["is_concentrated"]:
            alerts.append(
                {
                    "level": "warning",
                    "message": f"⚠️ {concentration['top_ticker']} が{concentration['top_position_pct']:.1%} を占めています（推奨: 30%以下）",
                }
            )

        # セクター分散チェック
        sector_div = self.check_sector_diversification(positions)
        if sector_div["is_sector_concentrated"]:
            alerts.append(
                {
                    "level": "warning",
                    "message": f"⚠️ {sector_div['top_sector']} セクターが{sector_div['top_sector_pct']:.1%} を占めています（推奨: 50%以下）",
                }
            )

        # ポジション数チェック
        num_positions = len(positions)
        if num_positions == 1:
            alerts.append(
                {
                    "level": "warning",
                    "message": "⚠️ ポジションが銘柄のみです。分散投資を推奨します",
                }
            )
        elif num_positions >= 2 and num_positions <= 3:
            alerts.append(
                {
                    "level": "info",
                    "message": f"ℹ️ ポジション数: {num_positions}銘柄（推奨: 5-10銘柄）",
                }
            )

        return alerts

    def calculate_concentration_score(self, positions: pd.DataFrame) -> float:
        """
        集中度スコアを計算（0-100、低いほど分散されてます）

        Args:
            positions: PaperTrader.get_positions()の戻り値

        Returns:
            float: 0-100のスコア
        """
        if positions.empty or len(positions) == 0:
            return 0.0

        concentration = self.calculate_concentration(positions)
        hhi = concentration["herfindahl_index"]

        # HHIを0-100スコアに変換
        # HHI = 1.0 (完全集中) -> Score = 0
        # HHI = 1/N (完全分散) -> Score = 100

        n = len(positions)
        min_hhi = 1.0 / n  # 完全分散時のHHI
        max_hhi = 1.0  # 完全集中時のHHI

        # 正規化してスコア化: HHIが低いほどスコアが高い
        if max_hhi - min_hhi == 0:
            return 100.0

        score = ((max_hhi - hhi) / (max_hhi - min_hhi)) * 100
        return max(0.0, min(100.0, score))
