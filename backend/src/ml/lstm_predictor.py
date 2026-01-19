"""
LSTM Time Series Prediction Model
LSTM時系列予測モデル
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, accuracy_score

# Try to import tensorflow/keras
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("TensorFlow not available. LSTM model will be skipped.")

logger = logging.getLogger(__name__)


class LSTMStockPredictor:
    """LSTM株価予測器"""

    def __init__(self, sequence_length: int = 60, feature_count: int = 10):
        self.sequence_length = sequence_length
        self.feature_count = feature_count
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(-1, 1))
        self.is_trained = False

        if not TENSORFLOW_AVAILABLE:
            logger.warning("TensorFlow not available. LSTM model cannot be created.")

    def prepare_sequences(self, data: np.ndarray, target: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """LSTM用シーケンスデータ準備"""
        X, y = [], []

        for i in range(self.sequence_length, len(data)):
            X.append(data[i - self.sequence_length : i])
            y.append(target[i])

        return np.array(X), np.array(y)

    def create_model(self) -> Optional[any]:
        """LSTMモデル作成"""
        if not TENSORFLOW_AVAILABLE:
            return None

        model = Sequential(
            [
                # 1つ目のLSTM層
                LSTM(
                    64,
                    return_sequences=True,
                    input_shape=(self.sequence_length, self.feature_count),
                ),
                BatchNormalization(),
                Dropout(0.2),
                # 2つ目のLSTM層
                LSTM(32, return_sequences=False),
                BatchNormalization(),
                Dropout(0.2),
                # Dense層
                Dense(16, activation="relu"),
                Dropout(0.1),
                Dense(8, activation="relu"),
                Dense(1, activation="linear"),  # 価格変化率を予測
            ]
        )

        # モデルコンパイル
        model.compile(optimizer=Adam(learning_rate=0.001), loss="mse", metrics=["mae"])

        return model

    def train(self, X: pd.DataFrame, y: pd.Series, validation_split: float = 0.2) -> Dict:
        """LSTMモデル学習"""
        if not TENSORFLOW_AVAILABLE:
            return {"error": "TensorFlow not available"}

        logger.info("LSTMモデル学習開始")

        # データのスケーリング
        X_scaled = self.scaler.fit_transform(X)

        # シーケンスデータ作成
        X_seq, y_seq = self.prepare_sequences(X_scaled, y.values)

        if len(X_seq) < 100:
            return {"error": "Insufficient data for LSTM training"}

        # 学習・検証データ分割
        split_idx = int(len(X_seq) * (1 - validation_split))
        X_train, X_val = X_seq[:split_idx], X_seq[split_idx:]
        y_train, y_val = y_seq[:split_idx], y_seq[split_idx:]

        # モデル作成
        self.model = self.create_model()

        # コールバック設定
        callbacks = [
            EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-7),
        ]

        # モデル学習
        history = self.model.fit(
            X_train,
            y_train,
            validation_data=(X_val, y_val),
            epochs=50,
            batch_size=32,
            callbacks=callbacks,
            verbose=1,
        )

        self.is_trained = True

        # 学習結果の評価
        train_pred = self.model.predict(X_train)
        val_pred = self.model.predict(X_val)

        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
        train_mae = mean_absolute_error(y_train, train_pred)
        val_mae = mean_absolute_error(y_val, val_pred)

        # 方向性精度
        train_direction = accuracy_score((y_train > 0), (train_pred > 0))
        val_direction = accuracy_score((y_val > 0), (val_pred > 0))

        training_info = {
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "train_rmse": train_rmse,
            "val_rmse": val_rmse,
            "train_mae": train_mae,
            "val_mae": val_mae,
            "train_direction": train_direction,
            "val_direction": val_direction,
            "epochs_trained": len(history.history["loss"]),
        }

        logger.info(f"LSTM学習完了 - 検証精度: {val_direction:.3f}")
        return training_info

    def predict(self, X: pd.DataFrame, last_n_sequences: int = 1) -> np.ndarray:
        """予測実行"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        if not TENSORFLOW_AVAILABLE:
            raise ValueError("TensorFlow not available")

        # データのスケーリング
        X_scaled = self.scaler.transform(X)

        # 最新のシーケンスを取得
        if len(X_scaled) < self.sequence_length:
            raise ValueError("Insufficient data for prediction")

        # 最後のN個のシーケンスで予測
        predictions = []
        for i in range(last_n_sequences):
            start_idx = len(X_scaled) - self.sequence_length - i
            sequence = X_scaled[start_idx : start_idx + self.sequence_length]
            sequence = sequence.reshape(1, self.sequence_length, self.feature_count)

            pred = self.model.predict(sequence, verbose=0)[0][0]
            predictions.append(pred)

        return np.array(predictions)

    def evaluate(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """モデル評価"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        if not TENSORFLOW_AVAILABLE:
            raise ValueError("TensorFlow not available")

        # データ準備
        X_scaled = self.scaler.transform(X)
        X_seq, y_seq = self.prepare_sequences(X_scaled, y.values)

        if len(X_seq) == 0:
            return {"error": "No valid sequences for evaluation"}

        # 予測
        predictions = self.model.predict(X_seq, verbose=0)
        predictions = predictions.flatten()

        # 評価指標計算
        rmse = np.sqrt(mean_squared_error(y_seq, predictions))
        mae = mean_absolute_error(y_seq, predictions)
        direction = accuracy_score((y_seq > 0), (predictions > 0))

        return {
            "rmse": rmse,
            "mae": mae,
            "direction_accuracy": direction,
            "samples": len(X_seq),
        }

    def save_model(self, filepath: str):
        """モデル保存"""
        if self.model is not None and self.is_trained:
            self.model.save(filepath)
            logger.info(f"LSTM model saved to: {filepath}")
        else:
            logger.warning("No trained model to save")

    def load_model(self, filepath: str):
        """モデル読み込み"""
        try:
            if TENSORFLOW_AVAILABLE:
                self.model = tf.keras.models.load_model(filepath)
                self.is_trained = True
                logger.info(f"LSTM model loaded from: {filepath}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")


def test_lstm_prediction():
    """LSTM予測テスト"""
    import yfinance as yf

    logger.info("LSTM予測モデルテスト開始")

    if not TENSORFLOW_AVAILABLE:
        print("ERROR: TensorFlow not available. Please install with: pip install tensorflow")
        return None

    # テスト銘柄
    ticker = "7203.T"

    try:
        # データ取得
        stock = yf.Ticker(ticker)
        df = stock.history(period="1y")

        if df.empty:
            logger.error(f"No data for {ticker}")
            return None

        logger.info(f"{ticker}: データ取得 {len(df)} 日分")

        # 特徴量作成
        df_features = df.copy()

        # テクニカル指標
        df_features["SMA_5"] = df["Close"].rolling(5).mean()
        df_features["SMA_20"] = df["Close"].rolling(20).mean()
        df_features["RSI"] = calculate_rsi(df["Close"], 14)
        df_features["MACD"] = df["Close"].ewm(span=12).mean() - df["Close"].ewm(span=26).mean()
        df_features["Volatility"] = df["Close"].rolling(20).std()
        df_features["Price_Change"] = df["Close"].pct_change(1)
        df_features["Volume_MA"] = df["Volume"].rolling(20).mean()
        df_features["High_Low_Ratio"] = df["High"] / df["Low"]
        df_features["Close_to_MA20"] = df["Close"] / df["SMA_20"]

        # ターゲット変数（翌日の価格変化率）
        df_features["Target"] = df_features["Close"].pct_change(1).shift(-1)

        # 欠損値処理
        df_clean = df_features.dropna()

        if len(df_clean) < 100:
            logger.error("Insufficient data after cleaning")
            return None

        # 特徴量とターゲットを分離
        feature_cols = [
            "Close",
            "Volume",
            "SMA_5",
            "SMA_20",
            "RSI",
            "MACD",
            "Volatility",
            "Price_Change",
            "Volume_MA",
            "High_Low_Ratio",
            "Close_to_MA20",
        ]
        X = df_clean[feature_cols]
        y = df_clean["Target"]

        logger.info(f"特徴量: {len(X.columns)}、サンプル数: {len(X)}")

        # LSTMモデル作成と学習
        lstm_model = LSTMStockPredictor(sequence_length=30, feature_count=len(feature_cols))

        # 学習
        training_info = lstm_model.train(X, y, validation_split=0.2)

        if "error" in training_info:
            print(f"LSTM学習失敗: {training_info['error']}")
            return None

        print(f"\nLSTM学習結果:")
        print(f"学習サンプル: {training_info['train_samples']}")
        print(f"検証サンプル: {training_info['val_samples']}")
        print(f"学習RMSE: {training_info['train_rmse']:.6f}")
        print(f"検証RMSE: {training_info['val_rmse']:.6f}")
        print(f"検証方向性精度: {training_info['val_direction']:.3f}")

        # 最新予測
        latest_predictions = lstm_model.predict(X, last_n_sequences=5)

        print(f"\n最新5日間の予測:")
        for i, pred in enumerate(latest_predictions):
            signal = "HOLD"
            if pred > 0.01:
                signal = "BUY"
            elif pred < -0.01:
                signal = "SELL"
            print(f"  {i + 1}日先: {pred[0]:.4f} ({signal})")

        # 評価
        evaluation = lstm_model.evaluate(X, y)

        print(f"\n最終評価:")
        print(f"RMSE: {evaluation['rmse']:.6f}")
        print(f"MAE: {evaluation['mae']:.6f}")
        print(f"方向性精度: {evaluation['direction_accuracy']:.3f}")

        return {
            "model": lstm_model,
            "training_info": training_info,
            "evaluation": evaluation,
            "latest_predictions": latest_predictions,
        }

    except Exception as e:
        logger.error(f"Error in LSTM test: {e}")
        return None


def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """RSI計算"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


if __name__ == "__main__":
    result = test_lstm_prediction()

    if result:
        print(f"\nLSTM予測モデルテスト完了")
        print(f"最終方向性精度: {result['evaluation']['direction_accuracy']:.1%}")
    else:
        print(f"LSTM予測モデルテスト失敗")
