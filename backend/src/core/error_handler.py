"""
Unified Error Handling System
統一エラーハンドリングシステム
"""

import logging
import traceback
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, Union
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

logger = logging.getLogger(__name__)


class ErrorCode(str, Enum):
    """エラーコード列挙"""

    # 一般エラー
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    BAD_REQUEST = "BAD_REQUEST"
    CONFLICT = "CONFLICT"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # 取引関連エラー
    TRADE_EXECUTION_FAILED = "TRADE_EXECUTION_FAILED"
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
    INVALID_ORDER = "INVALID_ORDER"
    MARKET_CLOSED = "MARKET_CLOSED"

    # データ関連エラー
    DATA_NOT_AVAILABLE = "DATA_NOT_AVAILABLE"
    DATA_CORRUPTION = "DATA_CORRUPTION"
    DATA_SOURCE_UNAVAILABLE = "DATA_SOURCE_UNAVAILABLE"

    # モデル関連エラー
    MODEL_PREDICTION_FAILED = "MODEL_PREDICTION_FAILED"
    MODEL_NOT_LOADED = "MODEL_NOT_LOADED"
    MODEL_TRAINING_FAILED = "MODEL_TRAINING_FAILED"

    # 承認関連エラー
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    APPROVAL_EXPIRED = "APPROVAL_EXPIRED"
    APPROVAL_DENIED = "APPROVAL_DENIED"


class ErrorSeverity(str, Enum):
    """エラー重要度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TradingSystemError(Exception):
    """取引システムカスタム例外基底クラス"""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        details: Dict[str, Any] = None,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.severity = severity
        self.timestamp = datetime.now()
        super().__init__(self.message)


class ValidationError(TradingSystemError):
    """バリデーションエラー"""

    def __init__(self, message: str, field: str = None, value: Any = None):
        details = {"field": field, "value": value} if field else {}
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            details=details,
            severity=ErrorSeverity.LOW,
        )


class AuthenticationError(TradingSystemError):
    """認証エラー"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            error_code=ErrorCode.AUTHENTICATION_ERROR,
            severity=ErrorSeverity.MEDIUM,
        )


class AuthorizationError(TradingSystemError):
    """認可エラー"""

    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message=message,
            error_code=ErrorCode.AUTHORIZATION_ERROR,
            severity=ErrorSeverity.MEDIUM,
        )


class DataNotFoundError(TradingSystemError):
    """データが見つからないエラー"""

    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"

        details = (
            {"resource": resource, "identifier": identifier}
            if identifier
            else {"resource": resource}
        )
        super().__init__(
            message=message,
            error_code=ErrorCode.NOT_FOUND,
            details=details,
            severity=ErrorSeverity.LOW,
        )


class ExternalServiceError(TradingSystemError):
    """外部サービスエラー"""

    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"{service} service error: {message}",
            error_code=ErrorCode.DATA_SOURCE_UNAVAILABLE,
            details={"service": service},
            severity=ErrorSeverity.HIGH,
        )


class ModelError(TradingSystemError):
    """MLモデルエラー"""

    def __init__(self, message: str, model_name: str = None):
        details = {"model_name": model_name} if model_name else {}
        super().__init__(
            message=message,
            error_code=ErrorCode.MODEL_PREDICTION_FAILED,
            details=details,
            severity=ErrorSeverity.HIGH,
        )


