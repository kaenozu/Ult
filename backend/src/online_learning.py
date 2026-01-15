"""
オンライン学習モジュール

新しいデータで継続的にモデルを更新し、市場環境の変化に適応します。
"""

import logging
import os
import pickle
from datetime import datetime
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OnlineLearner:
    """
    オンライン学習マネージャー

    新しいデータで継続的にモデルを更新し、性能を監視します。
    """

    def __init__(
        self, base_model, update_frequency: str = "daily", decay_rate: float = 0.95, performance_threshold: float = 0.95
    ):
        """
        Args:
            base_model: ベースとなる機械学習モデル
            update_frequency: 更新頻度 ('daily', 'weekly', 'monthly')
            decay_rate: 時間減衰率（0-1）
            performance_threshold: 性能低下の閾値（0-1）
        """
        self.base_model = base_model
        self.update_frequency = update_frequency
        self.decay_rate = decay_rate
        self.performance_threshold = performance_threshold

        self.performance_history = []
        self.update_history = []
        self.last_update = None

        logger.info(f"OnlineLearner initialized with {update_frequency} updates")

    def incremental_fit(
        self, X_new: pd.DataFrame, y_new: pd.Series, sample_weight: Optional[np.ndarray] = None
    ) -> None:
        """
        新しいデータで増分学習

        Args:
            X_new: 新しい特徴量データ
            y_new: 新しいラベルデータ
            sample_weight: サンプルの重み（Noneの場合は時間減衰重みを使用）
        """
        if sample_weight is None:
            sample_weight = self._calculate_time_decay_weights(len(X_new))

        logger.info(f"Incremental fit with {len(X_new)} samples")

        try:
            # LightGBMの場合
            if hasattr(self.base_model, "booster_"):
                # 既存モデルを初期値として新しいデータで再訓練
                self.base_model.fit(X_new, y_new, sample_weight=sample_weight, init_model=self.base_model.booster_)
            else:
                # 通常の再訓練
                self.base_model.fit(X_new, y_new, sample_weight=sample_weight)

            self.last_update = datetime.now()
            self.update_history.append(
                {"timestamp": self.last_update, "n_samples": len(X_new), "avg_weight": sample_weight.mean()}
            )

            logger.info(f"Model updated successfully at {self.last_update}")

        except Exception as e:
            logger.error(f"Error during incremental fit: {e}")
            raise

    def _calculate_time_decay_weights(self, n_samples: int) -> np.ndarray:
        """
        時間減衰を考慮した重み計算

        新しいデータほど高い重みを付与します。

        Args:
            n_samples: サンプル数

        Returns:
            正規化された重み配列
        """
        # 指数減衰: 最新データが最も重い
        weights = np.array([self.decay_rate**i for i in range(n_samples - 1, -1, -1)])

        # 正規化
        weights = weights / weights.sum()

        return weights

    def evaluate_and_update(self, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, Any]:
        """
        モデルの性能評価と更新判断

        Args:
            X_test: テストデータの特徴量
            y_test: テストデータのラベル

        Returns:
            評価結果の辞書
        """
        from sklearn.metrics import accuracy_score, precision_score, recall_score

        # 予測
        predictions = self.base_model.predict(X_test)

        # 性能評価
        accuracy = accuracy_score(y_test, predictions)
        precision = precision_score(y_test, predictions, average="weighted", zero_division=0)
        recall = recall_score(y_test, predictions, average="weighted", zero_division=0)

        # 履歴に追加
        performance = {"timestamp": datetime.now(), "accuracy": accuracy, "precision": precision, "recall": recall}
        self.performance_history.append(performance)

        # 更新が必要か判断
        needs_update = self._check_performance_degradation()

        logger.info(f"Performance: Accuracy={accuracy:.4f}, Precision={precision:.4f}, Recall={recall:.4f}")
        logger.info(f"Update needed: {needs_update}")

        return {
            "performance": performance,
            "needs_update": needs_update,
            "performance_history": self.performance_history[-10:],  # 最新10件
        }

    def _check_performance_degradation(self) -> bool:
        """
        性能低下をチェック

        Returns:
            更新が必要な場合True
        """
        if len(self.performance_history) < 10:
            return False

        # 最近5件と過去5件の平均を比較
        recent_avg = np.mean([p["accuracy"] for p in self.performance_history[-5:]])
        past_avg = np.mean([p["accuracy"] for p in self.performance_history[-10:-5]])

        # 閾値以上の性能低下があれば更新が必要
        if recent_avg < past_avg * self.performance_threshold:
            logger.warning(
                f"Performance degradation detected: {recent_avg:.4f} < {past_avg:.4f} * {self.performance_threshold}"
            )
            return True

        return False

    def should_update(self) -> bool:
        """
        更新頻度に基づいて更新すべきか判断

        Returns:
            更新すべき場合True
        """
        if self.last_update is None:
            return True

        time_since_update = (datetime.now() - self.last_update).days

        frequency_days = {"daily": 1, "weekly": 7, "monthly": 30}

        threshold = frequency_days.get(self.update_frequency, 1)

        return time_since_update >= threshold

    def save_model(self, filepath: str) -> None:
        """
        モデルを保存

        Args:
            filepath: 保存先パス
        """
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        model_data = {
            "base_model": self.base_model,
            "performance_history": self.performance_history,
            "update_history": self.update_history,
            "last_update": self.last_update,
            "config": {
                "update_frequency": self.update_frequency,
                "decay_rate": self.decay_rate,
                "performance_threshold": self.performance_threshold,
            },
        }

        with open(filepath, "wb") as f:
            pickle.dump(model_data, f)

        logger.info(f"Model saved to {filepath}")

    def load_model(self, filepath: str) -> None:
        """
        モデルを読み込み

        Args:
            filepath: 読み込み元パス
        """
        with open(filepath, "rb") as f:
            model_data = pickle.load(f)

        self.base_model = model_data["base_model"]
        self.performance_history = model_data["performance_history"]
        self.update_history = model_data["update_history"]
        self.last_update = model_data["last_update"]

        config = model_data["config"]
        self.update_frequency = config["update_frequency"]
        self.decay_rate = config["decay_rate"]
        self.performance_threshold = config["performance_threshold"]

        logger.info(f"Model loaded from {filepath}")

    def get_performance_summary(self) -> Dict[str, Any]:
        """
        性能サマリーを取得

        Returns:
            性能サマリーの辞書
        """
        if not self.performance_history:
            return {"message": "No performance history available"}

        recent_performance = self.performance_history[-10:]

        return {
            "total_updates": len(self.update_history),
            "last_update": self.last_update,
            "recent_accuracy_avg": np.mean([p["accuracy"] for p in recent_performance]),
            "recent_accuracy_std": np.std([p["accuracy"] for p in recent_performance]),
            "recent_precision_avg": np.mean([p["precision"] for p in recent_performance]),
            "recent_recall_avg": np.mean([p["recall"] for p in recent_performance]),
            "performance_trend": self._calculate_trend(),
        }

    def _calculate_trend(self) -> str:
        """
        性能トレンドを計算

        Returns:
            'improving', 'stable', 'degrading'
        """
        if len(self.performance_history) < 5:
            return "insufficient_data"

        recent = [p["accuracy"] for p in self.performance_history[-5:]]

        # 線形回帰で傾きを計算
        x = np.arange(len(recent))
        slope = np.polyfit(x, recent, 1)[0]

        if slope > 0.01:
            return "improving"
        elif slope < -0.01:
            return "degrading"
        else:
            return "stable"


# 使用例
if __name__ == "__main__":
    from lightgbm import LGBMClassifier

    # サンプルデータ
    X = pd.DataFrame(np.random.randn(100, 10))
    y = pd.Series(np.random.randint(0, 2, 100))

    # ベースモデル
    base_model = LGBMClassifier(n_estimators=100, random_state=42)
    base_model.fit(X[:80], y[:80])

    # オンライン学習
    learner = OnlineLearner(base_model, update_frequency="daily")

    # 新しいデータで更新
    X_new = X[80:]
    y_new = y[80:]
    learner.incremental_fit(X_new, y_new)

    # 性能評価
    result = learner.evaluate_and_update(X_new, y_new)
    print("Evaluation result:", result)

    # サマリー
    summary = learner.get_performance_summary()
    print("Performance summary:", summary)
