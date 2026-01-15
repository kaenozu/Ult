"""
モデルの継続的学習と適応モジュール

- オンライン学習
- 概念ドリフト検出
- 自己教師あり学習
"""

from __future__ import annotations
import logging
import os
import pickle
from typing import Any, List, Optional

import numpy as np
try:
    from sklearn.metrics import mean_squared_error
except ImportError:
    mean_squared_error = None

try:
    from tensorflow import keras
except ImportError:
    keras = None

from .base_predictor import BasePredictor

logger = logging.getLogger(__name__)


class ConceptDriftDetector(BasePredictor):
    """概念ドリフト検出器"""

    def __init__(self, threshold: float = 0.05, window_size: int = 100):
        self.threshold = threshold
        self.window_size = window_size
        self.reference_window = []
        self.current_window = []

        self.current_window = []

    def prepare_model(self, X, y):
        pass

    def fit(self, X, y):
        pass

    def predict(self, X):
        """ドリフト検出器は予測を行わないため、ダミーを返す"""
        return np.zeros(len(X) if hasattr(X, "__len__") else 1)

    def update_and_check(self, new_value: float) -> bool:
        """新しい値を追加し、ドリフトを検出"""
        self.current_window.append(new_value)

        if len(self.current_window) > self.window_size:
            self.current_window.pop(0)

        # 十分なデータが蓄積されたら比較
        if len(self.current_window) == self.window_size:
            if len(self.reference_window) < self.window_size:
                self.reference_window = self.current_window.copy()
                return False

            # 2つのウィンドウの分布を比較（簡易的）
            ref_mean = np.mean(self.reference_window)
            ref_std = np.std(self.reference_window)
            curr_mean = np.mean(self.current_window)
            curr_std = np.std(self.current_window)

            # 平均と標準偏差の変化をチェック
            mean_change = abs(ref_mean - curr_mean) / (ref_std + 1e-8)
            std_change = abs(ref_std - curr_std) / (ref_std + 1e-8)

            drift_detected = (mean_change > self.threshold) or (std_change > self.threshold)

            if drift_detected:
                logger.info(f"Concept drift detected: mean_change={mean_change:.3f}, std_change={std_change:.3f}")
                # 現在のウィンドウを新しいリファレンスにする
                self.reference_window = self.current_window.copy()
                self.current_window = []

            return drift_detected

        return False


class OnlineLearningPredictor:
    """オンライン学習対応の予測器"""

    def __init__(self, base_model: Any, learning_rate: float = 0.001):
        self.base_model = base_model
        self.learning_rate = learning_rate
        self.is_trained = False

        # ドリフト検出器の初期化
        self.drift_detector = ConceptDriftDetector()

        # モデルの保存用パス
        self.model_path = "models/online_model.h5"
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

    def partial_fit(self, X: np.ndarray, y: np.ndarray):
        """部分学習（オンライン学習）"""
        if hasattr(self.base_model, "fit"):
            # 既存モデルを微調整
            if isinstance(self.base_model, keras.Model):
                # Kerasモデルの場合はfine-tuning
                self.base_model.compile(
                    optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate),
                    loss="mse",
                )
                self.base_model.fit(X, y, epochs=1, verbose=0, batch_size=min(32, len(X)))
            elif hasattr(self.base_model, "partial_fit"):
                # sklearnのオンライン学習対応モデル
                self.base_model.partial_fit(X, y)
            else:
                # 通常の学習（オンライン更新は不可）
                logger.warning("Model does not support online learning, using full retraining")

        self.is_trained = True

    def predict_and_update(self, X: np.ndarray, true_y: Optional[np.ndarray] = None) -> np.ndarray:
        """予測とモデル更新"""
        pred = self.base_model.predict(X)

        # 真の値が提供されていれば、ドリフトを検出
        if true_y is not None:
            # 予測誤差をもとにドリフトを検出
            errors = np.abs(pred - true_y)
            avg_error = np.mean(errors)

            drift_detected = self.drift_detector.update_and_check(avg_error)

            if drift_detected:
                logger.info("Retraining model due to concept drift...")
        # ここでは単純に再学習（実際にはより洗練された方法が必要）
        # self.retrain_with_recent_data() などのメソッドを実装

        return pred

    def save_model(self):
        """モデルの保存"""
        if isinstance(self.base_model, keras.Model):
            self.base_model.save(self.model_path)
        else:
            with open(self.model_path.replace(".h5", ".pkl"), "wb") as f:
                pickle.dump(self.base_model, f)

    def load_model(self):
        """モデルの読み込み"""
        model_file = self.model_path
        if os.path.exists(model_file):
            if model_file.endswith(".h5"):
                self.base_model = keras.models.load_model(model_file)
            else:
                model_file = model_file.replace(".h5", ".pkl")
                if os.path.exists(model_file):
                    with open(model_file, "rb") as f:
                        self.base_model = pickle.load(f)
            self.is_trained = True


