import logging
import numpy as np
import pandas as pd

from ..base import Strategy

logger = logging.getLogger(__name__)

class AttentionLSTMStrategy(Strategy):
    """Attention-LSTMを使用した戦略"""

    def __init__(self, name: str = "AttentionLSTM", trend_period: int = 200):
        super().__init__(name, trend_period)
        self.model = None
        self.is_trained = False
        self.sequence_length = 30

    def train(self, df: pd.DataFrame):
        try:
            from ...advanced_models import AdvancedModels
            from ...features import add_advanced_features

            df_feat = add_advanced_features(df.copy())
            numeric_cols = df_feat.select_dtypes(include=[np.number]).columns

            data = df_feat[numeric_cols].values
            X, y = [], []
            for i in range(len(data) - self.sequence_length - 1):
                X.append(data[i : (i + self.sequence_length)])
                y.append(data[i + self.sequence_length + 1, 0])

            X, y = np.array(X), np.array(y)

            if len(X) == 0:
                return

            self.model = AdvancedModels.build_attention_lstm_model(input_shape=(X.shape[1], X.shape[2]))
            self.model.fit(X, y, epochs=10, batch_size=32, verbose=0)
            self.is_trained = True
            logger.info("Attention-LSTM model trained")

        except Exception as e:
            logger.error(f"Error training Attention-LSTM: {e}")

    def generate_signal(self, df: pd.DataFrame) -> str:
        if not self.is_trained or self.model is None:
            return "HOLD"

        try:
            from ...features import add_advanced_features

            df_feat = add_advanced_features(df.copy())
            numeric_cols = df_feat.select_dtypes(include=[np.number]).columns

            if len(df_feat) < self.sequence_length:
                return "HOLD"

            recent_data = df_feat[numeric_cols].iloc[-self.sequence_length :].values
            X = np.expand_dims(recent_data, axis=0)

            pred = self.model.predict(X)[0][0]
            current = df["Close"].iloc[-1]

            if pred > current * 1.02:
                return "BUY"
            elif pred < current * 0.98:
                return "SELL"
            return "HOLD"

        except Exception:
            return "HOLD"
