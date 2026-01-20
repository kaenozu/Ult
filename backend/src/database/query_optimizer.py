"""
データアクセスパターン最適化ユーティリティ
N+1クエリ対策、バッチ処理、キャッシュ戦略
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Set, Union, Callable
from dataclasses import dataclass
from functools import wraps, lru_cache
from datetime import datetime, timedelta
import json
import hashlib
import aioredis
import pandas as pd
from src.core.config import settings
from src.database.async_manager import AsyncDatabaseManager

logger = logging.getLogger(__name__)


@dataclass
class CacheConfig:
    """キャッシュ設定"""

    enabled: bool = True
    default_ttl: int = 300
    key_prefix: str = "cache"
    max_size: int = 1000


@dataclass
class BatchConfig:
    """バッチ処理設定"""

    enabled: bool = True
    batch_size: int = 1000
    flush_interval: float = 5.0
    max_wait_time: float = 10.0


class QueryOptimizer:
    """クエリ最適化クラス"""

    def __init__(self, db_manager: AsyncDatabaseManager):
        self.db = db_manager
        self.redis_pool = None
        self._pending_batches: Dict[str, List[Any]] = {}
        self._batch_timers: Dict[str, asyncio.Task] = {}

        asyncio.create_task(self._init_redis())

    async def _init_redis(self):
        """Redis初期化"""
        try:
            self.redis_pool = aioredis.ConnectionPool.from_url(
                settings.system.redis_url, max_connections=20
            )
        except Exception as e:
            logger.warning(f"Redis init failed: {e}")

    def cache_result(
        self,
        ttl: int = 300,
        key_func: Optional[Callable] = None,
        condition: Optional[Callable] = None,
    ):
        """結果キャッシュデコレータ"""

        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                if not self.redis_pool:
                    return await func(*args, **kwargs)

                # キャッシュ条件チェック
                if condition and not condition(*args, **kwargs):
                    return await func(*args, **kwargs)

                # キャッシュキー生成
                cache_key = self._generate_cache_key(func, args, kwargs, key_func)

                try:
                    redis = aioredis.Redis(connection_pool=self.redis_pool)

                    # キャッシュヒット
                    cached = await redis.get(cache_key)
                    if cached:
                        logger.debug(f"Cache hit: {cache_key}")
                        return json.loads(cached)

                    # 実行とキャッシュ保存
                    result = await func(*args, **kwargs)

                    # 大きすぎる結果はキャッシュしない
                    result_json = json.dumps(result, default=str)
                    if len(result_json) < 1024 * 1024:  # 1MB limit
                        await redis.setex(cache_key, ttl, result_json)
                        logger.debug(f"Cache saved: {cache_key}")

                    return result

                except Exception as e:
                    logger.warning(f"Cache error: {e}")
                    return await func(*args, **kwargs)

            return wrapper

        return decorator

    def _generate_cache_key(
        self,
        func: Callable,
        args: tuple,
        kwargs: dict,
        key_func: Optional[Callable] = None,
    ) -> str:
        """キャッシュキー生成"""
        if key_func:
            return key_func(*args, **kwargs)

        # 関数名と引数からキー生成
        key_data = {
            "func": func.__name__,
            "args": str(args),
            "kwargs": str(sorted(kwargs.items())),
        }
        key_hash = hashlib.md5(
            json.dumps(key_data, sort_keys=True).encode()
        ).hexdigest()
        return f"cache:{func.__name__}:{key_hash}"

    async def bulk_select_with_cache(
        self,
        table: str,
        ids: List[str],
        columns: List[str] = None,
        cache_ttl: int = 300,
    ) -> Dict[str, Dict[str, Any]]:
        """キャッシュ付き一括選択"""
        if not ids:
            return {}

        # キャッシュから取得
        cached_results = {}
        uncached_ids = []

        if self.redis_pool:
            try:
                redis = aioredis.Redis(connection_pool=self.redis_pool)

                # パイプラインで一括取得
                cache_keys = [f"{table}:item:{id}" for id in ids]
                cached_values = await redis.mget(cache_keys)

                for id, cached_value in zip(ids, cached_values):
                    if cached_value:
                        cached_results[id] = json.loads(cached_value)
                    else:
                        uncached_ids.append(id)

            except Exception as e:
                logger.warning(f"Batch cache error: {e}")
                uncached_ids = ids
        else:
            uncached_ids = ids

        # DBから未キャッシュ分を取得
        db_results = {}
        if uncached_ids:
            placeholders = ",".join(["?" for _ in uncached_ids])
            columns_str = ",".join(columns) if columns else "*"
            query = f"SELECT {columns_str} FROM {table} WHERE id IN ({placeholders})"

            rows = await self.db.execute_query(query, tuple(uncached_ids))
            db_results = {row["id"]: row for row in rows}

            # キャッシュ保存
            if self.redis_pool:
                try:
                    redis = aioredis.Redis(connection_pool=self.redis_pool)
                    pipe = redis.pipeline()

                    for id, row in db_results.items():
                        cache_key = f"{table}:item:{id}"
                        pipe.setex(cache_key, cache_ttl, json.dumps(row, default=str))

                    await pipe.execute()
                except Exception as e:
                    logger.warning(f"Cache save error: {e}")

        # 結果をマージ
        cached_results.update(db_results)
        return cached_results

    def batch_insert(
        self, table: str, batch_size: int = 1000, max_wait_time: float = 10.0
    ):
        """バッチ挿入デコレータ"""

        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                data = kwargs.get("data") or args[0] if args else []

                if not isinstance(data, list):
                    return await func(*args, **kwargs)

                if len(data) <= batch_size:
                    return await func(*args, **kwargs)

                # バッチ分割処理
                results = []
                for i in range(0, len(data), batch_size):
                    batch = data[i : i + batch_size]
                    batch_result = await func(batch, *args[1:], **kwargs)
                    results.extend(batch_result)

                return results

            return wrapper

        return decorator

    async def prevent_n_plus_one(
        self,
        main_query: str,
        related_queries: Dict[str, tuple],
        main_params: tuple = None,
    ) -> List[Dict[str, Any]]:
        """N+1クエリ対策"""

        # メインクエリ実行
        main_results = await self.db.execute_query(main_query, main_params or ())

        if not main_results:
            return []

        # 関連データのIDを収集
        related_ids: Dict[str, Set] = {}
        for query_name, (id_field, _) in related_queries.items():
            related_ids[query_name] = {
                row[id_field] for row in main_results if row.get(id_field)
            }

        # 関連データを一括取得
        related_data: Dict[str, Dict] = {}
        for query_name, ids in related_ids.items():
            if not ids:
                continue

            _, query_template = related_queries[query_name]
            placeholders = ",".join(["?" for _ in ids])
            query = query_template.format(placeholders=placeholders)

            rows = await self.db.execute_query(query, tuple(ids))
            related_data[query_name] = {row["id"]: row for row in rows}

        # 結合
        for row in main_results:
            for query_name, id_field in related_queries.items():
                id_value = row[id_field]
                if id_value and id_value in related_data[query_name]:
                    row[f"{query_name}_data"] = related_data[query_name][id_value]

        return main_results

    async def stream_large_dataset(
        self,
        query: str,
        params: tuple = None,
        batch_size: int = 1000,
        process_func: Optional[Callable] = None,
    ) -> AsyncGenerator[Any, None]:
        """大規模データセットのストリーミング処理"""

        async for batch in self.db.stream_query(query, params, batch_size):
            if process_func:
                processed = await process_func(batch)
                if processed:
                    yield processed
            else:
                yield batch

    async def lazy_load_related_data(
        self,
        primary_data: List[Dict[str, Any]],
        relationship_config: Dict[str, Dict[str, Any]],
        load_condition: Optional[Callable] = None,
    ) -> List[Dict[str, Any]]:
        """関連データの遅延読み込み"""

        result_data = primary_data.copy()

        for relation_name, config in relationship_config.items():
            # 読み込み条件チェック
            if load_condition and not load_condition(result_data, relation_name):
                continue

            # 関連ID収集
            id_field = config["id_field"]
            related_ids = {row[id_field] for row in result_data if row.get(id_field)}

            if not related_ids:
                continue

            # 関連データ取得
            table = config["table"]
            related_data = await self.bulk_select_with_cache(
                table=table,
                ids=list(related_ids),
                columns=config.get("columns"),
                cache_ttl=config.get("cache_ttl", 300),
            )

            # 結合
            for row in result_data:
                related_id = row.get(id_field)
                if related_id and related_id in related_data:
                    row[relation_name] = related_data[related_id]

        return result_data

    async def invalidate_cache_pattern(self, pattern: str):
        """キャッシュパターン無効化"""
        if not self.redis_pool:
            return

        try:
            redis = aioredis.Redis(connection_pool=self.redis_pool)
            keys = await redis.keys(pattern)
            if keys:
                await redis.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache keys: {pattern}")
        except Exception as e:
            logger.warning(f"Cache invalidation error: {e}")

    async def get_cache_stats(self) -> Dict[str, Any]:
        """キャッシュ統計"""
        stats = {"redis_connected": False, "cache_size": 0, "hit_rate": 0.0}

        if self.redis_pool:
            try:
                redis = aioredis.Redis(connection_pool=self.redis_pool)
                info = await redis.info()
                stats["redis_connected"] = True
                stats["cache_size"] = info.get("used_memory", 0)
                stats["hit_rate"] = info.get("keyspace_hits", 0) / max(
                    info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1), 1
                )
            except Exception as e:
                logger.warning(f"Cache stats error: {e}")

        return stats


class DataLoaderRegistry:
    """データローダーレジストリ（Facebook DataLoader風）"""

    def __init__(self):
        self._loaders: Dict[str, Callable] = {}
        self._cache: Dict[str, Any] = {}
        self._pending: Dict[str, asyncio.Task] = {}

    def register(self, name: str, loader: Callable):
        """ローダー登録"""
        self._loaders[name] = loader

    async def load(self, name: str, key: Any) -> Any:
        """データ読み込み"""
        cache_key = f"{name}:{key}"

        # キャッシュチェック
        if cache_key in self._cache:
            return self._cache[cache_key]

        # 進行中のロードチェック
        if cache_key in self._pending:
            return await self._pending[cache_key]

        # 新規ロード
        if name not in self._loaders:
            raise ValueError(f"Unknown loader: {name}")

        task = asyncio.create_task(self._load_and_cache(name, key, cache_key))
        self._pending[cache_key] = task

        try:
            result = await task
            return result
        finally:
            self._pending.pop(cache_key, None)

    async def _load_and_cache(self, name: str, key: Any, cache_key: str) -> Any:
        """データ読み込みとキャッシュ"""
        loader = self._loaders[name]
        result = await loader(key)
        self._cache[cache_key] = result
        return result

    async def load_many(self, name: str, keys: List[Any]) -> List[Any]:
        """一括データ読み込み"""
        tasks = [self.load(name, key) for key in keys]
        return await asyncio.gather(*tasks)

    def clear_cache(self, name: Optional[str] = None):
        """キャッシュクリア"""
        if name:
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(f"{name}:")]
            for key in keys_to_remove:
                self._cache.pop(key, None)
        else:
            self._cache.clear()


# グローバルインスタンス
_data_loader_registry = DataLoaderRegistry()


def get_data_loader_registry() -> DataLoaderRegistry:
    """データローダーレジストリ取得"""
    return _data_loader_registry