class SelfSupervisedLearner:
    """自己教師あり学習器"""

    def __init__(self, input_dim: int, features_dim: int = 64):
        self.input_dim = input_dim
        self.features_dim = features_dim
        self.encoder = None
        self.decoder = None
        self.model = None
        self._build_model()

    def _build_model(self):
        """モデル構築"""
        # エンコーダー
        encoder_input = keras.Input(shape=(None, self.input_dim))
        x = keras.layers.LSTM(self.features_dim, return_sequences=False)(encoder_input)
        x = keras.layers.Dense(self.features_dim, activation="relu")(x)
        encoder_output = keras.layers.Dense(self.features_dim)(x)

        self.encoder = keras.Model(encoder_input, encoder_output, name="encoder")

        # デコーダー
        decoder_input = keras.Input(shape=(self.features_dim,))
        x = keras.layers.Dense(self.features_dim, activation="relu")(decoder_input)
        x = keras.layers.Dense(self.input_dim)(x)
        decoder_output = keras.layers.RepeatVector(1)(x)  # 1ステップの出力

        self.decoder = keras.Model(decoder_input, decoder_output, name="decoder")

        # 結合モデル
        inputs = keras.Input(shape=(None, self.input_dim))
        encoded = self.encoder(inputs)
        decoded = self.decoder(encoded)
        self.model = keras.Model(inputs, decoded, name="autoencoder")

        self.model.compile(optimizer="adam", loss="mse", metrics=["mae"])

    def fit(self, X: np.ndarray, epochs: int = 50, validation_split: float = 0.2):
        """自己教師あり学習の実行（オートエンコーダーとして）"""
        return self.model.fit(
            X,
            X,
            epochs=epochs,
            validation_split=validation_split,
            verbose=0,  # 入力と出力が同じ（再構成タスク）
        )

    def extract_features(self, X: np.ndarray) -> np.ndarray:
        """特徴量の抽出"""
        return self.encoder.predict(X)


