"""
Lazy Model Loader - 遅延モデル読み込み
必要になるまでモデルをロードしない
"""

import logging
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


class LazyModelLoader:
    """遅延モデル読み込み"""

    def __init__(self):
        self._models: Dict[str, Any] = {}
        self._loaders: Dict[str, Callable] = {}
        self._loaded: Dict[str, bool] = {}

    def register(self, name: str, loader: Callable):
        """
        モデルローダーを登録

        Args:
            name: モデル名
            loader: モデルをロードする関数
        """
        self._loaders[name] = loader
        self._loaded[name] = False
        logger.debug(f"Registered lazy loader for: {name}")

    def get(self, name: str) -> Optional[Any]:
        """
        モデルを取得（必要に応じてロード）

        Args:
            name: モデル名

        Returns:
            モデルインスタンス
        """
        if name not in self._loaders:
            logger.warning(f"Unknown model: {name}")
            return None

        if not self._loaded.get(name, False):
            logger.info(f"Lazy loading model: {name}")
            try:
                self._models[name] = self._loaders[name]()
                self._loaded[name] = True
            except Exception as e:
                logger.error(f"Failed to load {name}: {e}")
                return None

        return self._models.get(name)

    def is_loaded(self, name: str) -> bool:
        """モデルがロード済みか確認"""
        return self._loaded.get(name, False)

    def unload(self, name: str):
        """モデルをアンロード"""
        if name in self._models:
            del self._models[name]
            self._loaded[name] = False
            logger.info(f"Unloaded model: {name}")

    def unload_all(self):
        """全モデルをアンロード"""
        for name in list(self._models.keys()):
            self.unload(name)

    def get_status(self) -> Dict:
        """ロード状態を取得"""
        return {
            "registered": list(self._loaders.keys()),
            "loaded": [name for name, loaded in self._loaded.items() if loaded],
            "unloaded": [name for name, loaded in self._loaded.items() if not loaded],
        }


# グローバルローダー
_loader = None


def get_lazy_loader() -> LazyModelLoader:
    global _loader
    if _loader is None:
        _loader = LazyModelLoader()
        _register_default_models(_loader)
    return _loader


def _register_default_models(loader: LazyModelLoader):
    """デフォルトモデルを登録"""

    def load_lstm():
        from src.future_predictor import FuturePredictor

        return FuturePredictor()

    def load_lgbm():
        from src.lgbm_predictor import LGBMPredictor

        return LGBMPredictor()

    def load_prophet():
        from src.prophet_predictor import ProphetPredictor

        return ProphetPredictor()

    def load_transformer():
        from src.transformer_predictor import TransformerPredictor

        return TransformerPredictor()

    def load_rl():
        from src.rl_strategy import RLStrategy

        return RLStrategy()

    def load_bert():
        from src.bert_sentiment import get_bert_analyzer

        return get_bert_analyzer()

    loader.register("lstm", load_lstm)
    loader.register("lgbm", load_lgbm)
    loader.register("prophet", load_prophet)
    loader.register("transformer", load_transformer)
    loader.register("rl", load_rl)
    loader.register("bert", load_bert)

    logger.info("Registered 6 lazy-loadable models")
