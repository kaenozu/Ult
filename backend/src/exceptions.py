"""
Custom Exception Hierarchy for AGStock
Provides specific exception types for better error handling.
"""


class AGStockException(Exception):
    """Base exception for all AGStock errors."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class DataFetchError(AGStockException):
    """Raised when data fetching fails."""


class DataValidationError(AGStockException):
    """Raised when data validation fails."""


class TradingError(AGStockException):
    """Raised when trading operations fail."""


class InsufficientFundsError(TradingError):
    """Raised when there are insufficient funds for a trade."""


class InvalidOrderError(TradingError):
    """Raised when an order is invalid."""


class StrategyError(AGStockException):
    """Raised when strategy execution fails."""


class PredictionError(AGStockException):
    """Raised when prediction fails."""


class ConfigurationError(AGStockException):
    """Raised when configuration is invalid."""


class APIError(AGStockException):
    """Raised when external API calls fail."""


class RateLimitError(APIError):
    """Raised when API rate limit is exceeded."""


class CacheError(AGStockException):
    """Raised when cache operations fail."""
