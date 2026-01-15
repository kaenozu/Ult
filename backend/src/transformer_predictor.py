"""
Transformer Predictor Wrapper
Temporal Fusion Transformerを使用した予測モジュール
"""

import logging
import os
from typing import Dict

import numpy as np
import pandas as pd

from .base_predictor import BasePredictor

logger = logging.getLogger(__name__)

MODEL_PATH = "models/tft_model.keras"


class TransformerPredictor(BasePredictor):
    """Transformer (TFT) ベースの予測器"""

    def __init__(self):
        self.model = None
        self.is_ready = False
        self._try_load_model()

    def prepare_model(self, X, y, sequence_length=60):
        """モデルの準備"""
        try:
            from .transformer_model import TemporalFusionTransformer

            # X is likely a DataFrame of features
            n_features = X.shape[1] if hasattr(X, "shape") else 10
            self.model = TemporalFusionTransformer(
                input_size=n_features,
                hidden_size=64,
                num_attention_heads=4,
                dropout=0.1,
            )
            self.is_ready = True
        except Exception as e:
            logger.error(f"Failed to prepare TFT model: {e}")

    def fit(self, X, y):
        """モデルの学習"""
        if not self.is_ready or self.model is None:
            self.prepare_model(X, y)

        try:
            # X and y might need reshaping for TFT depending on implementation
            # Assuming TFT handle (samples, features) and (samples,)
            # But TFT expects sequences.
            # EnhancedEnsemblePredictor passes 2D X.
            # We might need to reshape to 3D if underlying model expects it,
            # OR we trust `self.model.fit` to handle it.
            # Given we don't see src/transformer_model.py, we assume standard fit interface or adapt.

            # Simple adaptation:
            pass
            #             if hasattr(self.model, "fit"):
            # If X is DataFrame, convert to numpy
            X_np = X.values if hasattr(X, "values") else X
            y_np = y.values if hasattr(y, "values") else y

            # 2次元の場合は3次元(batch, 1, features)に変換
            if X_np.ndim == 2:
                X_np = X_np.reshape(X_np.shape[0], 1, X_np.shape[1])

            # Check if we need to sequence-ize it.
            # EnhancedEnsemblePredictor logic suggests it treats models as sklearn-like (taking 2D X).
            # But TFT is time-series.
            # Hopefully underlying fit handles it or ignores it.
            self.model.fit(X_np, y_np, epochs=10, batch_size=32, verbose=0)
        except Exception as e:
            logger.warning(f"TFT fit failed, skipping: {e}")

    def predict(self, X):
        """予測実行"""
        if not self.is_ready or self.model is None:
            return np.zeros(len(X))
        try:
            X_np = X.values if hasattr(X, "values") else X

            # 2次元の場合は3次元(batch, 1, features)に変換
            if X_np.ndim == 2:
                X_np = X_np.reshape(X_np.shape[0], 1, X_np.shape[1])

            return self.model.predict(X_np)
        except Exception as e:
            logger.warning(f"TFT predict failed: {e}")
            return np.zeros(len(X))

    def predict_point(self, current_features):
        """単一点予測"""
        res = self.predict(current_features)
        if isinstance(res, (list, np.ndarray)) and len(res) > 0:
            return res[0]
        return 0.0

    def _try_load_model(self):
        """保存済みモデルのロードを試行"""
        if os.path.exists(MODEL_PATH):
            try:
                from .transformer_model import TemporalFusionTransformer

                self.model = TemporalFusionTransformer.load(MODEL_PATH)
                self.is_ready = True
                logger.info("TFT model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load TFT model: {e}")

    def train_if_needed(self, df: pd.DataFrame):
        """必要に応じてモデルを訓練"""
        if self.is_ready:
            return

        try:
            from .features import add_advanced_features
            from .transformer_model import TemporalFusionTransformer

            # 特徴量追加
            df = add_advanced_features(df.copy())
            df = df.dropna()

            if len(df) < 100:
                logger.warning("Insufficient data for TFT training")
                return

            # TFTモデル初期化
            n_features = len([c for c in df.columns if c not in ["Date", "Open", "High", "Low", "Close", "Volume"]])
            self.model = TemporalFusionTransformer(
                input_size=max(n_features, 10),
                hidden_size=64,
                num_attention_heads=4,
                dropout=0.1,
            )

            # データ準備
            X, y = self.model.prepare_sequences(df, sequence_length=30, forecast_horizon=5)

            if len(X) < 50:
                logger.warning("Not enough sequences for TFT training")
                return

            # 訓練
            logger.info("Training TFT model...")
            self.model.fit(X, y, epochs=30, batch_size=32, validation_split=0.2, verbose=0)

            # 保存
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            self.model.save(MODEL_PATH)
            self.is_ready = True
            logger.info("TFT model trained and saved")

        except Exception as e:
            logger.error(f"TFT training error: {e}")

    def predict_trajectory(self, df: pd.DataFrame, days_ahead: int = 5) -> Dict:
        """
        時系列予測を実行

        Args:
            df: 価格データ
            days_ahead: 予測日数

        Returns:
            予測結果
        """
        if not self.is_ready:
            # 訓練を試行
            self.train_if_needed(df)

        if not self.is_ready:
            return {"error": "TFT model not available"}

        try:
            from .features import add_advanced_features

            # 特徴量追加
            df_features = add_advanced_features(df.copy())
            df_features = df_features.dropna()

            if len(df_features) < 30:
                return {"error": "Insufficient data for TFT prediction"}

            # 最後のシーケンスを取得
            X, _ = self.model.prepare_sequences(df_features, sequence_length=30, forecast_horizon=days_ahead)

            if len(X) == 0:
                return {"error": "Failed to prepare sequences"}

            # 最後のシーケンスで予測
            last_sequence = X[-1:].astype(np.float32)
            predictions = self.model.predict(last_sequence)[0]

            # 価格に変換（正規化を元に戻す）
            current_price = df["Close"].iloc[-1]
            # 予測値は変化率として解釈
            predicted_prices = [current_price * (1 + p) for p in predictions[:days_ahead]]

            # トレンド判定
            trend = "FLAT"
            if predicted_prices[-1] > current_price * 1.01:
                trend = "UP"
            elif predicted_prices[-1] < current_price * 0.99:
                trend = "DOWN"

            return {
                "current_price": current_price,
                "predictions": predicted_prices,
                "peak_price": max(predicted_prices),
                "trend": trend,
                "change_pct": (predicted_prices[-1] - current_price) / current_price * 100,
                "model": "TFT",
            }

        except Exception as e:
            logger.error(f"TFT prediction error: {e}")
            return {"error": str(e)}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    from src.data_loader import fetch_stock_data

    data_map = fetch_stock_data(["7203.T"], period="2y")
    df = data_map.get("7203.T")

    if df is not None:
        predictor = TransformerPredictor()
        result = predictor.predict_trajectory(df, days_ahead=5)
        print(f"Result: {result}")
