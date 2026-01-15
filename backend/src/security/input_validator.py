"""
入力検証とデータバリデーションモジュール
レースコンディション対策とスレッドセーフな実装
"""

import re
import threading
import time
import logging
from typing import Any, Dict, List, Optional, Union, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, Future
from functools import wraps
import hashlib
import json

from .secure_config import get_secure_config, log_security_event

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """検証結果"""

    is_valid: bool
    errors: List[str]
    warnings: List[str]
    sanitized_data: Any = None
    validation_time: float = 0.0


class InputValidator:
    """入力検証クラス"""

    def __init__(self):
        self.config_manager = get_secure_config()
        self._validation_cache = {}
        self._cache_lock = threading.Lock()
        self._rate_limiter = RateLimiter()

        # 検証パターン
        self.patterns = {
            "ticker_symbol": r"^[A-Z]{1,5}(\.[A-Z]{1,3})?$",
            "price": r"^\d{1,8}(\.\d{1,4})?$",
            "percentage": r"^-?\d{1,3}(\.\d{1,2})?$",
            "date": r"^\d{4}-\d{2}-\d{2}$",
            "email": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            "api_key": r"^[a-zA-Z0-9_-]{10,}$",
        }

        # 制限値
        self.limits = {
            "max_ticker_length": 10,
            "max_price": 1000000,
            "min_price": 0.0001,
            "max_quantity": 1000000,
            "min_quantity": 1,
            "max_text_length": 10000,
            "max_json_size": 1024 * 1024,  # 1MB
        }

    def validate_ticker(self, ticker: str) -> ValidationResult:
        """ティッカーシンボルを検証"""
        start_time = time.time()
        errors = []
        warnings = []

        try:
            if not isinstance(ticker, str):
                errors.append("ティッカーは文字列である必要があります")
                return ValidationResult(False, errors, warnings, time.time() - start_time)

            # 長さチェック
            if len(ticker) > self.limits["max_ticker_length"]:
                errors.append(f"ティッカーが長すぎます: {len(ticker)} > {self.limits['max_ticker_length']}")

            # パターンチェック
            if not re.match(self.patterns["ticker_symbol"], ticker.upper()):
                errors.append(f"無効なティッカー形式です: {ticker}")

            # サニタイズ
            sanitized = ticker.upper().strip()

            # キャッシュチェック
            cache_key = self._get_cache_key("ticker", sanitized)
            if self._is_cached(cache_key):
                warnings.append("キャッシュされた検証結果を使用")

            return ValidationResult(len(errors) == 0, errors, warnings, sanitized, time.time() - start_time)

        except Exception as e:
            logger.error(f"ティッカー検証エラー: {e}")
            errors.append(f"検証エラー: {e}")
            return ValidationResult(False, errors, warnings, time.time() - start_time)

    def validate_price(self, price: Union[str, float, int]) -> ValidationResult:
        """価格を検証"""
        start_time = time.time()
        errors = []
        warnings = []

        try:
            # 数値変換
            if isinstance(price, str):
                if not re.match(self.patterns["price"], price):
                    errors.append(f"無効な価格形式です: {price}")
                    return ValidationResult(False, errors, warnings, time.time() - start_time)
                price = float(price)
            elif isinstance(price, (int, float)):
                price = float(price)
            else:
                errors.append("価格は数値または文字列である必要があります")
                return ValidationResult(False, errors, warnings, time.time() - start_time)

            # 範囲チェック
            if price < self.limits["min_price"]:
                errors.append(f"価格が低すぎます: {price} < {self.limits['min_price']}")
            elif price > self.limits["max_price"]:
                errors.append(f"価格が高すぎます: {price} > {self.limits['max_price']}")

            return ValidationResult(len(errors) == 0, errors, warnings, price, time.time() - start_time)

        except Exception as e:
            logger.error(f"価格検証エラー: {e}")
            errors.append(f"検証エラー: {e}")
            return ValidationResult(False, errors, warnings, time.time() - start_time)

    def validate_quantity(self, quantity: Union[str, float, int]) -> ValidationResult:
        """数量を検証"""
        start_time = time.time()
        errors = []
        warnings = []

        try:
            # 数値変換
            if isinstance(quantity, str):
                quantity = float(quantity)
            elif isinstance(quantity, (int, float)):
                quantity = float(quantity)
            else:
                errors.append("数量は数値または文字列である必要があります")
                return ValidationResult(False, errors, warnings, time.time() - start_time)

            # 整数チェック
            if not quantity.is_integer():
                errors.append("数量は整数である必要があります")
                return ValidationResult(False, errors, warnings, time.time() - start_time)

            quantity = int(quantity)

            # 範囲チェック
            if quantity < self.limits["min_quantity"]:
                errors.append(f"数量が小さすぎます: {quantity} < {self.limits['min_quantity']}")
            elif quantity > self.limits["max_quantity"]:
                errors.append(f"数量が大きすぎます: {quantity} > {self.limits['max_quantity']}")

            return ValidationResult(len(errors) == 0, errors, warnings, quantity, time.time() - start_time)

        except Exception as e:
            logger.error(f"数量検証エラー: {e}")
            errors.append(f"検証エラー: {e}")
            return ValidationResult(False, errors, warnings, time.time() - start_time)

    def validate_json_data(self, data: Union[str, Dict]) -> ValidationResult:
        """JSONデータを検証"""
        start_time = time.time()
        errors = []
        warnings = []

        try:
            if isinstance(data, str):
                # 文字列長チェック
                if len(data) > self.limits["max_json_size"]:
                    errors.append(f"JSONデータが大きすぎます: {len(data)} > {self.limits['max_json_size']}")

                # JSONパース
                try:
                    parsed_data = json.loads(data)
                except json.JSONDecodeError as e:
                    errors.append(f"無効なJSON形式です: {e}")
                    return ValidationResult(False, errors, warnings, time.time() - start_time)
            elif isinstance(data, dict):
                parsed_data = data
            else:
                errors.append("JSONデータは文字列または辞書である必要があります")
                return ValidationResult(False, errors, warnings, time.time() - start_time)

            # 深さチェック
            max_depth = self._get_json_depth(parsed_data)
            if max_depth > 10:
                warnings.append(f"JSONの深さが深いです: {max_depth}")

            return ValidationResult(
                len(errors) == 0,
                errors,
                warnings,
                parsed_data,
                time.time() - start_time,
            )

        except Exception as e:
            logger.error(f"JSON検証エラー: {e}")
            errors.append(f"検証エラー: {e}")
            return ValidationResult(False, errors, warnings, time.time() - start_time)

    def _get_json_depth(self, obj: Any, current_depth: int = 0) -> int:
        """JSONの深さを取得"""
        if isinstance(obj, dict):
            return max(
                [self._get_json_depth(v, current_depth + 1) for v in obj.values()],
                default=current_depth,
            )
        elif isinstance(obj, list):
            return max(
                [self._get_json_depth(item, current_depth + 1) for item in obj],
                default=current_depth,
            )
        else:
            return current_depth

    def _get_cache_key(self, data_type: str, data: str) -> str:
        """キャッシュキーを生成"""
        return f"{data_type}:{hashlib.md5(data.encode()).hexdigest()}"

    def _is_cached(self, cache_key: str) -> bool:
        """キャッシュ済みかチェック"""
        with self._cache_lock:
            return cache_key in self._validation_cache


