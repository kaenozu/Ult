"""
API Response Optimization Service
キャッシュと非同期処理によるAPIレスポンス最適化
"""

import asyncio
import time
from typing import Dict, Any, Optional, List
from functools import lru_cache
import json
from pathlib import Path


class CacheManager:
    """キャッシュマネージャー"""

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 300):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds

    def _is_expired(self, cache_entry: Dict[str, Any]) -> bool:
        """キャッシュエントリが期限切れかチェック"""
        return time.time() - cache_entry["timestamp"] > self.ttl_seconds

    def _cleanup_expired(self):
        """期限切れエントリを削除"""
        expired_keys = [
            key for key, entry in self.cache.items() if self._is_expired(entry)
        ]
        for key in expired_keys:
            del self.cache[key]

    def get(self, key: str) -> Optional[Any]:
        """キャッシュから値を取得"""
        self._cleanup_expired()

        if key in self.cache:
            entry = self.cache[key]
            if not self._is_expired(entry):
                return entry["value"]
            else:
                del self.cache[key]

        return None

    def set(self, key: str, value: Any):
        """キャッシュに値を設定"""
        self._cleanup_expired()

        # キャッシュサイズ制限
        if len(self.cache) >= self.max_size:
            # LRU方式で古いエントリを削除
            oldest_key = min(
                self.cache.keys(), key=lambda k: self.cache[k]["timestamp"]
            )
            del self.cache[oldest_key]

        self.cache[key] = {"value": value, "timestamp": time.time()}

    def invalidate_pattern(self, pattern: str):
        """パターンに一致するキャッシュを無効化"""
        keys_to_delete = [key for key in self.cache.keys() if pattern in key]
        for key in keys_to_delete:
            del self.cache[key]


class AsyncTaskManager:
    """非同期タスクマネージャー"""

    def __init__(self, max_concurrent: int = 10):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_tasks: Dict[str, asyncio.Task] = {}

    async def execute_with_timeout(self, coro, timeout: float = 30.0):
        """タイムアウト付きでコルーチンを実行"""
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except asyncio.TimeoutError:
            raise TimeoutError(f"Operation timed out after {timeout} seconds")

    async def execute_concurrent(
        self, tasks: List[asyncio.Task], max_concurrent: Optional[int] = None
    ):
        """同時実行数を制限してタスクを実行"""
        semaphore = asyncio.Semaphore(max_concurrent or self.max_concurrent)

        async def run_with_semaphore(task_coro):
            async with semaphore:
                return await task_coro

        # セマフォ付きでタスクを実行
        concurrent_tasks = [run_with_semaphore(task) for task in tasks]
        return await asyncio.gather(*concurrent_tasks, return_exceptions=True)


