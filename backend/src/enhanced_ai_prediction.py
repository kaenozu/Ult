#!/usr/bin/env python3
"""
Enhanced AI Prediction System with Multiple Models and Ensemble Learning
複数AIモデルとアンサンブル学習による予測精度改善
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
import json
import logging
from datetime import datetime, timedelta
try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
except ImportError:
    RandomForestClassifier = None
    GradientBoostingClassifier = None
    LogisticRegression = None

try:
    import xgboost as xgb
except ImportError:
    xgb = None

try:
    import lightgbm as lgb
except ImportError:
    lgb = None

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
except ImportError:
    tf = None
    Sequential = None
    LSTM = None
    Dense = None
    Dropout = None

import joblib
import os
import asyncio
from dataclasses import dataclass

# 設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """予測結果データクラス"""

    symbol: str
    prediction: float  # 0-1 (買いシグナルの強さ)
    confidence: float  # 0-1 (信頼度)
    model_predictions: Dict[str, float]  # 各モデルの予測
    ensemble_method: str
    timestamp: datetime
    features_used: List[str]
    accuracy_score: Optional[float] = None


class FeatureEngineering:
    """特徴量エンジニアリング"""

    def __init__(self):
        self.feature_columns = []
        self.scaler = None

    def create_technical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """テクニカル指標特徴量生成"""
        df = df.copy()

        # 移動平均線
        for period in [5, 10, 20, 50]:
            df[f"sma_{period}"] = df["close"].rolling(window=period).mean()
            df[f"ema_{period}"] = df["close"].ewm(span=period).mean()
            df[f"price_sma_{period}_ratio"] = df["close"] / df[f"sma_{period}"]

        # RSI
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df["rsi_14"] = 100 - (100 / (1 + rs))

        # MACD
        ema_12 = df["close"].ewm(span=12).mean()
        ema_26 = df["close"].ewm(span=26).mean()
        df["macd"] = ema_12 - ema_26
        df["macd_signal"] = df["macd"].ewm(span=9).mean()
        df["macd_histogram"] = df["macd"] - df["macd_signal"]

        # ボリンジャーバンド
        bb_period = 20
        bb_std = 2
        df["bb_middle"] = df["close"].rolling(window=bb_period).mean()
        bb_upper = df["bb_middle"] + (df["close"].rolling(window=bb_period).std() * bb_std)
        bb_lower = df["bb_middle"] - (df["close"].rolling(window=bb_period).std() * bb_std)
        df["bb_position"] = (df["close"] - bb_lower) / (bb_upper - bb_lower)

        # ストキャスティクス
        k_period = 14
        d_period = 3
        low_min = df["low"].rolling(window=k_period).min()
        high_max = df["high"].rolling(window=k_period).max()
        df["stoch_k"] = 100 * (df["close"] - low_min) / (high_max - low_min)
        df["stoch_d"] = df["stoch_k"].rolling(window=d_period).mean()

        # ボリューム指標
        df["volume_sma_20"] = df["volume"].rolling(window=20).mean()
        df["volume_ratio"] = df["volume"] / df["volume_sma_20"]
        df["price_volume_trend"] = ((df["close"] - df["close"].shift(1)) / df["close"].shift(1)) * df["volume"]

        # ボラティリティ
        df["atr_14"] = self.calculate_atr(df, 14)
        df["volatility_ratio"] = df["atr_14"] / df["close"]

        # 価格変化率
        for period in [1, 3, 5, 10]:
            df[f"return_{period}d"] = df["close"].pct_change(period)

        return df

    def calculate_atr(self, df: pd.DataFrame, period: int) -> pd.Series:
        """ATR（平均真の幅）計算"""
        high_low = df["high"] - df["low"]
        high_close = np.abs(df["high"] - df["close"].shift())
        low_close = np.abs(df["low"] - df["close"].shift())

        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        return atr

    def create_market_features(self, df: pd.DataFrame, market_data: Dict) -> pd.DataFrame:
        """市場関連特徴量生成"""
        df = df.copy()

        # 市場センチメント
        if "market_sentiment" in market_data:
            df["market_sentiment"] = market_data["market_sentiment"]

        # VIX恐怖指数
        if "vix" in market_data:
            df["vix"] = market_data["vix"]

        # 金利
        if "interest_rate" in market_data:
            df["interest_rate"] = market_data["interest_rate"]

        return df

    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """特徴量準備"""
        # 欠損値処理
        df = df.fillna(method="ffill").fillna(method="bfill").fillna(0)

        # 特徴量カラム選択
        feature_cols = [
            col for col in df.columns if col not in ["open", "high", "low", "close", "volume", "timestamp", "symbol"]
        ]

        self.feature_columns = feature_cols

        return df[feature_cols], feature_cols


class AIModelManager:
    """AIモデル管理"""

    def __init__(self):
        self.models = {}
        self.model_performance = {}
        self.ensemble_weights = {}
        self.feature_engineering = FeatureEngineering()
        self.initialize_models()

    def initialize_models(self):
        """モデル初期化"""
        # Random Forest
        if RandomForestClassifier:
            self.models["random_forest"] = RandomForestClassifier(
                n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
            )

        # Gradient Boosting
        if GradientBoostingClassifier:
            self.models["gradient_boost"] = GradientBoostingClassifier(
                n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42
            )

        # XGBoost
        if xgb:
            self.models["xgboost"] = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                eval_metric="logloss",
            )

        # LightGBM
        if lgb:
            self.models["lightgbm"] = lgb.LGBMClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42)

        # Logistic Regression
        if LogisticRegression:
            self.models["logistic"] = LogisticRegression(random_state=42, max_iter=1000)

        # Neural Network (LSTM)
        self.models["lstm"] = None  # 動的に生成

    def create_lstm_model(self, input_shape: Tuple[int, int]) -> Any:
        """LSTMモデルの構築 (型ヒントを Any に変更してエラー回避)"""
        if tf is None: return None
        model = Sequential(
            [
                LSTM(64, return_sequences=True, input_shape=input_shape),
                Dropout(0.2),
                LSTM(32, return_sequences=False),
                Dropout(0.2),
                Dense(16, activation="relu"),
                Dropout(0.2),
                Dense(1, activation="sigmoid"),
            ]
        )

        model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])

        return model

    def train_models(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        """全モデルの学習"""
        logger.info(f"モデル学習開始 - データサイズ: {len(X)}")

        training_results = {}

        for name, model in self.models.items():
            if name == "lstm":
                continue  # LSTMは別途処理

            try:
                # モデル学習
                model.fit(X, y)

                # 性能評価
                score = model.score(X, y)
                self.model_performance[name] = score
                training_results[name] = score

                logger.info(f"{name}: accuracy = {score:.4f}")

            except Exception as e:
                logger.error(f"{name} 学習エラー: {e}")
                training_results[name] = 0.0

        # LSTM学習
        self.train_lstm(X, y)

        # アンサンブル重み計算
        self.calculate_ensemble_weights()

        return training_results

    def train_lstm(self, X: pd.DataFrame, y: pd.Series):
        """LSTMモデル学習"""
        try:
            # LSTM用データ準備（シーケンスデータ）
            sequence_length = 10
            X_lstm, y_lstm = self.prepare_lstm_data(X, y, sequence_length)

            if len(X_lstm) > 0:
                model = self.create_lstm_model((sequence_length, X.shape[1]))

                # Early Stopping
                early_stopping = tf.keras.callbacks.EarlyStopping(
                    monitor="val_loss", patience=10, restore_best_weights=True
                )

                # 学習
                history = model.fit(
                    X_lstm,
                    y_lstm,
                    epochs=50,
                    batch_size=32,
                    validation_split=0.2,
                    callbacks=[early_stopping],
                    verbose=0,
                )

                self.models["lstm"] = model

                # 性能評価
                _, accuracy = model.evaluate(X_lstm, y_lstm, verbose=0)
                self.model_performance["lstm"] = accuracy
                logger.info(f"LSTM: accuracy = {accuracy:.4f}")

        except Exception as e:
            logger.error(f"LSTM学習エラー: {e}")

    def prepare_lstm_data(self, X: pd.DataFrame, y: pd.Series, sequence_length: int):
        """LSTM用データ準備"""
        X_seq, y_seq = [], []

        for i in range(sequence_length, len(X)):
            X_seq.append(X.iloc[i - sequence_length : i].values)
            y_seq.append(y.iloc[i])

        return np.array(X_seq), np.array(y_seq)

    def calculate_ensemble_weights(self):
        """アンサンブル重み計算"""
        if not self.model_performance:
            return

        # 性能に基づいて重みを計算
        total_performance = sum(self.model_performance.values())

        for name, performance in self.model_performance.items():
            self.ensemble_weights[name] = performance / total_performance

        logger.info(f"アンサンブル重み: {self.ensemble_weights}")

    def predict(self, X: pd.DataFrame) -> PredictionResult:
        """アンサンブル予測実行"""
        model_predictions = {}

        # 各モデルで予測
        for name, model in self.models.items():
            try:
                if name == "lstm" and model is not None:
                    # LSTM用データ準備
                    sequence_length = 10
                    if len(X) >= sequence_length:
                        X_lstm = X.iloc[-sequence_length:].values.reshape(1, sequence_length, X.shape[1])
                        pred = model.predict(X_lstm, verbose=0)[0][0]
                    else:
                        pred = 0.5  # デフォルト値
                else:
                    pred = model.predict_proba(X.tail(1))[:, 1][0]

                model_predictions[name] = float(pred)

            except Exception as e:
                logger.warning(f"{name} 予測エラー: {e}")
                model_predictions[name] = 0.5

        # アンサンブル予測
        ensemble_prediction = self.calculate_ensemble_prediction(model_predictions)

        # 信頼度計算
        confidence = self.calculate_confidence(model_predictions)

        return PredictionResult(
            symbol="",  # 呼び出し元で設定
            prediction=ensemble_prediction,
            confidence=confidence,
            model_predictions=model_predictions,
            ensemble_method="weighted_average",
            timestamp=datetime.now(),
            features_used=list(X.columns),
        )

    def calculate_ensemble_prediction(self, predictions: Dict[str, float]) -> float:
        """アンサンブル予測計算"""
        if not self.ensemble_weights:
            # 重みがない場合は単純平均
            return sum(predictions.values()) / len(predictions)

        weighted_sum = sum(pred * self.ensemble_weights.get(name, 0) for name, pred in predictions.items())

        return weighted_sum

    def calculate_confidence(self, predictions: Dict[str, float]) -> float:
        """信頼度計算"""
        values = list(predictions.values())

        # 予測の分散で信頼度を計算
        variance = np.var(values)

        # 分散が小さいほど信頼度高い
        confidence = 1.0 - min(variance, 1.0)

        return confidence


class EnhancedPredictionSystem:
    """強化された予測システム"""

    def __init__(self):
        self.model_manager = AIModelManager()
        self.prediction_history = []
        self.model_path = "models/ai_prediction"
        os.makedirs(self.model_path, exist_ok=True)

    def prepare_training_data(self, df: pd.DataFrame, target_period: int = 5) -> Tuple[pd.DataFrame, pd.Series]:
        """学習データ準備"""
        df = df.copy()

        # 特徴量生成
        df = self.model_manager.feature_engineering.create_technical_features(df)

        # ターゲット変数生成（将来の価格上昇）
        future_return = df["close"].shift(-target_period) / df["close"] - 1
        y = (future_return > 0.02).astype(int)  # 2%以上上昇したら1

        # 特徴量準備
        X, feature_cols = self.model_manager.feature_engineering.prepare_features(df)

        return X, y

    def train_system(self, historical_data: pd.DataFrame) -> Dict[str, Any]:
        """システム学習実行"""
        logger.info("予測システム学習開始")

        # データ準備
        X, y = self.prepare_training_data(historical_data)

        # 有効なデータのみ使用
        valid_mask = ~(X.isnull().any(axis=1) | y.isnull())
        X_clean = X[valid_mask]
        y_clean = y[valid_mask]

        logger.info(f"学習データ: {len(X_clean)} サンプル")

        # モデル学習
        training_results = self.model_manager.train_models(X_clean, y_clean)

        # モデル保存
        self.save_models()

        return {
            "training_samples": len(X_clean),
            "model_performance": training_results,
            "ensemble_weights": self.model_manager.ensemble_weights,
            "features_used": X_clean.columns.tolist(),
        }

    def predict_signal(self, symbol: str, recent_data: pd.DataFrame, market_data: Dict = None) -> PredictionResult:
        """売買シグナル予測"""
        # 特徴量生成
        df = self.model_manager.feature_engineering.create_technical_features(recent_data)

        if market_data:
            df = self.model_manager.feature_engineering.create_market_features(df, market_data)

        # 特徴量準備
        X, _ = self.model_manager.feature_engineering.prepare_features(df)

        if len(X) == 0:
            raise ValueError("有効な特徴量がありません")

        # 予測実行
        prediction = self.model_manager.predict(X)
        prediction.symbol = symbol

        # 予測結果保存
        self.prediction_history.append(prediction)

        return prediction

    def save_models(self):
        """モデル保存"""
        for name, model in self.model_manager.models.items():
            if name == "lstm":
                if model is not None:
                    model.save(f"{self.model_path}/lstm_model.h5")
            else:
                joblib.dump(model, f"{self.model_path}/{name}_model.pkl")

        # メタデータ保存
        metadata = {
            "feature_columns": self.model_manager.feature_engineering.feature_columns,
            "model_performance": self.model_manager.model_performance,
            "ensemble_weights": self.model_manager.ensemble_weights,
            "saved_at": datetime.now().isoformat(),
        }

        with open(f"{self.model_path}/metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info("モデル保存完了")

    def load_models(self) -> bool:
        """モデル読み込み"""
        try:
            # LSTMモデル
            lstm_path = f"{self.model_path}/lstm_model.h5"
            if os.path.exists(lstm_path):
                self.model_manager.models["lstm"] = tf.keras.models.load_model(lstm_path)

            # その他のモデル
            for name in [
                "random_forest",
                "gradient_boost",
                "xgboost",
                "lightgbm",
                "logistic",
            ]:
                model_path = f"{self.model_path}/{name}_model.pkl"
                if os.path.exists(model_path):
                    self.model_manager.models[name] = joblib.load(model_path)

            # メタデータ
            metadata_path = f"{self.model_path}/metadata.json"
            if os.path.exists(metadata_path):
                with open(metadata_path, "r") as f:
                    metadata = json.load(f)

                self.model_manager.feature_engineering.feature_columns = metadata.get("feature_columns", [])
                self.model_manager.model_performance = metadata.get("model_performance", {})
                self.model_manager.ensemble_weights = metadata.get("ensemble_weights", {})

            logger.info("モデル読み込み完了")
            return True

        except Exception as e:
            logger.error(f"モデル読み込みエラー: {e}")
            return False

    def get_model_performance_summary(self) -> Dict[str, Any]:
        """モデル性能サマリー取得"""
        return {
            "individual_models": self.model_manager.model_performance,
            "ensemble_weights": self.model_manager.ensemble_weights,
            "total_predictions": len(self.prediction_history),
            "accuracy_history": self.calculate_accuracy_history(),
        }

    def calculate_accuracy_history(self) -> List[float]:
        """履歴的正確さ計算"""
        if len(self.prediction_history) < 2:
            return []

        # 実際の結果と比較して精度を計算
        # (実装は実際のデータに依存するため簡略化)
        accuracies = []

        for prediction in self.prediction_history[-100:]:  # 最新100件
            if prediction.accuracy_score:
                accuracies.append(prediction.accuracy_score)

        return accuracies


def main():
    """メイン実行"""
    system = EnhancedPredictionSystem()

    # サンプルデータ生成（実際は市場データから取得）
    dates = pd.date_range(start="2023-01-01", end="2024-01-01", freq="D")
    np.random.seed(42)

    sample_data = pd.DataFrame(
        {
            "timestamp": dates,
            "open": 100 + np.random.randn(len(dates)).cumsum(),
            "high": 100 + np.random.randn(len(dates)).cumsum() + np.random.rand(len(dates)) * 2,
            "low": 100 + np.random.randn(len(dates)).cumsum() - np.random.rand(len(dates)) * 2,
            "close": 100 + np.random.randn(len(dates)).cumsum(),
            "volume": np.random.randint(1000000, 5000000, len(dates)),
        }
    )

    # 高値・安値の整合性修正
    sample_data["high"] = np.maximum(sample_data["high"], sample_data[["open", "close"]].max(axis=1))
    sample_data["low"] = np.minimum(sample_data["low"], sample_data[["open", "close"]].min(axis=1))

    try:
        # システム学習
        training_results = system.train_system(sample_data)
        print("学習完了:", training_results)

        # 予測実行
        recent_data = sample_data.tail(50)
        market_data = {"market_sentiment": 0.6, "vix": 18.5, "interest_rate": 0.005}

        prediction = system.predict_signal("SAMPLE", recent_data, market_data)
        print("予測結果:")
        print(f"シグナル強さ: {prediction.prediction:.3f}")
        print(f"信頼度: {prediction.confidence:.3f}")
        print(f"各モデル予測: {prediction.model_predictions}")

        # 性能サマリー
        performance = system.get_model_performance_summary()
        print("性能サマリー:", performance)

    except Exception as e:
        print(f"エラー: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
