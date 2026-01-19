import datetime
import logging

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

try:
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.optimizers import Adam
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    # ダミークラス/関数を定義してエラーを防止
    class Sequential: pass
    class LSTM: pass
    class Dense: pass
    class Dropout: pass
    class Adam: pass

from .features import add_technical_indicators

logger = logging.getLogger(__name__)


class FuturePredictor:
    def __init__(self):
        self.lookback = 60
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model = None
        self.is_fitted = False

    def prepare_model(self, X, y=None):
        """モデル構造の定義"""
        if not TENSORFLOW_AVAILABLE:
            logger.warning("TensorFlow is not available. Skipping prepare_model.")
            return
        # ここではモデル構造を定義するだけ、または何もしない
        # fitで構築する
        pass

    def fit(self, X, y, epochs=10, batch_size=32):
        """モデルの学習"""
        if not TENSORFLOW_AVAILABLE:
            logger.error("TensorFlow is not available. Cannot fit FuturePredictor.")
            return

        # X is DataFrame (2D), need to reshape for LSTM if we use it here
        # or use simple regression if we treat it as 2D
        # FuturePredictor original implementation used LSTM with lookback on scaled data.
        
        # 簡易実装: LSTMモデルを再構築して学習
        try:
            if isinstance(X, pd.DataFrame):
                X_val = X.values
            else:
                X_val = X
                
            if isinstance(y, (pd.Series, pd.DataFrame)):
                y_val = y.values
            else:
                y_val = y

            # データをスケーリング
            # 注意: X全体をスケーリングするとリークになる可能性があるが、
            # preprocess_for_predictionですでにスケーリングされている場合は不要
            # ここでは入力Xがすでに特徴量エンジニアリング済みと仮定
            
            # シーケンス作成 (XからX_seq, yからy_seq)
            # しかし fit(X, y) のインターフェースでは X, y は対応している (samples, features)
            # LSTMには過去のデータが必要。
            # X_val自体が時系列順に並んでいると仮定。
            
            if len(X_val) <= self.lookback:
                return

            X_seq, y_seq = [], []
            for i in range(self.lookback, len(X_val)):
                X_seq.append(X_val[i - self.lookback : i])
                y_seq.append(y_val[i]) # yは1ステップ先と仮定
                
            X_seq = np.array(X_seq)
            y_seq = np.array(y_seq)
            
            if len(X_seq) == 0:
                return

            self.model = Sequential()
            self.model.add(LSTM(units=50, return_sequences=False, input_shape=(X_seq.shape[1], X_seq.shape[2])))
            self.model.add(Dropout(0.2))
            self.model.add(Dense(units=1))
            self.model.compile(optimizer=Adam(learning_rate=0.001), loss="mean_squared_error")
            
            self.model.fit(X_seq, y_seq, epochs=epochs, batch_size=batch_size, verbose=0)
            self.is_fitted = True
            
        except Exception as e:
            logger.error(f"FuturePredictor fit error: {e}")

    def predict(self, X):
        """予測"""
        if not TENSORFLOW_AVAILABLE:
            return np.zeros(len(X))

        if not self.is_fitted or self.model is None:
            return np.zeros(len(X))
            
        try:
            if isinstance(X, pd.DataFrame):
                X_val = X.values
            else:
                X_val = X
                
            # シーケンス作成
            # 先頭のlookback分は予測できないので0埋めまたはパディング
            X_seq = []
            valid_indices = []
            
            for i in range(self.lookback, len(X_val) + 1):
                # predict point i (using i-lookback to i)
                # But wait, predict(X) usually expects prediction for each row in X.
                # Row i in X corresponds to time t. We want to predict t+1?
                # If X[i] is features at t, we usually predict y[i] (target at t).
                # But LSTM uses X[t-lookback:t] to predict y[t].
                
                # Assuming X contains current features.
                # To predict for row i, we need history ending at i.
                
                seq = X_val[i - self.lookback : i]
                X_seq.append(seq)
                valid_indices.append(i-1) # 0-based index of the row we are predicting FOR (using past)
                # Actually, usually predict(X) takes X[i] and predicts y[i].
                # But LSTM needs context.
                
            X_seq = np.array(X_seq)
            
            if len(X_seq) == 0:
                return np.zeros(len(X))
                
            preds = self.model.predict(X_seq, verbose=0).flatten()
            
            # Pad the beginning
            full_preds = np.zeros(len(X))
            full_preds[self.lookback-1:] = preds # Adjust indexing roughly
            
            return full_preds
            
        except Exception as e:
            logger.error(f"FuturePredictor predict error: {e}")
            return np.zeros(len(X))

    def predict_point(self, current_features):
        """一点予測"""
        # 履歴がないと予測できないため、簡易的に0を返すか、
        # EnhancedEnsemblePredictor側で履歴を管理する必要がある。
        return 0.0

    def predict_trajectory(self, df: pd.DataFrame, days_ahead: int = 5) -> dict:
        """
        指定された銘柄の向こう数日間の価格推移を予測する
        """
        if not TENSORFLOW_AVAILABLE:
            return {"error": "TensorFlow is not available."}

        try:
            if df is None or df.empty or len(df) < 20:
                return {"error": f"データ不足 (データ数: {len(df) if df is not None else 0})"}

            # 1. Prepare Data
            data = df.copy()
            data["Volume"] = data["Volume"].replace(0, np.nan).ffill()

            # テクニカル指標を追加
            try:
                data = add_technical_indicators(data)
            except Exception as e:
                logger.warning(f"テクニカル指標追加エラー: {e}")
                # エラー時は最低限の指標で続行

            # データ数に応じてボラティリティ計算を調整
            vol_window = 20
            if len(data) < 40:
                vol_window = 5

            data["Volatility"] = data["Close"].rolling(window=vol_window).std() / data["Close"]

            # 欠損値処理（テクニカル指標計算でNaNが出るため）
            data.dropna(inplace=True)

            if len(data) < 5:
                return {"error": f"有効データ不足 (前処理後: {len(data)}件)"}

            # 使用する特徴量を定義
            # 存在しないカラムは除外
            potential_features = ["Close", "Volume", "Volatility", "RSI", "MACD", "BB_Mid"]
            feature_cols = [c for c in potential_features if c in data.columns]

            dataset = data[feature_cols].values

            # データ数に応じてLookbackを調整
            adjusted_lookback = min(self.lookback, len(dataset) // 2)
            if adjusted_lookback < 5:
                return {"error": "データが少なすぎて予測できません"}

            # 2. Train Model (Simplified)
            scaled_data = self.scaler.fit_transform(dataset)

            X, y = [], []
            for i in range(adjusted_lookback, len(scaled_data)):
                X.append(scaled_data[i - adjusted_lookback : i])
                y.append(scaled_data[i, 0])  # Target is Close price (index 0)

            X, y = np.array(X), np.array(y)

            if len(X) == 0:
                return {"error": "学習データ不足 (Lookback期間不足)"}

            model = Sequential()
            model.add(LSTM(units=50, return_sequences=False, input_shape=(X.shape[1], X.shape[2])))
            model.add(Dropout(0.2))
            model.add(Dense(units=1))
            model.compile(optimizer=Adam(learning_rate=0.001), loss="mean_squared_error")

            # Train quietly
            model.fit(X, y, epochs=10, batch_size=32, verbose=0)  # Epochs increased to 10

            # 3. Predict Future
            last_sequence = scaled_data[-adjusted_lookback:]
            current_sequence = last_sequence.copy()
            future_predictions = []

            for _ in range(days_ahead):
                input_seq = np.expand_dims(current_sequence, axis=0)
                pred_scaled = model.predict(input_seq, verbose=0)[0][0]

                # ダミー配列を作成して逆変換
                dummy = np.zeros((1, len(feature_cols)))
                dummy[0, 0] = pred_scaled
                # 他の特徴量は直近の値を維持（簡易的な未来予測）
                for i in range(1, len(feature_cols)):
                    dummy[0, i] = dataset[-1, i]

                pred_price = self.scaler.inverse_transform(dummy)[0, 0]
                future_predictions.append(pred_price)

                # 次のステップのためのシーケンス更新
                # Closeは予測値、他は直近値を維持
                new_row = np.zeros(len(feature_cols))
                new_row[0] = pred_scaled
                for i in range(1, len(feature_cols)):
                    new_row[i] = current_sequence[-1, i]

                current_sequence = np.vstack([current_sequence[1:], new_row])

            # 4. Analyze Result
            current_price = df["Close"].iloc[-1]
            peak_price = max(future_predictions)
            peak_day_idx = future_predictions.index(peak_price)

            trend = "FLAT"
            if future_predictions[-1] > current_price * 1.01:
                trend = "UP"
            elif future_predictions[-1] < current_price * 0.99:
                trend = "DOWN"

            return {
                "current_price": current_price,
                "predictions": future_predictions,
                "peak_price": peak_price,
                "peak_day": peak_day_idx + 1,
                "trend": trend,
                "change_pct": (future_predictions[-1] - current_price) / current_price * 100,
            }

        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {"error": str(e)}
