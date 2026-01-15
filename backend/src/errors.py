"""AGStockプロジェクトのカスタム例外定義

このモジュールは、AGStockプロジェクトで使用されるカスタム例外クラスを定義します。
これらの例外は、エラー発生時の詳細情報（エラーコード、詳細情報など）を提供し、
エラー追跡とデバッグを容易にします。
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class AGStockException(Exception):
    """AGStockプロジェクトの全例外のベースクラス

    このクラスは、AGStockプロジェクトで発生するすべての例外のベースクラスです。
    エラーの詳細情報（エラーメード、追加の詳細情報）を保持します。

    Attributes:
        message (str): エラーメセージ
        error_code (str): エラーコード
        details (dict): エラーに関する追加の詳細情報
    """

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        """AGStockExceptionの初期化

        Args:
            message (str): エラーのメッセージ
            error_code (Optional[str]): エラー識別コード
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code or "UNKNOWN_ERROR"
        self.details = details or {}
        logger.error(f"{self.__class__.__name__}: {message} (Code: {self.error_code}, Details: {self.details})")


class DataLoadError(AGStockException):
    """データ読み込みに関するエラー

    データ取得や読み込み処理で発生する例外を表します。
    """

    def __init__(self, message: str, ticker: Optional[str] = None, details: Optional[dict] = None):
        """DataLoadErrorの初期化

        Args:
            message (str): エラーのメッセージ
            ticker (Optional[str]): 関連する銘柄コード
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(
            message=message,
            error_code="DATA_LOAD_ERROR",
            details={**(details or {}), "ticker": ticker},
        )


class RiskManagementError(AGStockException):
    """リスク管理に関するエラー

    リスク管理処理で発生する例外を表します。
    """

    def __init__(
        self,
        message: str,
        risk_type: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        """RiskManagementErrorの初期化

        Args:
            message (str): エラーのメッセージ
            risk_type (Optional[str]): リスキタイプ
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(
            message=message,
            error_code="RISK_MANAGEMENT_ERROR",
            details={**(details or {}), "risk_type": risk_type},
        )


class StrategyError(AGStockException):
    """トレード戦略に関するエラー

    トレード戦略の実行や計算で発生する例外を表します。
    """

    def __init__(
        self,
        message: str,
        strategy_name: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        """StrategyErrorの初期化

        Args:
            message (str): エラーのメッセージ
            strategy_name (Optional[str]): 関連する戦略名
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(
            message=message,
            error_code="STRATEGY_ERROR",
            details={**(details or {}), "strategy_name": strategy_name},
        )


class ExecutionError(AGStockException):
    """取引実行に関するエラー

    取引の実行処理で発生する例外を表します。
    """

    def __init__(
        self,
        message: str,
        ticker: Optional[str] = None,
        action: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        """ExecutionErrorの初期化

        Args:
            message (str): エラーのメッセージ
            ticker (Optional[str]): 関連する銘柄コード
            action (Optional[str]): 実行アクション（BUY/SELLなど）
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(
            message=message,
            error_code="EXECUTION_ERROR",
            details={**(details or {}), "ticker": ticker, "action": action},
        )


class ConfigurationError(AGStockException):
    """設定関連のエラー

    設定値の読み込みや検証で発生する例外を表します。
    """

    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        """ConfigurationErrorの初期化

        Args:
            message (str): エラーのメッセージ
            config_key (Optional[str]): 関連する設定キー
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            details={**(details or {}), "config_key": config_key},
        )
        self.config_key = config_key


class BacktestError(AGStockException):
    """バックテスト関連のエラー

    バックテストの実行で発生する例外を表します。
    """

    def __init__(
        self,
        message: str,
        strategy_name: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        """BacktestErrorの初期化

        Args:
            message (str): エラーのメッセージ
            strategy_name (Optional[str]): 関連する戦略名
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(
            message=message,
            error_code="BACKTEST_ERROR",
            details={**(details or {}), "strategy_name": strategy_name},
        )


class CacheError(AGStockException):
    """キャッシュ関連のエラー

    キャッシュ操作で発生する例外を表します。
    """

    def __init__(
        self,
        message: str,
        cache_key: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        """CacheErrorの初期化

        Args:
            message (str): エラーのメッセージ
            cache_key (Optional[str]): 関連するキャッシュキー
            details (Optional[dict]): エラーに関する追加の詳細情報
        """
        super().__init__(
            message=message,
            error_code="CACHE_ERROR",
            details={**(details or {}), "cache_key": cache_key},
        )
