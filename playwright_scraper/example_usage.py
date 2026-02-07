#!/usr/bin/env python3
"""
Example usage of the PlaywrightScraper class.

This file demonstrates how to use the scraper programmatically
without using the CLI.
"""

import asyncio
from scraper import PlaywrightScraper, ScrapingConfig


async def example_basic_usage():
    """Example: Basic scraping without authentication."""
    config = ScrapingConfig(
        url="https://example.com/data",
        headless=True,
        max_pages=5,
        output_dir="./output",
        log_dir="./logs"
    )
    
    async with PlaywrightScraper(config) as scraper:
        data = await scraper.scrape()
        print(f"Collected {len(data)} items")


async def example_with_login():
    """Example: Scraping with login authentication."""
    config = ScrapingConfig(
        url="https://example.com/login",
        username="your_username",
        password="your_password",
        headless=False,  # Show browser for debugging
        login_username_selector="input[name='email']",
        login_password_selector="input[name='password']",
        login_button_selector="button[type='submit']",
        max_pages=10,
        output_dir="./output",
        log_dir="./logs",
        log_level="DEBUG"
    )
    
    async with PlaywrightScraper(config) as scraper:
        data = await scraper.scrape()
        print(f"Collected {len(data)} items")


async def example_custom_selectors():
    """Example: Using custom CSS selectors for specific website structure."""
    config = ScrapingConfig(
        url="https://news.example.com/articles",
        headless=True,
        # Custom selectors for a news website
        data_container_selector=".article-list",
        item_selector="article.news-item",
        next_page_selector=".pagination .next",
        max_pages=20,
        block_images=True,  # Speed up scraping by blocking images
        output_dir="./news_output"
    )
    
    async with PlaywrightScraper(config) as scraper:
        data = await scraper.scrape()
        
        # Custom processing
        for item in data:
            print(f"Title: {item.title}")
            print(f"URL: {item.url}")
            print("-" * 50)


async def example_advanced_request_interception():
    """Example: Advanced request interception and filtering."""
    import re
    
    config = ScrapingConfig(
        url="https://example.com/data",
        headless=True,
        # Block ads and tracking
        blocked_urls=[
            re.compile(r"google-analytics\\.com"),
            re.compile(r"doubleclick\\.net"),
            re.compile(r"facebook\\.com/tr"),
        ],
        # Only allow API calls from specific domain
        allowed_urls=[
            re.compile(r"api\\.example\\.com"),
            re.compile(r"example\\.com"),
        ],
        block_images=True,
        block_stylesheets=False,
        output_dir="./filtered_output"
    )
    
    async with PlaywrightScraper(config) as scraper:
        data = await scraper.scrape()
        print(f"Collected {len(data)} items with filtered requests")


async def example_manual_data_extraction():
    """Example: Manual data extraction with custom logic."""
    config = ScrapingConfig(
        url="https://example.com/products",
        headless=True,
        max_pages=3
    )
    
    scraper = PlaywrightScraper(config)
    await scraper.initialize()
    
    try:
        # Navigate manually
        await scraper.navigate(config.url)
        
        # Custom extraction logic
        page = scraper.page
        
        # Wait for specific element
        await page.wait_for_selector(".product-grid", state="visible")
        
        # Extract with custom JavaScript evaluation
        products = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.product-item');
                return Array.from(items).map(item => ({
                    name: item.querySelector('.product-name')?.textContent?.trim() || '',
                    price: item.querySelector('.product-price')?.textContent?.trim() || '',
                    rating: item.querySelector('.product-rating')?.dataset?.rating || '0'
                }));
            }
        """)
        
        print(f"Found {len(products)} products")
        for product in products:
            print(f"  - {product['name']}: {product['price']} (Rating: {product['rating']})")
            
    finally:
        await scraper.cleanup()


async def example_error_handling():
    """Example: Proper error handling and retries."""
    config = ScrapingConfig(
        url="https://unreliable-site.com/data",
        headless=True,
        max_retries=5,  # More retries for unreliable site
        base_delay=2.0,  # Longer initial delay
        max_pages=1
    )
    
    try:
        async with PlaywrightScraper(config) as scraper:
            data = await scraper.scrape()
            print(f"Success! Collected {len(data)} items")
    except Exception as e:
        print(f"Scraping failed after all retries: {e}")


async def main():
    """Run all examples."""
    print("=" * 60)
    print("Playwright Scraper - Example Usage")
    print("=" * 60)
    
    # Uncomment the example you want to run:
    
    # await example_basic_usage()
    # await example_with_login()
    # await example_custom_selectors()
    # await example_advanced_request_interception()
    # await example_manual_data_extraction()
    # await example_error_handling()
    
    print("\nExamples defined. Uncomment the ones you want to run.")
    print("Make sure to install dependencies: pip install -r requirements.txt")
    print("And install Playwright browsers: playwright install")


if __name__ == "__main__":
    asyncio.run(main())
