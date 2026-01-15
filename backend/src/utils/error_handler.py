"""
Unified Error Handler for AGStock
Provides consistent error handling, logging, and user-friendly notifications.
"""

import logging
import traceback
import os
import sys
import shutil
import sqlite3
import datetime
from functools import wraps
from typing import Any, Callable, Optional
import streamlit as st

logger = logging.getLogger(__name__)


class AGStockError(Exception):
    """Base exception for AGStock applications."""

    def __init__(
        self,
        message: str,
        user_message: Optional[str] = None,
        recovery_hint: Optional[str] = None,
    ):
        super().__init__(message)
        self.user_message = user_message or message
        self.recovery_hint = recovery_hint


class DataFetchError(AGStockError):
    """Errors related to fetching market or external data."""


class AnalysisError(AGStockError):
    """Errors occurring during strategy analysis or model inference."""


class ExecutionError(AGStockError):
    """Errors occurring during trade execution or order processing."""


class ConfigurationError(AGStockError):
    """Errors related to system settings or missing API keys."""


def handle_error(error: Exception, context: str = "", show_to_user: bool = True) -> None:
    """
    Centralized error handling. Logs the full traceback and optionally notifies user via UI.
    """
    error_msg = f"{context}: {str(error)}" if context else str(error)
    logger.error(error_msg)
    logger.debug(traceback.format_exc())

    if show_to_user:
        if isinstance(error, AGStockError):
            st.error(f"❌ {error.user_message}")
            if error.recovery_hint:
                st.info(f"💡 {error.recovery_hint}")
        else:
            st.error(f"❌ エラーが発生しました: {error_msg}")
            st.info("💡 問題が解決しない場合は、ページを再読み込みするかログを確認してください。")


def safe_execute(func: Callable, *args, default_return: Any = None, context: str = "", **kwargs) -> Any:
    """Safely execute a function, catching and handling any exceptions."""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        handle_error(e, context=context or f"Execution of {func.__name__}")
        return default_return


def error_boundary(default_return: Any = None, show_error: bool = True):
    """Decorator to catch exceptions in a function and return a default value."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if show_error:
                    handle_error(e, context=f"Error in {func.__name__}")
                return default_return

        return wrapper

    return decorator


def validate_ticker(ticker: str) -> bool:
    """Validates the format of a ticker symbol."""
    if not ticker or not isinstance(ticker, str):
        raise ConfigurationError(
            f"Invalid ticker: {ticker}",
            user_message="銘柄コードが正しくありません。",
            recovery_hint="正しい形式（例: 7203.T）で入力してください。",
        )
    return True


def validate_api_key(name: str, value: Optional[str]) -> bool:
    """Validates if a required API key is present."""
    if not value or value.startswith("YOUR_"):
        raise ConfigurationError(
            f"Missing API Key: {name}",
            user_message=f"{name} が設定されていません。",
            recovery_hint="設定画面から正しいAPIキーを入力してください。",
        )
    return True


class ErrorRecovery:
    """Utility for automatic error recovery strategies."""

    @staticmethod
    def retry_with_backoff(
        func: Callable,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        backoff_factor: float = 2.0,
        exceptions: tuple = (Exception,),
    ) -> Any:
        """Retries a function call with exponential backoff on failure."""
        import time

        delay = initial_delay
        last_exception = None

        for i in range(max_retries):
            try:
                return func()
            except exceptions as e:
                last_exception = e
                logger.warning(f"Retry {i + 1}/{max_retries} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= backoff_factor

        raise last_exception if last_exception else RuntimeError("Retry failed")

    @staticmethod
    def fallback_chain(*funcs: Callable) -> Any:
        """Execute a chain of functions until one succeeds."""
        last_exception = None
        for func in funcs:
            try:
                return func()
            except Exception as e:
                last_exception = e
                logger.warning(f"Fallback attempt failed: {e}")
                continue

        raise last_exception if last_exception else RuntimeError("All fallbacks failed")


def autonomous_error_handler(name: str = "System", reraise: bool = False, notification_enabled: bool = True):
    """
    Decorator for autonomous error handling, logging, and diagnostics.
    Captures stack traces and logs them in JSON structured format.
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_msg = f"Critical Error in {name}.{func.__name__}: {str(e)}"
                stack_trace = traceback.format_exc()

                # Take System Snapshot (Time Travel Debug)
                snapshot_path = take_system_snapshot(name, func.__name__)

                # Log with extended info
                logger.error(
                    error_msg,
                    extra={
                        "err_type": type(e).__name__,
                        "err_function": func.__name__,
                        "err_module": name,
                        "stack_trace": stack_trace,
                        "snapshot": snapshot_path,
                    },
                )

                # Self-Diagnosis
                diagnose_environment()

                if notification_enabled:
                    try:
                        # Attempt to notify via existing channels
                        from src.smart_notifier import SmartNotifier
                        from src.config import settings

                        notifier = SmartNotifier(settings.dict())
                        notifier.send_error_notification(module=name, error=str(e), stack=stack_trace[:500] + "...")
                    except Exception as notify_err:
                        logger.warning(f"Notification in error handler failed: {notify_err}")

                if reraise:
                    raise
                return None

        return wrapper

    return decorator


