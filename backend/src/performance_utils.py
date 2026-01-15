"""パフォーマンス最適化ユーティリティモジュール

このモジュールは、AGStockプロジェクトのパフォーマンスを向上させるための
ユーティリティ機能を提供します。主にキャッシュ、データ処理の高速化、
メモリ管理の最適化に焦点を当てています。
"""

import functools
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """キャッシュエントリのデータクラス"""

    value: Any
    timestamp: datetime = field(default_factory=datetime.now)
    ttl: Optional[timedelta] = None  # Time-to-live

    def is_expired(self) -> bool:
        """エントリが期限切れかどうかを確認"""
        if self.ttl is None:
            return False
        return datetime.now() - self.timestamp > self.ttl


class LRUCache:
    """LRU（Least Recently Used）キャッシュの実装"""

    def __init__(self, max_size: int = 1000):
        """LRUCacheの初期化

        Args:
            max_size (int): キャッシュの最大サイズ
        """
        self.max_size = max_size
        self.cache: Dict[str, CacheEntry] = {}
        self.access_order: Dict[str, datetime] = {}

    def get(self, key: str) -> Optional[Any]:
        """キャッシュから値を取得

        Args:
            key (str): キー

        Returns:
            Optional[Any]: 値。存在しないまたは期限切れの場合はNone
        """
        if key in self.cache:
            entry = self.cache[key]
            if not entry.is_expired():
                # アクセス時刻を更新
                self.access_order[key] = datetime.now()
                return entry.value
            else:
                # 期限切れの場合は削除
                del self.cache[key]
                if key in self.access_order:
                    del self.access_order[key]

        return None

    def put(self, key: str, value: Any, ttl: Optional[timedelta] = None) -> None:
        """キャッシュに値を保存

        Args:
            key (str): キー
            value (Any): 値
            ttl (Optional[timedelta]): 有効期限
        """
        # 既に存在する場合は更新
        if key in self.cache:
            self.cache[key] = CacheEntry(value=value, ttl=ttl)
            self.access_order[key] = datetime.now()
            return

        # 最大サイズに達している場合は最も古いエントリを削除
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.access_order, key=self.access_order.get)
            del self.cache[oldest_key]
            del self.access_order[oldest_key]

        # 新しいエントリを追加
        self.cache[key] = CacheEntry(value=value, ttl=ttl)
        self.access_order[key] = datetime.now()

    def remove(self, key: str) -> bool:
        """キャッシュからエントリを削除

        Args:
            key (str): 削除するキー

        Returns:
            bool: 削除に成功した場合はTrue
        """
        if key in self.cache:
            del self.cache[key]
            if key in self.access_order:
                del self.access_order[key]
            return True
        return False

    def clear(self) -> None:
        """すべてのキャッシュをクリア"""
        self.cache.clear()
        self.access_order.clear()

    def size(self) -> int:
        """現在のキャッシュサイズを返す"""
        return len(self.cache)


def memoize_with_ttl(ttl: int = 300):
    """TTL付きメモ化デコレーター

    Args:
        ttl (int): Time-to-live（秒）
    """

    def decorator(func: Callable) -> Callable:
        cache = LRUCache(max_size=1000)
        ttl_delta = timedelta(seconds=ttl)

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # 引数をキーとして使用（簡単のため文字列化）
            key = f"{func.__name__}:{args}:{sorted(kwargs.items())}"

            # キャッシュから値を取得
            cached_value = cache.get(key)
            if cached_value is not None:
                return cached_value

            # 関数を実行して値を取得
            result = func(*args, **kwargs)

            # キャッシュに保存
            cache.put(key, result, ttl_delta)

            return result

        return wrapper

    return decorator


class DataProcessorOptimizer:
    """データ処理の最適化を行うクラス"""

    @staticmethod
    def optimize_dataframe_memory(df: pd.DataFrame) -> pd.DataFrame:
        """DataFrameのメモリ使用量を最適化

        Args:
            df (pd.DataFrame): 最適化するDataFrame

        Returns:
            pd.DataFrame: 最適化されたDataFrame
        """
        df_optimized = df.copy()

        for col in df_optimized.columns:
            col_type = df_optimized[col].dtype

            if col_type != "object":
                c_min = df_optimized[col].min()
                c_max = df_optimized[col].max()

                if str(col_type)[:3] == "int":
                    if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                        df_optimized[col] = df_optimized[col].astype(np.int8)
                    elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                        df_optimized[col] = df_optimized[col].astype(np.int16)
                    elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                        df_optimized[col] = df_optimized[col].astype(np.int32)

                elif str(col_type)[:5] == "float":
                    if c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                        df_optimized[col] = df_optimized[col].astype(np.float32)

        return df_optimized

    @staticmethod
    def chunked_operation(df: pd.DataFrame, func: Callable, chunk_size: int = 10000) -> pd.DataFrame:
        """チャンク単位で操作を行うことでメモリ効率を改善

        Args:
            df (pd.DataFrame): 操作対象のDataFrame
            func (Callable): 各チャンクに適用する関数
            chunk_size (int): チンクサイズ

        Returns:
            pd.DataFrame: 操作結果のDataFrame
        """
        chunks = []
        for i in range(0, len(df), chunk_size):
            chunk = df.iloc[i : i + chunk_size]
            processed_chunk = func(chunk)
            chunks.append(processed_chunk)

        return pd.concat(chunks, ignore_index=True)

    @staticmethod
    def vectorized_calculation(df: pd.DataFrame, expression: str) -> pd.Series:
        """ベクトル化された計算を行う

        Args:
            df (pd.DataFrame): 計算対象のDataFrame
            expression (str): 計算式（例: "Close * Volume"）

        Returns:
            pd.Series: 計算結果
        """
        return df.eval(expression)


def time_it(func: Callable) -> Callable:
    """関数の実行時間を測定するデコレーター"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = end_time - start_time
        logger.debug(f"{func.__name__} executed in {execution_time:.4f} seconds")
        return result

    return wrapper


# グローバルLRUキャッシュ（必要に応じて）
_global_lru_cache: Optional[LRUCache] = None


def get_global_lru_cache() -> LRUCache:
    """グローバルLRUキャッシュを取得

    Returns:
        LRUCache: シングルトンのLRUキャッシュインスタンス
    """
    global _global_lru_cache
    if _global_lru_cache is None:
        _global_lru_cache = LRUCache()
    return _global_lru_cache


def cache_get(key: str) -> Optional[Any]:
    """グローバルキャッシュから値を取得

    Args:
        key (str): キー

    Returns:
        Optional[Any]: 値。存在しない場合はNone
    """
    cache = get_global_lru_cache()
    return cache.get(key)


def cache_put(key: str, value: Any, ttl: Optional[timedelta] = None) -> None:
    """グローバルキャッシュに値を保存

    Args:
        key (str): キー
        value (Any): 値
        ttl (Optional[timedelta]): 有効期限
    """
    cache = get_global_lru_cache()
    cache.put(key, value, ttl)
