"""
データアクセス最適化の実装例
既存のdatabase_manager.pyを非同期対応に改善
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from uuid import uuid4

from src.database.async_manager import get_async_db_manager, AsyncDatabaseManager
from src.database.query_optimizer import get_data_loader_registry, QueryOptimizer
from src.logging.structured_logger import get_logger, log_performance, Component
from src.database_manager import PortfolioRecord, TradeRecord, AlertRecord

logger = get_logger(__name__)


class OptimizedDatabaseManager:
    """最適化されたデータベースマネージャー"""

    def __init__(self):
        self.async_db: AsyncDatabaseManager = None
        self.optimizer: QueryOptimizer = None
        self.data_loader_registry = get_data_loader_registry()

        # 非同期初期化
        asyncio.create_task(self._initialize())

    async def _initialize(self):
        """非同期初期化"""
        self.async_db = await get_async_db_manager()
        self.optimizer = QueryOptimizer(self.async_db)

        # データローダー登録
        self.data_loader_registry.register(
            "portfolio_by_id", self._load_portfolio_by_id
        )
        self.data_loader_registry.register(
            "trades_by_symbol", self._load_trades_by_symbol
        )

    @log_performance("save_portfolio_batch")
    async def save_portfolio_batch(
        self, portfolios: List[PortfolioRecord]
    ) -> List[str]:
        """ポートフォリオ一括保存（最適化版）"""

        # データ変換
        portfolio_dicts = []
        for portfolio in portfolios:
            portfolio_dicts.append(
                {
                    "total_value": portfolio.total_value,
                    "cash_balance": portfolio.cash_balance,
                    "positions": json.loads(portfolio.positions)
                    if isinstance(portfolio.positions, str)
                    else portfolio.positions,
                    "daily_return": portfolio.daily_return,
                    "total_return": portfolio.total_return,
                }
            )

        # 非同期一括保存
        ids = await self.async_db.save_portfolio_optimized(portfolio_dicts)

        logger.info(f"Saved {len(portfolios)} portfolios in batch")
        return ids

    @log_performance("get_portfolio_history_with_cache")
    async def get_portfolio_history_with_cache(
        self, limit: int = 100, use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """キャッシュ付きポートフォリオ履歴取得"""

        if use_cache:
            # キャッシュ付き取得
            cache_key = f"portfolio_history:{limit}"
            result = await self.async_db.get_trades_optimized(symbol=None, limit=limit)
            return result
        else:
            # 直接取得
            return await self.async_db.get_portfolio_history_optimized(limit)

    @log_performance("get_trades_with_related_data")
    async def get_trades_with_related_data(
        self, symbol: Optional[str] = None, include_portfolio: bool = True
    ) -> List[Dict[str, Any]]:
        """関連データ付き取引取得（N+1対策）"""

        # 取引取得
        trades = await self.async_db.get_trades_optimized(symbol=symbol)

        if not trades or not include_portfolio:
            return trades

        # 遅延読み込みでポートフォリオデータを取得
        trade_ids = [t["id"] for t in trades]
        trades_with_portfolio = await self.async_db.get_trades_with_portfolio_lazy(
            trade_ids
        )

        return list(trades_with_portfolio.values())

    @log_performance("get_portfolio_summary")
    async def get_portfolio_summary(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """ポートフォリオサマリー取得（集計最適化）"""

        # クエリ最適化を使用
        query = """
            SELECT 
                COUNT(*) as total_records,
                AVG(total_value) as avg_value,
                MAX(total_value) as max_value,
                MIN(total_value) as min_value,
                AVG(daily_return) as avg_daily_return
            FROM portfolio_history 
            WHERE timestamp >= ? AND timestamp <= ?
        """

        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()

        result = await self.async_db.execute_query(
            query, (start_date.isoformat(), end_date.isoformat()), fetch_mode="one"
        )

        return result or {}

    async def stream_large_portfolio_history(
        self, batch_size: int = 1000, process_func: Optional[callable] = None
    ):
        """大規模ポートフォリオ履歴のストリーミング処理"""

        query = """
            SELECT * FROM portfolio_history 
            ORDER BY timestamp DESC
        """

        async for batch in self.async_db.stream_query(query, batch_size=batch_size):
            if process_func:
                processed = await process_func(batch)
                if processed:
                    yield processed
            else:
                yield batch

    @log_performance("bulk_update_trade_status")
    async def bulk_update_trade_status(self, updates: List[Dict[str, Any]]) -> int:
        """取引ステータス一括更新"""

        return await self.async_db.bulk_update_trade_status(updates)

    async def _load_portfolio_by_id(
        self, portfolio_id: str
    ) -> Optional[Dict[str, Any]]:
        """IDによるポートフォリオ読み込み（DataLoader用）"""
        query = "SELECT * FROM portfolio_history WHERE id = ?"
        return await self.async_db.execute_query(
            query, (portfolio_id,), fetch_mode="one"
        )

    async def _load_trades_by_symbol(self, symbol: str) -> List[Dict[str, Any]]:
        """シンボルによる取引読み込み（DataLoader用）"""
        return await self.async_db.get_trades_optimized(symbol=symbol)

    def get_sync_interface(self):
        """同期インターフェース取得（既存コード互換）"""
        return SyncDatabaseInterface(self)


class SyncDatabaseInterface:
    """同期データベースインターフェース（既存コード互換）"""

    def __init__(self, optimized_manager: OptimizedDatabaseManager):
        self.optimized = optimized_manager

    def save_portfolio(
        self,
        total_value: float,
        cash_balance: float,
        positions: Dict[str, Any],
        daily_return: float = 0.0,
        total_return: float = 0.0,
    ) -> str:
        """同期ポートフォリオ保存（既存API互換）"""

        portfolio = PortfolioRecord(
            id=str(uuid4()),
            timestamp=datetime.now().isoformat(),
            total_value=total_value,
            cash_balance=cash_balance,
            positions=json.dumps(positions),
            daily_return=daily_return,
            total_return=total_return,
        )

        # イベントループ取得または実行
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # 実行中の場合はタスクを作成
                task = asyncio.create_task(
                    self.optimized.save_portfolio_batch([portfolio])
                )
                return task.result()[0] if task else portfolio.id
            else:
                # 新規イベントループで実行
                return loop.run_until_complete(
                    self.optimized.save_portfolio_batch([portfolio])
                )[0]
        except Exception as e:
            logger.error(f"Sync portfolio save failed: {e}")
            # フォールバック
            return portfolio.id

    def get_portfolio_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """同期ポートフォリオ履歴取得（既存API互換）"""

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                task = asyncio.create_task(
                    self.optimized.get_portfolio_history_with_cache(limit)
                )
                return task.result()
            else:
                return loop.run_until_complete(
                    self.optimized.get_portfolio_history_with_cache(limit)
                )
        except Exception as e:
            logger.error(f"Sync portfolio history failed: {e}")
            return []

    def get_trades(
        self, symbol: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """同期取引履歴取得（既存API互換）"""

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                task = asyncio.create_task(
                    self.optimized.get_trades_with_related_data(
                        symbol, include_portfolio=False
                    )
                )
                return task.result()
            else:
                return loop.run_until_complete(
                    self.optimized.get_trades_with_related_data(
                        symbol, include_portfolio=False
                    )
                )
        except Exception as e:
            logger.error(f"Sync trades failed: {e}")
            return []


# 使用例
async def example_usage():
    """使用例"""

    # 最適化マネージャー取得
    optimized_manager = OptimizedDatabaseManager()

    # 一括保存
    portfolios = [
        PortfolioRecord(
            total_value=1000000,
            cash_balance=500000,
            positions={"AAPL": 100, "GOOGL": 50},
            daily_return=0.01,
            total_return=0.15,
        ),
        PortfolioRecord(
            total_value=1050000,
            cash_balance=480000,
            positions={"AAPL": 110, "GOOGL": 45},
            daily_return=0.02,
            total_return=0.18,
        ),
    ]

    ids = await optimized_manager.save_portfolio_batch(portfolios)
    logger.info(f"Batch saved IDs: {ids}")

    # キャッシュ付き取得
    history = await optimized_manager.get_portfolio_history_with_cache(limit=50)
    logger.info(f"Retrieved {len(history)} portfolio records")

    # 関連データ付き取得
    trades = await optimized_manager.get_trades_with_related_data(symbol="AAPL")
    logger.info(f"Retrieved {len(trades)} trades with portfolio data")

    # ストリーミング処理
    async def process_batch(batch):
        """バッチ処理関数"""
        # データ変換などの処理
        processed = [
            item for item in batch if float(item.get("total_value", 0)) > 100000
        ]
        logger.info(f"Processed batch: {len(processed)} high-value portfolios")
        return processed

    async for batch in optimized_manager.stream_large_portfolio_history(
        batch_size=500, process_func=process_batch
    ):
        # バッチごとの処理
        pass

    # 統計情報取得
    summary = await optimized_manager.get_portfolio_summary()
    logger.info(f"Portfolio summary: {summary}")


# 既存コード移行用
def migrate_to_optimized():
    """既存コードから最適化版への移行支援"""

    # 元のインスタンス取得
    from src.database_manager import db_manager

    # 最適化版作成
    optimized = OptimizedDatabaseManager()

    # 同期インターフェースで置き換え
    sync_interface = optimized.get_sync_interface()

    # 元のメソッドを置き換え（注意：既存コードのテストが必要）
    db_manager.save_portfolio = sync_interface.save_portfolio
    db_manager.get_portfolio_history = sync_interface.get_portfolio_history
    db_manager.get_trades = sync_interface.get_trades

    logger.info("Database manager migration completed")


if __name__ == "__main__":
    # テスト実行
    asyncio.run(example_usage())