class AdaptiveEnsemblePredictor:
    """適応的アンサンブル予測器"""

    def __init__(self, base_predictors: List, adaptation_window: int = 50):
        self.base_predictors = base_predictors
        self.adaptation_window = adaptation_window
        self.performance_history = {i: [] for i in range(len(base_predictors))}
        self.weights = np.ones(len(base_predictors)) / len(base_predictors)
        self.prediction_buffer = []
        self.truth_buffer = []

    def predict_and_adapt(self, X: np.ndarray, true_y: Optional[np.ndarray] = None) -> np.ndarray:
        """予測と重みの適応"""
        # すべてのベース予測器から予測を得る
        predictions = []
        for predictor in self.base_predictors:
            if hasattr(predictor, "predict_and_update"):
                pred = predictor.predict_and_update(X, true_y)
            else:
                pred = predictor.predict(X)
            predictions.append(pred)

        # 重み付き平均で最終予測
        final_pred = np.zeros_like(predictions[0])
        for i, pred in enumerate(predictions):
            final_pred += self.weights[i] * pred

        # 真の値が与えられた場合、性能評価と重み更新
        if true_y is not None:
            self._update_weights(predictions, true_y)

        return final_pred

    def _update_weights(self, predictions: List[np.ndarray], true_y: np.ndarray):
        """予測器の重みを更新"""
        # 性能評価（MSE）
        performances = []
        for i, pred in enumerate(predictions):
            perf = 1.0 / (mean_squared_error(true_y, pred) + 1e-8)  # 誤差の逆数
            performances.append(perf)
            self.performance_history[i].append(perf)

        # 履歴が一定数以上溜まったら重みを更新
        if len(self.performance_history[0]) >= self.adaptation_window:
            recent_performances = [
                np.mean(self.performance_history[i][-self.adaptation_window :])
                for i in range(len(self.base_predictors))
            ]

            # 正規化して重みを更新
            total_perf = sum(recent_performances)
            if total_perf > 0:
                self.weights = np.array(recent_performances) / total_perf
            else:
                self.weights = np.ones(len(self.base_predictors)) / len(self.base_predictors)

            # 履歴を保持
            for i in range(len(self.base_predictors)):
                self.performance_history[i] = self.performance_history[i][-self.adaptation_window :]


class ContinualLearningSystem(BasePredictor):
    """継続的学習システムの統合クラス"""

    def __init__(self, base_model: Any = None, features_dim: int = 64):
        self.base_model = base_model
        self.features_dim = features_dim

        # 自己教師あり学習器
        self.self_supervised_learner = SelfSupervisedLearner(
            input_dim=base_model.input_shape[-1] if hasattr(base_model, "input_shape") else features_dim
        )

        # オンライン学習予測器
        self.online_predictor = OnlineLearningPredictor(base_model)

        # 適応的アンサンブル（複数モデル対応）
        self.adaptive_ensemble = None

        self.is_initialized = False

    def prepare_model(self, X, y):
        pass

    def fit(self, X, y):
        pass

    def predict(self, X):
        return self.predict_with_adaptation(X)

    def initialize(self):
        """システムの初期化"""
        # 自己教師あり学習で特徴量エンコーダーを学習
        # （実際には大量のラベルなしデータが必要）

        self.is_initialized = True

    def predict_with_adaptation(self, X: np.ndarray, true_y: Optional[np.ndarray] = None) -> np.ndarray:
        """適応的予測"""
        if not self.is_initialized:
            self.initialize()

        # 自己教師ありで特徴量を抽出（オプショナル）
        if true_y is not None:
            # オンライン学習
            return self.online_predictor.predict_and_update(X, true_y)
        else:
            # 通常の予測
            return self.online_predictor.base_model.predict(X)

    def save_system(self):
        """システム全体の保存"""
        self.online_predictor.save_model()

    def load_system(self):
        """システム全体の読み込み"""
        self.online_predictor.load_model()


if __name__ == "__main__":
    # テスト用コード
    logging.basicConfig(level=logging.INFO)

    # シンプルなモデルでテスト
    model = keras.Sequential(
        [
            keras.layers.LSTM(10, return_sequences=True),
            keras.layers.LSTM(10),
            keras.layers.Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse")

    # ダミーデータ
    X_test = np.random.random((1, 10, 5)).astype(np.float32)
    y_test = np.random.random((1, 1)).astype(np.float32)

    # 継続的学習システムの初期化
    cls = ContinualLearningSystem(model)

    # 予測テスト
    pred = cls.predict_with_adaptation(X_test, y_test)
    print(f"Prediction shape: {pred.shape}, value: {pred[0][0]:.4f}")

    # ドリフト検出器のテスト
    detector = ConceptDriftDetector()
    for i in range(150):
        # 前半は同じ分布、後半は異なる分布
        if i < 75:
            value = np.random.normal(0, 1)
        else:
            value = np.random.normal(2, 1.5)  # 分布が変化

        drift = detector.update_and_check(value)
        if drift:
            print(f"Drift detected at step {i}")

    print("Continual learning components test completed.")
