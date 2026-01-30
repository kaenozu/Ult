# Playwright Web Scraper

A robust Python web scraper built with Playwright, featuring login automation, pagination handling, retry logic with exponential backoff, and data export to JSON/CSV formats.

## Features

- 🔐 **Login Automation**: Automatic login with configurable selectors
- 🔄 **Pagination Handling**: Automatically navigate through multiple pages
- 🛡️ **Retry Logic**: Exponential backoff for transient failures
- 📊 **Data Export**: Save data to both JSON and CSV formats
- 📝 **Rotating Logs**: Automatic log rotation with configurable size limits
- 🎛️ **CLI Interface**: Full command-line interface with argparse
- 🌐 **Request Interception**: Block images, stylesheets, or specific URLs
- 🖥️ **Viewport Configuration**: Customizable browser viewport dimensions

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Playwright browsers:
```bash
playwright install
```

## Usage

### Command Line Interface

Basic usage:
```bash
python scraper.py --url https://example.com/data
```

With login:
```bash
python scraper.py --url https://example.com/login \
  --username myuser \
  --password mypass
```

Advanced options:
```bash
python scraper.py --url https://example.com/data \
  --headless \
  --viewport 1920x1080 \
  --max-pages 20 \
  --block-images \
  --block-stylesheets \
  --output-dir ./my_output \
  --log-level DEBUG
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | Target URL to scrape (required) | - |
| `--username, -u` | Username for login | - |
| `--password, -p` | Password for login | - |
| `--headless` | Run browser in headless mode | False |
| `--viewport` | Viewport dimensions (WIDTHxHEIGHT) | 1920x1080 |
| `--item-selector` | CSS selector for data items | `.item, .data-row` |
| `--container-selector` | CSS selector for data container | `.data-container` |
| `--next-page-selector` | CSS selector for next page button | `.next-page` |
| `--max-pages` | Maximum pages to scrape | 10 |
| `--block-images` | Block image requests | False |
| `--block-stylesheets` | Block CSS requests | False |
| `--block-javascript` | Block JavaScript requests | False |
| `--output-dir` | Output directory | `./output` |
| `--json-filename` | Custom JSON filename | auto-generated |
| `--csv-filename` | Custom CSV filename | auto-generated |
| `--log-dir` | Log directory | `./logs` |
| `--log-level` | Logging level (DEBUG/INFO/WARNING/ERROR) | INFO |
| `--max-retries` | Maximum retry attempts | 3 |
| `--base-delay` | Base delay for retries (seconds) | 1.0 |

### Programmatic Usage

```python
import asyncio
from scraper import PlaywrightScraper, ScrapingConfig

async def main():
    config = ScrapingConfig(
        url="https://example.com/data",
        headless=True,
        max_pages=5,
        output_dir="./output"
    )
    
    async with PlaywrightScraper(config) as scraper:
        data = await scraper.scrape()
        print(f"Collected {len(data)} items")

asyncio.run(main())
```

See [`example_usage.py`](example_usage.py) for more detailed examples.

## Output Files

### JSON Format
```json
[
  {
    "title": "Item Title",
    "url": "https://example.com/item/1",
    "content": "Item description...",
    "timestamp": "2024-01-29T12:00:00",
    "metadata": {
      "page_url": "https://example.com/data",
      "extracted_at": "2024-01-29T12:00:00"
    }
  }
]
```

### CSV Format
```csv
title,url,content,timestamp
"Item Title","https://example.com/item/1","Description...","2024-01-29T12:00:00"
```

## Project Structure

```
playwright_scraper/
├── scraper.py           # Main scraper implementation
├── example_usage.py     # Usage examples
├── requirements.txt     # Python dependencies
├── README.md           # This file
├── output/             # Default output directory
└── logs/               # Default log directory
```

## Customization

### Custom Selectors

Modify the selectors in `ScrapingConfig` to match your target website:

```python
config = ScrapingConfig(
    url="https://example.com",
    login_username_selector="input#email",  # Custom username field
    login_password_selector="input#pass",   # Custom password field
    login_button_selector="button#login",   # Custom login button
    data_container_selector=".products",     # Custom container
    item_selector=".product-card",           # Custom item selector
    next_page_selector="a.next"              # Custom pagination
)
```

### Request Interception

Block specific URLs or resource types:

```python
import re

config = ScrapingConfig(
    url="https://example.com",
    blocked_urls=[
        re.compile(r"google-analytics\.com"),
        re.compile(r"advertising\.com"),
    ],
    block_images=True,
    block_stylesheets=True
)
```

## Logging

Logs are automatically rotated when they reach 10MB (configurable). Log files are stored in the `logs/` directory with timestamps.

Log format:
```
2024-01-29 12:00:00 - playwright_scraper - INFO - Navigating to: https://example.com
```

## Error Handling

The scraper includes comprehensive error handling:

- **Retry Logic**: Failed operations are automatically retried with exponential backoff
- **Timeout Handling**: Configurable timeouts for all operations
- **Graceful Degradation**: Individual item failures don't stop the entire scrape
- **Detailed Logging**: All errors are logged with context

## License

MIT License
