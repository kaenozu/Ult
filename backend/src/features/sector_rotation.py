"""セクターローテーション検出モジュール

景気サイクルに応じた最適セクターの自動提案
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


class EconomicCycle(Enum):
    """景気サイクル"""

    EARLY_EXPANSION = "early_expansion"  # 景気回復初期
    MID_EXPANSION = "mid_expansion"  # 景気拡大期
    LATE_EXPANSION = "late_expansion"  # 景気後期
    EARLY_RECESSION = "early_recession"  # 景気後退初期
    MID_RECESSION = "mid_recession"  # 景気後退期
    LATE_RECESSION = "late_recession"  # 景気後退後期


@dataclass
class SectorPerformance:
    """セクターパフォーマンス"""

    sector: str
    etf_symbol: str
    return_1w: float
    return_1m: float
    return_3m: float
    return_6m: float
    relative_strength: float
    momentum_score: float
    recommendation: str  # "OVERWEIGHT", "NEUTRAL", "UNDERWEIGHT"


class SectorRotation:
    """セクターローテーション分析クラス"""

    # セクターETFマッピング（S&P 500セクターETF）
    US_SECTOR_ETFS = {
        "Technology": "XLK",
        "Healthcare": "XLV",
        "Financials": "XLF",
        "Consumer Discretionary": "XLY",
        "Consumer Staples": "XLP",
        "Energy": "XLE",
        "Industrials": "XLI",
        "Materials": "XLB",
        "Utilities": "XLU",
        "Real Estate": "XLRE",
        "Communication Services": "XLC",
    }

    # 日本セクターETF
    JP_SECTOR_ETFS = {
        "電気機器": "1623.T",
        "輸送用機器": "1624.T",
        "銀行": "1631.T",
        "化学": "1620.T",
        "情報通信": "1626.T",
    }

    # 景気サイクルごとの推奨セクター
    CYCLE_RECOMMENDATIONS = {
        EconomicCycle.EARLY_EXPANSION: ["Technology", "Consumer Discretionary", "Financials"],
        EconomicCycle.MID_EXPANSION: ["Industrials", "Materials", "Technology"],
        EconomicCycle.LATE_EXPANSION: ["Energy", "Materials", "Industrials"],
        EconomicCycle.EARLY_RECESSION: ["Utilities", "Consumer Staples", "Healthcare"],
        EconomicCycle.MID_RECESSION: ["Consumer Staples", "Healthcare", "Utilities"],
        EconomicCycle.LATE_RECESSION: ["Financials", "Consumer Discretionary", "Real Estate"],
    }

    def __init__(self, market: str = "US"):
        """初期化

        Args:
            market: 市場（"US"または"JP"）
        """
        self.market = market
        self.sector_etfs = self.US_SECTOR_ETFS if market == "US" else self.JP_SECTOR_ETFS
        self._cache: Dict[str, pd.DataFrame] = {}
        self._cache_timestamp: Optional[datetime] = None

    def analyze_sectors(self, lookback_days: int = 180) -> List[SectorPerformance]:
        """全セクターのパフォーマンスを分析

        Args:
            lookback_days: 分析期間（日）

        Returns:
            セクターパフォーマンスリスト
        """
        performances = []
        benchmark_returns = self._get_benchmark_returns(lookback_days)

        for sector, etf in self.sector_etfs.items():
            try:
                perf = self._analyze_single_sector(sector, etf, lookback_days, benchmark_returns)
                if perf:
                    performances.append(perf)
            except Exception as e:
                logger.warning(f"Failed to analyze sector {sector}: {e}")

        # モメンタムスコアでソート
        performances.sort(key=lambda x: x.momentum_score, reverse=True)

        return performances

    def _analyze_single_sector(
        self,
        sector: str,
        etf: str,
        lookback_days: int,
        benchmark_returns: Dict[str, float],
    ) -> Optional[SectorPerformance]:
        """単一セクターを分析"""
        try:
            ticker = yf.Ticker(etf)
            hist = ticker.history(period=f"{lookback_days}d")

            if hist.empty or len(hist) < 20:
                return None

            # 各期間のリターン計算
            close = hist["Close"]

            return_1w = self._calc_return(close, 5)
            return_1m = self._calc_return(close, 21)
            return_3m = self._calc_return(close, 63)
            return_6m = self._calc_return(close, 126)

            # 相対強度（ベンチマーク比）
            benchmark_1m = benchmark_returns.get("1m", 0)
            relative_strength = return_1m - benchmark_1m

            # モメンタムスコア（加重平均）
            momentum_score = return_1w * 0.1 + return_1m * 0.3 + return_3m * 0.4 + return_6m * 0.2

            # 推奨判定
            if momentum_score > 5 and relative_strength > 2:
                recommendation = "OVERWEIGHT"
            elif momentum_score < -5 or relative_strength < -5:
                recommendation = "UNDERWEIGHT"
            else:
                recommendation = "NEUTRAL"

            return SectorPerformance(
                sector=sector,
                etf_symbol=etf,
                return_1w=return_1w,
                return_1m=return_1m,
                return_3m=return_3m,
                return_6m=return_6m,
                relative_strength=relative_strength,
                momentum_score=momentum_score,
                recommendation=recommendation,
            )

        except Exception as e:
            logger.debug(f"Sector analysis failed for {sector}: {e}")
            return None

    def _calc_return(self, prices: pd.Series, days: int) -> float:
        """リターンを計算"""
        if len(prices) < days:
            return 0.0

        current = prices.iloc[-1]
        past = prices.iloc[-min(days, len(prices))]

        if past == 0:
            return 0.0

        return (current - past) / past * 100

    def _get_benchmark_returns(self, lookback_days: int) -> Dict[str, float]:
        """ベンチマークリターンを取得"""
        benchmark = "SPY" if self.market == "US" else "1306.T"

        try:
            ticker = yf.Ticker(benchmark)
            hist = ticker.history(period=f"{lookback_days}d")

            if hist.empty:
                return {}

            close = hist["Close"]

            return {
                "1w": self._calc_return(close, 5),
                "1m": self._calc_return(close, 21),
                "3m": self._calc_return(close, 63),
                "6m": self._calc_return(close, 126),
            }
        except Exception:
            return {}

    def detect_cycle(self) -> Tuple[EconomicCycle, float]:
        """現在の景気サイクルを推定

        Returns:
            (景気サイクル, 信頼度)
        """
        indicators = self._get_economic_indicators()

        # シンプルなサイクル判定ロジック
        # VIX, イールドカーブ、セクターパフォーマンスから推定

        vix = indicators.get("vix", 20)
        yield_spread = indicators.get("yield_spread", 1.0)

        # セクターパフォーマンスからサイクルを推定
        performances = self.analyze_sectors()
        top_sectors = [p.sector for p in performances[:3]]

        # サイクル判定
        if vix < 15 and yield_spread > 1.5:
            if "Technology" in top_sectors or "Consumer Discretionary" in top_sectors:
                return EconomicCycle.EARLY_EXPANSION, 0.7
            else:
                return EconomicCycle.MID_EXPANSION, 0.6

        elif vix < 20 and yield_spread > 0.5:
            if "Energy" in top_sectors or "Materials" in top_sectors:
                return EconomicCycle.LATE_EXPANSION, 0.65
            else:
                return EconomicCycle.MID_EXPANSION, 0.55

        elif vix > 25:
            if "Utilities" in top_sectors or "Consumer Staples" in top_sectors:
                return EconomicCycle.MID_RECESSION, 0.6
            else:
                return EconomicCycle.EARLY_RECESSION, 0.5

        elif yield_spread < 0:
            return EconomicCycle.LATE_RECESSION, 0.6

        return EconomicCycle.MID_EXPANSION, 0.4

    def _get_economic_indicators(self) -> Dict[str, float]:
        """経済指標を取得"""
        indicators = {}

        # VIX
        try:
            vix = yf.Ticker("^VIX")
            hist = vix.history(period="5d")
            if not hist.empty:
                indicators["vix"] = float(hist["Close"].iloc[-1])
        except Exception:
            indicators["vix"] = 20

        # イールドカーブ（10Y - 2Y）
        try:
            tnx = yf.Ticker("^TNX")  # 10年債利回り
            tnx_hist = tnx.history(period="5d")

            # 2年債の代替として簡易計算
            if not tnx_hist.empty:
                indicators["yield_spread"] = float(tnx_hist["Close"].iloc[-1]) - 4.0
        except Exception:
            indicators["yield_spread"] = 1.0

        return indicators

    def get_recommendations(self) -> Dict[str, Any]:
        """セクターローテーション推奨を取得"""
        cycle, confidence = self.detect_cycle()
        performances = self.analyze_sectors()

        # サイクルに基づく推奨セクター
        recommended_sectors = self.CYCLE_RECOMMENDATIONS.get(cycle, [])

        # パフォーマンスとサイクル推奨を統合
        combined_recommendations = []
        for perf in performances:
            score = perf.momentum_score
            if perf.sector in recommended_sectors:
                score += 10  # サイクル推奨ボーナス

            combined_recommendations.append(
                {
                    "sector": perf.sector,
                    "etf": perf.etf_symbol,
                    "combined_score": score,
                    "momentum_score": perf.momentum_score,
                    "relative_strength": perf.relative_strength,
                    "cycle_recommended": perf.sector in recommended_sectors,
                    "action": perf.recommendation,
                }
            )

        combined_recommendations.sort(key=lambda x: x["combined_score"], reverse=True)

        return {
            "current_cycle": cycle.value,
            "cycle_confidence": confidence,
            "cycle_description": self._get_cycle_description(cycle),
            "top_sectors": combined_recommendations[:3],
            "avoid_sectors": combined_recommendations[-2:],
            "all_sectors": combined_recommendations,
            "analysis_date": datetime.now().isoformat(),
        }

    def _get_cycle_description(self, cycle: EconomicCycle) -> str:
        """サイクルの説明を取得"""
        descriptions = {
            EconomicCycle.EARLY_EXPANSION: "景気回復初期: 金利低下、消費回復。グロース株が有望。",
            EconomicCycle.MID_EXPANSION: "景気拡大期: 経済成長が加速。景気敏感株が好調。",
            EconomicCycle.LATE_EXPANSION: "景気後期: インフレ懸念。コモディティ関連が有望。",
            EconomicCycle.EARLY_RECESSION: "景気後退初期: 防御的セクターへシフト推奨。",
            EconomicCycle.MID_RECESSION: "景気後退期: ディフェンシブポジション維持。",
            EconomicCycle.LATE_RECESSION: "景気後退後期: 回復の兆し。金融・消費に注目。",
        }
        return descriptions.get(cycle, "")


# シングルトン
_sector_rotation: Optional[SectorRotation] = None


def get_sector_rotation(market: str = "US") -> SectorRotation:
    """シングルトンインスタンスを取得"""
    global _sector_rotation
    if _sector_rotation is None or _sector_rotation.market != market:
        _sector_rotation = SectorRotation(market=market)
    return _sector_rotation
