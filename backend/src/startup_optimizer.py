"""
パフォーマンス最適化モジュール
スタートアップ時間を5秒以内に改善
"""

import functools
import logging
import time
import asyncio
from typing import Dict, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor
import threading
import pandas as pd
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)


class PerformanceOptimizer:
    """
    パフォーマンス最適化管理クラス

    キャッシュ、遅延読み込み、並列処理で
    スタートアップ時間を短縮
    """

    def __init__(self):
        self.caches = {}
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.startup_time = time.time()
        self._lock = threading.Lock()

    def preflight_checks(self) -> Dict[str, bool]:
        """
        起動前チェックを並列実行

        Returns:
            チェック結果辞書
        """
        checks = {}

        # 並列でチェックを実行
        futures = {
            "config": self.executor.submit(self._check_config),
            "data_directory": self.executor.submit(self._check_data_directory),
            "database": self.executor.submit(self._check_database),
            "models": self.executor.submit(self._check_models),
            "api_keys": self.executor.submit(self._check_api_keys),
        }

        for key, future in futures.items():
            try:
                checks[key] = future.result(timeout=2)
            except Exception as e:
                logger.warning(f"Check {key} failed: {e}")
                checks[key] = False

        return checks

    def _check_config(self) -> bool:
        """設定ファイルチェック"""
        try:
            config_path = Path("config.json")
            return config_path.exists() and config_path.stat().st_size > 0
        except:
            return False

    def _check_data_directory(self) -> bool:
        """データディレクトリチェック"""
        try:
            data_path = Path("data")
            return data_path.exists() and data_path.is_dir()
        except:
            return False


# 全局キャッシュデコレーター
def smart_cache(maxsize: int = 128, ttl: int = 3600):
    """
    スマートキャッシュデコレータ

    Args:
        maxsize: キャッシュサイズ
        ttl: 生存時間（秒）
    """

    def decorator(func):
        cache = {}
        cache_times = {}

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # キャッシュキー生成
            key = str(args) + str(sorted(kwargs.items()))
            current_time = time.time()

            # キャッシュチェック
            if key in cache:
                if current_time - cache_times[key] < ttl:
                    return cache[key]
                else:
                    del cache[key]
                    del cache_times[key]

            # 実行とキャッシュ保存
            result = func(*args, **kwargs)
            if len(cache) >= maxsize:
                oldest_key = min(cache_times.keys(), key=cache_times.get)
                del cache[oldest_key]
                del cache_times[oldest_key]

            cache[key] = result
            cache_times[key] = current_time
            return result

        wrapper.cache_clear = cache.clear
        wrapper.cache_info = lambda: {"size": len(cache)}
        return wrapper

    return decorator


# 遅延読み込みクラス
class LazyLoader:
    """
    遅延読み込みマネージャ

    高負荷モジュールを必要時にだけ読み込む
    """

    def __init__(self):
        self._modules = {}
        self._load_times = {}

    def get(self, module_name: str, module_path: str = None):
        """
        モジュールを遅延読み込み

        Args:
            module_name: モジュール名
            module_path: モジュールパス（オプション）

        Returns:
            モジュールオブジェクト
        """
        if module_name not in self._modules:
            start_time = time.time()
            try:
                if module_path:
                    import importlib

                    module = importlib.import_module(module_path)
                else:
                    module = __import__(module_name)

                self._modules[module_name] = module
                self._load_times[module_name] = time.time() - start_time
                logger.info(f"Loaded {module_name} in {self._load_times[module_name]:.2f}s")

            except Exception as e:
                logger.error(f"Failed to load {module_name}: {e}")
                return None

        return self._modules.get(module_name)


# グローバルインスタンス
performance_optimizer = PerformanceOptimizer()
lazy_loader = LazyLoader()


# 起動時間計測デコレーター
def measure_startup_time(func):
    """起動時間計測デコレータ"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()

        startup_time = end_time - performance_optimizer.startup_time
        logger.info(f"Startup time: {startup_time:.2f}s")

        if startup_time > 5.0:
            logger.warning(f"Startup took {startup_time:.2f}s (>5s target)")
        else:
            logger.info(f"Startup target met: {startup_time:.2f}s")

        return result

    return wrapper
