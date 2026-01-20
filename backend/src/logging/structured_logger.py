"""
構造化ロギングシステム
ELKスタック統合、相関ID、監査ログ、パフォーマンス監視
"""

import asyncio
import json
import logging
import logging.handlers
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Callable
from functools import wraps
import traceback
import threading
from elasticsearch import AsyncElasticsearch
import aioredis
from src.core.config import settings


class LogLevel(Enum):
    """ログレベル"""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Component(Enum):
    """コンポーネント分類"""

    API = "api"
    DATABASE = "database"
    TRADING = "trading"
    AUTH = "auth"
    MONITORING = "monitoring"
    SYSTEM = "system"
    APPROVAL = "approval"
    AI = "ai"


class SecurityEventType(Enum):
    """セキュリティイベントタイプ"""

    LOGIN = "login"
    LOGOUT = "logout"
    ACCESS_DENIED = "access_denied"
    PERMISSION_CHANGE = "permission_change"
    DATA_EXPORT = "data_export"
    CONFIG_CHANGE = "config_change"
    TRADE_EXECUTION = "trade_execution"
    APPROVAL_REQUEST = "approval_request"
    APPROVAL_DECISION = "approval_decision"


@dataclass
class LogContext:
    """ログコンテキスト"""

    correlation_id: Optional[str] = None
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    component: Optional[Component] = None
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    additional: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PerformanceMetrics:
    """パフォーマンス指標"""

    duration_ms: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    db_queries: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    external_api_calls: int = 0


