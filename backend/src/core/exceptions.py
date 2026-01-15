"""
例外処理ユーティリティ

サイレント失敗を防ぎ、適切なログ出力を行う。
"""

import functools
import logging
import traceback
from typing import Any, Callable, Optional, Type, TypeVar, Union

logger = logging.getLogger(__name__)

T = TypeVar("T")


class AGStockError(Exception):
    """AGStock基底例外"""
    pass


class DataFetchError(AGStockError):
    """データ取得エラー"""
    pass


class TradingError(AGStockError):
    """取引エラー"""
    pass


class ConfigurationError(AGStockError):
    """設定エラー"""
    pass


class ModelError(AGStockError):
    """MLモデルエラー"""
    pass


def safe_execute(
    default: T = None,
    exceptions: tuple = (Exception,),
    log_level: str = "warning",
    reraise: bool = False,
) -> Callable:
    """
    例外を安全に処理するデコレータ
    
    サイレント失敗を防ぎ、必ずログを出力する。
    
    Args:
        default: 例外時のデフォルト戻り値
        exceptions: キャッチする例外タイプ
        log_level: ログレベル (debug, info, warning, error)
        reraise: 例外を再送出するか
    
    Example:
        @safe_execute(default=[], log_level="error")
        def fetch_data():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            try:
                return func(*args, **kwargs)
            except exceptions as e:
                log_func = getattr(logger, log_level, logger.warning)
                log_func(
                    f"Exception in {func.__name__}: {type(e).__name__}: {e}\n"
                    f"Args: {args[:3]}..., Kwargs: {list(kwargs.keys())}"
                )
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(traceback.format_exc())
                if reraise:
                    raise
                return default
        return wrapper
    return decorator


def log_exceptions(func: Callable) -> Callable:
    """
    例外をログ出力して再送出するデコレータ
    
    サイレント失敗を防ぐ最小限のデコレータ。
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.exception(f"Exception in {func.__name__}: {e}")
            raise
    return wrapper


class ExceptionContext:
    """
    コンテキストマネージャーによる例外処理
    
    Example:
        with ExceptionContext("データ取得", default=[]):
            data = fetch_data()
    """
    
    def __init__(
        self,
        operation: str,
        default: Any = None,
        reraise: bool = False,
        log_level: str = "error",
    ):
        self.operation = operation
        self.default = default
        self.reraise = reraise
        self.log_level = log_level
        self.result = default
        self.exception: Optional[Exception] = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.exception = exc_val
            log_func = getattr(logger, self.log_level, logger.error)
            log_func(f"[{self.operation}] {exc_type.__name__}: {exc_val}")
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(traceback.format_exc())
            if self.reraise:
                return False
            return True
        return False
