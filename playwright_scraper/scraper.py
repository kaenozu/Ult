#!/usr/bin/env python3
"""
Playwright Web Scraper

A robust web scraper using Playwright with the following features:
- Browser automation with login support
- Robust selectors with explicit waits
- Pagination handling
- Retry logic with exponential backoff
- Data export to JSON and CSV
- Rotating file logging
- CLI with configurable parameters
"""

import argparse
import asyncio
import csv
import json
import logging
import random
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Pattern, Tuple, Union

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    Request,
    Route,
    async_playwright,
)

from .config import ScrapingConfig


# =============================================================================
# Data Models
# =============================================================================

@dataclass
class ScrapedItem:
    """Represents a single scraped data item."""
    
    title: str = ""
    url: str = ""
    content: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


# =============================================================================
# Logging Setup
# =============================================================================

def setup_logging(config: ScrapingConfig) -> logging.Logger:
    """
    Set up rotating file handler logging.
    
    Args:
        config: Scraping configuration
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger("playwright_scraper")
    logger.setLevel(getattr(logging, config.log_level.upper()))
    
    # Clear only our module's handlers to avoid affecting other loggers
    # This prevents clearing root logger handlers which could affect other libraries
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create log directory
    log_dir = Path(config.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Rotating file handler
    log_file = log_dir / f"scraper_{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=config.log_max_bytes,
        backupCount=config.log_backup_count,
        encoding="utf-8"
    )
    file_handler.setLevel(getattr(logging, config.log_level.upper()))
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


# =============================================================================
# Retry Decorator with Exponential Backoff
# =============================================================================

def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: Tuple[type, ...] = (Exception,)
):
    """
    Decorator for retrying async functions with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries in seconds
        max_delay: Maximum delay between retries in seconds
        exceptions: Tuple of exception types to catch and retry
    """
    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs):
            logger = logging.getLogger("playwright_scraper")
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        logger.error(
                            f"Failed after {max_retries + 1} attempts: {func.__name__}"
                        )
                        raise
                    
                    # Calculate delay with jitter
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    jitter = random.uniform(0, 0.1 * delay)
                    total_delay = delay + jitter
                    
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_retries + 1} failed for {func.__name__}: {e}. "
                        f"Retrying in {total_delay:.2f}s..."
                    )
                    
                    await asyncio.sleep(total_delay)
            
            return None  # Should never reach here
        
        return wrapper
    return decorator


# =============================================================================
# Request Interception
# =============================================================================

async def intercept_request(route: Route, request: Request, config: ScrapingConfig) -> None:
    """
    Intercept and filter network requests.
    
    Args:
        route: Playwright route object
        request: Playwright request object
        config: Scraping configuration
    """
    url = request.url
    resource_type = request.resource_type
    
    # Check blocked URLs
    for pattern in config.blocked_urls:
        if pattern.search(url):
            await route.abort()
            return
    
    # Check allowed URLs (if specified, only allow matching URLs)
    if config.allowed_urls:
        allowed = any(pattern.search(url) for pattern in config.allowed_urls)
        if not allowed:
            await route.abort()
            return
    
    # Block by resource type
    if config.block_images and resource_type == "image":
        await route.abort()
        return
    
    if config.block_stylesheets and resource_type == "stylesheet":
        await route.abort()
        return
    
    if config.block_javascript and resource_type == "script":
        await route.abort()
        return
    
    await route.continue_()


# =============================================================================
# Main Scraper Class
# =============================================================================

class PlaywrightScraper:
    """
    Main scraper class using Playwright for browser automation.
    """
    
    def __init__(self, config: ScrapingConfig):
        """
        Initialize the scraper with configuration.
        
        Args:
            config: Scraping configuration
        """
        self.config = config
        self.logger = setup_logging(config)
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.scraped_data: List[ScrapedItem] = []
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.cleanup()
    
    async def initialize(self) -> None:
        """Initialize browser and context."""
        self.logger.info("Initializing Playwright scraper...")
        
        playwright = await async_playwright().start()
        self._playwright = playwright
        
        # Launch browser
        self.browser = await playwright.chromium.launch(
            headless=self.config.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
            ]
        )
        
        # Create context with viewport
        self.context = await self.browser.new_context(
            viewport={
                "width": self.config.viewport_width,
                "height": self.config.viewport_height
            },
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        # Create page
        self.page = await self.context.new_page()
        
        # Set up request interception if needed
        if (self.config.block_images or self.config.block_stylesheets or 
            self.config.block_javascript or self.config.blocked_urls or 
            self.config.allowed_urls):
            await self.page.route("**/*", lambda route, request: 
                asyncio.create_task(intercept_request(route, request, self.config)))
        
        self.logger.info("Browser initialized successfully")
    
    async def cleanup(self) -> None:
        """Clean up browser resources."""
        self.logger.info("Cleaning up resources...")
        
        if self.context:
            await self.context.close()
        
        if self.browser:
            await self.browser.close()
        
        if hasattr(self, '_playwright'):
            await self._playwright.stop()
        
        self.logger.info("Cleanup completed")
    
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    async def navigate(self, url: str) -> None:
        """
        Navigate to a URL with retry logic.
        
        Args:
            url: URL to navigate to
        """
        self.logger.info(f"Navigating to: {url}")
        
        if not self.page:
            raise RuntimeError("Browser not initialized")
        
        response = await self.page.goto(
            url,
            wait_until="networkidle",
            timeout=30000
        )
        
        if response and response.ok:
            self.logger.info(f"Successfully loaded: {url}")
        else:
            status = response.status if response else "No response"
            raise RuntimeError(f"Failed to load page: {url} (Status: {status})")
    
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    async def login(self) -> bool:
        """
        Perform login with provided credentials.
        
        Returns:
            True if login successful, False otherwise
        """
        if not self.config.username or not self.config.password:
            self.logger.info("No credentials provided, skipping login")
            return True
        
        self.logger.info("Attempting login...")
        
        if not self.page:
            raise RuntimeError("Browser not initialized")
        
        try:
            # Wait for and fill username
            await self.page.wait_for_selector(
                self.config.login_username_selector,
                state="visible",
                timeout=10000
            )
            await self.page.fill(
                self.config.login_username_selector,
                self.config.username
            )
            self.logger.debug("Username filled")
            
            # Fill password
            await self.page.fill(
                self.config.login_password_selector,
                self.config.password
            )
            self.logger.debug("Password filled")
            
            # Click login button
            await self.page.click(self.config.login_button_selector)
            self.logger.debug("Login button clicked")
            
            # Wait for navigation or success indicator
            await self.page.wait_for_load_state("networkidle", timeout=30000)
            
            # Check for login errors (customize based on your target site)
            error_selectors = [
                ".error-message",
                ".login-error",
                "[data-testid='login-error']"
            ]
            
            for selector in error_selectors:
                try:
                    error_elem = await self.page.wait_for_selector(
                        selector,
                        state="visible",
                        timeout=2000
                    )
                    if error_elem:
                        error_text = await error_elem.text_content()
                        self.logger.error(f"Login failed: {error_text}")
                        return False
                except:
                    pass
            
            self.logger.info("Login successful")
            return True
            
        except Exception as e:
            self.logger.error(f"Login error: {e}")
            raise
    
    async def extract_data_from_page(self) -> List[ScrapedItem]:
        """
        Extract data from the current page.
        
        Returns:
            List of scraped items
        """
        if not self.page:
            raise RuntimeError("Browser not initialized")
        
        items: List[ScrapedItem] = []
        
        try:
            # Wait for data container
            await self.page.wait_for_selector(
                self.config.data_container_selector,
                state="visible",
                timeout=10000
            )
            
            # Extract items
            elements = await self.page.query_selector_all(self.config.item_selector)
            
            for elem in elements:
                try:
                    # Extract data from each element
                    # Customize these selectors based on your target site
                    title_elem = await elem.query_selector("h2, h3, .title, [data-testid='title']")
                    content_elem = await elem.query_selector("p, .description, [data-testid='description']")
                    link_elem = await elem.query_selector("a")
                    
                    title = await title_elem.text_content() if title_elem else ""
                    content = await content_elem.text_content() if content_elem else ""
                    url = await link_elem.get_attribute("href") if link_elem else ""
                    
                    # Clean up extracted text
                    title = title.strip() if title else ""
                    content = content.strip() if content else ""
                    
                    item = ScrapedItem(
                        title=title,
                        url=url,
                        content=content,
                        metadata={
                            "page_url": self.page.url,
                            "extracted_at": datetime.now().isoformat()
                        }
                    )
                    items.append(item)
                    
                except Exception as e:
                    self.logger.warning(f"Error extracting item: {e}")
                    continue
            
            self.logger.info(f"Extracted {len(items)} items from page")
            
        except Exception as e:
            self.logger.error(f"Error extracting data: {e}")
        
        return items
    
    async def handle_pagination(self) -> List[ScrapedItem]:
        """
        Handle pagination and collect data from all pages.
        
        Returns:
            Combined list of scraped items from all pages
        """
        all_items: List[ScrapedItem] = []
        current_page = 1
        
        while current_page <= self.config.max_pages:
            self.logger.info(f"Processing page {current_page}/{self.config.max_pages}")
            
            # Extract data from current page
            items = await self.extract_data_from_page()
            all_items.extend(items)
            
            # Check for next page
            try:
                next_button = await self.page.wait_for_selector(
                    self.config.next_page_selector,
                    state="visible",
                    timeout=5000
                )
                
                if not next_button:
                    self.logger.info("No more pages available")
                    break
                
                # Check if next button is disabled
                is_disabled = await next_button.is_disabled()
                if is_disabled:
                    self.logger.info("Next page button is disabled")
                    break
                
                # Click next page
                await next_button.click()
                await self.page.wait_for_load_state("networkidle")
                
                # Wait a moment for content to stabilize
                await asyncio.sleep(1)
                
                current_page += 1
                
            except Exception as e:
                self.logger.info(f"Pagination ended: {e}")
                break
        
        self.logger.info(f"Total items collected: {len(all_items)}")
        return all_items
    
    def save_to_json(self, data: List[ScrapedItem], filename: Optional[str] = None) -> str:
        """
        Save scraped data to JSON file.
        
        Args:
            data: List of scraped items
            filename: Optional custom filename
            
        Returns:
            Path to saved file
        """
        output_dir = Path(self.config.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"scraped_data_{timestamp}.json"
        
        filepath = output_dir / filename
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(
                [item.to_dict() for item in data],
                f,
                indent=2,
                ensure_ascii=False
            )
        
        self.logger.info(f"Data saved to JSON: {filepath}")
        return str(filepath)
    
    def save_to_csv(self, data: List[ScrapedItem], filename: Optional[str] = None) -> str:
        """
        Save scraped data to CSV file.
        
        Args:
            data: List of scraped items
            filename: Optional custom filename
            
        Returns:
            Path to saved file
        """
        output_dir = Path(self.config.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"scraped_data_{timestamp}.csv"
        
        filepath = output_dir / filename
        
        if not data:
            self.logger.warning("No data to save to CSV")
            return str(filepath)
        
        # Flatten metadata for CSV
        fieldnames = ["title", "url", "content", "timestamp"]
        
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for item in data:
                row = {
                    "title": item.title,
                    "url": item.url,
                    "content": item.content,
                    "timestamp": item.timestamp
                }
                writer.writerow(row)
        
        self.logger.info(f"Data saved to CSV: {filepath}")
        return str(filepath)
    
    async def scrape(self) -> List[ScrapedItem]:
        """
        Main scraping workflow.
        
        Returns:
            List of all scraped items
        """
        self.logger.info("Starting scraping session...")
        
        try:
            # Navigate to target URL
            await self.navigate(self.config.url)
            
            # Perform login if credentials provided
            if self.config.username and self.config.password:
                login_success = await self.login()
                if not login_success:
                    self.logger.error("Login failed, aborting scrape")
                    return []
            
            # Handle pagination and collect data
            self.scraped_data = await self.handle_pagination()
            
            # Save data
            if self.scraped_data:
                self.save_to_json(self.scraped_data, self.config.json_filename)
                self.save_to_csv(self.scraped_data, self.config.csv_filename)
            
            self.logger.info("Scraping session completed successfully")
            
        except Exception as e:
            self.logger.error(f"Scraping session failed: {e}")
            raise
        
        return self.scraped_data


# =============================================================================
# CLI Argument Parser
# =============================================================================

def create_argument_parser() -> argparse.ArgumentParser:
    """
    Create and configure the argument parser.
    
    Returns:
        Configured ArgumentParser instance
    """
    parser = argparse.ArgumentParser(
        description="Playwright Web Scraper - Automated data extraction tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --url https://example.com/data
  %(prog)s --url https://example.com/login --username user --password pass
  %(prog)s --url https://example.com --headless --viewport 1920x1080
  %(prog)s --url https://example.com --block-images --block-stylesheets
        """
    )
    
    # Required arguments
    parser.add_argument(
        "--url",
        type=str,
        required=True,
        help="Target URL to scrape"
    )
    
    # Authentication
    auth_group = parser.add_argument_group("Authentication")
    auth_group.add_argument(
        "--username",
        "-u",
        type=str,
        default="",
        help="Username for login"
    )
    auth_group.add_argument(
        "--password",
        "-p",
        type=str,
        default=os.environ.get("SCRAPER_PASSWORD", ""),
        help="Password for login (or set SCRAPER_PASSWORD env var)"
    )
    
    # Browser settings
    browser_group = parser.add_argument_group("Browser Settings")
    browser_group.add_argument(
        "--headless",
        action="store_true",
        help="Run browser in headless mode (default: False)"
    )
    browser_group.add_argument(
        "--viewport",
        type=str,
        default="1920x1080",
        help="Viewport dimensions (format: WIDTHxHEIGHT, default: 1920x1080)"
    )
    
    # Selectors
    selector_group = parser.add_argument_group("Selectors")
    selector_group.add_argument(
        "--item-selector",
        type=str,
        default=".item, .data-row, [data-testid='item']",
        help="CSS selector for data items"
    )
    selector_group.add_argument(
        "--container-selector",
        type=str,
        default=".data-container, .items-list, [data-testid='items']",
        help="CSS selector for data container"
    )
    selector_group.add_argument(
        "--next-page-selector",
        type=str,
        default=".next-page, .pagination-next, [aria-label='Next page']",
        help="CSS selector for next page button"
    )
    
    # Pagination
    pagination_group = parser.add_argument_group("Pagination")
    pagination_group.add_argument(
        "--max-pages",
        type=int,
        default=10,
        help="Maximum number of pages to scrape (default: 10)"
    )
    
    # Request interception
    interception_group = parser.add_argument_group("Request Interception")
    interception_group.add_argument(
        "--block-images",
        action="store_true",
        help="Block image requests"
    )
    interception_group.add_argument(
        "--block-stylesheets",
        action="store_true",
        help="Block CSS stylesheet requests"
    )
    interception_group.add_argument(
        "--block-javascript",
        action="store_true",
        help="Block JavaScript requests"
    )
    
    # Output
    output_group = parser.add_argument_group("Output")
    output_group.add_argument(
        "--output-dir",
        type=str,
        default="./output",
        help="Output directory for scraped data (default: ./output)"
    )
    output_group.add_argument(
        "--json-filename",
        type=str,
        help="Custom filename for JSON output"
    )
    output_group.add_argument(
        "--csv-filename",
        type=str,
        help="Custom filename for CSV output"
    )
    
    # Logging
    logging_group = parser.add_argument_group("Logging")
    logging_group.add_argument(
        "--log-dir",
        type=str,
        default="./logs",
        help="Directory for log files (default: ./logs)"
    )
    logging_group.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging level (default: INFO)"
    )
    
    # Retry settings
    retry_group = parser.add_argument_group("Retry Settings")
    retry_group.add_argument(
        "--max-retries",
        type=int,
        default=3,
        help="Maximum retry attempts for failed operations (default: 3)"
    )
    retry_group.add_argument(
        "--base-delay",
        type=float,
        default=1.0,
        help="Base delay for exponential backoff in seconds (default: 1.0)"
    )
    
    return parser


