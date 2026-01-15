"""
統一エラーハンドリングとメモリ管理モジュール
構造化された例外処理とリソース管理を実装
"""

import logging
import traceback
import sys
import gc
import threading
import time
import psutil
import os
from typing import Any, Dict, List, Optional, Type, Callable, Union
from dataclasses import dataclass
from enum import Enum
from functools import wraps
from contextlib import contextmanager
import weakref
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """エラー深刻度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """エラーカテゴリ"""

    SYSTEM = "system"
    NETWORK = "network"
    DATABASE = "database"
    API = "api"
    VALIDATION = "validation"
    BUSINESS = "business"
    SECURITY = "security"
    PERFORMANCE = "performance"


@dataclass
class ErrorInfo:
    """エラー情報"""

    exception: Exception
    category: ErrorCategory
    severity: ErrorSeverity
    context: Dict[str, Any]
    timestamp: datetime
    stack_trace: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class BaseTradingError(Exception):
    """取引システム基本例外"""

    def __init__(
        self,
        message: str,
        category: ErrorCategory = ErrorCategory.SYSTEM,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.category = category
        self.severity = severity
        self.context = context or {}
        self.timestamp = datetime.now()


class ValidationError(BaseTradingError):
    """検証エラー"""

    def __init__(self, message: str, field: str = None, **kwargs):
        context = kwargs.get("context", {})
        if field:
            context["field"] = field
        super().__init__(message, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, context)
        self.field = field


class DatabaseError(BaseTradingError):
    """データベースエラー"""

    def __init__(self, message: str, query: str = None, **kwargs):
        context = kwargs.get("context", {})
        if query:
            context["query"] = query[:100]  # クエリを100文字に制限
        super().__init__(message, ErrorCategory.DATABASE, ErrorSeverity.HIGH, context)
        self.query = query


class APIError(BaseTradingError):
    """APIエラー"""

    def __init__(self, message: str, service: str = None, status_code: int = None, **kwargs):
        context = kwargs.get("context", {})
        if service:
            context["service"] = service
        if status_code:
            context["status_code"] = status_code
        super().__init__(message, ErrorCategory.API, ErrorSeverity.MEDIUM, context)
        self.service = service
        self.status_code = status_code


class SecurityError(BaseTradingError):
    """セキュリティエラー"""

    def __init__(self, message: str, threat_type: str = None, **kwargs):
        context = kwargs.get("context", {})
        if threat_type:
            context["threat_type"] = threat_type
        super().__init__(message, ErrorCategory.SECURITY, ErrorSeverity.CRITICAL, context)
        self.threat_type = threat_type


class PerformanceError(BaseTradingError):
    """パフォーマンスエラー"""

    def __init__(self, message: str, metric: str = None, threshold: float = None, **kwargs):
        context = kwargs.get("context", {})
        if metric:
            context["metric"] = metric
        if threshold:
            context["threshold"] = threshold
        super().__init__(message, ErrorCategory.PERFORMANCE, ErrorSeverity.MEDIUM, context)
        self.metric = metric
        self.threshold = threshold


class ErrorHandler:
    """統一エラーハンドラー"""

    def __init__(self):
        self.error_history: List[ErrorInfo] = []
        self.error_callbacks: Dict[ErrorCategory, List[Callable]] = {}
        self.max_history_size = 1000
        self._lock = threading.Lock()

        # カテゴリ別コールバックを初期化
        for category in ErrorCategory:
            self.error_callbacks[category] = []

    def handle_error(
        self,
        exception: Exception,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> ErrorInfo:
        """エラーを処理"""
        # エラー情報を構築
        if isinstance(exception, BaseTradingError):
            category = exception.category
            severity = exception.severity
            error_context = {**exception.context, **(context or {})}
        else:
            category = self._categorize_exception(exception)
            severity = self._determine_severity(exception, category)
            error_context = context or {}

        error_info = ErrorInfo(
            exception=exception,
            category=category,
            severity=severity,
            context=error_context,
            timestamp=datetime.now(),
            stack_trace=traceback.format_exc(),
            user_id=user_id,
            session_id=session_id,
        )

        # 履歴に記録
        self._add_to_history(error_info)

        # ログ記録
        self._log_error(error_info)

        # コールバック実行
        self._execute_callbacks(error_info)

        return error_info

    def register_callback(self, category: ErrorCategory, callback: Callable[[ErrorInfo], None]) -> None:
        """エラーコールバックを登録"""
        with self._lock:
            self.error_callbacks[category].append(callback)

    def _categorize_exception(self, exception: Exception) -> ErrorCategory:
        """例外をカテゴリ分類"""
        exception_type = type(exception).__name__

        if "Database" in exception_type or "SQL" in exception_type:
            return ErrorCategory.DATABASE
        elif "Connection" in exception_type or "Network" in exception_type:
            return ErrorCategory.NETWORK
        elif "Validation" in exception_type or "Value" in exception_type:
            return ErrorCategory.VALIDATION
        elif "Security" in exception_type or "Permission" in exception_type:
            return ErrorCategory.SECURITY
        elif "Timeout" in exception_type or "Performance" in exception_type:
            return ErrorCategory.PERFORMANCE
        elif "API" in exception_type:
            return ErrorCategory.API
        else:
            return ErrorCategory.SYSTEM

    def _determine_severity(self, exception: Exception, category: ErrorCategory) -> ErrorSeverity:
        """深刻度を判定"""
        if category == ErrorCategory.SECURITY:
            return ErrorSeverity.CRITICAL
        elif category == ErrorCategory.DATABASE:
            return ErrorSeverity.HIGH
        elif isinstance(exception, (KeyboardInterrupt, SystemExit)):
            return ErrorSeverity.CRITICAL
        elif isinstance(exception, (ValueError, TypeError)):
            return ErrorSeverity.MEDIUM
        else:
            return ErrorSeverity.LOW

    def _add_to_history(self, error_info: ErrorInfo) -> None:
        """エラー履歴に追加"""
        with self._lock:
            self.error_history.append(error_info)

            # 履歴サイズを制限
            if len(self.error_history) > self.max_history_size:
                self.error_history = self.error_history[-self.max_history_size :]

    def _log_error(self, error_info: ErrorInfo) -> None:
        """エラーをログ記録"""
        log_level = {
            ErrorSeverity.LOW: logging.INFO,
            ErrorSeverity.MEDIUM: logging.WARNING,
            ErrorSeverity.HIGH: logging.ERROR,
            ErrorSeverity.CRITICAL: logging.CRITICAL,
        }.get(error_info.severity, logging.ERROR)

        logger.log(
            log_level,
            f"[{error_info.category.value.upper()}] {error_info.exception.__class__.__name__}: {error_info.exception}",
        )

        if error_info.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            logger.debug(f"Stack trace: {error_info.stack_trace}")
            logger.debug(f"Context: {error_info.context}")

    def _execute_callbacks(self, error_info: ErrorInfo) -> None:
        """コールバックを実行"""
        callbacks = self.error_callbacks.get(error_info.category, [])

        for callback in callbacks:
            try:
                callback(error_info)
            except Exception as e:
                logger.error(f"エラーコールバック実行失敗: {e}")

    def get_error_stats(self, hours: int = 24) -> Dict[str, Any]:
        """エラー統計を取得"""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        recent_errors = [e for e in self.error_history if e.timestamp > cutoff_time]

        stats = {
            "total_errors": len(recent_errors),
            "by_category": {},
            "by_severity": {},
            "error_rate": len(recent_errors) / hours,
        }

        for error in recent_errors:
            # カテゴリ別集計
            category = error.category.value
            stats["by_category"][category] = stats["by_category"].get(category, 0) + 1

            # 深刻度別集計
            severity = error.severity.value
            stats["by_severity"][severity] = stats["by_severity"].get(severity, 0) + 1

        return stats


class MemoryManager:
    """メモリ管理クラス"""

    def __init__(self):
        self.process = psutil.Process(os.getpid())
        self.memory_threshold_mb = 1024  # 1GB
        self.cleanup_callbacks: List[Callable] = []
        self._monitoring = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # キャッシュ
        self._cache = {}

    def start_monitoring(self, interval_seconds: int = 30) -> None:
        """メモリ監視を開始"""
        if self._monitoring:
            return

        self._monitoring = True
        self._monitor_thread = threading.Thread(target=self._monitor_memory, args=(interval_seconds,), daemon=True)
        self._monitor_thread.start()
        logger.info("メモリ監視を開始しました")

    def stop_monitoring(self) -> None:
        """メモリ監視を停止"""
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)
        logger.info("メモリ監視を停止しました")

    def _monitor_memory(self, interval_seconds: int) -> None:
        """メモリ使用量を監視"""
        while self._monitoring:
            try:
                memory_info = self.get_memory_info()

                if memory_info["rss_mb"] > self.memory_threshold_mb:
                    logger.warning(f"メモリ使用量が閾値を超過: {memory_info['rss_mb']:.1f}MB")
                    self.cleanup_memory()

                time.sleep(interval_seconds)

            except Exception as e:
                logger.error(f"メモリ監視エラー: {e}")
                time.sleep(interval_seconds)

    def get_memory_info(self) -> Dict[str, float]:
        """メモリ情報を取得"""
        memory_info = self.process.memory_info()
        return {
            "rss_mb": memory_info.rss / 1024 / 1024,
            "vms_mb": memory_info.vms / 1024 / 1024,
            "percent": self.process.memory_percent(),
        }

    def cleanup_memory(self) -> None:
        """メモリをクリーンアップ"""
        with self._lock:
            try:
                # ガベージコレクション実行
                collected = gc.collect()
                logger.info(f"ガベージコレクション実行: {collected}オブジェクト回収")

                # クリーンアップコールバック実行
                for callback in self.cleanup_callbacks:
                    try:
                        callback()
                    except Exception as e:
                        logger.error(f"メモリクリーンアップコールバックエラー: {e}")

                # メモリ情報を再取得
                memory_info = self.get_memory_info()
                logger.info(f"クリーンアップ後メモリ: {memory_info['rss_mb']:.1f}MB")

            except Exception as e:
                logger.error(f"メモリクリーンアップエラー: {e}")

    def register_cleanup_callback(self, callback: Callable[[], None]) -> None:
        """クリーンアップコールバックを登録"""
        with self._lock:
            self.cleanup_callbacks.append(callback)

    def cache_object(self, key: str, obj: Any) -> None:
        """オブジェクトをキャッシュ"""
        self._cache[key] = obj

    def get_cached_object(self, key: str) -> Optional[Any]:
        """キャッシュされたオブジェクトを取得"""
        return self._cache.get(key)


# グローバルインスタンス
error_handler = ErrorHandler()
memory_manager = MemoryManager()


def get_error_handler() -> ErrorHandler:
    """エラーハンドラーを取得"""
    return error_handler


def get_memory_manager() -> MemoryManager:
    """メモリマネージャーを取得"""
    return memory_manager


def handle_exceptions(
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    reraise: bool = True,
    return_on_error: Any = None,
):
    """例外処理デコレーター"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # エラーを処理
                error_info = error_handler.handle_error(
                    e,
                    context={
                        "function": func.__name__,
                        "module": func.__module__,
                        "args": str(args)[:200],
                        "kwargs": str(kwargs)[:200],
                    },
                )

                if reraise:
                    raise
                else:
                    return return_on_error

        return wrapper

    return decorator


