"""
Ensemble Weight Optimizer - アンサンブル重み最適化
過去データから最適なモデル重みを自動学習
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, List

import numpy as np

logger = logging.getLogger(__name__)

WEIGHTS_PATH = "models/optimal_weights.json"


class EnsembleWeightOptimizer:
    """アンサンブル重みの最適化"""

    def __init__(self):
        self.optimal_weights = self._load_weights()
        self.model_names = ["lstm", "lgbm", "prophet", "sma", "transformer"]
        self.last_optimization = None
        self.optimization_interval_days = 14  # 2週間ごとに再最適化

    def _load_weights(self) -> Dict[str, float]:
        """保存済みの最適重みをロード"""
        if os.path.exists(WEIGHTS_PATH):
            try:
                with open(WEIGHTS_PATH, "r") as f:
                    return json.load(f)
            except Exception as e:
                logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

        # デフォルト重み
        return {
            "lstm": 0.25,
            "lgbm": 0.25,
            "prophet": 0.15,
            "sma": 0.10,
            "transformer": 0.25,
        }

    def _save_weights(self, weights: Dict[str, float]):
        """最適重みを保存"""
        os.makedirs(os.path.dirname(WEIGHTS_PATH), exist_ok=True)
        weights["last_updated"] = datetime.now().isoformat()
        with open(WEIGHTS_PATH, "w") as f:
            json.dump(weights, f, indent=2)

    def optimize_weights(self, predictions_history: List[Dict], actual_returns: List[float]) -> Dict[str, float]:
        """
        過去の予測履歴から最適な重みを計算

        Args:
            predictions_history: 各モデルの過去予測結果
            actual_returns: 実際のリターン

        Returns:
            最適な重み辞書
        """
        if len(predictions_history) < 20:
            logger.warning("Not enough history for weight optimization")
            return self.optimal_weights

        try:
            # 各モデルの予測精度を計算
            model_errors = {name: [] for name in self.model_names}

            for pred, actual in zip(predictions_history, actual_returns):
                for model_name in self.model_names:
                    if model_name in pred:
                        model_pred = pred[model_name].get("change_pct", 0)
                        error = abs(model_pred - actual)
                        model_errors[model_name].append(error)

            # 各モデルの平均誤差を計算
            avg_errors = {}
            for model_name, errors in model_errors.items():
                if errors:
                    avg_errors[model_name] = np.mean(errors)
                else:
                    avg_errors[model_name] = 10.0  # デフォルト高誤差

            # 誤差の逆数で重みを計算（誤差が小さいほど重み大）
            inverse_errors = {k: 1.0 / (v + 0.1) for k, v in avg_errors.items()}
            total = sum(inverse_errors.values())

            new_weights = {k: v / total for k, v in inverse_errors.items()}

            # 重みが極端にならないよう制限
            for k in new_weights:
                new_weights[k] = max(0.05, min(0.40, new_weights[k]))

            # 正規化
            total = sum(new_weights.values())
            new_weights = {k: v / total for k, v in new_weights.items()}

            self.optimal_weights = new_weights
            self._save_weights(new_weights)

            logger.info(f"Optimized weights: {new_weights}")
            return new_weights

        except Exception as e:
            logger.error(f"Weight optimization error: {e}")
            return self.optimal_weights

    def get_weights(self) -> Dict[str, float]:
        """現在の最適重みを取得"""
        return self.optimal_weights


# シングルトン
_optimizer = None


def get_weight_optimizer() -> EnsembleWeightOptimizer:
    global _optimizer
    if _optimizer is None:
        _optimizer = EnsembleWeightOptimizer()
    return _optimizer