def diagnose_environment():
    """Perform a lightweight system check to see if environment issues caused the error."""
    logger.info("🛠 Running Self-Diagnosis...")

    # 1. Disk Space
    try:
        total, used, free = shutil.disk_usage(".")
        logger.info(f"Disk Check: Total={total // (2**30)}GB, Free={free // (2**30)}GB")
    except Exception:
        pass

    # 2. Database Connectivity
    try:
        from src.paths import STOCK_DATA_DB

        conn = sqlite3.connect(STOCK_DATA_DB)
        conn.execute("SELECT 1")
        conn.close()
        logger.info("DB Check: Connection OK")
    except Exception as e:
        logger.error(f"DB Check: FAILED - {e}")

    # 3. Memory
    try:
        import psutil

        mem = psutil.virtual_memory()
        logger.info(f"Memory Check: {mem.percent}% used")
    except ImportError:
        pass


def take_system_snapshot(module: str, function: str) -> str:
    """Saves a JSON snapshot of the system state for debugging."""
    try:
        from src.paths import LOGS_DIR
        from src.utils.state_engine import state_engine

        snapshot_dir = LOGS_DIR / "snapshots"
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"snapshot_{timestamp}_{module}_{function}.json"
        filepath = snapshot_dir / filename

        snapshot = {
            "timestamp": timestamp,
            "module": module,
            "function": function,
            "system_state": state_engine.state,
            "environment": {"os": os.name, "cwd": os.getcwd(), "python": sys.version},
        }

        import json

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2, default=str)

        logger.info(f"📸 System snapshot saved: {filepath}")
        return str(filepath)
    except Exception as e:
        logger.warning(f"Failed to take system snapshot: {e}")
        return "N/A"


class SafeExecution:
    """Context manager for safe execution of code blocks."""

    def __init__(self, context: str = "", default_return: Any = None, show_error: bool = True):
        self.context = context
        self.default_return = default_return
        self.show_error = show_error
        self.result = default_return

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            if self.show_error:
                handle_error(exc_val, context=self.context)
            return True  # Suppress the exception
        return False

# Expose retry_with_backoff as top-level function for backward compatibility
def retry_with_backoff(func=None, retries=3, backoff_in_seconds=1, max_retries=None, initial_delay=None, **kwargs):
    """
    Compatibility wrapper for retry_with_backoff to support both decorator (with/without args)
    and legacy function call patterns.
    """
    _max_retries = max_retries if max_retries is not None else retries
    _initial_delay = initial_delay if initial_delay is not None else backoff_in_seconds

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            return ErrorRecovery.retry_with_backoff(
                lambda: f(*args, **kwargs),
                max_retries=_max_retries,
                initial_delay=_initial_delay
            )
        return wrapper

    if func and callable(func):
        return decorator(func)
    else:
        return decorator
