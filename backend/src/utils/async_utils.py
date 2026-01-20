"""
Async Utilities and Performance Optimizations
非同期ユーティリティとパフォーマンス最適化
"""

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from contextlib import asynccontextmanager
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Union, Coroutine
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class AsyncMetrics:
    """非同期処理のメトリクス"""

    task_count: int = 0
    total_duration: float = 0.0
    avg_duration: float = 0.0
    max_duration: float = 0.0
    min_duration: float = float("inf")
    error_count: int = 0
    last_updated: Optional[datetime] = None


class AsyncTaskManager:
    """非同期タスクマネージャー"""

    def __init__(self, max_workers: int = 10, max_concurrent_tasks: int = 50):
        self.thread_executor = ThreadPoolExecutor(max_workers=max_workers)
        self.process_executor = ProcessPoolExecutor(max_workers=max_workers // 2)
        self.max_concurrent_tasks = max_concurrent_tasks
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.task_metrics: Dict[str, AsyncMetrics] = {}
        self.semaphore = asyncio.Semaphore(max_concurrent_tasks)
        self.is_running = False

    async def submit_task(
        self,
        task_id: str,
        coro: Coroutine,
        timeout: Optional[float] = None,
        use_process_pool: bool = False,
    ) -> Any:
        """タスクをサブミット"""

        if task_id in self.active_tasks:
            raise ValueError(f"Task {task_id} already exists")

        async with self.semaphore:
            start_time = time.time()

            try:
                if use_process_pool:
                    # プロセスプールを使用（CPUバウンドなタスク用）
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        self.process_executor, self._run_sync_task, coro
                    )
                else:
                    # スレッドプールを使用（I/Oバウンドなタスク用）
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        self.thread_executor, self._run_sync_task, coro
                    )

                duration = time.time() - start_time
                self._update_metrics(task_id, duration, False)

                return result

            except Exception as e:
                duration = time.time() - start_time
                self._update_metrics(task_id, duration, True)
                logger.error(f"Task {task_id} failed after {duration:.2f}s: {e}")
                raise
            finally:
                if task_id in self.active_tasks:
                    del self.active_tasks[task_id]

    def _run_sync_task(self, coro: Coroutine) -> Any:
        """同期タスクを実行"""
        return asyncio.run(coro)

    def _update_metrics(self, task_id: str, duration: float, error: bool) -> None:
        """メトリクスを更新"""

        if task_id not in self.task_metrics:
            self.task_metrics[task_id] = AsyncMetrics()

        metrics = self.task_metrics[task_id]
        metrics.task_count += 1
        metrics.total_duration += duration
        metrics.avg_duration = metrics.total_duration / metrics.task_count
        metrics.max_duration = max(metrics.max_duration, duration)
        metrics.min_duration = min(metrics.min_duration, duration)

        if error:
            metrics.error_count += 1

        metrics.last_updated = datetime.now()

    async def cancel_task(self, task_id: str) -> bool:
        """タスクをキャンセル"""

        if task_id not in self.active_tasks:
            return False

        task = self.active_tasks[task_id]
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

        del self.active_tasks[task_id]
        logger.info(f"Task {task_id} cancelled")
        return True

    def get_task_status(self, task_id: str) -> Optional[str]:
        """タスクステータスを取得"""

        if task_id not in self.active_tasks:
            return "not_found"

        task = self.active_tasks[task_id]

        if task.done():
            if task.cancelled():
                return "cancelled"
            elif task.exception():
                return "failed"
            else:
                return "completed"
        else:
            return "running"

    def get_active_tasks(self) -> List[str]:
        """アクティブなタスク一覧を取得"""
        return list(self.active_tasks.keys())

    def get_metrics(
        self, task_id: Optional[str] = None
    ) -> Union[AsyncMetrics, Dict[str, AsyncMetrics]]:
        """メトリクスを取得"""

        if task_id:
            return self.task_metrics.get(task_id)

        return self.task_metrics.copy()

    async def shutdown(self) -> None:
        """シャットダウン"""

        logger.info("Shutting down AsyncTaskManager...")

        # 全てのアクティブタスクをキャンセル
        for task_id in list(self.active_tasks.keys()):
            await self.cancel_task(task_id)

        # エグゼキュータをシャットダウン
        self.thread_executor.shutdown(wait=True)
        self.process_executor.shutdown(wait=True)

        logger.info("AsyncTaskManager shutdown complete")


