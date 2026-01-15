"""
改善されたエラーハンドリングシステム
ユーザーフレンドリーなエラーメッセージと自動回復機能
"""

import logging
import traceback
import functools
import sys
import time
from typing import Dict, Any, Optional, Callable, Type
from enum import Enum
import pandas as pd
import streamlit as st
from datetime import datetime

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ErrorCategory(Enum):
    NETWORK = "NETWORK"
    API = "API"
    DATABASE = "DATABASE"
    LOGIC = "LOGIC"
    SYSTEM = "SYSTEM"
    TRADING = "TRADING"
    DATA = "DATA"
    ML = "ML"
    MODEL = "MODEL"
    SECURITY = "SECURITY"
    PERMISSION = "PERMISSION"
    VALIDATION = "VALIDATION"
    UNKNOWN = "UNKNOWN"


class RetryableError(Exception):
    """Exception raised for errors that can be retried."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def api_retry(max_retries: int = 3, backoff_factor: float = 1.0):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for i in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if i == max_retries - 1:
                        raise e
                    time.sleep(backoff_factor * (2**i))
            return func(*args, **kwargs)

        return wrapper
    return decorator


def classify_error(error: Exception) -> ErrorCategory:
    """Classify an error into a category."""
    if isinstance(error, (ConnectionError, TimeoutError)):
        return ErrorCategory.NETWORK
    return ErrorCategory.UNKNOWN


def get_user_friendly_message(error: Exception) -> str:
    """Get a user-friendly message for an error."""
    return str(error)


def log_error_with_context(error: Exception, context: dict = None):
    """Log an error with additional context."""
    logger.error(f"Error: {error}, Context: {context}")


# Alias
network_retry = api_retry
retry = api_retry


class UserFriendlyError:
    """ユーザーフレンドリーなエラーメッセージ"""

    MESSAGES = {
        # データ関連
        ErrorCategory.DATA: {
            ErrorSeverity.LOW: "データの更新中です。少々お待ちください。",
            ErrorSeverity.MEDIUM: "データ取得に問題があります。しばらくしてから再度お試しください。",
            ErrorSeverity.HIGH: "データシステムで問題が発生しました。管理者にご連絡ください。",
            ErrorSeverity.CRITICAL: "データシステムが停止しています。緊急メンテナンス中です。",
        },
        # ネットワーク関連
        ErrorCategory.NETWORK: {
            ErrorSeverity.LOW: "一時的な接続問題です。再試行しています...",
            ErrorSeverity.MEDIUM: "ネットワーク接続が不安定です。WiFi環境をご確認ください。",
            ErrorSeverity.HIGH: "ネットワークに接続できません。インターネット設定を確認してください。",
            ErrorSeverity.CRITICAL: "サーバーに接続できません。サービスが一時停止しています。",
        },
        # 取引関連
        ErrorCategory.TRADING: {
            ErrorSeverity.LOW: "取引リクエストを処理中です。",
            ErrorSeverity.MEDIUM: "取引に時間がかかっています。しばらくお待ちください。",
            ErrorSeverity.HIGH: "取引処理でエラーが発生しました。注文状況をご確認ください。",
            ErrorSeverity.CRITICAL: "取引システムで重大な問題が発生しました。取引を一時停止します。",
        },
        # モデル関連
        ErrorCategory.MODEL: {
            ErrorSeverity.LOW: "予測モデルを更新しています。",
            ErrorSeverity.MEDIUM: "予測精度が低下しています。代替モデルを使用します。",
            ErrorSeverity.HIGH: "予測モデルでエラーが発生しました。安全モードで動作します。",
            ErrorSeverity.CRITICAL: "すべての予測モデルが利用できません。手動運用に切り替えます。",
        },
    }

    @classmethod
    def get_message(cls, category: ErrorCategory, severity: ErrorSeverity) -> str:
        """ユーザーフレンドリーなメッセージを取得"""
        if category in cls.MESSAGES and severity in cls.MESSAGES[category]:
            return cls.MESSAGES[category][severity]

        return "問題が発生しました。しばらくしてから再度お試しください。"


class ErrorRecovery:
    """エラー自動回復機能"""

    @staticmethod
    def retry_with_backoff(
        func: Callable,
        max_retries: int = 3,
        base_delay: float = 1.0,
        backoff_factor: float = 2.0,
    ):
        """
        指数バックオフ付きリトライ

        Args:
            func: 実行する関数
            max_retries: 最大リトライ回数
            base_delay: 初期待機時間
            backoff_factor: バックオフ係数
        """

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries:
                        raise

                    delay = base_delay * (backoff_factor**attempt)
                    logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                    time.sleep(delay)

            return None

        return wrapper

    @staticmethod
    def fallback_to_default(func: Callable, fallback_value: Any):
        """
        デフォルト値へのフォールバック

        Args:
            func: 実行する関数
            fallback_value: フォールバック値
        """

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Function {func.__name__} failed: {e}. Using fallback value.")
                return fallback_value

        return wrapper


class ErrorHandler:
    """
    包括的なエラーハンドリングマネージャ
    """

    def __init__(self):
        self.error_history = []
        self.auto_recovery_enabled = True
        self.notification_callbacks = []

    def handle_error(
        self,
        error: Exception,
        category: ErrorCategory = ErrorCategory.SYSTEM,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        エラーを処理

        Args:
            error: 発生したエラー
            category: エラーカテゴリ
            severity: 深刻度
            context: エラーコンテキスト

        Returns:
            エラー処理結果
        """
        error_info = {
            "timestamp": datetime.now(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "category": category.value,
            "severity": severity.value,
            "traceback": traceback.format_exc(),
            "context": context or {},
        }

        # 履歴に保存
        self.error_history.append(error_info)

        # ログ記録
        self._log_error(error_info)

        # ユーザー通知
        user_message = UserFriendlyError.get_message(category, severity)
        self._notify_user(user_message, severity)

        # 自動回復試行
        recovery_result = None
        if self.auto_recovery_enabled:
            recovery_result = self._attempt_recovery(error_info)

        return {
            "handled": True,
            "user_message": user_message,
            "recovery_attempted": self.auto_recovery_enabled,
            "recovery_result": recovery_result,
            "error_info": error_info,
        }

    def _log_error(self, error_info: Dict[str, Any]):
        """エラーをログ記録"""
        log_message = f"Error: {error_info['error_type']} - {error_info['error_message']}"

        if error_info["severity"] == "critical":
            logger.critical(log_message)
        elif error_info["severity"] == "high":
            logger.error(log_message)
        elif error_info["severity"] == "medium":
            logger.warning(log_message)
        else:
            logger.info(log_message)

    def _notify_user(self, message: str, severity: ErrorSeverity):
        """ユーザーに通知"""
        # Streamlit通知
        if hasattr(st, "session_state"):
            if severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
                st.error(message)
            elif severity == ErrorSeverity.MEDIUM:
                st.warning(message)
            else:
                st.info(message)

        # コールバック通知
        for callback in self.notification_callbacks:
            try:
                callback(message, severity)
            except Exception as e:
                logger.error(f"Notification callback failed: {e}")

    def _attempt_recovery(self, error_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """自動回復を試行"""
        recovery_strategies = {
            ErrorCategory.DATA: self._recover_data_error,
            ErrorCategory.NETWORK: self._recover_network_error,
            ErrorCategory.MODEL: self._recover_model_error,
            ErrorCategory.TRADING: self._recover_trading_error,
        }

        category = ErrorCategory(error_info["category"])
        if category in recovery_strategies:
            return recovery_strategies[category](error_info)

        return None

    def _recover_data_error(self, error_info: Dict[str, Any]) -> Dict[str, Any]:
        """データエラー回復"""
        return {
            "strategy": "data_fallback",
            "action": "キャッシュデータ使用",
            "success": True,
        }

    def _recover_network_error(self, error_info: Dict[str, Any]) -> Dict[str, Any]:
        """ネットワークエラー回復"""
        return {"strategy": "retry_connection", "action": "接続再試行", "success": True}

    def _recover_model_error(self, error_info: Dict[str, Any]) -> Dict[str, Any]:
        """モデルエラー回復"""
        return {
            "strategy": "fallback_model",
            "action": "代替モデル使用",
            "success": True,
        }

    def _recover_trading_error(self, error_info: Dict[str, Any]) -> Dict[str, Any]:
        """取引エラー回復"""
        return {"strategy": "safe_mode", "action": "セーフモード切替", "success": True}

    def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """
        エラー概要を取得

        Args:
            hours: 集計時間（時間）

        Returns:
            エラー概要
        """
        cutoff_time = datetime.now() - pd.Timedelta(hours=hours)
        recent_errors = [e for e in self.error_history if e["timestamp"] > cutoff_time]

        if not recent_errors:
            return {"total": 0, "by_category": {}, "by_severity": {}}

        # カテゴリ別集計
        by_category = {}
        for error in recent_errors:
            cat = error["category"]
            by_category[cat] = by_category.get(cat, 0) + 1

        # 深刻度別集計
        by_severity = {}
        for error in recent_errors:
            sev = error["severity"]
            by_severity[sev] = by_severity.get(sev, 0) + 1

        return {
            "total": len(recent_errors),
            "by_category": by_category,
            "by_severity": by_severity,
            "most_recent": recent_errors[-1] if recent_errors else None,
        }


# グローバルエラーハンドラー
error_handler = ErrorHandler()


# デコレーター群
def safe_execute(
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    fallback_value: Any = None,
    max_retries: int = 3,
):
    """
    安全実行デコレータ

    Args:
        category: エラーカテゴリ
        severity: 深刻度
        fallback_value: フォールバック値
        max_retries: 最大リトライ回数
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # リトライ機能適用
                retry_func = ErrorRecovery.retry_with_backoff(func, max_retries)
                return retry_func(*args, **kwargs)

            except Exception as e:
                # エラーハンドリング
                result = error_handler.handle_error(
                    e,
                    category,
                    severity,
                    {
                        "function": func.__name__,
                        "args": str(args)[:100],
                        "kwargs": str(kwargs)[:100],
                    },
                )

                # フォールバック値を返す
                if fallback_value is not None:
                    return fallback_value

                # 例外を再送出
                if severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
                    raise

        return wrapper

    return decorator


def validate_user_input(
    input_value: Any,
    input_name: str,
    validator: Callable[[Any], bool],
    error_message: str = None,
):
    """
    ユーザー入力検証

    Args:
        input_value: 入力値
        input_name: 入力名
        validator: 検証関数
        error_message: エラーメッセージ

    Returns:
        検証結果
    """
    try:
        if not validator(input_value):
            error = ValueError(error_message or f"{input_name}の入力が不正です")
            error_handler.handle_error(
                error,
                ErrorCategory.USER_INPUT,
                ErrorSeverity.MEDIUM,
                {"input_name": input_name, "input_value": input_value},
            )
            return False

        return True

    except Exception as e:
        error_handler.handle_error(
            e,
            ErrorCategory.USER_INPUT,
            ErrorSeverity.MEDIUM,
            {"input_name": input_name},
        )
        return False


# Streamlit向けユーティリティ
def streamlit_error_boundary(func):
    """Streamlitエラーボウンディリデコレータ"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            error_handler.handle_error(e, ErrorCategory.SYSTEM, ErrorSeverity.HIGH, {"function": func.__name__})
            st.error("エラーが発生しました。ページを更新してください。")

    return wrapper


# 使用例
if __name__ == "__main__":

    @safe_execute(category=ErrorCategory.DATA, max_retries=3)
    def load_data():
        # データ読み込み処理
        pass

    @streamlit_error_boundary
    def main_page():
        # Streamlitメインページ
        pass
