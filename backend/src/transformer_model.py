"""
Temporal Fusion Transformer (TFT) モデルの実装
時系列予測に特化したTransformerベースのモデル
"""

from __future__ import annotations
import logging
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
except ImportError:
    tf = None
    keras = None
    layers = None

logger = logging.getLogger(__name__)


class ScaledDotProductAttention(layers.Layer):
    """スケーリングドットプロダクトアテンション"""

    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads

        self.W_q = layers.Dense(d_model)
        self.W_k = layers.Dense(d_model)
        self.W_v = layers.Dense(d_model)

        self.fc = layers.Dense(d_model)

    def call(
        self,
        query: tf.Tensor,
        key: tf.Tensor,
        value: tf.Tensor,
        mask: Optional[tf.Tensor] = None,
    ):
        batch_size = tf.shape(query)[0]

        Q = self.W_q(query)
        K = self.W_k(key)
        V = self.W_v(value)

        # Multi-head
        Q = tf.reshape(Q, (batch_size, -1, self.n_heads, self.d_k))
        K = tf.reshape(K, (batch_size, -1, self.n_heads, self.d_k))
        V = tf.reshape(V, (batch_size, -1, self.n_heads, self.d_k))

        Q = tf.transpose(Q, [0, 2, 1, 3])
        K = tf.transpose(K, [0, 2, 1, 3])
        V = tf.transpose(V, [0, 2, 1, 3])

        # Attention scores
        scores = tf.matmul(Q, K, transpose_b=True) / tf.math.sqrt(tf.cast(self.d_k, tf.float32))

        if mask is not None:
            scores += mask * -1e9

        attention_weights = tf.nn.softmax(scores, axis=-1)

        output = tf.matmul(attention_weights, V)
        output = tf.transpose(output, [0, 2, 1, 3])
        output = tf.reshape(output, (batch_size, -1, self.d_model))

        output = self.fc(output)

        return output, attention_weights


class GatedLinearUnit(layers.Layer):
    """Gated Linear Unit (GLU)"""

    def __init__(self, units: int):
        super().__init__()
        self.linear = layers.Dense(units)
        self.gate = layers.Dense(units, activation="sigmoid")

    def call(self, x: tf.Tensor):
        return self.linear(x) * self.gate(x)


class GatedResidualNetwork(layers.Layer):
    """Gated Residual Network"""

    def __init__(self, units: int, dropout_rate: float = 0.1):
        super().__init__()
        self.units = units
        self.dropout_rate = dropout_rate

        self.linear = layers.Dense(units)
        self.glu = GatedLinearUnit(units)
        self.layer_norm = layers.LayerNormalization()
        self.projection = layers.Dense(units)
        self.dropout = layers.Dropout(dropout_rate)

    def call(self, x: tf.Tensor, a: Optional[tf.Tensor] = None):
        # Optional additional input 'a'
        if a is not None:
            x = tf.concat([x, a], axis=-1)

        x_proj = self.projection(x)
        x = self.linear(x)
        x = self.glu(x)
        x = self.dropout(x)
        x = x + x_proj

        x = self.layer_norm(x)

        return x


class VariableSelectionNetwork(layers.Layer):
    """Variable Selection Network"""

    def __init__(self, units: int, n_inputs: int):
        super().__init__()
        self.units = units
        self.n_inputs = n_inputs
        self.grns = []

        # Create GRNs for each input
        for _ in range(n_inputs):
            self.grns.append(GatedResidualNetwork(units))

        self.top_grn = GatedResidualNetwork(units)
        self.softmax = layers.Softmax(axis=-1)

    def call(self, x: List[tf.Tensor]):
        # Gate for each input
        v = []
        for i in range(self.n_inputs):
            grn_out = self.grns[i](x[i])
            v.append(grn_out)

        v = tf.stack(v, axis=2)  # [batch, time, n_inputs, units]
        v = self.top_grn(v)
        v = self.softmax(v)

        # Apply gates to inputs
        outputs = []
        for i in range(self.n_inputs):
            output = v[:, :, i : i + 1, :] * x[i]
            outputs.append(output)

        outputs = tf.reduce_sum(outputs, axis=2)  # [batch, time, units]

        return outputs


