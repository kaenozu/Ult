"""
Multi-Level Caching System
マルチレベルキャッシュシステム（インメモリ + Redis）
"""

import asyncio
import json
import logging
import pickle
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable
from enum import Enum
from dataclasses import dataclass

try:
    import redis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


class CacheLevel(str, Enum):
    """キャッシュレベル"""

    MEMORY = "memory"
    REDIS = "redis"
    HYBRID = "hybrid"


@dataclass
class CacheConfig:
    """キャッシュ設定"""

    memory_ttl: float = 300.0  # seconds
    redis_ttl: float = 3600.0  # seconds
    max_memory_size: int = 1000
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    enable_compression: bool = True
    enable_serializer: bool = True


class CacheEntry:
    """キャッシュエントリ"""

    def __init__(self, value: Any, ttl: float = 300.0):
        self.value = value
        self.created_at = datetime.now()
        self.expires_at = self.created_at + timedelta(seconds=ttl)
        self.access_count = 0
        self.last_accessed = self.created_at
        self.size = self._calculate_size()

    def _calculate_size(self) -> int:
        """オブジェクトサイズを概算"""
        try:
            return len(pickle.dumps(self.value))
        except:
            return len(str(self.value))

    def is_expired(self) -> bool:
        """期限切れチェック"""
        return datetime.now() > self.expires_at

    def is_valid(self) -> bool:
        """有効性チェック"""
        return not self.is_expired()

    def touch(self):
        """アクセス時間を更新"""
        self.access_count += 1
        self.last_accessed = datetime.now()


class MemoryCache:
    """インメモリキャッシュ"""

    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache: Dict[str, CacheEntry] = {}
        self.access_order: List[str] = []
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """値を取得"""

        async with self._lock:
            if key not in self.cache:
                return None

            entry = self.cache[key]

            if not entry.is_valid():
                del self.cache[key]
                self.access_order.remove(key)
                return None

            entry.touch()
            return entry.value

    async def set(self, key: str, value: Any, ttl: float = 300.0) -> None:
        """値を設定"""

        async with self._lock:
            # 既存エントリを削除
            if key in self.cache:
                self.access_order.remove(key)

            # 新しいエントリを作成
            entry = CacheEntry(value, ttl)
            self.cache[key] = entry
            self.access_order.append(key)

            # 最大サイズチェックとLRU削除
            while len(self.cache) > self.max_size:
                oldest_key = self.access_order.pop(0)
                del self.cache[oldest_key]

    async def delete(self, key: str) -> bool:
        """値を削除"""

        async with self._lock:
            if key not in self.cache:
                return False

            del self.cache[key]
            self.access_order.remove(key)
            return True

    async def clear(self) -> None:
        """キャッシュをクリア"""

        async with self._lock:
            self.cache.clear()
            self.access_order.clear()

    async def cleanup_expired(self) -> int:
        """期限切れエントリをクリーンアップ"""

        async with self._lock:
            expired_keys = []

            for key, entry in self.cache.items():
                if entry.is_expired():
                    expired_keys.append(key)

            for key in expired_keys:
                del self.cache[key]
                if key in self.access_order:
                    self.access_order.remove(key)

            return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """統計情報を取得"""

        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "utilization": len(self.cache) / self.max_size,
            "entries": len(self.cache),
        }


