"""
Standardized API Response Models and Error Handling

This module provides consistent response formats and error handling
across all API endpoints in Living Nexus & Strategy Shifter.
"""

from typing import Any, Dict, List, Optional, Union, Generic, TypeVar
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse


# Generic type for data
T = TypeVar("T")


class ResponseStatus(str, Enum):
    """Standard response status codes."""

    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"


class BaseAPIResponse(BaseModel, Generic[T]):
    """Standard API response format."""

    status: ResponseStatus = Field(..., description="Response status")
    message: str = Field(..., description="Human-readable message")
    data: Optional[T] = Field(None, description="Response data")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp"
    )
    request_id: Optional[str] = Field(None, description="Request ID for tracing")
    version: str = Field(default="1.0", description="API version")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class PaginatedResponse(BaseAPIResponse[List[T]]):
    """Paginated response format."""

    pagination: Dict[str, Any] = Field(..., description="Pagination metadata")

    @classmethod
    def create(
        cls,
        data: List[T],
        message: str = "Data retrieved successfully",
        page: int = 1,
        limit: int = 50,
        total: int = 0,
        request_id: Optional[str] = None,
    ) -> "PaginatedResponse[T]":
        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return cls(
            status=ResponseStatus.SUCCESS,
            message=message,
            data=data,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
            request_id=request_id,
        )


class ErrorDetail(BaseModel):
    """Detailed error information."""

    code: str = Field(..., description="Error code")
    field: Optional[str] = Field(None, description="Field that caused the error")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(
        None, description="Additional error details"
    )


class ErrorResponse(BaseAPIResponse[None]):
    """Standard error response format."""

    error_code: str = Field(..., description="Application-specific error code")
    errors: List[ErrorDetail] = Field(
        default_factory=list, description="Detailed error information"
    )

    @classmethod
    def create(
        cls,
        message: str,
        error_code: str,
        errors: Optional[List[ErrorDetail]] = None,
        status_code: int = 500,
        request_id: Optional[str] = None,
    ) -> tuple["ErrorResponse", int]:
        return cls(
            status=ResponseStatus.ERROR,
            message=message,
            error_code=error_code,
            errors=errors or [],
            request_id=request_id,
        ), status_code


# Success response factories
def success_response(
    data: Optional[T] = None,
    message: str = "Operation completed successfully",
    request_id: Optional[str] = None,
) -> BaseAPIResponse[T]:
    """Create a success response."""
    return BaseAPIResponse[T](
        status=ResponseStatus.SUCCESS,
        message=message,
        data=data,
        request_id=request_id,
    )


def created_response(
    data: Optional[T] = None,
    message: str = "Resource created successfully",
    request_id: Optional[str] = None,
) -> BaseAPIResponse[T]:
    """Create a resource created response."""
    return BaseAPIResponse[T](
        status=ResponseStatus.SUCCESS,
        message=message,
        data=data,
        request_id=request_id,
    )


def no_content_response(
    message: str = "Operation completed successfully", request_id: Optional[str] = None
) -> BaseAPIResponse[None]:
    """Create a no content response."""
    return BaseAPIResponse[None](
        status=ResponseStatus.SUCCESS,
        message=message,
        data=None,
        request_id=request_id,
    )


# Error response factories
def bad_request_error(
    message: str = "Bad request",
    error_code: str = "BAD_REQUEST",
    errors: Optional[List[ErrorDetail]] = None,
    request_id: Optional[str] = None,
) -> tuple[ErrorResponse, int]:
    """Create a bad request error response."""
    return ErrorResponse.create(
        message=message,
        error_code=error_code,
        errors=errors,
        status_code=status.HTTP_400_BAD_REQUEST,
        request_id=request_id,
    )


def unauthorized_error(
    message: str = "Unauthorized",
    error_code: str = "UNAUTHORIZED",
    request_id: Optional[str] = None,
) -> tuple[ErrorResponse, int]:
    """Create an unauthorized error response."""
    return ErrorResponse.create(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_401_UNAUTHORIZED,
        request_id=request_id,
    )


def forbidden_error(
    message: str = "Forbidden",
    error_code: str = "FORBIDDEN",
    request_id: Optional[str] = None,
) -> tuple[ErrorResponse, int]:
    """Create a forbidden error response."""
    return ErrorResponse.create(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_403_FORBIDDEN,
        request_id=request_id,
    )


def not_found_error(
    message: str = "Resource not found",
    error_code: str = "NOT_FOUND",
    request_id: Optional[str] = None,
) -> tuple[ErrorResponse, int]:
    """Create a not found error response."""
    return ErrorResponse.create(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_404_NOT_FOUND,
        request_id=request_id,
    )


def conflict_error(
    message: str = "Resource conflict",
    error_code: str = "CONFLICT",
    request_id: Optional[str] = None,
) -> tuple[ErrorResponse, int]:
    """Create a conflict error response."""
    return ErrorResponse.create(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_409_CONFLICT,
        request_id=request_id,
    )


def internal_error(
    message: str = "Internal server error",
    error_code: str = "INTERNAL_ERROR",
    request_id: Optional[str] = None,
) -> tuple[ErrorResponse, int]:
    """Create an internal server error response."""
    return ErrorResponse.create(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=request_id,
    )


# Custom exception classes
class APIException(HTTPException):
    """Base API exception with standardized error response."""

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        errors: Optional[List[ErrorDetail]] = None,
    ):
        self.error_code = error_code
        self.errors = errors or []
        super().__init__(status_code=status_code, detail=message)


class ValidationError(APIException):
    """Validation error exception."""

    def __init__(
        self,
        message: str = "Validation failed",
        errors: Optional[List[ErrorDetail]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            message=message,
            errors=errors,
        )


class ResourceNotFoundError(APIException):
    """Resource not found exception."""

    def __init__(self, resource: str = "Resource", identifier: Optional[str] = None):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
            message=message,
        )


class PermissionDeniedError(APIException):
    """Permission denied exception."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PERMISSION_DENIED",
            message=message,
        )


class RateLimitError(APIException):
    """Rate limit exceeded exception."""

    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            message=message,
        )


# Response utilities
def create_json_response(
    response_data: Union[BaseAPIResponse, ErrorResponse],
    status_code: int = status.HTTP_200_OK,
) -> JSONResponse:
    """Create a JSON response with proper headers."""
    return JSONResponse(
        content=response_data.dict(exclude_none=True),
        status_code=status_code,
        headers={
            "X-API-Version": response_data.version,
            "X-Response-Time": datetime.utcnow().isoformat(),
        },
    )


# Request ID utilities
def generate_request_id() -> str:
    """Generate a unique request ID."""
    import uuid

    return str(uuid.uuid4())


__all__ = [
    # Response models
    "BaseAPIResponse",
    "PaginatedResponse",
    "ErrorResponse",
    "ErrorDetail",
    "ResponseStatus",
    # Success response factories
    "success_response",
    "created_response",
    "no_content_response",
    # Error response factories
    "bad_request_error",
    "unauthorized_error",
    "forbidden_error",
    "not_found_error",
    "conflict_error",
    "internal_error",
    # Exception classes
    "APIException",
    "ValidationError",
    "ResourceNotFoundError",
    "PermissionDeniedError",
    "RateLimitError",
    # Utilities
    "create_json_response",
    "generate_request_id",
]
