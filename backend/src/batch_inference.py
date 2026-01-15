"""
Batch Inference - バッチ推論
複数銘柄を並列処理して高速化
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Dict, List

import pandas as pd

logger = logging.getLogger(__name__)


class BatchInferenceEngine:
    """バッチ推論エンジン"""

    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.stats = {"total_batches": 0, "total_tickers": 0, "avg_time_per_ticker": 0}

    def predict_batch(self, predictor, data_map: Dict[str, pd.DataFrame], days_ahead: int = 5) -> Dict[str, Dict]:
        """
        複数銘柄を並列で予測

        Args:
            predictor: 予測器（EnsemblePredictorなど）
            data_map: {ticker: DataFrame}のマップ
            days_ahead: 予測日数

        Returns:
            {ticker: prediction}のマップ
        """
        if not data_map:
            return {}

        start_time = datetime.now()
        results = {}

        def predict_one(ticker: str, df: pd.DataFrame) -> tuple:
            try:
                result = predictor.predict_trajectory(df=df, days_ahead=days_ahead, ticker=ticker)
                return (ticker, result)
            except Exception as e:
                logger.error(f"Prediction error for {ticker}: {e}")
                return (ticker, {"error": str(e)})

        # 並列実行
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(predict_one, ticker, df): ticker
                for ticker, df in data_map.items()
                if df is not None and not df.empty
            }

            for future in as_completed(futures):
                ticker = futures[future]
                try:
                    result_ticker, result = future.result()
                    results[result_ticker] = result
                except Exception as e:
                    logger.error(f"Future error for {ticker}: {e}")
                    results[ticker] = {"error": str(e)}

        # 統計更新
        elapsed = (datetime.now() - start_time).total_seconds()
        self.stats["total_batches"] += 1
        self.stats["total_tickers"] += len(data_map)

        if len(data_map) > 0:
            self.stats["avg_time_per_ticker"] = elapsed / len(data_map)

        logger.info(f"Batch prediction completed: {len(results)} tickers in {elapsed:.2f}s")

        return results

    def rank_predictions(
        self,
        predictions: Dict[str, Dict],
        sort_by: str = "change_pct",
        ascending: bool = False,
    ) -> List[tuple]:
        """
        予測結果をランキング

        Args:
            predictions: 予測結果マップ
            sort_by: ソートキー
            ascending: 昇順かどうか

        Returns:
            [(ticker, prediction), ...] のリスト（ソート済み）
        """
        valid_predictions = [
            (ticker, pred) for ticker, pred in predictions.items() if "error" not in pred and sort_by in pred
        ]

        sorted_preds = sorted(valid_predictions, key=lambda x: x[1].get(sort_by, 0), reverse=not ascending)

        return sorted_preds

    def get_top_opportunities(
        self, predictions: Dict[str, Dict], n: int = 5, min_confidence: float = 0.5
    ) -> List[Dict]:
        """
        上位の投資機会を取得

        Args:
            predictions: 予測結果マップ
            n: 取得件数
            min_confidence: 最小信頼度

        Returns:
            上位の機会リスト
        """
        opportunities = []

        for ticker, pred in predictions.items():
            if "error" in pred:
                continue

            # 信頼度チェック
            auto_info = pred.get("auto_selector", {})
            confidence = auto_info.get("confidence_score", 0.5)

            if confidence < min_confidence:
                continue

            trend = pred.get("trend", "FLAT")
            change_pct = pred.get("change_pct", 0)

            # スコア計算（上昇トレンド + 信頼度）
            if trend == "UP":
                score = change_pct * confidence
            elif trend == "DOWN":
                score = change_pct * confidence  # マイナスなので下がる
            else:
                score = 0

            opportunities.append(
                {
                    "ticker": ticker,
                    "trend": trend,
                    "change_pct": change_pct,
                    "confidence": confidence,
                    "score": score,
                    "recommendation": auto_info.get("recommendation", ""),
                }
            )

        # スコアで降順ソート
        opportunities.sort(key=lambda x: x["score"], reverse=True)

        return opportunities[:n]

    def get_stats(self) -> Dict:
        """統計情報を取得"""
        return self.stats


# シングルトン
_engine = None


def get_batch_engine() -> BatchInferenceEngine:
    global _engine
    if _engine is None:
        _engine = BatchInferenceEngine(max_workers=4)
    return _engine
