"""
複数ホライズン（1日/5日/20日）を並列に学習し、バンディット風に重み付けする軽量エキスパート。
"""

import logging
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from src.walkforward_blender import WalkForwardBlender

logger = logging.getLogger(__name__)


class HorizonExpertEnsemble:
    def __init__(self, horizons: Optional[List[int]] = None) -> None:
        self.horizons = horizons or [1, 5, 20]
        self.models: Dict[int, WalkForwardBlender] = {h: WalkForwardBlender(horizon=h) for h in self.horizons}
        self.weights: Dict[int, float] = {h: 1.0 / len(self.horizons) for h in self.horizons}

    def fit(self, df: pd.DataFrame, external_features: Optional[Dict] = None) -> Dict[int, Dict[str, float]]:
        metrics: Dict[int, Dict[str, float]] = {}
        for h, model in self.models.items():
            try:
                metrics[h] = model.fit(df, target_col="Close", external_features=external_features)
                # 重みはRMSEの逆数で初期化
                rmse = metrics[h].get("rmse", 1.0)
                self.weights[h] = 1.0 / (rmse + 1e-6)
            except Exception as exc:
                logger.warning("Horizon %s training skipped: %s", h, exc)
                metrics[h] = {}
                self.weights[h] = 0.0

        # 正規化
        total = sum(self.weights.values()) or 1.0
        self.weights = {k: v / total for k, v in self.weights.items()}
        return metrics

    def predict(self, df: pd.DataFrame, external_features: Optional[Dict] = None) -> np.ndarray:
        preds = []
        weights = []
        for h, model in self.models.items():
            if not model.base_models:
                continue
            try:
                pred = model.predict(df, external_features=external_features)
                preds.append(pred * self.weights.get(h, 0.0))
                weights.append(self.weights.get(h, 0.0))
            except Exception as exc:
                logger.debug("Prediction failed for horizon %s: %s", h, exc)
        if not preds:
            raise ValueError("No trained horizons available.")
        return np.sum(preds, axis=0)

    def predict_interval(self, df: pd.DataFrame, external_features: Optional[Dict] = None) -> Dict[int, tuple]:
        """ホライズンごとの区間予測を返す。"""
        intervals: Dict[int, tuple] = {}
        for h, model in self.models.items():
            if not model.base_models:
                continue
            try:
                intervals[h] = model.predict_interval(df, external_features=external_features)
            except Exception as exc:
                logger.debug("Interval prediction failed for horizon %s: %s", h, exc)
        return intervals

    def needs_retrain(self, df: pd.DataFrame, external_features: Optional[Dict] = None) -> Dict[int, Dict]:
        decisions: Dict[int, Dict] = {}
        for h, model in self.models.items():
            try:
                drift, details = model.needs_retrain(df, external_features=external_features)
                decisions[h] = {"retrain": drift, "details": details}
            except Exception as exc:
                decisions[h] = {"retrain": True, "details": {"error": str(exc)}}
        return decisions