class APIResponseOptimizer:
    """APIレスポンス最適化マネージャー"""

    def __init__(self):
        self.cache_manager = CacheManager(max_size=1000, ttl_seconds=300)  # 5分TTL
        self.task_manager = AsyncTaskManager(max_concurrent=20)

    async def optimize_portfolio_response(self, user_id: str) -> Dict[str, Any]:
        """ポートフォリオレスポンスの最適化"""
        cache_key = f"portfolio:{user_id}"

        # キャッシュチェック
        cached_data = self.cache_manager.get(cache_key)
        if cached_data:
            return cached_data

        # 実際のデータ取得（ここではモック）
        portfolio_data = await self._fetch_portfolio_data(user_id)

        # 計算集約タスクの並列実行
        calculation_tasks = [
            self._calculate_portfolio_metrics(portfolio_data),
            self._calculate_risk_metrics(portfolio_data),
            self._calculate_performance_metrics(portfolio_data),
        ]

        results = await self.task_manager.execute_concurrent(calculation_tasks)

        # 結果統合
        optimized_data = {
            "portfolio": portfolio_data,
            "metrics": results[0] if not isinstance(results[0], Exception) else {},
            "risk": results[1] if not isinstance(results[1], Exception) else {},
            "performance": results[2] if not isinstance(results[2], Exception) else {},
            "timestamp": time.time(),
            "cached": False,
        }

        # キャッシュ保存
        self.cache_manager.set(cache_key, optimized_data)

        return optimized_data

    async def optimize_market_data_response(self, symbols: List[str]) -> Dict[str, Any]:
        """市場データレスポンスの最適化"""
        cache_key = f"market:{','.join(sorted(symbols))}"

        # キャッシュチェック
        cached_data = self.cache_manager.get(cache_key)
        if cached_data:
            return cached_data

        # シンボルごとのデータ取得タスク作成
        fetch_tasks = [self._fetch_market_data(symbol) for symbol in symbols]

        # 並列実行
        results = await self.task_manager.execute_concurrent(fetch_tasks)

        # 結果統合
        market_data = {}
        errors = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                errors.append(f"Error fetching {symbols[i]}: {str(result)}")
            else:
                market_data[symbols[i]] = result

        optimized_data = {
            "data": market_data,
            "errors": errors,
            "timestamp": time.time(),
            "cached": False,
            "symbols_requested": len(symbols),
            "symbols_returned": len(market_data),
        }

        # キャッシュ保存（市場データは短いTTL）
        if not errors:  # エラーがなければキャッシュ
            self.cache_manager.set(cache_key, optimized_data)

        return optimized_data

    async def _fetch_portfolio_data(self, user_id: str) -> Dict[str, Any]:
        """ポートフォリオデータ取得（実際の実装ではDBアクセス）"""
        # モックデータ
        await asyncio.sleep(0.1)  # DBアクセスをシミュレート
        return {
            "user_id": user_id,
            "total_value": 10000.0,
            "positions": [
                {"symbol": "AAPL", "shares": 10, "price": 150.0},
                {"symbol": "GOOGL", "shares": 5, "price": 200.0},
            ],
        }

    async def _fetch_market_data(self, symbol: str) -> Dict[str, Any]:
        """市場データ取得（実際の実装ではAPIアクセス）"""
        # モックデータ
        await asyncio.sleep(0.05)  # APIアクセスをシミュレート
        return {
            "symbol": symbol,
            "price": 150.0 + (hash(symbol) % 100),  # 擬似乱数
            "change": (hash(symbol) % 20) - 10,
            "volume": hash(symbol) % 1000000,
        }

    async def _calculate_portfolio_metrics(
        self, portfolio_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """ポートフォリオメトリクス計算"""
        await asyncio.sleep(0.02)  # 計算時間をシミュレート

        positions = portfolio_data.get("positions", [])
        total_value = sum(pos["shares"] * pos["price"] for pos in positions)

        return {
            "total_positions": len(positions),
            "total_value": total_value,
            "diversification_ratio": len(set(pos["symbol"] for pos in positions))
            / len(positions)
            if positions
            else 0,
        }

    async def _calculate_risk_metrics(
        self, portfolio_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """リスクメトリクス計算"""
        await asyncio.sleep(0.03)  # 計算時間をシミュレート

        positions = portfolio_data.get("positions", [])
        if not positions:
            return {"risk_score": 0, "volatility": 0}

        # 簡易的なリスク計算
        price_variations = [abs(hash(pos["symbol"]) % 20 - 10) for pos in positions]
        avg_volatility = sum(price_variations) / len(price_variations)

        return {
            "risk_score": min(100, avg_volatility * 5),
            "volatility": avg_volatility,
            "positions_count": len(positions),
        }

    async def _calculate_performance_metrics(
        self, portfolio_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """パフォーマンスメトリクス計算"""
        await asyncio.sleep(0.025)  # 計算時間をシミュレート

        positions = portfolio_data.get("positions", [])
        if not positions:
            return {"total_return": 0, "best_performer": None, "worst_performer": None}

        # 簡易的なパフォーマンス計算
        performances = []
        for pos in positions:
            # 擬似パフォーマンス計算
            performance = (hash(pos["symbol"] + "perf") % 40) - 20
            performances.append({"symbol": pos["symbol"], "performance": performance})

        total_return = (
            sum(p["performance"] for p in performances) / len(performances)
            if performances
            else 0
        )
        best = (
            max(performances, key=lambda x: x["performance"]) if performances else None
        )
        worst = (
            min(performances, key=lambda x: x["performance"]) if performances else None
        )

        return {
            "total_return": total_return,
            "best_performer": best["symbol"] if best else None,
            "worst_performer": worst["symbol"] if worst else None,
            "performance_distribution": [p["performance"] for p in performances],
        }

    def invalidate_portfolio_cache(self, user_id: str):
        """ポートフォリオキャッシュを無効化"""
        self.cache_manager.invalidate_pattern(f"portfolio:{user_id}")

    def invalidate_market_cache(self):
        """市場データキャッシュを無効化"""
        self.cache_manager.invalidate_pattern("market:")

    def get_cache_stats(self) -> Dict[str, Any]:
        """キャッシュ統計取得"""
        return {
            "cache_entries": len(self.cache_manager.cache),
            "max_cache_size": self.cache_manager.max_size,
            "cache_ttl_seconds": self.cache_manager.ttl_seconds,
        }
