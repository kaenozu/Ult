"""Tests for the main scraper functionality."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from playwright_scraper.config import ScrapingConfig
from playwright_scraper.exceptions import ElementNotFoundError, NavigationError
from playwright_scraper.scraper import (
    PlaywrightScraper,
    ScrapedItem,
    intercept_request,
    retry_with_backoff,
    setup_logging,
)


class TestScrapedItem:
    """Test cases for ScrapedItem dataclass."""
    
    def test_scraped_item_creation(self):
        """Test creating a ScrapedItem."""
        item = ScrapedItem(
            title="Test Title",
            url="https://example.com",
            content="Test content",
        )
        
        assert item.title == "Test Title"
        assert item.url == "https://example.com"
        assert item.content == "Test content"
        assert item.timestamp is not None
        assert item.metadata == {}
    
    def test_scraped_item_to_dict(self):
        """Test converting ScrapedItem to dictionary."""
        item = ScrapedItem(
            title="Test",
            url="https://example.com",
            content="Content",
            metadata={"key": "value"},
        )
        
        data = item.to_dict()
        
        assert data["title"] == "Test"
        assert data["url"] == "https://example.com"
        assert data["content"] == "Content"
        assert data["metadata"] == {"key": "value"}


class TestSetupLogging:
    """Test cases for logging setup."""
    
    def test_setup_logging_creates_handlers(self, temp_dir: Path):
        """Test that logging setup creates file and console handlers."""
        config = ScrapingConfig(
            url="https://example.com",
            log_dir=str(temp_dir / "logs"),
            log_level="DEBUG",
        )
        
        logger = setup_logging(config)
        
        assert len(logger.handlers) == 2  # File and console handlers
        assert logger.level == 10  # DEBUG level
    
    def test_setup_logging_creates_log_directory(self, temp_dir: Path):
        """Test that logging setup creates log directory."""
        log_dir = temp_dir / "new_logs"
        config = ScrapingConfig(
            url="https://example.com",
            log_dir=str(log_dir),
        )
        
        setup_logging(config)
        
        assert log_dir.exists()


class TestRetryWithBackoff:
    """Test cases for retry decorator."""
    
    @pytest.mark.asyncio
    async def test_retry_success_on_first_attempt(self):
        """Test that successful function doesn't retry."""
        mock_func = AsyncMock(return_value="success")
        
        @retry_with_backoff(max_retries=3, base_delay=0.1)
        async def test_func():
            return await mock_func()
        
        result = await test_func()
        
        assert result == "success"
        assert mock_func.call_count == 1
    
    @pytest.mark.asyncio
    async def test_retry_on_failure(self):
        """Test that function retries on failure."""
        mock_func = AsyncMock(
            side_effect=[Exception("Error 1"), Exception("Error 2"), "success"]
        )
        
        @retry_with_backoff(max_retries=3, base_delay=0.01)
        async def test_func():
            return await mock_func()
        
        result = await test_func()
        
        assert result == "success"
        assert mock_func.call_count == 3
    
    @pytest.mark.asyncio
    async def test_retry_exhausted(self):
        """Test that exception is raised after max retries."""
        mock_func = AsyncMock(side_effect=Exception("Persistent error"))
        
        @retry_with_backoff(max_retries=2, base_delay=0.01)
        async def test_func():
            return await mock_func()
        
        with pytest.raises(Exception, match="Persistent error"):
            await test_func()
        
        assert mock_func.call_count == 3  # Initial + 2 retries


class TestInterceptRequest:
    """Test cases for request interception."""
    
    @pytest.mark.asyncio
    async def test_block_images(self):
        """Test blocking image requests."""
        mock_route = AsyncMock()
        mock_request = Mock()
        mock_request.url = "https://example.com/image.png"
        mock_request.resource_type = "image"
        
        config = ScrapingConfig(
            url="https://example.com",
            block_images=True,
        )
        
        await intercept_request(mock_route, mock_request, config)
        
        mock_route.abort.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_allow_request(self):
        """Test allowing normal requests."""
        mock_route = AsyncMock()
        mock_request = Mock()
        mock_request.url = "https://example.com/page"
        mock_request.resource_type = "document"
        
        config = ScrapingConfig(
            url="https://example.com",
            block_images=False,
        )
        
        await intercept_request(mock_route, mock_request, config)
        
        mock_route.continue_.assert_called_once()


