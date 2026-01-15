"""
遅延インポートユーティリティ

重量級ライブラリ（TensorFlow, PyTorch, Prophet等）を必要な時だけ読み込む。
起動時間とメモリ使用量を大幅に削減。
"""

import importlib
import logging
from functools import lru_cache
from typing import Any, Optional

logger = logging.getLogger(__name__)


class LazyModule:
    """遅延読み込みモジュールラッパー"""
    
    def __init__(self, module_name: str, package: Optional[str] = None):
        self._module_name = module_name
        self._package = package
        self._module = None
    
    def _load(self):
        if self._module is None:
            logger.debug(f"Lazy loading: {self._module_name}")
            try:
                self._module = importlib.import_module(self._module_name, self._package)
            except ImportError as e:
                logger.warning(f"Failed to import {self._module_name}: {e}")
                raise
        return self._module
    
    def __getattr__(self, name: str) -> Any:
        return getattr(self._load(), name)
    
    def __dir__(self):
        return dir(self._load())


class LazyImporter:
    """遅延インポート管理クラス"""
    
    _instances: dict = {}
    
    @classmethod
    def get(cls, module_name: str) -> LazyModule:
        if module_name not in cls._instances:
            cls._instances[module_name] = LazyModule(module_name)
        return cls._instances[module_name]
    
    @classmethod
    def is_available(cls, module_name: str) -> bool:
        """モジュールが利用可能かチェック（インポートせずに）"""
        try:
            import importlib.util
            spec = importlib.util.find_spec(module_name)
            return spec is not None
        except (ModuleNotFoundError, ValueError):
            return False


# よく使う重量級ライブラリの遅延インポート関数
@lru_cache(maxsize=1)
def get_tensorflow():
    """TensorFlowを遅延読み込み"""
    import tensorflow as tf
    # GPU メモリの動的確保を有効化
    try:
        gpus = tf.config.list_physical_devices('GPU')
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    except Exception:
        pass
    return tf


@lru_cache(maxsize=1)
def get_keras():
    """Kerasを遅延読み込み"""
    tf = get_tensorflow()
    return tf.keras


@lru_cache(maxsize=1)
def get_torch():
    """PyTorchを遅延読み込み"""
    import torch
    return torch


@lru_cache(maxsize=1)
def get_prophet():
    """Prophetを遅延読み込み"""
    from prophet import Prophet
    return Prophet


@lru_cache(maxsize=1)
def get_transformers():
    """Transformersを遅延読み込み"""
    import transformers
    return transformers


# 利用可能性チェック
def is_tensorflow_available() -> bool:
    return LazyImporter.is_available("tensorflow")


def is_torch_available() -> bool:
    return LazyImporter.is_available("torch")


def is_prophet_available() -> bool:
    return LazyImporter.is_available("prophet")


def is_transformers_available() -> bool:
    return LazyImporter.is_available("transformers")
