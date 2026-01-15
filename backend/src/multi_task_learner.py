"""
Multi-Task Learner - マルチタスク学習
価格、方向、ボラティリティを同時に予測
"""

import logging
from typing import Dict, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class MultiTaskPredictor:
    """マルチタスク予測器"""

    def __init__(self):
        self.model = None
        self.is_ready = False

    def prepare_targets(self, df: pd.DataFrame, horizon: int = 5) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        3つのターゲットを準備

        Args:
            df: 価格データ
            horizon: 予測期間

        Returns:
            (price_change, direction, volatility) のタプル
        """
        close = df["Close"].values

        # 1. 価格変化率
        price_change = (np.roll(close, -horizon) - close) / close * 100
        price_change[-horizon:] = np.nan

        # 2. 方向（上昇=1, 下落=0）
        direction = (np.roll(close, -horizon) > close).astype(float)
        direction[-horizon:] = np.nan

        # 3. ボラティリティ（将来h日間の標準偏差）
        returns = pd.Series(close).pct_change()
        volatility = returns.rolling(horizon).std().shift(-horizon).values

        return price_change, direction, volatility

    def predict_multi_task(self, df: pd.DataFrame, days_ahead: int = 5) -> Dict:
        """
        マルチタスク予測を実行

        各ターゲットを個別モデルで予測し、結果を統合

        Args:
            df: 価格データ
            days_ahead: 予測日数

        Returns:
            予測結果
        """
        try:
            from lightgbm import LGBMClassifier, LGBMRegressor

            from src.features import add_advanced_features

            # 特徴量準備
            df_features = add_advanced_features(df.copy())
            df_features = df_features.dropna()

            if len(df_features) < 100:
                return {"error": "Insufficient data for multi-task learning"}

            # ターゲット準備
            price_change, direction, volatility = self.prepare_targets(df_features, days_ahead)

            # 特徴量抽出
            exclude = ["Date", "Open", "High", "Low", "Close", "Volume"]
            feature_cols = [c for c in df_features.columns if c not in exclude]
            feature_cols = df_features[feature_cols].select_dtypes(include=[np.number]).columns.tolist()

            X = df_features[feature_cols].values

            # 有効なデータのみ使用
            valid_idx = ~np.isnan(direction) & ~np.isnan(price_change) & ~np.isnan(volatility)
            X_valid = X[valid_idx]
            dir_valid = direction[valid_idx]
            price_valid = price_change[valid_idx]
            vol_valid = volatility[valid_idx]

            if len(X_valid) < 50:
                return {"error": "Not enough valid samples"}

            # 訓練/テスト分割
            split = int(len(X_valid) * 0.8)
            X_train = X_valid[:split]

            # 1. Direction予測
            dir_model = LGBMClassifier(n_estimators=50, max_depth=3, random_state=42, verbose=-1)
            dir_model.fit(X_train, dir_valid[:split])
            dir_pred = dir_model.predict_proba(X[-1:])[:, 1][0]

            # 2. Price change予測
            price_model = LGBMRegressor(n_estimators=50, max_depth=3, random_state=42, verbose=-1)
            price_model.fit(X_train, price_valid[:split])
            price_pred = price_model.predict(X[-1:])[0]

            # 3. Volatility予測
            vol_model = LGBMRegressor(n_estimators=50, max_depth=3, random_state=42, verbose=-1)
            vol_model.fit(X_train, vol_valid[:split])
            vol_pred = vol_model.predict(X[-1:])[0]

            # トレンド判定
            if dir_pred > 0.55:
                trend = "UP"
            elif dir_pred < 0.45:
                trend = "DOWN"
            else:
                trend = "FLAT"

            return {
                "trend": trend,
                "direction_probability": dir_pred,
                "expected_change_pct": price_pred,
                "expected_volatility": vol_pred,
                "confidence": abs(dir_pred - 0.5) * 2,
                "model": "MultiTask",
            }

        except Exception as e:
            logger.error(f"Multi-task prediction error: {e}")
            return {"error": str(e)}


# シングルトン
_predictor = None


def get_multi_task_predictor() -> MultiTaskPredictor:
    global _predictor
    if _predictor is None:
        _predictor = MultiTaskPredictor()
    return _predictor