class RateLimiter:
    """レートリミッター"""

    def __init__(self, max_requests_per_second: int = 5, max_requests_per_minute: int = 100):
        self._requests = {}
        self._lock = threading.Lock()
        self.max_rps = max_requests_per_second
        self.max_rpm = max_requests_per_minute
        self.window_size = timedelta(minutes=1)
        self.max_requests = max_requests_per_minute  # 1分あたりの最大リクエスト数

    def is_allowed(self, client_id: str) -> bool:
        """リクエストを許可するか判定"""
        with self._lock:
            now = datetime.now()

            if client_id not in self._requests:
                self._requests[client_id] = []

            # 古いリクエスト（1分以上前）を削除
            self._requests[client_id] = [
                req_time for req_time in self._requests[client_id] if now - req_time < timedelta(minutes=1)
            ]

            # 1秒以内のリクエスト数をチェック
            recent_second_requests = [
                req_time for req_time in self._requests[client_id] if now - req_time < timedelta(seconds=1)
            ]
            if len(recent_second_requests) >= self.max_rps:
                return False

            # 1分以内のリクエスト数をチェック
            if len(self._requests[client_id]) >= self.max_rpm:
                return False

            # リクエストを記録
            self._requests[client_id].append(now)
            return True

    def get_remaining_requests(self, client_id: str) -> int:
        """残りリクエスト数を取得"""
        with self._lock:
            now = datetime.now()
            if client_id not in self._requests:
                return min(self.max_rps, self.max_rpm)

            # 1秒以内のリクエスト
            recent_second = [
                req_time for req_time in self._requests[client_id] if now - req_time < timedelta(seconds=1)
            ]
            # 1分以内のリクエスト
            recent_minute = [
                req_time for req_time in self._requests[client_id] if now - req_time < timedelta(minutes=1)
            ]

            remaining_sec = max(0, self.max_rps - len(recent_second))
            remaining_min = max(0, self.max_rpm - len(recent_minute))

            return min(remaining_sec, remaining_min)


