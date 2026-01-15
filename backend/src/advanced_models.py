"""
高度な予測モデル

- Attention付きLSTM
- CNN-LSTMハイブリッド
- 多段階予測モデル
- N-BEATSスタイルモデル

遅延読み込み対応版
"""

import logging
import warnings
from typing import Tuple, Optional, Any

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

# TensorFlowの遅延読み込み
_tf = None
_keras = None
_layers = None
TF_AVAILABLE = None


def _ensure_tf():
    """TensorFlowを必要な時に読み込む"""
    global _tf, _keras, _layers, TF_AVAILABLE
    if TF_AVAILABLE is None:
        try:
            from src.utils.lazy_imports import get_tensorflow, get_keras
            _tf = get_tensorflow()
            _keras = get_keras()
            _layers = _keras.layers
            TF_AVAILABLE = True
            logger.debug("TensorFlow loaded successfully")
        except ImportError:
            logger.warning("TensorFlow not available. Advanced models will not be usable.")
            TF_AVAILABLE = False
    return TF_AVAILABLE


def get_tf():
    _ensure_tf()
    return _tf


def get_keras_module():
    _ensure_tf()
    return _keras


def get_layers():
    _ensure_tf()
    return _layers


class AttentionLayer:
    """Attention層（遅延読み込み対応）"""
    
    def __new__(cls, *args, **kwargs):
        if not _ensure_tf():
            raise ImportError("TensorFlow is required for AttentionLayer")
        
        layers = get_layers()
        
        class _AttentionLayer(layers.Layer):
            def __init__(self, units: int, **layer_kwargs):
                super().__init__(**layer_kwargs)
                self.units = units
                self.W = None
                self.b = None
                self.u = None

            def build(self, input_shape):
                tf = get_tf()
                self.W = self.add_weight(
                    name="attention_weight",
                    shape=(input_shape[-1], self.units),
                    initializer="glorot_uniform",
                    trainable=True,
                )
                self.b = self.add_weight(
                    name="attention_bias",
                    shape=(self.units,),
                    initializer="zeros",
                    trainable=True,
                )
                self.u = self.add_weight(
                    name="context_vector",
                    shape=(self.units,),
                    initializer="glorot_uniform",
                    trainable=True,
                )
                super().build(input_shape)

            def call(self, inputs):
                tf = get_tf()
                uit = tf.matmul(inputs, self.W) + self.b
                uit = tf.nn.tanh(uit)
                ait = tf.matmul(uit, tf.expand_dims(self.u, axis=-1))
                ait = tf.squeeze(ait, axis=-1)
                ait = tf.nn.softmax(ait)
                ait = tf.expand_dims(ait, axis=-1)
                weighted_input = inputs * ait
                return tf.reduce_sum(weighted_input, axis=1)

            def get_config(self):
                config = super().get_config()
                config.update({"units": self.units})
                return config
        
        return _AttentionLayer(*args, **kwargs)


class AdvancedModels:
    """高度なAI予測モデルのファクトリ"""

    def __init__(self, input_shape: Tuple[int, int] = (10, 5)):
        self.input_shape = input_shape

    def build_attention_lstm(self, units: int = 64) -> Any:
        """Attention付きLSTMモデル"""
        if not _ensure_tf():
            return None
            
        tf = get_tf()
        keras = get_keras_module()
        layers = get_layers()
        
        inputs = layers.Input(shape=self.input_shape)
        x = layers.LSTM(units, return_sequences=True)(inputs)
        x = AttentionLayer(units)(x)
        x = layers.Dropout(0.2)(x)
        x = layers.Dense(32, activation="relu")(x)
        outputs = layers.Dense(1, activation="linear")(x)
        
        model = keras.Model(inputs=inputs, outputs=outputs)
        model.compile(optimizer="adam", loss="mse", metrics=["mae"])
        return model

    def build_cnn_lstm(self, filters: int = 32, lstm_units: int = 64) -> Any:
        """CNN-LSTMハイブリッドモデル"""
        if not _ensure_tf():
            return None
            
        tf = get_tf()
        keras = get_keras_module()
        layers = get_layers()
        
        inputs = layers.Input(shape=self.input_shape)
        x = layers.Conv1D(filters=filters, kernel_size=3, padding="same", activation="relu")(inputs)
        x = layers.MaxPooling1D(pool_size=2)(x)
        x = layers.LSTM(lstm_units)(x)
        x = layers.Dropout(0.2)(x)
        outputs = layers.Dense(1)(x)
        
        model = keras.Model(inputs=inputs, outputs=outputs)
        model.compile(optimizer="adam", loss="mse")
        return model

    def build_multistep_predictor(self, steps: int = 5) -> Any:
        """多段階予測モデル"""
        if not _ensure_tf():
            return None
            
        tf = get_tf()
        keras = get_keras_module()
        layers = get_layers()
        
        inputs = layers.Input(shape=self.input_shape)
        x = layers.LSTM(128, return_sequences=True)(inputs)
        x = layers.LSTM(64)(x)
        x = layers.Dense(64, activation="relu")(x)
        outputs = layers.Dense(steps)(x)
        
        model = keras.Model(inputs=inputs, outputs=outputs)
        model.compile(optimizer="adam", loss="mse")
        return model