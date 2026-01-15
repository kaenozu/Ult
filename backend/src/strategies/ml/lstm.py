"""
LSTM戦略（遅延読み込み対応版）
"""

import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

from ..base import Strategy

logger = logging.getLogger(__name__)

# TensorFlow遅延読み込み
_model_cache = {}


def _get_tf_components():
    """TensorFlowコンポーネントを遅延読み込み"""
    try:
        from src.utils.lazy_imports import get_tensorflow, get_keras
        tf = get_tensorflow()
        keras = get_keras()
        return tf, keras, True
    except ImportError:
        logger.warning("TensorFlow not available for LSTM strategy")
        return None, None, False


class DeepLearningStrategy(Strategy):
    def __init__(
        self, lookback=60, epochs=5, batch_size=32, trend_period=200, train_window_days=365, predict_window_days=20
    ):
        super().__init__("Deep Learning (LSTM)", trend_period)
        self.lookback = lookback
        self.epochs = epochs
        self.batch_size = batch_size
        self.train_window_days = train_window_days
        self.predict_window_days = predict_window_days
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self._tf_available = None

    def _check_tf(self):
        """TensorFlowの利用可能性をチェック"""
        if self._tf_available is None:
            _, _, self._tf_available = _get_tf_components()
        return self._tf_available

    def _create_sequences(self, data):
        X, y = [], []
        for i in range(self.lookback, len(data)):
            X.append(data[i - self.lookback : i])
            y.append(data[i, 0])
        return np.array(X), np.array(y)

    def build_model(self, input_shape):
        if not self._check_tf():
            raise ImportError("TensorFlow is required for LSTM model")
        
        tf, keras, _ = _get_tf_components()
        from tensorflow.keras.layers import LSTM, Dense, Dropout
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.optimizers import Adam

        model = Sequential()
        model.add(LSTM(units=50, return_sequences=False, input_shape=input_shape))
        model.add(Dropout(0.2))
        model.add(Dense(units=1))
        model.compile(optimizer=Adam(learning_rate=0.001), loss="mean_squared_error")
        return model

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df is None or df.empty or "Close" not in df.columns:
            return pd.Series(dtype=int)

        if not self._check_tf():
            logger.warning("TensorFlow not available, returning neutral signals")
            return pd.Series(0, index=df.index)

        data = df.copy()
        data["Volume"] = data["Volume"].replace(0, np.nan).ffill()
        data["Volatility"] = data["Close"].rolling(window=20).std() / data["Close"]
        data.dropna(inplace=True)

        if len(data) < self.train_window_days + self.lookback:
            return pd.Series(0, index=df.index)

        feature_cols = ["Close", "Volume", "Volatility"]
        dataset = data[feature_cols].values
        signals = pd.Series(0, index=df.index)

        start_index = self.train_window_days
        end_index = len(dataset)
        step = self.predict_window_days

        logger.info(f"Starting Walk-Forward Validation for DL Strategy... (Total steps: {(end_index - start_index) // step})")

        for current_idx in range(start_index, end_index, step):
            train_start = max(0, current_idx - self.train_window_days)
            train_end = current_idx
            predict_end = min(current_idx + step, end_index)

            if train_end >= predict_end:
                break

            train_data = dataset[train_start:train_end]
            local_scaler = MinMaxScaler(feature_range=(0, 1))
            scaled_train = local_scaler.fit_transform(train_data)

            X_train, y_train = self._create_sequences(scaled_train)

            if len(X_train) == 0:
                continue

            model = self.build_model((X_train.shape[1], X_train.shape[2]))
            model.fit(X_train, y_train, batch_size=self.batch_size, epochs=self.epochs, verbose=0)

            pred_data_start = current_idx - self.lookback
            pred_data_raw = dataset[pred_data_start:predict_end]
            scaled_pred_input = local_scaler.transform(pred_data_raw)
            X_pred, _ = self._create_sequences(scaled_pred_input)

            if len(X_pred) == 0:
                continue

            predictions_scaled = model.predict(X_pred, verbose=0)
            dummy_pred = np.zeros((len(predictions_scaled), len(feature_cols)))
            dummy_pred[:, 0] = predictions_scaled.flatten()
            predictions = local_scaler.inverse_transform(dummy_pred)[:, 0]

            threshold = 0.005

            for i in range(len(predictions)):
                target_df_idx = current_idx + i
                if target_df_idx >= len(data):
                    break
                decision_idx = target_df_idx - 1
                if decision_idx < 0:
                    continue

                current_price = data["Close"].iloc[decision_idx]
                predicted_price = predictions[i]

                if predicted_price > current_price * (1 + threshold):
                    signals.iloc[data.index.get_loc(data.index[decision_idx])] = 1
                elif predicted_price < current_price * (1 - threshold):
                    signals.iloc[data.index.get_loc(data.index[decision_idx])] = -1

        return self.apply_trend_filter(df, signals)

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "ディープラーニング（LSTM）が過去の価格・出来高・変動率から、短期的な上昇トレンドを予測しました。"
        elif signal == -1:
            return "ディープラーニング（LSTM）が過去の価格・出来高・変動率から、短期的な下落トレンドを予測しました。"
        return "予測価格は現在の価格と大きな差がありません。"
