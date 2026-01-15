"""
Feature Importance Filter - SHAP特徴量フィルター
重要度の低い特徴量を自動除外して予測精度を向上
"""

import json
import logging
import os
from typing import Dict, List

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

IMPORTANCE_PATH = "models/feature_importance.json"


class FeatureImportanceFilter:
    """特徴量重要度フィルター"""

    def __init__(self, min_importance: float = 0.01):
        self.min_importance = min_importance
        self.importance_scores = self._load_importance()
        self.selected_features = []

    def _load_importance(self) -> Dict[str, float]:
        """保存済みの重要度をロード"""
        if os.path.exists(IMPORTANCE_PATH):
            try:
                with open(IMPORTANCE_PATH, "r") as f:
                    return json.load(f)
            except Exception as e:
                logging.getLogger(__name__).debug(f"Non-critical exception: {e}")
        return {}

    def _save_importance(self, scores: Dict[str, float]):
        """重要度を保存"""
        os.makedirs(os.path.dirname(IMPORTANCE_PATH), exist_ok=True)
        with open(IMPORTANCE_PATH, "w") as f:
            json.dump(scores, f, indent=2)

    def calculate_importance(self, model, X: pd.DataFrame, feature_names: List[str]) -> Dict[str, float]:
        """
        SHAPを使用して特徴量重要度を計算

        Args:
            model: 学習済みモデル
            X: 特徴量データ
            feature_names: 特徴量名リスト

        Returns:
            特徴量名と重要度の辞書
        """
        try:
            import shap

            # サンプリング（計算時間短縮）
            if len(X) > 100:
                X_sample = X.sample(100, random_state=42)
            else:
                X_sample = X

            # SHAP値計算
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_sample)

            # 平均絶対SHAP値で重要度計算
            if isinstance(shap_values, list):
                shap_values = shap_values[1]  # Binary classification

            importance = np.abs(shap_values).mean(axis=0)

            # 正規化
            total = importance.sum()
            if total > 0:
                importance = importance / total

            # 辞書に変換
            scores = dict(zip(feature_names, importance))

            self.importance_scores = scores
            self._save_importance(scores)

            return scores

        except Exception as e:
            logger.warning(f"SHAP calculation failed: {e}")
            return {}

    def filter_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        重要度の低い特徴量を除外

        Args:
            df: 元のデータフレーム

        Returns:
            フィルタ後のデータフレーム
        """
        if not self.importance_scores:
            return df

        # 重要な特徴量のみ選択
        important_features = [
            f for f, score in self.importance_scores.items() if score >= self.min_importance and f in df.columns
        ]

        if not important_features:
            return df

        # 必須カラムは保持
        required = ["Date", "Open", "High", "Low", "Close", "Volume"]
        keep_cols = list(set(required + important_features) & set(df.columns))

        self.selected_features = [f for f in important_features if f not in required]

        logger.info(f"Selected {len(self.selected_features)} important features out of {len(df.columns)}")

        return df[keep_cols]

    def get_top_features(self, n: int = 10) -> List[tuple]:
        """上位n件の重要特徴量を取得"""
        if not self.importance_scores:
            return []

        sorted_features = sorted(self.importance_scores.items(), key=lambda x: x[1], reverse=True)

        return sorted_features[:n]


# シングルトン
_filter = None


def get_feature_filter() -> FeatureImportanceFilter:
    global _filter
    if _filter is None:
        _filter = FeatureImportanceFilter()
    return _filter