def parse_viewport(viewport_str: str) -> Tuple[int, int]:
    """
    Parse viewport string into width and height.
    
    Args:
        viewport_str: String in format "WIDTHxHEIGHT"
        
    Returns:
        Tuple of (width, height)
    """
    try:
        width, height = viewport_str.lower().split("x")
        return int(width), int(height)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid viewport format: {viewport_str}. Use WIDTHxHEIGHT (e.g., 1920x1080)"
        )


def build_config_from_args(args: argparse.Namespace) -> ScrapingConfig:
    """
    Build ScrapingConfig from parsed arguments.
    
    Args:
        args: Parsed command line arguments
        
    Returns:
        ScrapingConfig instance
    """
    viewport_width, viewport_height = parse_viewport(args.viewport)
    
    return ScrapingConfig(
        url=args.url,
        username=args.username,
        password=args.password,
        headless=args.headless,
        viewport_width=viewport_width,
        viewport_height=viewport_height,
        item_selector=args.item_selector,
        data_container_selector=args.container_selector,
        next_page_selector=args.next_page_selector,
        max_pages=args.max_pages,
        block_images=args.block_images,
        block_stylesheets=args.block_stylesheets,
        block_javascript=args.block_javascript,
        output_dir=args.output_dir,
        json_filename=args.json_filename,
        csv_filename=args.csv_filename,
        log_dir=args.log_dir,
        log_level=args.log_level,
        max_retries=args.max_retries,
        base_delay=args.base_delay
    )


# =============================================================================
# Main Entry Point
# =============================================================================

async def main():
    """Main entry point for the scraper."""
    parser = create_argument_parser()
    args = parser.parse_args()
    
    # Build configuration
    config = build_config_from_args(args)
    
    # Run scraper
    async with PlaywrightScraper(config) as scraper:
        data = await scraper.scrape()
        
        if data:
            print(f"\nScraping completed successfully!")
            print(f"Total items collected: {len(data)}")
        else:
            print("\nNo data was collected.")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
