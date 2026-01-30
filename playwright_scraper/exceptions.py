#!/usr/bin/env python3
"""
Custom exceptions for the Playwright Web Scraper.

This module defines a hierarchy of custom exceptions for different
error scenarios that can occur during web scraping operations.
"""


class ScraperException(Exception):
    """Base exception for all scraper-related errors."""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}
    
    def __str__(self):
        if self.details:
            return f"{self.message} - Details: {self.details}"
        return self.message


class ConfigurationError(ScraperException):
    """Raised when there's an error in the scraper configuration."""
    pass


class BrowserError(ScraperException):
    """Raised when browser operations fail."""
    pass


class NavigationError(ScraperException):
    """Raised when page navigation fails."""
    
    def __init__(self, message: str, url: str = None, status_code: int = None, details: dict = None):
        super().__init__(message, details)
        self.url = url
        self.status_code = status_code
    
    def __str__(self):
        base_msg = f"{self.message}"
        if self.url:
            base_msg += f" (URL: {self.url})"
        if self.status_code:
            base_msg += f" (Status: {self.status_code})"
        return base_msg


class AuthenticationError(ScraperException):
    """Raised when login/authentication fails."""
    
    def __init__(self, message: str, username: str = None, details: dict = None):
        super().__init__(message, details)
        self.username = username
    
    def __str__(self):
        base_msg = f"{self.message}"
        if self.username:
            base_msg += f" (Username: {self.username})"
        return base_msg


class ElementNotFoundError(ScraperException):
    """Raised when an expected element is not found on the page."""
    
    def __init__(self, message: str, selector: str = None, timeout: float = None, details: dict = None):
        super().__init__(message, details)
        self.selector = selector
        self.timeout = timeout
    
    def __str__(self):
        base_msg = f"{self.message}"
        if self.selector:
            base_msg += f" (Selector: {self.selector})"
        if self.timeout:
            base_msg += f" (Timeout: {self.timeout}s)"
        return base_msg


class DataExtractionError(ScraperException):
    """Raised when data extraction from the page fails."""
    pass


class PaginationError(ScraperException):
    """Raised when pagination operations fail."""
    
    def __init__(self, message: str, current_page: int = None, details: dict = None):
        super().__init__(message, details)
        self.current_page = current_page
    
    def __str__(self):
        base_msg = f"{self.message}"
        if self.current_page:
            base_msg += f" (Current Page: {self.current_page})"
        return base_msg


class StorageError(ScraperException):
    """Raised when saving/loading data fails."""
    pass


class RateLimitError(ScraperException):
    """Raised when rate limiting is detected."""
    
    def __init__(self, message: str, retry_after: int = None, details: dict = None):
        super().__init__(message, details)
        self.retry_after = retry_after
    
    def __str__(self):
        base_msg = f"{self.message}"
        if self.retry_after:
            base_msg += f" (Retry after: {self.retry_after}s)"
        return base_msg


class ValidationError(ScraperException):
    """Raised when data validation fails."""
    pass


class TimeoutError(ScraperException):
    """Raised when an operation times out."""
    
    def __init__(self, message: str, operation: str = None, timeout: float = None, details: dict = None):
        super().__init__(message, details)
        self.operation = operation
        self.timeout = timeout
    
    def __str__(self):
        base_msg = f"{self.message}"
        if self.operation:
            base_msg += f" (Operation: {self.operation})"
        if self.timeout:
            base_msg += f" (Timeout: {self.timeout}s)"
        return base_msg


class NetworkError(ScraperException):
    """Raised when network-related errors occur."""
    pass


class ProxyError(NetworkError):
    """Raised when proxy connection fails."""
    pass


class CaptchaDetectedError(ScraperException):
    """Raised when a CAPTCHA is detected."""
    pass


class JavaScriptError(ScraperException):
    """Raised when JavaScript execution fails."""
    pass