class ErrorHandler:
    """統一エラーハンドラー"""

    @staticmethod
    def create_error_response(error: TradingSystemError) -> JSONResponse:
        """エラーレスポンスを作成"""

        # ステータスコードをマッピング
        status_mapping = {
            ErrorCode.VALIDATION_ERROR: status.HTTP_400_BAD_REQUEST,
            ErrorCode.AUTHENTICATION_ERROR: status.HTTP_401_UNAUTHORIZED,
            ErrorCode.AUTHORIZATION_ERROR: status.HTTP_403_FORBIDDEN,
            ErrorCode.NOT_FOUND: status.HTTP_404_NOT_FOUND,
            ErrorCode.CONFLICT: status.HTTP_409_CONFLICT,
            ErrorCode.RATE_LIMIT_EXCEEDED: status.HTTP_429_TOO_MANY_REQUESTS,
        }

        http_status = status_mapping.get(
            error.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR
        )

        error_response = {
            "error": {
                "code": error.error_code.value,
                "message": error.message,
                "severity": error.severity.value,
                "timestamp": error.timestamp.isoformat(),
                **error.details,
            }
        }

        # 重要度に応じたロギング
        if error.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            logger.error(f"High severity error: {error.message}", exc_info=True)
        elif error.severity == ErrorSeverity.MEDIUM:
            logger.warning(f"Medium severity error: {error.message}")
        else:
            logger.info(f"Low severity error: {error.message}")

        return JSONResponse(status_code=http_status, content=error_response)

    @staticmethod
    def handle_validation_error(exc: RequestValidationError) -> JSONResponse:
        """FastAPIリクエスト検証エラーを処理"""

        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append(
                {"field": field, "message": error["msg"], "type": error["type"]}
            )

        validation_error = ValidationError(
            message="Request validation failed", details={"validation_errors": errors}
        )

        return ErrorHandler.create_error_response(validation_error)

    @staticmethod
    def handle_general_exception(exc: Exception) -> JSONResponse:
        """一般例外を処理"""

        # カスタム例外の場合
        if isinstance(exc, TradingSystemError):
            return ErrorHandler.create_error_response(exc)

        # FastAPI HTTP例外の場合
        elif isinstance(exc, HTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": {
                        "code": "HTTP_ERROR",
                        "message": exc.detail,
                        "severity": "medium",
                        "timestamp": datetime.now().isoformat(),
                    }
                },
            )

        # その他の例外
        else:
            logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)

            # デバッグモードの場合は詳細を含める
            debug_mode = False  # 環境変数で制御
            details = {
                "exception_type": type(exc).__name__,
            }

            if debug_mode:
                details.update(
                    {
                        "traceback": traceback.format_exc(),
                        "args": str(exc.args) if exc.args else None,
                    }
                )

            system_error = TradingSystemError(
                message="An internal error occurred",
                error_code=ErrorCode.INTERNAL_SERVER_ERROR,
                details=details,
                severity=ErrorSeverity.HIGH,
            )

            return ErrorHandler.create_error_response(system_error)


def log_error(
    error: Union[Exception, TradingSystemError],
    context: Dict[str, Any] = None,
    user_id: str = None,
):
    """エラーを構造化ログに出力"""

    error_data = {
        "timestamp": datetime.now().isoformat(),
        "error_type": type(error).__name__,
        "message": str(error),
        "context": context or {},
    }

    if isinstance(error, TradingSystemError):
        error_data.update(
            {
                "error_code": error.error_code.value,
                "severity": error.severity.value,
                "details": error.details,
            }
        )

    if user_id:
        error_data["user_id"] = user_id

    # 重要度に応じたロギングレベル
    if isinstance(error, TradingSystemError):
        if error.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            logger.error("High severity error", extra=error_data)
        elif error.severity == ErrorSeverity.MEDIUM:
            logger.warning("Medium severity error", extra=error_data)
        else:
            logger.info("Low severity error", extra=error_data)
    else:
        logger.error("Unhandled error", extra=error_data)


# デコレータ：エラーハンドリングを自動化
def handle_errors(func):
    """関数のエラーを自動的に処理するデコレータ"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except TradingSystemError as e:
            log_error(e, context={"function": func.__name__})
            return ErrorHandler.create_error_response(e)
        except Exception as e:
            log_error(e, context={"function": func.__name__})
            return ErrorHandler.create_error_response(TradingSystemError(str(e)))

    return wrapper


# 非同期バージョンのデコレータ
def handle_async_errors(func):
    """非同期関数のエラーを自動的に処理するデコレータ"""

    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except TradingSystemError as e:
            log_error(e, context={"function": func.__name__})
            return ErrorHandler.create_error_response(e)
        except Exception as e:
            log_error(e, context={"function": func.__name__})
            return ErrorHandler.create_error_response(TradingSystemError(str(e)))

    return wrapper
