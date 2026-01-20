"""
非同期データベースマネージャー
接続プール、非同期操作、ストリーミング対応の最適化されたデータアクセス層
"""

import asyncio
import aiosqlite
import logging
import sqlite3
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional
from pathlib import Path
import json
from uuid import uuid4
import asyncpg
import aioredis
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import text, select, and_, or_
import pandas as pd
from src.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ConnectionPoolConfig:
    """接続プール設定"""
    min_connections: int = 2
    max_connections: int = 20
    connection_timeout: float = 30.0
    idle_timeout: float = 300.0
    max_lifetime: float = 3600.0


@dataclass
class QueryOptimization:
    """クエリ最適化設定"""
    enable_lazy_loading: bool = True
    batch_size: int = 1000
    enable_streaming: bool = True
    cache_ttl: int = 300
    n11_threshold: int = 100


class AsyncDatabaseManager:
    """非同期データベースマネージャー"""

    def __init__(self, pool_config: ConnectionPoolConfig = None):
        self.pool_config = pool_config or ConnectionPoolConfig()
        self.engine = None
        self.session_factory = None
        self.redis_pool = None
        self._initialized = False

    async def initialize(self):
        """非同期初期化"""
        if self._initialized:
            return

        # SQLite非同期エンジンの作成
        db_path = str(settings.system.db_path)
        self.engine = create_async_engine(
            f"sqlite+aiosqlite:///{db_path}",
            pool_size=self.pool_config.max_connections,
            max_overflow=self.pool_config.max_connections,
            pool_timeout=self.pool_config.connection_timeout,
            echo=settings.get("debug", False),
            # SQLite最適化設定
            connect_args={
                "check_same_thread": False,
                "timeout": self.pool_config.connection_timeout,
                "isolation_level": None,
            }
        )

        self.session_factory = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False
        )

        # Redis接続プール
        try:
            self.redis_pool = aioredis.ConnectionPool.from_url(
                settings.system.redis_url,
                max_connections=self.pool_config.max_connections,
                timeout=self.pool_config.connection_timeout
            )
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")

        await self._init_database_schema()
        self._initialized = True
        logger.info("Async Database Manager initialized")

    async def _init_database_schema(self):
        """データベーススキーマ初期化"""
        async with self.session_factory() as session:
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS portfolio_history (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    total_value REAL NOT NULL,
                    cash_balance REAL NOT NULL,
                    positions TEXT,
                    daily_return REAL,
                    total_return REAL
                )
            """))
            
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS trades (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    action TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    price REAL NOT NULL,
                    total REAL NOT NULL,
                    status TEXT DEFAULT 'pending'
                )
            """))
            
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS ticker_metadata (
                    ticker TEXT PRIMARY KEY,
                    last_updated TIMESTAMP,
                    start_date TIMESTAMP,
                    end_date TIMESTAMP,
                    data_points INTEGER,
                    file_path TEXT
                )
            """))
            
            # パフォーマンスインデックス作成
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_portfolio_timestamp 
                ON portfolio_history(timestamp)
            """))
            
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_trades_symbol_timestamp 
                ON trades(symbol, timestamp)
            """))
            
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ticker_updated 
                ON ticker_metadata(last_updated)
            """))
            
            await session.commit()

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """非同期セッション取得"""
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def execute_query(
        self, 
        query: str, 
        params: tuple = None,
        fetch_mode: str = "all"
    ) -> List[Dict[str, Any]]:
        """クエリ実行"""
        async with self.get_session() as session:
            result = await session.execute(text(query), params or ())
            
            if fetch_mode == "all":
                return [dict(row._mapping) for row in result.fetchall()]
            elif fetch_mode == "one":
                row = result.fetchone()
                return dict(row._mapping) if row else None
            elif fetch_mode == "scalar":
                return result.scalar()

    async def execute_batch(
        self, 
        query: str, 
        params_list: List[tuple]
    ) -> int:
        """バッチ実行"""
        async with self.get_session() as session:
            result = await session.execute(text(query), params_list)
            return result.rowcount

    async def stream_query(
        self,
        query: str,
        params: tuple = None,
        batch_size: int = 1000
    ) -> AsyncGenerator[List[Dict[str, Any]], None]:
        """クエリ結果ストリーミング"""
        async with self.get_session() as session:
            result = await session.execute(text(query), params or ())
            
            while True:
                batch = result.fetchmany(batch_size)
                if not batch:
                    break
                yield [dict(row._mapping) for row in batch]

    async def save_portfolio_optimized(
        self,
        portfolios: List[Dict[str, Any]]
    ) -> List[str]:
        """ポートフォリオ一括保存"""
        if not portfolios:
            return []

        # バッチINSERT
        values = []
        ids = []
        for portfolio in portfolios:
            portfolio_id = str(uuid4())
            ids.append(portfolio_id)
            values.append((
                portfolio_id,
                datetime.now().isoformat(),
                portfolio["total_value"],
                portfolio["cash_balance"],
                json.dumps(portfolio.get("positions", {})),
                portfolio.get("daily_return", 0.0),
                portfolio.get("total_return", 0.0)
            ))

        query = """
            INSERT INTO portfolio_history
            (id, timestamp, total_value, cash_balance, positions, daily_return, total_return)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        await self.execute_batch(query, values)
        return ids

    async def get_portfolio_history_optimized(
        self,
        limit: int = 100,
        offset: int = 0,
        use_streaming: bool = False
    ) -> List[Dict[str, Any]]:
        """ポートフォリオ履歴取得（最適化版）"""
        query = """
            SELECT * FROM portfolio_history 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
        """
        
        if use_streaming:
            async for batch in self.stream_query(query, (limit, offset)):
                return batch
        else:
            return await self.execute_query(query, (limit, offset))

    async def get_trades_optimized(
        self,
        symbol: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        use_lazy_loading: bool = True
    ) -> List[Dict[str, Any]]:
        """取引履歴取得（N+1対策）"""
        
        # 条件動的生成
        conditions = ["1=1"]
        params = []
        
        if symbol:
            conditions.append("symbol = ?")
            params.append(symbol)
            
        if status:
            conditions.append("status = ?")
            params.append(status)
            
        query = f"""
            SELECT * FROM trades 
            WHERE {' AND '.join(conditions)}
            ORDER BY timestamp DESC 
            LIMIT ?
        """
        params.append(limit)
        
        return await self.execute_query(query, tuple(params))

    async def get_trades_with_portfolio_lazy(
        self,
        trade_ids: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """遅延読み込みで取引と関連ポートフォリオを取得"""
        
        # 取引を一括取得
        placeholders = ','.join(['?' for _ in trade_ids])
        trades_query = f"""
            SELECT * FROM trades 
            WHERE id IN ({placeholders})
        """
        trades = await self.execute_query(trades_query, tuple(trade_ids))
        
        # 必要に応じてポートフォリオを遅延読み込み
        if trades and len(trades) < 50:  # 少量の場合のみ結合
            timestamps = [t['timestamp'] for t in trades]
            portfolio_query = """
                SELECT * FROM portfolio_history 
                WHERE timestamp IN ({})
                ORDER BY timestamp DESC
            """.format(','join(['?' for _ in timestamps]))
            
            portfolios = await self.execute_query(portfolio_query, tuple(timestamps))
            portfolio_map = {p['timestamp']: p for p in portfolios}
            
            # 結合
            for trade in trades:
                trade['portfolio'] = portfolio_map.get(trade['timestamp'])
        
        return {t['id']: t for t in trades}

    async def get_ticker_metadata_cached(
        self,
        ticker: str,
        cache_ttl: int = 300
    ) -> Optional[Dict[str, Any]]:
        """キャッシュ付きティッカーメタデータ取得"""
        
        # Redisからキャッシュ確認
        if self.redis_pool:
            try:
                redis = aioredis.Redis(connection_pool=self.redis_pool)
                cache_key = f"ticker_meta:{ticker}"
                cached = await redis.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception as e:
                logger.warning(f"Redis cache error: {e}")
        
        # DBから取得
        query = "SELECT * FROM ticker_metadata WHERE ticker = ?"
        result = await self.execute_query(query, (ticker,), fetch_mode="one")
        
        # キャッシュ保存
        if result and self.redis_pool:
            try:
                redis = aioredis.Redis(connection_pool=self.redis_pool)
                cache_key = f"ticker_meta:{ticker}"
                await redis.setex(cache_key, cache_ttl, json.dumps(result))
            except Exception as e:
                logger.warning(f"Redis cache save error: {e}")
        
        return result

    async def bulk_update_trade_status(
        self,
        updates: List[Dict[str, Any]]
    ) -> int:
        """取引ステータス一括更新"""
        
        if not updates:
            return 0
            
        values = [(update['status'], update['id']) for update in updates]
        query = "UPDATE trades SET status = ? WHERE id = ?"
        
        return await self.execute_batch(query, values)

    async def get_database_stats(self) -> Dict[str, Any]:
        """データベース統計情報"""
        stats = {}
        
        # テーブルごとのレコード数
        tables = ['portfolio_history', 'trades', 'ticker_metadata']
        for table in tables:
            query = f"SELECT COUNT(*) as count FROM {table}"
            result = await self.execute_query(query, fetch_mode="scalar")
            stats[f"{table}_count"] = result
        
        # データベースサイズ
        try:
            db_path = Path(settings.system.db_path)
            if db_path.exists():
                stats["db_size_bytes"] = db_path.stat().st_size
                stats["db_size_mb"] = stats["db_size_bytes"] / (1024 * 1024)
        except Exception as e:
            logger.warning(f"Failed to get DB size: {e}")
        
        return stats

    async def optimize_database(self):
        """データベース最適化"""
        async with self.get_session() as session:
            await session.execute(text("PRAGMA journal_mode=WAL"))
            await session.execute(text("PRAGMA synchronous=NORMAL"))
            await session.execute(text("PRAGMA cache_size=10000"))
            await session.execute(text("PRAGMA temp_store=MEMORY"))
            await session.execute(text("ANALYZE"))
            await session.commit()
        
        logger.info("Database optimization completed")

    async def close(self):
        """接続クローズ"""
        if self.engine:
            await self.engine.dispose()
        if self.redis_pool:
            await self.redis_pool.disconnect()
        self._initialized = False


# グローバルインスタンス
_async_db_manager = None


async def get_async_db_manager() -> AsyncDatabaseManager:
    """非同期DBマネージャーシングルトン取得"""
    global _async_db_manager
    if _async_db_manager is None:
        _async_db_manager = AsyncDatabaseManager()
        await _async_db_manager.initialize()
    return _async_db_manager


# 同期インターフェース（後方互換性）
class SyncDatabaseWrapper:
    """同期DBマネージャーラッパー"""
    
    def __init__(self):
        self._async_manager = None
    
    def _ensure_initialized(self):
        if not self._async_manager:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                self._async_manager = AsyncDatabaseManager()
                asyncio.create_task(self._async_manager.initialize())
            else:
                self._async_manager = loop.run_until_complete(get_async_db_manager())
    
    def save_portfolio_sync(self, **kwargs):
        """同期ポートフォリオ保存"""
        self._ensure_initialized()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return asyncio.run(self._async_manager.save_portfolio_optimized([kwargs]))
        return loop.run_until_complete(self._async_manager.save_portfolio_optimized([kwargs]))
    
    def get_portfolio_history_sync(self, limit=100):
        """同期ポートフォリオ履歴取得"""
        self._ensure_initialized()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return asyncio.run(self._async_manager.get_portfolio_history_optimized(limit))
        return loop.run_until_complete(self._async_manager.get_portfolio_history_optimized(limit))


# 同期インスタンス（既存コード互換）
sync_db_wrapper = SyncDatabaseWrapper()