class TemporalFusionEncoder(layers.Layer):
    """TFTのエンコーダー"""

    def __init__(self, hidden_size: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        self.hidden_size = hidden_size
        self.n_heads = n_heads

        self.lstm = layers.LSTM(hidden_size, return_sequences=True, return_state=True)
        self.attention = ScaledDotProductAttention(hidden_size, n_heads)
        self.gate = GatedLinearUnit(hidden_size)
        self.norm1 = layers.LayerNormalization()
        self.norm2 = layers.LayerNormalization()
        self.dropout = layers.Dropout(dropout)

    def call(self, x: tf.Tensor):
        # LSTM
        lstm_out, hidden_state, cell_state = self.lstm(x)

        # Self-attention
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        attn_out = self.dropout(attn_out)

        # Gated residual connection
        x = self.norm1(x + self.gate(attn_out))

        return x


class TemporalFusionDecoder(layers.Layer):
    """TFTのデコーダー"""

    def __init__(self, hidden_size: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        self.hidden_size = hidden_size
        self.n_heads = n_heads

        self.lstm = layers.LSTM(hidden_size, return_sequences=True, return_state=True)
        self.attention = ScaledDotProductAttention(hidden_size, n_heads)
        self.gate = GatedLinearUnit(hidden_size)
        self.norm1 = layers.LayerNormalization()
        self.norm2 = layers.LayerNormalization()
        self.dropout = layers.Dropout(dropout)

    def call(self, x: tf.Tensor, encoder_output: tf.Tensor):
        # LSTM
        lstm_out, hidden_state, cell_state = self.lstm(
            x, initial_state=[encoder_output[:, -1, :], encoder_output[:, -1, :]]
        )

        # Attention with encoder output
        attn_out, _ = self.attention(lstm_out, encoder_output, encoder_output)
        attn_out = self.dropout(attn_out)

        # Gated residual connection
        x = self.norm1(x + self.gate(attn_out))

        return x


class TemporalFusionTransformer(keras.Model):
    """Temporal Fusion Transformer モデル"""

    def __init__(
        self,
        input_size: int,
        hidden_size: int = 64,
        num_attention_heads: int = 4,
        dropout: float = 0.1,
        forecast_horizon: int = 5,
    ):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_attention_heads = num_attention_heads
        self.dropout = dropout
        self.forecast_horizon = forecast_horizon

        # Variable Selection Network
        self.var_selection = VariableSelectionNetwork(hidden_size, input_size)

        # Encoder & Decoder
        self.encoder = TemporalFusionEncoder(hidden_size, num_attention_heads, dropout)
        self.decoder = TemporalFusionDecoder(hidden_size, num_attention_heads, dropout)

        # Output layer
        self.output_layer = layers.Dense(1)

    def call(self, inputs: tf.Tensor):
        # inputs shape: [batch, time, features]

        # Variable selection
        if self.input_size > 1:
            # Split features for variable selection (simplified approach)
            input_list = [inputs[:, :, i : i + 1] for i in range(inputs.shape[2])]
            x = self.var_selection(input_list)
        else:
            x = inputs

        # Split into encoder and decoder parts
        encoder_input = x[:, : -self.forecast_horizon, :]
        decoder_input = x[:, -self.forecast_horizon :, :]

        # Encode
        encoded = self.encoder(encoder_input)

        # Decode
        decoded = self.decoder(decoder_input, encoded)

        # Output
        output = self.output_layer(decoded)

        return output[:, :, 0]  # Remove last dimension for single output

    def prepare_sequences(
        self, df: pd.DataFrame, sequence_length: int, forecast_horizon: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        時系列データをモデル用のシーケンスに変換

        Args:
            df: 特徴量が追加されたデータフレーム
            sequence_length: 入力シーケンス長
            forecast_horizon: 予測期間

        Returns:
            X: 入力シーケンス [samples, sequence_length, n_features]
            y: 予測ターゲット [samples, forecast_horizon]
        """
        # 価格変動率をターゲットとする
        df_target = df.copy()
        df_target["Target"] = df_target["Close"].pct_change(periods=forecast_horizon).shift(-forecast_horizon)
        df_target.dropna(inplace=True)

        # 特徴量の選択
        feature_cols = [c for c in df_target.columns if c not in ["Date", "Target"]]
        features = df_target[feature_cols].values
        targets = df_target["Target"].values

        X, y = [], []
        for i in range(sequence_length, len(features) - forecast_horizon):
            X.append(features[i - sequence_length : i])
            y.append(targets[i : i + forecast_horizon])

        return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs):
        """モデルの学習"""
        # 損失関数とオプティマイザの設定
        self.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss="mse",
            metrics=["mae"],
        )

        # 学習
        history = super().fit(
            X,
            y,
            epochs=kwargs.get("epochs", 50),
            batch_size=kwargs.get("batch_size", 32),
            validation_split=kwargs.get("validation_split", 0.2),
            verbose=kwargs.get("verbose", 1),
            callbacks=[keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True)],
        )

        return history

    def save(self, filepath: str):
        """モデルの保存"""
        super().save(filepath)

    @classmethod
    def load(cls, filepath: str):
        """モデルのロード"""
        return keras.models.load_model(
            filepath,
            custom_objects={
                "TemporalFusionTransformer": cls,
                "ScaledDotProductAttention": ScaledDotProductAttention,
                "GatedLinearUnit": GatedLinearUnit,
                "GatedResidualNetwork": GatedResidualNetwork,
                "VariableSelectionNetwork": VariableSelectionNetwork,
                "TemporalFusionEncoder": TemporalFusionEncoder,
                "TemporalFusionDecoder": TemporalFusionDecoder,
            },
        )


if __name__ == "__main__":
    # テスト用の実装
    logging.basicConfig(level=logging.INFO)

    # ダミーデータの作成
    np.random.seed(42)
    n_samples, n_features = 1000, 10
    X = np.random.randn(n_samples, 20, n_features).astype(np.float32)
    y = np.random.randn(n_samples, 5).astype(np.float32)

    # モデルの作成と学習
    model = TemporalFusionTransformer(
        input_size=n_features,
        hidden_size=64,
        num_attention_heads=4,
        dropout=0.1,
        forecast_horizon=5,
    )

    # モデルのビルド
    _ = model(X[:1])

    logger.info("Model created and built successfully")
    logger.info(f"Model has {model.count_params():,} parameters")