class RedisCache:
    """Redisキャッシュ"""

    def __init__(self, config: CacheConfig):
        self.config = config

        if not REDIS_AVAILABLE:
            logger.warning("Redis not available, falling back to memory cache")
            self.enabled = False
            return

        try:
            self.redis_client = redis.Redis(
                host=config.redis_host,
                port=config.redis_port,
                db=config.redis_db,
                password=config.redis_password,
                decode_responses=False,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )

            # 接続テスト
            self.redis_client.ping()
            self.enabled = True
            logger.info("Redis cache initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            self.enabled = False

    async def get(self, key: str) -> Optional[Any]:
        """値を取得"""

        if not self.enabled:
            return None

        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, self.redis_client.get, key)

            if data is None:
                return None

            if self.config.enable_compression:
                return pickle.loads(data)
            else:
                return pickle.loads(data)  # JSONデコード

        except Exception as e:
            logger.error(f"Redis get error for key {key}: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: float = 3600.0) -> None:
        """値を設定"""

        if not self.enabled:
            return

        try:
            loop = asyncio.get_event_loop()

            if self.config.enable_compression:
                data = pickle.dumps(value)
            else:
                data = json.dumps(value).encode("utf-8")

            await loop.run_in_executor(
                None, lambda: self.redis_client.setex(key, int(ttl), data)
            )

        except Exception as e:
            logger.error(f"Redis set error for key {key}: {e}")

    async def delete(self, key: str) -> bool:
        """値を削除"""

        if not self.enabled:
            return False

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self.redis_client.delete, key)

            return result > 0

        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {e}")
            return False

    async def clear(self) -> None:
        """キャッシュをクリア"""

        if not self.enabled:
            return

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self.redis_client.flushdb)

        except Exception as e:
            logger.error(f"Redis clear error: {e}")

    async def exists(self, key: str) -> bool:
        """キーの存在チェック"""

        if not self.enabled:
            return False

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self.redis_client.exists, key)

            return result > 0

        except Exception as e:
            logger.error(f"Redis exists error for key {key}: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """統計情報を取得"""

        if not self.enabled:
            return {"enabled": False}

        try:
            loop = asyncio.get_event_loop()
            info = loop.run_in_executor(None, self.redis_client.info)

            return {
                "enabled": True,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "used_memory_rss": info.get("used_memory_rss", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
            }

        except Exception as e:
            logger.error(f"Redis stats error: {e}")
            return {"enabled": False, "error": str(e)}


class HybridCache:
    """ハイブリッドキャッシュ（インメモリ + Redis）"""

    def __init__(self, config: CacheConfig):
        self.config = config
        self.memory_cache = MemoryCache(config.max_memory_size)
        self.redis_cache = RedisCache(config)
        self.stats = {
            "hits": {"memory": 0, "redis": 0},
            "misses": 0,
            "sets": {"memory": 0, "redis": 0},
        }

    async def get(self, key: str, fallback_to_redis: bool = True) -> Optional[Any]:
        """値を取得（メモリ→Redisの順）"""

        # まずインメモリをチェック
        value = await self.memory_cache.get(key)
        if value is not None:
            self.stats["hits"]["memory"] += 1
            return value

        if not fallback_to_redis:
            self.stats["misses"] += 1
            return None

        # 次にRedisをチェック
        value = await self.redis_cache.get(key)
        if value is not None:
            # Redisから取得した値をメモリにキャッシュ
            await self.memory_cache.set(key, value, self.config.memory_ttl)
            self.stats["hits"]["redis"] += 1
            return value

        self.stats["misses"] += 1
        return None

    async def set(
        self,
        key: str,
        value: Any,
        level: CacheLevel = CacheLevel.HYBRID,
        ttl: Optional[float] = None,
    ) -> None:
        """値を設定"""

        memory_ttl = ttl or self.config.memory_ttl
        redis_ttl = ttl or self.config.redis_ttl

        if level in [CacheLevel.MEMORY, CacheLevel.HYBRID]:
            await self.memory_cache.set(key, value, memory_ttl)
            self.stats["sets"]["memory"] += 1

        if level in [CacheLevel.REDIS, CacheLevel.HYBRID]:
            await self.redis_cache.set(key, value, redis_ttl)
            self.stats["sets"]["redis"] += 1

    async def delete(self, key: str, level: CacheLevel = CacheLevel.HYBRID) -> bool:
        """値を削除"""

        memory_deleted = False
        redis_deleted = False

        if level in [CacheLevel.MEMORY, CacheLevel.HYBRID]:
            memory_deleted = await self.memory_cache.delete(key)

        if level in [CacheLevel.REDIS, CacheLevel.HYBRID]:
            redis_deleted = await self.redis_cache.delete(key)

        return memory_deleted or redis_deleted

    async def clear(self, level: CacheLevel = CacheLevel.HYBRID) -> None:
        """キャッシュをクリア"""

        if level in [CacheLevel.MEMORY, CacheLevel.HYBRID]:
            await self.memory_cache.clear()

        if level in [CacheLevel.REDIS, CacheLevel.HYBRID]:
            await self.redis_cache.clear()

    async def warm(self, keys: List[str], loader: Callable[[str], Any]) -> None:
        """キャッシュウォームアップ"""

        logger.info(f"Warming up cache with {len(keys)} keys")

        for key in keys:
            try:
                value = loader(key)
                await self.set(key, value, CacheLevel.HYBRID)
            except Exception as e:
                logger.error(f"Failed to warm cache for key {key}: {e}")

        logger.info("Cache warm-up completed")

    def get_stats(self) -> Dict[str, Any]:
        """統計情報を取得"""

        memory_stats = self.memory_cache.get_stats()
        redis_stats = self.redis_cache.get_stats()
        total_hits = self.stats["hits"]["memory"] + self.stats["hits"]["redis"]
        total_requests = total_hits + self.stats["misses"]

        return {
            "memory": memory_stats,
            "redis": redis_stats,
            "hybrid": {
                "hits": self.stats["hits"],
                "misses": self.stats["misses"],
                "sets": self.stats["sets"],
                "hit_rate": total_hits / total_requests if total_requests > 0 else 0,
                "total_requests": total_requests,
            },
        }


class CacheManager:
    """統一キャッシュマネージャー"""

    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.cache = HybridCache(self.config)
        self.timers: Dict[str, asyncio.Task] = {}

    def cache_result(
        self, key: str, ttl: float = 300.0, level: CacheLevel = CacheLevel.HYBRID
    ) -> Callable:
        """結果をキャッシュするデコレータ"""

        def decorator(func):
            async def wrapper(*args, **kwargs):
                cache_key = (
                    key if key else f"{func.__name__}:{hash(args)}:{hash(str(kwargs))}"
                )

                # キャッシュをチェック
                result = await self.cache.get(cache_key)
                if result is not None:
                    return result

                # 関数を実行
                result = await func(*args, **kwargs)

                # 結果をキャッシュ
                await self.cache.set(cache_key, result, level, ttl)

                return result

            return wrapper

        return decorator

    def cache_with_ttl(
        self, ttl: float, level: CacheLevel = CacheLevel.HYBRID
    ) -> Callable:
        """TTL指定キャッシュデコレータ"""

        def decorator(func):
            return self.cache_result(f"{func.__name__}", ttl, level)(func)

        return decorator

    async def invalidate_pattern(
        self, pattern: str, level: CacheLevel = CacheLevel.HYBRID
    ) -> int:
        """パターンに一致するキーを無効化"""

        if level == CacheLevel.REDIS:
            # Redisの場合はワイルドカード削除
            # 実装はRedisのコマンドによる
            return 0

        # メモリキャッシュの場合
        count = 0
        keys_to_delete = []

        for key in self.cache.memory_cache.cache.keys():
            if pattern in key:
                keys_to_delete.append(key)

        for key in keys_to_delete:
            if await self.cache.delete(key, CacheLevel.MEMORY):
                count += 1

        return count

    async def set_ttl_timer(self, key: str, ttl: float) -> None:
        """TTLタイマーを設定"""

        if key in self.timers:
            self.timers[key].cancel()

        async def expire():
            await asyncio.sleep(ttl)
            await self.cache.delete(key)

        self.timers[key] = asyncio.create_task(expire())

    async def cleanup(self) -> Dict[str, int]:
        """クリーンアップを実行"""

        memory_cleaned = await self.cache.memory_cache.cleanup_expired()

        return {"memory_expired": memory_cleaned, "total_cleaned": memory_cleaned}

    def get_performance_stats(self) -> Dict[str, Any]:
        """パフォーマンス統計を取得"""

        return self.cache.get_stats()


# グローバルインスタンス
default_config = CacheConfig()
default_cache = CacheManager(default_config)
