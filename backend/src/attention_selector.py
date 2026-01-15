"""
Attention Feature Selector - アテンション特徴選択
重要な時点とフィーチャーを自動的にフォーカス
"""

import logging
from typing import Dict, List

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class AttentionFeatureSelector:
    """アテンション機構による特徴選択"""

    def __init__(self, window_size: int = 20):
        self.window_size = window_size
        self.attention_weights = None
        self.feature_scores = {}

    def compute_temporal_attention(self, df: pd.DataFrame) -> np.ndarray:
        """
        時系列データの各時点の重要度を計算

        直近のデータほど重要（指数減衰）+ ボラティリティ高い時点も重要

        Args:
            df: 価格データ

        Returns:
            注意重みの配列
        """
        n = len(df)
        if n == 0:
            return np.array([])

        # 1. 時間的減衰（直近ほど高い）
        time_decay = np.exp(-0.1 * np.arange(n)[::-1])

        # 2. ボラティリティベース（変動大きい時点は重要）
        if "Close" in df.columns:
            returns = df["Close"].pct_change().fillna(0).abs()
            volatility_weight = (returns - returns.min()) / (returns.max() - returns.min() + 1e-10)
        else:
            volatility_weight = np.ones(n)

        # 3. 出来高ベース（出来高大きい時点は重要）
        if "Volume" in df.columns:
            volume = df["Volume"].fillna(0)
            volume_weight = (volume - volume.min()) / (volume.max() - volume.min() + 1e-10)
        else:
            volume_weight = np.ones(n)

        # 組み合わせ
        combined = 0.6 * time_decay + 0.2 * volatility_weight.values + 0.2 * volume_weight.values

        # 正規化
        attention = combined / combined.sum()
        self.attention_weights = attention

        return attention

    def select_important_features(self, df: pd.DataFrame, n_features: int = 20) -> List[str]:
        """
        重要な特徴量を選択

        Args:
            df: 特徴量データ
            n_features: 選択する特徴量数

        Returns:
            重要な特徴量名リスト
        """
        exclude_cols = ["Date", "Open", "High", "Low", "Close", "Volume"]
        feature_cols = [c for c in df.columns if c not in exclude_cols]

        if not feature_cols:
            return []

        # 各特徴量のスコアを計算
        scores = {}
        for col in feature_cols:
            try:
                series = df[col].dropna()
                if len(series) == 0:
                    continue

                # 分散が高い特徴量は情報量が多い
                variance = series.var()

                # 終値との相関が高い特徴量は予測に有用
                if "Close" in df.columns:
                    corr = abs(df[col].corr(df["Close"]))
                else:
                    corr = 0

                scores[col] = 0.5 * variance + 0.5 * corr

            except Exception:
                continue

        self.feature_scores = scores

        # スコア上位を選択
        sorted_features = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        selected = [f[0] for f in sorted_features[:n_features]]

        logger.info(f"Selected {len(selected)} important features")
        return selected

    def apply_attention_weights(self, X: np.ndarray, attention: np.ndarray) -> np.ndarray:
        """
        データにアテンション重みを適用

        Args:
            X: 入力データ (samples, timesteps, features)
            attention: アテンション重み

        Returns:
            重み付きデータ
        """
        if len(attention) != X.shape[1]:
            # サイズ合わせ
            attention = np.interp(
                np.linspace(0, 1, X.shape[1]),
                np.linspace(0, 1, len(attention)),
                attention,
            )

        # 各時点に重みを適用
        weighted = X * attention[:, np.newaxis]
        return weighted

    def get_attention_summary(self) -> Dict:
        """アテンション情報のサマリーを取得"""
        return {
            "top_features": list(self.feature_scores.items())[:10] if self.feature_scores else [],
            "attention_weights": self.attention_weights.tolist() if self.attention_weights is not None else [],
        }


# シングルトン
_selector = None


def get_attention_selector() -> AttentionFeatureSelector:
    global _selector
    if _selector is None:
        _selector = AttentionFeatureSelector()
    return _selector
