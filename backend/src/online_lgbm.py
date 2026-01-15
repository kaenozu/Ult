"""
Online Learning Wrapper for LightGBM
LightGBMモデルに継続的学習機能を追加
"""

import logging
import os
from datetime import datetime

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

ONLINE_MODEL_PATH = "models/lgbm_online.pkl"


class OnlineLGBMPredictor:
    """オンライン学習対応のLightGBM予測器"""

    def __init__(self):
        self.learner = None
        self.last_update = None
        self.update_interval_days = 7  # 週次更新
        self._initialize()

    def _initialize(self):
        """初期化"""
        try:
            from lightgbm import LGBMClassifier

            from src.online_learning import OnlineLearner

            # ベースモデル
            base_model = LGBMClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                verbose=-1,
            )

            self.learner = OnlineLearner(
                base_model=base_model,
                update_frequency="weekly",
                decay_rate=0.95,
                performance_threshold=0.9,
            )

            # 保存済みモデルをロード
            if os.path.exists(ONLINE_MODEL_PATH):
                self.learner.load_model(ONLINE_MODEL_PATH)
                logger.info("Online LightGBM model loaded")

        except Exception as e:
            logger.error(f"Failed to initialize Online LightGBM: {e}")

    def update_if_needed(self, df: pd.DataFrame):
        """必要に応じてモデルを更新"""
        if self.learner is None:
            return False

        # 更新間隔チェック
        if self.last_update:
            days_since_update = (datetime.now() - self.last_update).days
            if days_since_update < self.update_interval_days:
                return False

        try:
            from src.features import add_advanced_features

            # 特徴量準備
            df_features = add_advanced_features(df.copy())
            df_features = df_features.dropna()

            if len(df_features) < 50:
                return False

            # ターゲット作成（翌日リターン）
            df_features["target"] = (df_features["Close"].shift(-1) > df_features["Close"]).astype(int)
            df_features = df_features.dropna()

            # 特徴量とターゲット
            exclude_cols = ["Date", "Open", "High", "Low", "Close", "Volume", "target"]
            feature_cols = [c for c in df_features.columns if c not in exclude_cols]
            feature_cols = df_features[feature_cols].select_dtypes(include=[np.number]).columns.tolist()

            X = df_features[feature_cols]
            y = df_features["target"]

            # 増分学習を実行
            if self.learner.should_update():
                self.learner.incremental_fit(X, y)
                self.learner.save_model(ONLINE_MODEL_PATH)
                self.last_update = datetime.now()
                logger.info("Online LightGBM model updated")
                return True

        except Exception as e:
            logger.error(f"Online learning update error: {e}")

        return False

    def get_performance_summary(self) -> dict:
        """性能サマリーを取得"""
        if self.learner is None:
            return {"status": "not_initialized"}

        return self.learner.get_performance_summary()


# シングルトンインスタンス
_online_predictor = None


def get_online_lgbm() -> OnlineLGBMPredictor:
    global _online_predictor
    if _online_predictor is None:
        _online_predictor = OnlineLGBMPredictor()
    return _online_predictor


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    from src.data_loader import fetch_stock_data

    data_map = fetch_stock_data(["7203.T"], period="2y")
    df = data_map.get("7203.T")

    if df is not None:
        predictor = get_online_lgbm()
        updated = predictor.update_if_needed(df)
        print(f"Updated: {updated}")
        print(f"Summary: {predictor.get_performance_summary()}")