class ThreadSafeDataProcessor:
    """スレッドセーフなデータプロセッサー"""

    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._active_tasks = {}
        self._task_lock = threading.Lock()
        self._shutdown = False

    def process_data_async(
        self,
        task_id: str,
        data: Any,
        processor_func: Callable,
        timeout: Optional[float] = None,
    ) -> Future:
        """データを非同期に処理"""
        if self._shutdown:
            raise RuntimeError("プロセッサーはシャットダウンされています")

        with self._task_lock:
            if task_id in self._active_tasks:
                if not self._active_tasks[task_id].done():
                    logger.warning(f"タスクが既に実行中です: {task_id}")
                    return self._active_tasks[task_id]

            # タスクを submit
            future = self.executor.submit(self._process_with_validation, task_id, data, processor_func)
            self._active_tasks[task_id] = future

            return future

    def _process_with_validation(self, task_id: str, data: Any, processor_func: Callable) -> Any:
        """検証付きでデータを処理"""
        try:
            # 入力検証
            validator = InputValidator()

            if isinstance(data, dict):
                # データ型に応じた検証
                if "ticker" in data:
                    result = validator.validate_ticker(data["ticker"])
                    if not result.is_valid:
                        raise ValueError(f"ティッカー検証エラー: {result.errors}")
                    data["ticker"] = result.sanitized_data

                if "price" in data:
                    result = validator.validate_price(data["price"])
                    if not result.is_valid:
                        raise ValueError(f"価格検証エラー: {result.errors}")
                    data["price"] = result.sanitized_data

                if "quantity" in data:
                    result = validator.validate_quantity(data["quantity"])
                    if not result.is_valid:
                        raise ValueError(f"数量検証エラー: {result.errors}")
                    data["quantity"] = result.sanitized_data

            # 処理実行
            result = processor_func(data)

            # 結果検証
            if isinstance(result, dict):
                # 結果の基本的な検証
                if len(str(result)) > 100000:  # 100KB超
                    logger.warning(f"処理結果が大きいです: {task_id}")

            return result

        except Exception as e:
            logger.error(f"データ処理エラー ({task_id}): {e}")
            raise
        finally:
            # タスクをクリーンアップ
            with self._task_lock:
                if task_id in self._active_tasks:
                    del self._active_tasks[task_id]

    def get_task_status(self, task_id: str) -> Optional[str]:
        """タスクステータスを取得"""
        with self._task_lock:
            if task_id not in self._active_tasks:
                return None

            future = self._active_tasks[task_id]
            if future.done():
                if future.exception():
                    return "failed"
                return "completed"
            elif future.running():
                return "running"
            elif future.cancelled():
                return "cancelled"
            else:
                return "pending"

    def cancel_task(self, task_id: str) -> bool:
        """タスクをキャンセル"""
        with self._task_lock:
            if task_id not in self._active_tasks:
                return False

            future = self._active_tasks[task_id]
            cancelled = future.cancel()

            if cancelled:
                del self._active_tasks[task_id]
                logger.info(f"タスクをキャンセルしました: {task_id}")

            return cancelled

    def shutdown(self, wait: bool = True) -> None:
        """プロセッサーをシャットダウン"""
        self._shutdown = True
        self.executor.shutdown(wait=wait)
        logger.info("データプロセッサーをシャットダウンしました")


def thread_safe(max_workers: int = 4):
    """スレッドセーフデコレーター"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            processor = ThreadSafeDataProcessor(max_workers)
            try:
                task_id = f"{func.__name__}_{int(time.time())}"
                future = processor.process_data_async(task_id, (args, kwargs), func)
                return future.result(timeout=30)  # 30秒タイムアウト
            finally:
                processor.shutdown(wait=False)

        return wrapper

    return decorator


def rate_limit(max_requests: int = 100, window_minutes: int = 1):
    """レート制限デコレーター"""

    def decorator(func):
        limiter = RateLimiter()
        limiter.max_requests = max_requests
        limiter.window_size = timedelta(minutes=window_minutes)

        @wraps(func)
        def wrapper(*args, **kwargs):
            # クライアントIDを取得（IPアドレスやユーザーIDなど）
            client_id = kwargs.get("client_id", "default")

            if not limiter.is_allowed(client_id):
                remaining = limiter.get_remaining_requests(client_id)
                raise ValueError(f"レート制限超過。残りリクエスト: {remaining}")

            return func(*args, **kwargs)

        return wrapper

    return decorator


# グローバルインスタンス
input_validator = InputValidator()
data_processor = ThreadSafeDataProcessor()


def get_input_validator() -> InputValidator:
    """入力検証器を取得"""
    return input_validator


def get_data_processor() -> ThreadSafeDataProcessor:
    """データプロセッサーを取得"""
    return data_processor
