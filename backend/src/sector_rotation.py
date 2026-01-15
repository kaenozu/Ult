import logging
from typing import Dict, List, Optional, Tuple

import pandas as pd

from src.constants import CYCLE_SECTOR_MAP, SECTOR_ETFS, SECTOR_NAMES_JA
from src.data_loader import fetch_stock_data

logger = logging.getLogger(__name__)


class SectorRotationEngine:
    """
    セクターローテーションエンジン。
    経済サイクルに基づいて、最適なセクター配分を推奨する。
    """

    def __init__(self, lookback_period: str = "1y"):
        """
        Args:
            lookback_period: パフォーマンス計算に使用する期間
        """
        self.lookback_period = lookback_period
        self.sector_tickers = list(SECTOR_ETFS.keys())
        self.sector_data: Dict[str, pd.DataFrame] = {}
        self.sector_performance: Dict[str, float] = {}

    def fetch_sector_data(self) -> Dict[str, pd.DataFrame]:
        """
        全セクターETFのデータを取得する。

        Returns:
            セクターティッカーごとのDataFrame
        """
        logger.info(f"Fetching sector data for {len(self.sector_tickers)} sectors...")
        self.sector_data = fetch_stock_data(self.sector_tickers, period=self.lookback_period)
        return self.sector_data

    def calculate_sector_performance(self, period_days: int = 30) -> Dict[str, float]:
        """
        各セクターの過去N日間のパフォーマンスを計算する。

        Args:
            period_days: 計算期間（日数）

        Returns:
            セクターティッカー → リターン（%）のDict
        """
        if not self.sector_data:
            self.fetch_sector_data()

        performance = {}

        for ticker, df in self.sector_data.items():
            if df is None or df.empty or len(df) < period_days:
                performance[ticker] = 0.0
                continue

            # 過去N日間のリターンを計算
            start_price = df["Close"].iloc[-period_days]
            end_price = df["Close"].iloc[-1]
            ret = (end_price - start_price) / start_price
            performance[ticker] = ret

        self.sector_performance = performance
        return performance

    def get_top_sectors(self, n: int = 3, period_days: int = 30) -> List[Tuple[str, float]]:
        """
        パフォーマンスが高い上位Nセクターを取得する。

        Args:
            n: 取得するセクター数
            period_days: 評価期間（日数）

        Returns:
            (ticker, performance)のリスト（降順）
        """
        if not self.sector_performance:
            self.calculate_sector_performance(period_days)

        sorted_sectors = sorted(self.sector_performance.items(), key=lambda x: x[1], reverse=True)
        return sorted_sectors[:n]

    def recommend_sectors_by_cycle(self, cycle: str) -> List[str]:
        """
        経済サイクルに基づいて推奨セクターを返す。

        Args:
            cycle: 'early_recovery', 'expansion', 'early_recession', 'recession'

        Returns:
            推奨セクターのティッカーリスト
        """
        recommended = CYCLE_SECTOR_MAP.get(cycle, [])
        logger.info(f"Recommended sectors for {cycle}: {recommended}")
        return recommended

    def calculate_optimal_weights(
        self,
        cycle: Optional[str] = None,
        use_momentum: bool = True,
        momentum_weight: float = 0.5,
    ) -> Dict[str, float]:
        """
        最適なセクター配分ウェイトを計算する。

        Args:
            cycle: 経済サイクル（指定しない場合はモメンタムのみ）
            use_momentum: モメンタムスコアを使用するか
            momentum_weight: モメンタムの重み（0.0~1.0）

        Returns:
            セクター → ウェイト（合計1.0）のDict
        """
        weights = {ticker: 0.0 for ticker in self.sector_tickers}

        # 1. サイクルベースのウェイト
        if cycle:
            recommended_sectors = self.recommend_sectors_by_cycle(cycle)
            if recommended_sectors:
                base_weight = (1.0 - momentum_weight) / len(recommended_sectors)
                for sector in recommended_sectors:
                    weights[sector] = base_weight

        # 2. モメンタムベースのウェイト
        if use_momentum:
            if not self.sector_performance:
                self.calculate_sector_performance()

            # 正のリターンのセクターのみを対象
            positive_sectors = {k: v for k, v in self.sector_performance.items() if v > 0}

            if positive_sectors:
                total_positive_return = sum(positive_sectors.values())
                if total_positive_return > 0:
                    for sector, perf in positive_sectors.items():
                        # モメンタムスコアを加算
                        weights[sector] += (perf / total_positive_return) * momentum_weight

        # 3. 正規化（合計を1.0に）
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        else:
            # フォールバック: 均等配分
            equal_weight = 1.0 / len(self.sector_tickers)
            weights = {k: equal_weight for k in self.sector_tickers}

        return weights

    def get_sector_heatmap_data(self, periods: List[int] = [7, 30, 90]) -> pd.DataFrame:
        """
        複数期間のセクターパフォーマンスをヒートマップ用に整形する。

        Args:
            periods: 評価期間のリスト（日数）

        Returns:
            セクター × 期間のDataFrame
        """
        if not self.sector_data:
            self.fetch_sector_data()

        heatmap_data = []

        for ticker in self.sector_tickers:
            df = self.sector_data.get(ticker)
            if df is None or df.empty:
                continue

            row = {"Sector": SECTOR_NAMES_JA.get(ticker, ticker)}

            for period in periods:
                if len(df) < period:
                    row[f"{period}d"] = 0.0
                else:
                    start_price = df["Close"].iloc[-period]
                    end_price = df["Close"].iloc[-1]
                    ret = (end_price - start_price) / start_price * 100  # Percentage
                    row[f"{period}d"] = ret

            heatmap_data.append(row)

        return pd.DataFrame(heatmap_data)

    def analyze_cycle_from_regime(self, regime_id: int) -> str:
        """
        レジームIDから経済サイクルを判定する。

        Args:
            regime_id: RegimeDetectorが返すID

        Returns:
            経済サイクル文字列
        """
        # レジーム→サイクルのマッピング
        # 0: 安定上昇 → expansion
        # 1: 不安定 → early_recession
        # 2: 暴落警戒 → recession

        cycle_map = {0: "expansion", 1: "early_recession", 2: "recession"}

        return cycle_map.get(regime_id, "expansion")