def async_timer(func: Callable) -> Callable:
    """非同期関数の実行時間を計測するデコレータ"""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()

        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"{func.__name__} completed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{func.__name__} failed after {duration:.3f}s: {e}")
            raise

    return wrapper


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,),
) -> Callable:
    """非同期リトライデコレータ"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e

                    if attempt == max_attempts - 1:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {e}"
                        )
                        raise

                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1} failed: {e}. Retrying in {current_delay}s..."
                    )
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff_factor

            raise last_exception

        return wrapper

    return decorator


@asynccontextmanager
async def async_timeout(timeout: float):
    """非同期タイムアウトコンテキストマネージャ"""

    try:
        yield asyncio.wait_for(asyncio.sleep(timeout), timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning(f"Operation timed out after {timeout}s")
        raise


class AsyncCache:
    """非同期キャッシュ"""

    def __init__(self, ttl: float = 300.0, max_size: int = 1000):
        self.cache: Dict[str, Any] = {}
        self.timestamps: Dict[str, datetime] = {}
        self.ttl = ttl
        self.max_size = max_size
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """キャッシュから値を取得"""

        async with self._lock:
            if key not in self.cache:
                return None

            # TTLチェック
            if datetime.now() - self.timestamps[key] > timedelta(seconds=self.ttl):
                del self.cache[key]
                del self.timestamps[key]
                return None

            return self.cache[key]

    async def set(self, key: str, value: Any) -> None:
        """キャッシュに値を設定"""

        async with self._lock:
            # 最大サイズチェック
            if len(self.cache) >= self.max_size:
                # 最も古いエントリを削除
                oldest_key = min(self.timestamps.keys(), key=self.timestamps.get)
                del self.cache[oldest_key]
                del self.timestamps[oldest_key]

            self.cache[key] = value
            self.timestamps[key] = datetime.now()

    async def delete(self, key: str) -> bool:
        """キャッシュから値を削除"""

        async with self._lock:
            if key in self.cache:
                del self.cache[key]
                del self.timestamps[key]
                return True
            return False

    async def clear(self) -> None:
        """キャッシュをクリア"""

        async with self._lock:
            self.cache.clear()
            self.timestamps.clear()

    async def cleanup_expired(self) -> int:
        """期限切れのエントリをクリーンアップ"""

        async with self._lock:
            expired_keys = []
            now = datetime.now()

            for key, timestamp in self.timestamps.items():
                if now - timestamp > timedelta(seconds=self.ttl):
                    expired_keys.append(key)

            for key in expired_keys:
                del self.cache[key]
                del self.timestamps[key]

            return len(expired_keys)


class AsyncBatchProcessor:
    """非同期バッチプロセッサ"""

    def __init__(self, batch_size: int = 100, max_wait_time: float = 5.0):
        self.batch_size = batch_size
        self.max_wait_time = max_wait_time
        self.queue: asyncio.Queue = asyncio.Queue()
        self.processor_task: Optional[asyncio.Task] = None
        self.is_running = False

    async def start(self, processor_func: Callable[[List[Any]], Coroutine]) -> None:
        """バッチプロセッサを開始"""

        if self.is_running:
            return

        self.is_running = True
        self.processor_task = asyncio.create_task(self._process_batches(processor_func))

    async def stop(self) -> None:
        """バッチプロセッサを停止"""

        self.is_running = False

        if self.processor_task:
            self.processor_task.cancel()
            try:
                await self.processor_task
            except asyncio.CancelledError:
                pass

    async def add_item(self, item: Any) -> None:
        """アイテムを追加"""

        await self.queue.put(item)

    async def add_items(self, items: List[Any]) -> None:
        """複数のアイテムを追加"""

        for item in items:
            await self.queue.put(item)

    async def _process_batches(
        self, processor_func: Callable[[List[Any]], Coroutine]
    ) -> None:
        """バッチを処理"""

        while self.is_running:
            try:
                batch = []
                deadline = time.time() + self.max_wait_time

                # バッチを収集
                while len(batch) < self.batch_size and time.time() < deadline:
                    try:
                        timeout = max(0.1, deadline - time.time())
                        item = await asyncio.wait_for(self.queue.get(), timeout=timeout)
                        batch.append(item)
                    except asyncio.TimeoutError:
                        break

                if batch:
                    await processor_func(batch)
                else:
                    # キューが空の場合は少し待機
                    await asyncio.sleep(0.1)

            except Exception as e:
                logger.error(f"Error processing batch: {e}")
                await asyncio.sleep(1.0)


class AsyncRateLimiter:
    """非同期レートリミッター"""

    def __init__(self, max_requests: int, time_window: float):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests: List[float] = []
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """リクエスト許可を取得"""

        async with self._lock:
            now = time.time()

            # 古いリクエストを削除
            cutoff = now - self.time_window
            self.requests = [
                req_time for req_time in self.requests if req_time > cutoff
            ]

            # レート制限チェック
            if len(self.requests) >= self.max_requests:
                wait_time = self.time_window - (now - self.requests[0])
                if wait_time > 0:
                    await asyncio.sleep(wait_time)

            self.requests.append(now)


# ユーティリティ関数
async def gather_with_concurrency(
    coroutines: List[Coroutine], max_concurrency: int = 10
) -> List[Any]:
    """並行度制限付きで複数のコルーチンを実行"""

    semaphore = asyncio.Semaphore(max_concurrency)

    async def limited_coro(coro):
        async with semaphore:
            return await coro

    limited_coros = [limited_coro(coro) for coro in coroutines]
    return await asyncio.gather(*limited_coros, return_exceptions=True)


async def async_cache_result(
    cache: AsyncCache, key: str, coro: Coroutine, ttl: Optional[float] = None
) -> Any:
    """結果をキャッシュする非同期関数"""

    # キャッシュをチェック
    cached_result = await cache.get(key)
    if cached_result is not None:
        return cached_result

    # コルーチンを実行
    result = await coro

    # 結果をキャッシュ
    await cache.set(key, result)

    return result


# グローバルインスタンス
default_task_manager = AsyncTaskManager()
default_cache = AsyncCache()
