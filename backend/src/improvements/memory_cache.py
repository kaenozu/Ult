"""高速インメモリキャッシュ層

Redis互換APIを提供し、ローカル環境で高速キャッシュを実現
"""

import logging
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class CacheEntry:
    """キャッシュエントリ"""

    value: Any
    expires_at: Optional[float] = None
    created_at: float = field(default_factory=time.time)
    access_count: int = 0
    last_accessed: float = field(default_factory=time.time)


class MemoryCache:
    """高速インメモリキャッシュ

    特徴:
    - LRUエビクション
    - TTLサポート
    - スレッドセーフ
    - Redis互換API
    """

    def __init__(
        self,
        max_size: int = 10000,
        default_ttl: Optional[int] = None,
        cleanup_interval: int = 60,
    ):
        """初期化

        Args:
            max_size: 最大エントリ数
            default_ttl: デフォルトTTL（秒）
            cleanup_interval: クリーンアップ間隔（秒）
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cleanup_interval = cleanup_interval

        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
        }

        # バックグラウンドクリーンアップ
        self._cleanup_thread: Optional[threading.Thread] = None
        self._stop_cleanup = threading.Event()
        self._start_cleanup_thread()

    def _start_cleanup_thread(self):
        """クリーンアップスレッドを開始"""

        def cleanup_loop():
            while not self._stop_cleanup.wait(self.cleanup_interval):
                self._cleanup_expired()

        self._cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        self._cleanup_thread.start()

    def _cleanup_expired(self):
        """期限切れエントリを削除"""
        now = time.time()
        expired_keys = []

        with self._lock:
            for key, entry in self._cache.items():
                if entry.expires_at and entry.expires_at < now:
                    expired_keys.append(key)

            for key in expired_keys:
                del self._cache[key]
                self._stats["evictions"] += 1

    def get(self, key: str, default: T = None) -> Union[Any, T]:
        """Redis互換: 値を取得"""
        with self._lock:
            entry = self._cache.get(key)

            if entry is None:
                self._stats["misses"] += 1
                return default

            # TTLチェック
            if entry.expires_at and entry.expires_at < time.time():
                del self._cache[key]
                self._stats["misses"] += 1
                return default

            # LRU更新
            self._cache.move_to_end(key)
            entry.access_count += 1
            entry.last_accessed = time.time()

            self._stats["hits"] += 1
            return entry.value

    def set(
        self,
        key: str,
        value: Any,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool:
        """Redis互換: 値を設定

        Args:
            key: キー
            value: 値
            ex: 有効期限（秒）
            px: 有効期限（ミリ秒）
            nx: キーが存在しない場合のみ設定
            xx: キーが存在する場合のみ設定

        Returns:
            設定成功かどうか
        """
        with self._lock:
            exists = key in self._cache

            if nx and exists:
                return False
            if xx and not exists:
                return False

            # TTL計算
            expires_at = None
            if ex is not None:
                expires_at = time.time() + ex
            elif px is not None:
                expires_at = time.time() + px / 1000
            elif self.default_ttl:
                expires_at = time.time() + self.default_ttl

            # エビクション
            while len(self._cache) >= self.max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                self._stats["evictions"] += 1

            self._cache[key] = CacheEntry(
                value=value,
                expires_at=expires_at,
            )
            self._cache.move_to_end(key)

            return True

    def delete(self, key: str) -> bool:
        """Redis互換: キーを削除"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def exists(self, key: str) -> bool:
        """Redis互換: キーの存在確認"""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return False
            if entry.expires_at and entry.expires_at < time.time():
                del self._cache[key]
                return False
            return True

    def ttl(self, key: str) -> int:
        """Redis互換: 残りTTLを取得"""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return -2  # キーが存在しない
            if entry.expires_at is None:
                return -1  # TTLなし

            remaining = entry.expires_at - time.time()
            return max(0, int(remaining))

    def expire(self, key: str, seconds: int) -> bool:
        """Redis互換: TTLを設定"""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return False
            entry.expires_at = time.time() + seconds
            return True

    def incr(self, key: str, amount: int = 1) -> int:
        """Redis互換: 数値をインクリメント"""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self.set(key, amount)
                return amount

            try:
                new_value = int(entry.value) + amount
                entry.value = new_value
                return new_value
            except (TypeError, ValueError):
                raise TypeError("Value is not an integer")

    def keys(self, pattern: str = "*") -> List[str]:
        """Redis互換: キー一覧を取得"""
        import fnmatch

        with self._lock:
            return [k for k in self._cache.keys() if fnmatch.fnmatch(k, pattern)]

    def flushall(self):
        """Redis互換: 全キャッシュをクリア"""
        with self._lock:
            self._cache.clear()
            self._stats = {"hits": 0, "misses": 0, "evictions": 0}

    def info(self) -> Dict[str, Any]:
        """Redis互換: キャッシュ情報を取得"""
        with self._lock:
            total = self._stats["hits"] + self._stats["misses"]
            hit_rate = self._stats["hits"] / total if total > 0 else 0

            return {
                "keys": len(self._cache),
                "max_size": self.max_size,
                "hits": self._stats["hits"],
                "misses": self._stats["misses"],
                "evictions": self._stats["evictions"],
                "hit_rate": hit_rate,
            }

    def close(self):
        """キャッシュをクローズ"""
        self._stop_cleanup.set()
        if self._cleanup_thread:
            self._cleanup_thread.join(timeout=1)


def cached(
    ttl: Optional[int] = 300,
    key_prefix: str = "",
    key_builder: Optional[Callable[..., str]] = None,
):
    """キャッシュデコレータ

    Args:
        ttl: キャッシュTTL（秒）
        key_prefix: キーのプレフィックス
        key_builder: カスタムキービルダー
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        cache = get_memory_cache()

        def wrapper(*args, **kwargs) -> T:
            # キー生成
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                key_parts = [key_prefix or func.__name__]
                key_parts.extend(str(a) for a in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = ":".join(key_parts)

            # キャッシュチェック
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # 実行とキャッシュ
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ex=ttl)

            return result

        wrapper.__wrapped__ = func
        return wrapper

    return decorator


# シングルトンインスタンス
_memory_cache: Optional[MemoryCache] = None


def get_memory_cache(
    max_size: int = 10000,
    default_ttl: Optional[int] = 300,
) -> MemoryCache:
    """シングルトンインスタンスを取得"""
    global _memory_cache
    if _memory_cache is None:
        _memory_cache = MemoryCache(
            max_size=max_size,
            default_ttl=default_ttl,
        )
    return _memory_cache