def memory_monitor(threshold_mb: int = 512):
    """メモリ監視デコレーター"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 実行前メモリチェック
            memory_before = memory_manager.get_memory_info()

            if memory_before["rss_mb"] > threshold_mb:
                logger.warning(f"関数実行前メモリ使用量が高い: {memory_before['rss_mb']:.1f}MB")
                memory_manager.cleanup_memory()

            try:
                result = func(*args, **kwargs)

                # 実行後メモリチェック
                memory_after = memory_manager.get_memory_info()
                memory_diff = memory_after["rss_mb"] - memory_before["rss_mb"]

                if memory_diff > 100:  # 100MB以上増加
                    logger.warning(f"メモリ使用量が増加: {memory_diff:.1f}MB ({func.__name__})")

                return result

            except Exception as e:
                # エラー時もメモリクリーンアップ
                memory_manager.cleanup_memory()
                raise

        return wrapper

    return decorator


@contextmanager
def error_context(
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Optional[Dict[str, Any]] = None,
):
    """エラーコンテキストマネージャー"""
    try:
        yield
    except Exception as e:
        error_handler.handle_error(e, context)
        raise


@contextmanager
def memory_context(cleanup_on_exit: bool = True):
    """メモリコンテキストマネージャー"""
    memory_before = memory_manager.get_memory_info()

    try:
        yield
    finally:
        if cleanup_on_exit:
            memory_manager.cleanup_memory()

        memory_after = memory_manager.get_memory_info()
        logger.debug(f"メモリ使用量: {memory_before['rss_mb']:.1f}MB -> {memory_after['rss_mb']:.1f}MB")


# 初期化
def initialize_error_handling():
    """エラーハンドリングを初期化"""

    # セキュリティエラーコールバック
    def security_error_callback(error_info: ErrorInfo):
        logger.critical(f"セキュリティエラー検出: {error_info.exception}")
        # 必要に応じて追加のセキュリティ対策を実行

    error_handler.register_callback(ErrorCategory.SECURITY, security_error_callback)

    # メモリ監視を開始
    memory_manager.start_monitoring()

    logger.info("エラーハンドリングシステムを初期化しました")