@dataclass
class SecurityEvent:
    """セキュリティイベント"""

    event_type: SecurityEventType
    resource: str
    action: str
    success: bool
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class StructuredFormatter(logging.Formatter):
    """構造化ログフォーマッター"""

    def __init__(self, include_extra_fields: bool = True):
        super().__init__()
        self.include_extra_fields = include_extra_fields

    def format(self, record: logging.LogRecord) -> str:
        """ログレコードをJSON形式にフォーマット"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "thread": threading.current_thread().name,
            "process": os.getpid(),
        }

        # コンテキスト情報追加
        if hasattr(record, "correlation_id"):
            log_entry["correlation_id"] = record.correlation_id
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "component"):
            log_entry["component"] = (
                record.component.value
                if isinstance(record.component, Component)
                else record.component
            )
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id

        # パフォーマンス情報追加
        if hasattr(record, "performance_metrics"):
            log_entry["performance"] = asdict(record.performance_metrics)

        # エラー情報追加
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # 追加フィールド
        if self.include_extra_fields:
            for key, value in record.__dict__.items():
                if key not in {
                    "name",
                    "msg",
                    "args",
                    "levelname",
                    "levelno",
                    "pathname",
                    "filename",
                    "module",
                    "lineno",
                    "funcName",
                    "created",
                    "msecs",
                    "relativeCreated",
                    "thread",
                    "threadName",
                    "processName",
                    "process",
                    "getMessage",
                    "exc_info",
                    "exc_text",
                    "stack_info",
                    "correlation_id",
                    "user_id",
                    "component",
                    "request_id",
                    "performance_metrics",
                }:
                    log_entry[key] = value

        return json.dumps(log_entry, default=str, ensure_ascii=False)


class StructuredLogger:
    """構造化ロガー"""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self._context: LogContext = LogContext()
        self.elasticsearch = None
        self.redis_pool = None

        # 非同期初期化
        asyncio.create_task(self._init_async_components())

    async def _init_async_components(self):
        """非同期コンポーネント初期化"""
        try:
            # Elasticsearch
            if settings.get("logging.elasticsearch.enabled", False):
                self.elasticsearch = AsyncElasticsearch(
                    settings.get("logging.elasticsearch.url", "http://localhost:9200"),
                    http_auth=(
                        settings.get("logging.elasticsearch.username"),
                        settings.get("logging.elasticsearch.password"),
                    )
                    if settings.get("logging.elasticsearch.username")
                    else None,
                )

            # Redis
            if settings.get("logging.redis.enabled", False):
                self.redis_pool = aioredis.ConnectionPool.from_url(
                    settings.system.redis_url
                )
        except Exception as e:
            print(f"Failed to init async logging components: {e}")

    def set_context(self, **kwargs):
        """コンテキスト設定"""
        for key, value in kwargs.items():
            if hasattr(self._context, key):
                setattr(self._context, key, value)
            else:
                self._context.additional[key] = value

    def _log_with_context(
        self,
        level: LogLevel,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        performance_metrics: Optional[PerformanceMetrics] = None,
    ):
        """コンテキスト付きログ出力"""
        extra_data = {
            "correlation_id": self._context.correlation_id,
            "user_id": self._context.user_id,
            "component": self._context.component,
            "request_id": self._context.request_id,
        }

        if performance_metrics:
            extra_data["performance_metrics"] = performance_metrics

        if extra:
            extra_data.update(extra)

        # 追加コンテキスト
        extra_data.update(self._context.additional)

        # ログ出力
        getattr(self.logger, level.value.lower())(message, extra=extra_data)

        # 非同期送信
        if level in [LogLevel.ERROR, LogLevel.CRITICAL]:
            asyncio.create_task(self._send_to_elasticsearch(level, message, extra_data))

    def debug(self, message: str, **kwargs):
        """デバッグログ"""
        self._log_with_context(LogLevel.DEBUG, message, kwargs)

    def info(self, message: str, **kwargs):
        """情報ログ"""
        self._log_with_context(LogLevel.INFO, message, kwargs)

    def warning(self, message: str, **kwargs):
        """警告ログ"""
        self._log_with_context(LogLevel.WARNING, message, kwargs)

    def error(self, message: str, **kwargs):
        """エラーログ"""
        self._log_with_context(LogLevel.ERROR, message, kwargs)

    def critical(self, message: str, **kwargs):
        """重大エラーログ"""
        self._log_with_context(LogLevel.CRITICAL, message, kwargs)

    def log_performance(
        self,
        operation: str,
        metrics: PerformanceMetrics,
        extra: Optional[Dict[str, Any]] = None,
    ):
        """パフォーマンスログ"""
        message = f"Performance: {operation}"
        extra_data = {"operation": operation}
        if extra:
            extra_data.update(extra)

        self._log_with_context(LogLevel.INFO, message, extra_data, metrics)

    async def log_security_event(self, event: SecurityEvent):
        """セキュリティイベントログ"""
        message = f"Security Event: {event.event_type.value} - {event.action}"
        extra_data = {"security_event": asdict(event), "component": Component.AUTH}

        self._log_with_context(LogLevel.INFO, message, extra_data)

        # 監査ログとして保存
        await self._save_audit_log(event)

    async def _send_to_elasticsearch(
        self, level: LogLevel, message: str, extra_data: Dict[str, Any]
    ):
        """Elasticsearchにログ送信"""
        if not self.elasticsearch:
            return

        try:
            doc = {
                "timestamp": datetime.utcnow().isoformat(),
                "level": level.value,
                "message": message,
                **extra_data,
            }

            index_name = f"logs-{datetime.utcnow().strftime('%Y.%m')}"
            await self.elasticsearch.index(index=index_name, body=doc)
        except Exception as e:
            print(f"Elasticsearch logging error: {e}")

    async def _save_audit_log(self, event: SecurityEvent):
        """監査ログ保存"""
        if not self.redis_pool:
            return

        try:
            redis = aioredis.Redis(connection_pool=self.redis_pool)
            audit_key = f"audit:{event.timestamp[:10]}"  # 日単位キー
            await redis.lpush(audit_key, json.dumps(asdict(event), default=str))
            await redis.expire(audit_key, 30 * 24 * 3600)  # 30日保持
        except Exception as e:
            print(f"Audit log error: {e}")

    @contextmanager
    def with_context(self, **kwargs):
        """一時的コンテキスト設定"""
        old_context = self._context
        try:
            self._context = LogContext(
                correlation_id=kwargs.get("correlation_id", old_context.correlation_id),
                user_id=kwargs.get("user_id", old_context.user_id),
                component=kwargs.get("component", old_context.component),
                **{
                    k: v
                    for k, v in kwargs.items()
                    if k not in ["correlation_id", "user_id", "component"]
                },
            )
            yield self
        finally:
            self._context = old_context

    @asynccontextmanager
    async def with_async_context(self, **kwargs):
        """非同期一時的コンテキスト設定"""
        old_context = self._context
        try:
            self._context = LogContext(
                correlation_id=kwargs.get("correlation_id", old_context.correlation_id),
                user_id=kwargs.get("user_id", old_context.user_id),
                component=kwargs.get("component", old_context.component),
                **{
                    k: v
                    for k, v in kwargs.items()
                    if k not in ["correlation_id", "user_id", "component"]
                },
            )
            yield self
        finally:
            self._context = old_context


def get_logger(name: str) -> StructuredLogger:
    """構造化ロガー取得"""
    return StructuredLogger(name)


def log_performance(operation: str, logger: Optional[StructuredLogger] = None):
    """パフォーマンス計測デコレータ"""

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            start_memory = _get_memory_usage()

            try:
                if logger:
                    logger.set_context(
                        function=func.__name__,
                        module=func.__module__,
                        correlation_id=_get_correlation_id(),
                    )

                result = await func(*args, **kwargs)

                metrics = PerformanceMetrics(
                    duration_ms=(time.time() - start_time) * 1000,
                    memory_usage_mb=_get_memory_usage() - start_memory,
                )

                if logger:
                    logger.log_performance(operation, metrics)

                return result

            except Exception as e:
                metrics = PerformanceMetrics(
                    duration_ms=(time.time() - start_time) * 1000,
                    memory_usage_mb=_get_memory_usage() - start_memory,
                )

                if logger:
                    logger.error(
                        f"Operation failed: {operation} - {str(e)}",
                        error=str(e),
                        operation=operation,
                    )
                    logger.log_performance(f"{operation}_failed", metrics)

                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            start_memory = _get_memory_usage()

            try:
                if logger:
                    logger.set_context(
                        function=func.__name__,
                        module=func.__module__,
                        correlation_id=_get_correlation_id(),
                    )

                result = func(*args, **kwargs)

                metrics = PerformanceMetrics(
                    duration_ms=(time.time() - start_time) * 1000,
                    memory_usage_mb=_get_memory_usage() - start_memory,
                )

                if logger:
                    logger.log_performance(operation, metrics)

                return result

            except Exception as e:
                metrics = PerformanceMetrics(
                    duration_ms=(time.time() - start_time) * 1000,
                    memory_usage_mb=_get_memory_usage() - start_memory,
                )

                if logger:
                    logger.error(
                        f"Operation failed: {operation} - {str(e)}",
                        error=str(e),
                        operation=operation,
                    )
                    logger.log_performance(f"{operation}_failed", metrics)

                raise

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


def log_security_event(
    event_type: SecurityEventType,
    resource: str,
    logger: Optional[StructuredLogger] = None,
):
    """セキュリティイベントロギングデコレータ"""

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            event_logger = logger or get_logger(func.__module__)

            try:
                result = await func(*args, **kwargs)

                event = SecurityEvent(
                    event_type=event_type,
                    resource=resource,
                    action=func.__name__,
                    success=True,
                    user_id=_get_user_id(),
                    ip_address=_get_client_ip(),
                )

                asyncio.create_task(event_logger.log_security_event(event))
                return result

            except Exception as e:
                event = SecurityEvent(
                    event_type=event_type,
                    resource=resource,
                    action=func.__name__,
                    success=False,
                    user_id=_get_user_id(),
                    ip_address=_get_client_ip(),
                    details={"error": str(e)},
                )

                asyncio.create_task(event_logger.log_security_event(event))
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            event_logger = logger or get_logger(func.__module__)

            try:
                result = func(*args, **kwargs)

                event = SecurityEvent(
                    event_type=event_type,
                    resource=resource,
                    action=func.__name__,
                    success=True,
                    user_id=_get_user_id(),
                    ip_address=_get_client_ip(),
                )

                asyncio.create_task(event_logger.log_security_event(event))
                return result

            except Exception as e:
                event = SecurityEvent(
                    event_type=event_type,
                    resource=resource,
                    action=func.__name__,
                    success=False,
                    user_id=_get_user_id(),
                    ip_address=_get_client_ip(),
                    details={"error": str(e)},
                )

                asyncio.create_task(event_logger.log_security_event(event))
                raise

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


# ヘルパー関数
def _get_correlation_id() -> str:
    """相関ID取得（コンテキストから）"""
    # 実際の実装ではコンテキスト変数やリクエストヘッダーから取得
    return getattr(threading.current_thread(), "correlation_id", str(uuid.uuid4()))


def _get_user_id() -> Optional[str]:
    """ユーザーID取得"""
    # 実装: 認証コンテキストから取得
    return getattr(threading.current_thread(), "user_id", None)


def _get_client_ip() -> Optional[str]:
    """クライアントIP取得"""
    # 実装: リクエストコンテキストから取得
    return getattr(threading.current_thread(), "client_ip", None)


def _get_memory_usage() -> float:
    """メモリ使用量取得（MB）"""
    try:
        import psutil

        return psutil.Process().memory_info().rss / (1024 * 1024)
    except ImportError:
        return 0.0


class LoggingSetup:
    """ロギングセットアップ"""

    @staticmethod
    def setup_structured_logging(
        log_level: str = "INFO",
        log_file: Optional[str] = None,
        console_output: bool = True,
        file_rotation: bool = True,
    ):
        """構造化ロギングセットアップ"""

        # ルートロガー設定
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, log_level.upper()))

        # ハンドラークリア
        root_logger.handlers.clear()

        # 構造化フォーマッター
        formatter = StructuredFormatter()

        # コンソール出力
        if console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(formatter)
            root_logger.addHandler(console_handler)

        # ファイル出力
        if log_file:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)

            if file_rotation:
                file_handler = logging.handlers.RotatingFileHandler(
                    log_file,
                    maxBytes=50 * 1024 * 1024,  # 50MB
                    backupCount=10,
                )
            else:
                file_handler = logging.FileHandler(log_file)

            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)

    @staticmethod
    def setup_component_logging(component: Component, config: Dict[str, Any]):
        """コンポーネント別ロギング設定"""
        logger = logging.getLogger(f"trading.{component.value}")

        level = config.get("level", "INFO")
        logger.setLevel(getattr(logging, level.upper()))

        # コンポーネント固有のハンドラー設定
        if config.get("separate_file", False):
            log_file = config.get("log_file", f"logs/{component.value}.log")
            handler = logging.FileHandler(log_file)
            handler.setFormatter(StructuredFormatter())
            logger.addHandler(handler)


# 初期化
def initialize_logging():
    """ロギングシステム初期化"""
    LoggingSetup.setup_structured_logging(
        log_level=settings.get("logging.level", "INFO"),
        log_file=settings.get("logging.file", "logs/trading.log"),
        console_output=settings.get("logging.console", True),
    )

    # コンポーネント別設定
    component_configs = settings.get("logging.components", {})
    for component_name, config in component_configs.items():
        try:
            component = Component(component_name)
            LoggingSetup.setup_component_logging(component, config)
        except ValueError:
            print(f"Unknown component: {component_name}")


# 起動時に初期化
initialize_logging()
