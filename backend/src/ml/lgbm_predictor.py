"""
LightGBM予測モデル
決定木ベースの軽量で高速なモデル
"""

import logging
from typing import Any, Dict

try:
    import lightgbm as lgb
except ImportError:
    lgb = None
import pandas as pd

from .base_predictor import BasePredictor

logger = logging.getLogger(__name__)


class LGBMPredictor(BasePredictor):
    def __init__(self):
        self.model = None
        self.params = self._load_optimized_params()

    def _load_optimized_params(self) -> Dict[str, Any]:
        """Load optimized parameters if they exist."""
        try:
            import os
            import json

            if os.path.exists("model_params.json"):
                with open("model_params.json", "r", encoding="utf-8") as f:
                    all_params = json.load(f)
                    return all_params.get("lgbm", {})
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")
        return {}

    def prepare_model(self, X, y):
        """モデルの準備（LGBMでは特に必要なし）"""

    def fit(self, X, y):
        """モデルの学習"""
        # データチェック
        if len(X) != len(y):
            raise ValueError("X and y must have same length")

        # Use optimized params or default
        params = {
            "n_estimators": 100,
            "learning_rate": 0.05,
            "max_depth": 5,
            "verbose": -1,
        }
        params.update(self.params)

        self.model = lgb.LGBMRegressor(**params)
        self.model.fit(X, y)
        return self

    def train(self, X, y):
        """Alias for fit"""
        return self.fit(X, y)

    def predict(self, X):
        """予測実行"""
        if self.model is None:
            raise ValueError("Model not fitted")
        return self.model.predict(X)

    def predict_point(self, current_features):
        """単一点予測（Ensemble互換）"""
        return self.predict(current_features)[0]

    def predict_trajectory(self, df: pd.DataFrame, days_ahead: int = 5) -> dict:
        """
        LightGBMで価格変動率を予測
        """
        try:
            if df is None or df.empty or len(df) < 50:
                return {"error": f"データ不足 (データ数: {len(df) if df is not None else 0})"}

            # 1. 特徴量生成
            data = df.copy()

            # 基本的なテクニカル指標
            data["Returns"] = data["Close"].pct_change()
            data["SMA_5"] = data["Close"].rolling(5).mean()
            data["SMA_20"] = data["Close"].rolling(20).mean()
            data["Volatility"] = data["Close"].rolling(20).std()

            # RSI（簡易版）
            delta = data["Close"].diff()
            gain = (delta.where(delta > 0, 0)).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / loss
            data["RSI"] = 100 - (100 / (1 + rs))

            data.dropna(inplace=True)

            if len(data) < 30:
                return {"error": "有効データ不足"}

            # 2. ターゲット変数の作成（翌日のリターン）
            data["Target"] = data["Close"].pct_change().shift(-1)
            data.dropna(inplace=True)

            # 3. 特徴量とターゲットを分離
            feature_cols = ["Returns", "SMA_5", "SMA_20", "Volatility", "RSI"]
            X = data[feature_cols].values
            y = data["Target"].values

            # 4. 学習
            # 直近80%を学習、残り20%をテスト用に（ただし予測では使わない）
            split_idx = int(len(X) * 0.8)
            X_train, y_train = X[:split_idx], y[:split_idx]

            self.model = lgb.LGBMRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, verbose=-1)
            self.model.fit(X_train, y_train)

            # 5. 未来予測（再帰的）
            current_price = df["Close"].iloc[-1]
            last_features = X[-1].copy()
            predictions = []

            for _ in range(days_ahead):
                # 予測
                pred_return = self.model.predict([last_features])[0]

                # 次の価格を計算
                next_price = current_price * (1 + pred_return)
                predictions.append(next_price)

                # 特徴量を更新（簡易的に、直近の値を維持）
                # 実際には、新しい価格から再計算すべきだが、ここでは簡略化
                current_price = next_price

            # 6. 結果の整形
            peak_price = max(predictions)
            peak_day_idx = predictions.index(peak_price)

            initial_price = df["Close"].iloc[-1]
            trend = "FLAT"
            if predictions[-1] > initial_price * 1.01:
                trend = "UP"
            elif predictions[-1] < initial_price * 0.99:
                trend = "DOWN"

            return {
                "current_price": initial_price,
                "predictions": predictions,
                "peak_price": peak_price,
                "peak_day": peak_day_idx + 1,
                "trend": trend,
                "change_pct": (predictions[-1] - initial_price) / initial_price * 100,
            }

        except Exception as e:
            logger.error(f"LGBM prediction error: {e}")
            return {"error": str(e)}
