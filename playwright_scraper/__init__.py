"""
Playwright Web Scraper Package

A robust web scraping solution using Playwright with features including:
- Browser automation with login support
- Robust selectors with explicit waits
- Pagination handling
- Retry logic with exponential backoff
- Data export to JSON and CSV
- Rotating file logging
- CLI with configurable parameters
"""

import importlib.metadata

from .config import ScrapingConfig, merge_configs
from .exceptions import (
    AuthenticationError,
    BrowserError,
    CaptchaDetectedError,
    ConfigurationError,
    DataExtractionError,
    ElementNotFoundError,
    JavaScriptError,
    NavigationError,
    NetworkError,
    PaginationError,
    ProxyError,
    RateLimitError,
    ScraperException,
    StorageError,
    TimeoutError,
    ValidationError,
)
from .scraper import (
    PlaywrightScraper,
    ScrapedItem,
    intercept_request,
    retry_with_backoff,
    setup_logging,
)

# Dynamically load version from package metadata
try:
    __version__ = importlib.metadata.version("playwright-scraper")
except importlib.metadata.PackageNotFoundError:
    # Fallback version if package is not installed
    __version__ = "1.0.0"
__all__ = [
    # Core classes
    "PlaywrightScraper",
    "ScrapedItem",
    "ScrapingConfig",
    # Utilities
    "retry_with_backoff",
    "setup_logging",
    "intercept_request",
    "merge_configs",
    # Exceptions
    "ScraperException",
    "ConfigurationError",
    "BrowserError",
    "NavigationError",
    "AuthenticationError",
    "ElementNotFoundError",
    "DataExtractionError",
    "PaginationError",
    "StorageError",
    "RateLimitError",
    "ValidationError",
    "TimeoutError",
    "NetworkError",
    "ProxyError",
    "CaptchaDetectedError",
    "JavaScriptError",
]