class TestPlaywrightScraper:
    """Test cases for PlaywrightScraper class."""
    
    @pytest.fixture
    def scraper(self, sample_config: ScrapingConfig):
        """Create a scraper instance with mocked browser."""
        with patch("playwright_scraper.scraper.async_playwright") as mock_playwright:
            scraper = PlaywrightScraper(sample_config)
            # Don't initialize browser for unit tests
            scraper._playwright = Mock()
            scraper.browser = Mock()
            scraper.context = Mock()
            scraper.page = Mock()
            return scraper
    
    @pytest.mark.asyncio
    async def test_initialize(self, sample_config: ScrapingConfig):
        """Test browser initialization."""
        with patch("playwright_scraper.scraper.async_playwright") as mock_playwright:
            mock_playwright_obj = Mock()
            mock_playwright_obj.start = AsyncMock(return_value=mock_playwright_obj)
            mock_playwright_obj.stop = AsyncMock()
            mock_playwright.return_value = mock_playwright_obj
            
            mock_browser = AsyncMock()
            mock_context = AsyncMock()
            mock_page = AsyncMock()
            
            mock_playwright_obj.chromium.launch = AsyncMock(return_value=mock_browser)
            mock_browser.new_context = AsyncMock(return_value=mock_context)
            mock_context.new_page = AsyncMock(return_value=mock_page)
            
            scraper = PlaywrightScraper(sample_config)
            await scraper.initialize()
            
            assert scraper.browser is not None
            assert scraper.context is not None
            assert scraper.page is not None
            mock_playwright_obj.chromium.launch.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_cleanup(self, scraper: PlaywrightScraper):
        """Test resource cleanup."""
        await scraper.cleanup()
        
        scraper.context.close.assert_called_once()
        scraper.browser.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_navigate_success(self, scraper: PlaywrightScraper):
        """Test successful navigation."""
        mock_response = Mock()
        mock_response.ok = True
        scraper.page.goto = AsyncMock(return_value=mock_response)
        
        await scraper.navigate("https://example.com")
        
        scraper.page.goto.assert_called_once_with(
            "https://example.com",
            wait_until="networkidle",
            timeout=30000,
        )
    
    @pytest.mark.asyncio
    async def test_navigate_failure(self, scraper: PlaywrightScraper):
        """Test navigation failure."""
        mock_response = Mock()
        mock_response.ok = False
        mock_response.status = 404
        scraper.page.goto = AsyncMock(return_value=mock_response)
        
        with pytest.raises(Exception):
            await scraper.navigate("https://example.com")
    
    @pytest.mark.asyncio
    async def test_login_success(self, scraper: PlaywrightScraper):
        """Test successful login."""
        scraper.config.username = "test_user"
        scraper.config.password = "test_pass"
        
        scraper.page.wait_for_selector = AsyncMock()
        scraper.page.fill = AsyncMock()
        scraper.page.click = AsyncMock()
        scraper.page.wait_for_load_state = AsyncMock()
        
        result = await scraper.login()
        
        assert result is True
        scraper.page.fill.assert_any_call(
            scraper.config.login_username_selector,
            "test_user"
        )
        scraper.page.fill.assert_any_call(
            scraper.config.login_password_selector,
            "test_pass"
        )
    
    @pytest.mark.asyncio
    async def test_login_no_credentials(self, scraper: PlaywrightScraper):
        """Test login with no credentials."""
        scraper.config.username = ""
        scraper.config.password = ""
        
        result = await scraper.login()
        
        assert result is True  # Skips login
    
    def test_save_to_json(self, scraper: PlaywrightScraper, temp_dir: Path, mock_scraped_items):
        """Test saving data to JSON."""
        scraper.config.output_dir = str(temp_dir / "output")
        
        filepath = scraper.save_to_json(mock_scraped_items, "test.json")
        
        assert Path(filepath).exists()
        
        with open(filepath) as f:
            data = json.load(f)
        
        assert len(data) == 3
        assert data[0]["title"] == "Item 1"
    
    def test_save_to_csv(self, scraper: PlaywrightScraper, temp_dir: Path, mock_scraped_items):
        """Test saving data to CSV."""
        import csv
        
        scraper.config.output_dir = str(temp_dir / "output")
        
        filepath = scraper.save_to_csv(mock_scraped_items, "test.csv")
        
        assert Path(filepath).exists()
        
        with open(filepath, newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        assert len(rows) == 3
        assert rows[0]["title"] == "Item 1"
    
    def test_save_empty_data(self, scraper: PlaywrightScraper, temp_dir: Path):
        """Test saving empty data."""
        scraper.config.output_dir = str(temp_dir / "output")
        
        filepath = scraper.save_to_json([], "empty.json")
        
        assert Path(filepath).exists()
        
        with open(filepath) as f:
            data = json.load(f)
        
        assert data == []
