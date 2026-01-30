"""Tests for custom exceptions."""

import pytest

from playwright_scraper.exceptions import (
    AuthenticationError,
    ConfigurationError,
    ElementNotFoundError,
    NavigationError,
    PaginationError,
    RateLimitError,
    ScraperException,
    TimeoutError,
)


class TestScraperException:
    """Test cases for base ScraperException."""
    
    def test_basic_exception(self):
        """Test basic exception creation."""
        exc = ScraperException("Test error")
        assert str(exc) == "Test error"
        assert exc.message == "Test error"
        assert exc.details == {}
    
    def test_exception_with_details(self):
        """Test exception with details."""
        details = {"key": "value", "number": 42}
        exc = ScraperException("Test error", details=details)
        
        assert "Test error" in str(exc)
        assert "key" in str(exc)
        assert exc.details == details


class TestNavigationError:
    """Test cases for NavigationError."""
    
    def test_basic_navigation_error(self):
        """Test basic navigation error."""
        exc = NavigationError("Failed to navigate")
        assert "Failed to navigate" in str(exc)
    
    def test_navigation_error_with_url(self):
        """Test navigation error with URL."""
        exc = NavigationError(
            "Failed to navigate",
            url="https://example.com",
            status_code=404
        )
        
        assert "https://example.com" in str(exc)
        assert "404" in str(exc)
        assert exc.url == "https://example.com"
        assert exc.status_code == 404


class TestAuthenticationError:
    """Test cases for AuthenticationError."""
    
    def test_basic_auth_error(self):
        """Test basic authentication error."""
        exc = AuthenticationError("Login failed")
        assert "Login failed" in str(exc)
    
    def test_auth_error_with_username(self):
        """Test authentication error with username."""
        exc = AuthenticationError(
            "Login failed",
            username="test_user"
        )
        
        assert "test_user" in str(exc)
        assert exc.username == "test_user"


class TestElementNotFoundError:
    """Test cases for ElementNotFoundError."""
    
    def test_basic_element_error(self):
        """Test basic element not found error."""
        exc = ElementNotFoundError("Element not found")
        assert "Element not found" in str(exc)
    
    def test_element_error_with_selector(self):
        """Test element error with selector."""
        exc = ElementNotFoundError(
            "Element not found",
            selector=".my-class",
            timeout=10.0
        )
        
        assert ".my-class" in str(exc)
        assert "10.0s" in str(exc)
        assert exc.selector == ".my-class"
        assert exc.timeout == 10.0


class TestPaginationError:
    """Test cases for PaginationError."""
    
    def test_basic_pagination_error(self):
        """Test basic pagination error."""
        exc = PaginationError("Pagination failed")
        assert "Pagination failed" in str(exc)
    
    def test_pagination_error_with_page(self):
        """Test pagination error with current page."""
        exc = PaginationError(
            "Failed to navigate to next page",
            current_page=5
        )
        
        assert "5" in str(exc)
        assert exc.current_page == 5


class TestRateLimitError:
    """Test cases for RateLimitError."""
    
    def test_basic_rate_limit_error(self):
        """Test basic rate limit error."""
        exc = RateLimitError("Rate limit exceeded")
        assert "Rate limit exceeded" in str(exc)
    
    def test_rate_limit_error_with_retry(self):
        """Test rate limit error with retry after."""
        exc = RateLimitError(
            "Rate limit exceeded",
            retry_after=60
        )
        
        assert "60s" in str(exc)
        assert exc.retry_after == 60


class TestTimeoutError:
    """Test cases for TimeoutError."""
    
    def test_basic_timeout_error(self):
        """Test basic timeout error."""
        exc = TimeoutError("Operation timed out")
        assert "Operation timed out" in str(exc)
    
    def test_timeout_error_with_details(self):
        """Test timeout error with operation details."""
        exc = TimeoutError(
            "Operation timed out",
            operation="navigation",
            timeout=30.0
        )
        
        assert "navigation" in str(exc)
        assert "30.0s" in str(exc)
        assert exc.operation == "navigation"
        assert exc.timeout == 30.0


class TestExceptionHierarchy:
    """Test cases for exception hierarchy."""
    
    def test_all_exceptions_inherit_from_base(self):
        """Test that all custom exceptions inherit from ScraperException."""
        exceptions = [
            ConfigurationError("test"),
            AuthenticationError("test"),
            ElementNotFoundError("test"),
            NavigationError("test"),
            PaginationError("test"),
            RateLimitError("test"),
            TimeoutError("test"),
        ]
        
        for exc in exceptions:
            assert isinstance(exc, ScraperException)
    
    def test_catch_all_with_base_exception(self):
        """Test that all exceptions can be caught with base exception."""
        exceptions_to_raise = [
            lambda: (_ for _ in ()).throw(ConfigurationError("test")),
            lambda: (_ for _ in ()).throw(AuthenticationError("test")),
            lambda: (_ for _ in ()).throw(ElementNotFoundError("test")),
        ]
        
        for raise_exc in exceptions_to_raise:
            with pytest.raises(ScraperException):
                try:
                    raise_exc()
                except ScraperException:
                    raise
