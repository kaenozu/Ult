"""
動的アンサンブル最適化モジュール

各モデルの過去のパフォーマンスに基づいて、アンサンブルのウェイトを動的に調整します。
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd

logger = logging.getLogger(__name__)


class DynamicEnsemble:
    def __init__(
        self,
        strategies: List[Any],
        learning_rate: float = 0.1,
        window_size: int = 20,
        state_file: str = "ensemble_state.json",
    ):
        """
        Args:
            strategies: 戦略インスタンスのリスト
            learning_rate: ウェイト更新の学習率 (0.0 ~ 1.0)
            window_size: パフォーマンス評価のウィンドウサイズ
            state_file: 状態保存用ファイルのパス
        """
        self.strategies = strategies
        self.learning_rate = learning_rate
        self.window_size = window_size
        self.weights = {s.name: 1.0 / len(strategies) for s in strategies}
        self.history = []  # [{'date': date, 'predictions': {name: pred}, 'actual': return}]
        self.performance = {s.name: 0.0 for s in strategies}

        # 永続化ファイルのパス
        self.state_file = state_file
        self.load_state()

    def update(
        self,
        ticker: str,
        date: datetime,
        actual_return: float,
        predictions: Dict[str, float],
    ):
        """
        実際のリターンに基づいてウェイトを更新

        Args:
            ticker: 銘柄コード
            date: 日付
            actual_return: 実際の収益率（翌日のリターンなど）
            predictions: 各モデルの予測値（1: Buy, -1: Sell, 0: Neutral）
        """
        # 履歴に追加
        record = {
            "date": date.strftime("%Y-%m-%d"),
            "ticker": ticker,
            "predictions": predictions,
            "actual": actual_return,
        }
        self.history.append(record)

        # 古い履歴を削除
        if len(self.history) > 1000:
            self.history.pop(0)

        # パフォーマンス評価とウェイト更新
        self._recalculate_weights()
        self.save_state()

    def _recalculate_weights(self):
        """過去の履歴からウェイトを再計算"""
        if not self.history:
            return

        # 直近の履歴を取得
        recent_history = self.history[-self.window_size :]

        scores = {name: 0.0 for name in self.weights.keys()}

        for record in recent_history:
            actual = record["actual"]
            preds = record["predictions"]

            # 正解ラベル（プラスなら1、マイナスなら-1）
            target = 1 if actual > 0 else -1 if actual < 0 else 0

            for name, pred in preds.items():
                # 予測が正解と同じ方向ならスコア加算
                if pred == target:
                    scores[name] += 1.0
                # 逆方向なら減点
                elif pred == -target:
                    scores[name] -= 0.5

        # スコアを正規化してウェイトに変換（Softmax的なアプローチ）
        total_score = sum(max(0, s) for s in scores.values())

        if total_score > 0:
            new_weights = {name: max(0, score) / total_score for name, score in scores.items()}

            # EMAでウェイトを更新
            for name in self.weights:
                self.weights[name] = (1 - self.learning_rate) * self.weights[
                    name
                ] + self.learning_rate * new_weights.get(name, 0)
        else:
            # スコアが全て0以下の場合は均等割り
            n = len(self.strategies)
            self.weights = {name: 1.0 / n for name in self.weights}

    def predict(self, df: pd.DataFrame) -> float:
        """
        各モデルの予測を統合して最終予測を返す

        Returns:
            統合スコア (-1.0 ~ 1.0)
        """
        ensemble_score = 0.0
        predictions = {}

        for strategy in self.strategies:
            try:
                # 各戦略の予測を取得
                result = strategy.analyze(df)
                signal = result["signal"]  # 1, -1, 0
                confidence = result.get("confidence", 1.0)

                # スコア計算
                score = signal * confidence
                predictions[strategy.name] = score

                # 加重平均
                weight = self.weights.get(strategy.name, 0)
                ensemble_score += score * weight

            except Exception as e:
                logger.error(f"Error in strategy {strategy.name}: {e}")
                predictions[strategy.name] = 0

        return ensemble_score, predictions

    def save_state(self):
        """状態をJSONに保存"""
        try:
            state = {
                "weights": self.weights,
                "history": self.history[-100:],
            }  # 最新100件のみ保存
            with open(self.state_file, "w") as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save ensemble state: {e}")

    def load_state(self):
        """状態をJSONから読み込み"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r") as f:
                    state = json.load(f)
                    self.weights = state.get("weights", self.weights)
                    self.history = state.get("history", [])
            except Exception as e:
                logger.error(f"Failed to load ensemble state: {e}")
