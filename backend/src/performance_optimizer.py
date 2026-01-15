"""
パフォーマンス最適化モジュール
Performance Optimization for AGStock

機能:
    pass
- データ取得の高速化
- キャッシュ最適化
- 並列処理の改善
- メモリ使用量の削減
"""

import functools
import hashlib
import logging
import pickle
import time
from pathlib import Path
from typing import Callable

logger = logging.getLogger(__name__)


class PerformanceOptimizer:
    """パフォーマンス最適化"""

    def __init__(self, cache_dir: str = ".cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.stats = {"cache_hits": 0, "cache_misses": 0, "total_time_saved": 0}

    def disk_cache(self, ttl_seconds: int = 3600):
        """ディスクキャッシュデコレータ"""

        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # キャッシュキー生成
                key = self._generate_cache_key(func.__name__, args, kwargs)
                cache_file = self.cache_dir / f"{key}.pkl"

                # キャッシュチェック
                if cache_file.exists():
                    cache_age = time.time() - cache_file.stat().st_mtime
                    if cache_age < ttl_seconds:
                        try:
                            with open(cache_file, "rb") as f:
                                result = pickle.load(f)
                            self.stats["cache_hits"] += 1
                            logger.debug(f"Cache hit: {func.__name__}")
                            return result
                        except Exception as e:
                            logger.warning(f"Cache read error: {e}")

                # キャッシュミス - 関数実行
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time

                # 結果をキャッシュ
                try:
                    with open(cache_file, "wb") as f:
                        pickle.dump(result, f)
                    self.stats["cache_misses"] += 1
                    logger.debug(f"Cache miss: {func.__name__} ({execution_time:.2f}s)")
                except Exception as e:
                    logger.warning(f"Cache write error: {e}")

                return result

            return wrapper

        return decorator

    def _generate_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """キャッシュキー生成"""
        key_data = f"{func_name}:{str(args)}:{str(sorted(kwargs.items()))}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def clear_cache(self, older_than_hours: int = 24):
        """古いキャッシュを削除"""
        cutoff_time = time.time() - (older_than_hours * 3600)
        deleted_count = 0

        for cache_file in self.cache_dir.glob("*.pkl"):
            if cache_file.stat().st_mtime < cutoff_time:
                cache_file.unlink()
                deleted_count += 1

        logger.info(f"Cleared {deleted_count} old cache files")
        return deleted_count

    def get_stats(self) -> dict:
        """統計情報取得"""
        total_requests = self.stats["cache_hits"] + self.stats["cache_misses"]
        hit_rate = self.stats["cache_hits"] / total_requests if total_requests > 0 else 0

        return {
            "cache_hits": self.stats["cache_hits"],
            "cache_misses": self.stats["cache_misses"],
            "hit_rate": hit_rate,
            "total_requests": total_requests,
        }


class BatchProcessor:
    """バッチ処理最適化"""

    @staticmethod
    def batch_fetch(items: list, fetch_func: Callable, batch_size: int = 10) -> dict:
        """バッチでデータ取得"""
        results = {}

        for i in range(0, len(items), batch_size):
            batch = items[i : i + batch_size]
            try:
                batch_results = fetch_func(batch)
                results.update(batch_results)
            except Exception as e:
                logger.error(f"Batch fetch error: {e}")
                # 個別にリトライ
                for item in batch:
                    try:
                        results[item] = fetch_func([item])[item]
                    except Exception as e2:
                        logger.error(f"Individual fetch error for {item}: {e2}")

        return results


class MemoryOptimizer:
    """メモリ使用量最適化"""

    @staticmethod
    def optimize_dataframe(df):
        """DataFrameのメモリ使用量を最適化"""
        import pandas as pd

        if df is None or df.empty:
            return df

        # 数値型の最適化
        for col in df.select_dtypes(include=["int"]).columns:
            df[col] = pd.to_numeric(df[col], downcast="integer")

        for col in df.select_dtypes(include=["float"]).columns:
            df[col] = pd.to_numeric(df[col], downcast="float")

        # カテゴリ型への変換
        for col in df.select_dtypes(include=["object"]).columns:
            num_unique = df[col].nunique()
            num_total = len(df[col])
            if num_unique / num_total < 0.5:  # 50%未満がユニークなら
                df[col] = df[col].astype("category")

        return df


def timer(func: Callable) -> Callable:
    """実行時間計測デコレータ"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = time.time() - start_time
        logger.info(f"{func.__name__} executed in {execution_time:.2f}s")
        return result

    return wrapper


# グローバルインスタンス
optimizer = PerformanceOptimizer()

if __name__ == "__main__":
    # テスト
    print("=" * 60)
    print("  パフォーマンス最適化モジュール")
    print("=" * 60)

    # キャッシュ統計
    stats = optimizer.get_stats()
    print("\nキャッシュ統計:")
    print(f"  ヒット数: {stats['cache_hits']}")
    print(f"  ミス数: {stats['cache_misses']}")
    print(f"  ヒット率: {stats['hit_rate']:.1%}")

    # キャッシュクリア
    deleted = optimizer.clear_cache(older_than_hours=24)
    print(f"\n古いキャッシュ削除: {deleted}件")
