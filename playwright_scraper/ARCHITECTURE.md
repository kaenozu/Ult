# Playwright Web Scraper - Architecture Documentation

## Overview

The Playwright Web Scraper is a Python-based web scraping framework built on top of Microsoft's Playwright library. It provides a robust, configurable, and extensible solution for automated data extraction from websites.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   argparse   │  │  Config File │  │   Environment Vars   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Layer                           │
│              ┌─────────────────────────────┐                    │
│              │      ScrapingConfig         │                    │
│              │  (Validation & Defaults)    │                    │
│              └─────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Scraper Layer                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 PlaywrightScraper                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │  Browser    │  │    Page     │  │  Data Extractor │   │  │
│  │  │  Manager    │  │  Navigator  │  │                 │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │   Login     │  │ Pagination  │  │  Data Storage   │   │  │
│  │  │  Handler    │  │   Handler   │  │                 │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supporting Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    Retry     │  │   Request    │  │      Logging         │  │
│  │   Handler    │  │ Interception │  │   (Rotating File)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

### 1. Core Modules

#### `scraper.py`
The main module containing the `PlaywrightScraper` class, which is the primary interface for web scraping operations.

**Key Components:**
- `PlaywrightScraper`: Main scraper class with async context manager support
- `ScrapedItem`: Data class for representing scraped items
- `retry_with_backoff`: Decorator for implementing retry logic
- `setup_logging`: Function for configuring rotating file logging
- `intercept_request`: Function for request interception

#### `config.py`
Configuration management module supporting multiple sources and formats.

**Key Components:**
- `ScrapingConfig`: Dataclass with validation for all configuration options
- Configuration loaders for JSON, YAML, and environment variables
- `merge_configs`: Function for merging multiple configurations

#### `exceptions.py`
Custom exception hierarchy for precise error handling.

**Exception Hierarchy:**
```
ScraperException (base)
├── ConfigurationError
├── BrowserError
├── NavigationError
├── AuthenticationError
├── ElementNotFoundError
├── DataExtractionError
├── PaginationError
├── StorageError
├── RateLimitError
├── ValidationError
├── TimeoutError
├── NetworkError
│   └── ProxyError
├── CaptchaDetectedError
└── JavaScriptError
```

### 2. Supporting Files

#### `example_usage.py`
Comprehensive examples demonstrating various usage patterns:
- Basic scraping
- Authentication
- Custom selectors
- Request interception
- Manual data extraction
- Error handling

#### `pyproject.toml`
Project configuration including:
- Build system configuration
- Project metadata
- Dependencies
- Development tools configuration (black, isort, mypy, pytest)

## Design Patterns

### 1. Async/Await Pattern
The scraper uses Python's `asyncio` for concurrent operations:
```python
async with PlaywrightScraper(config) as scraper:
    data = await scraper.scrape()
```

### 2. Context Manager Pattern
Resources are managed using async context managers for proper cleanup:
```python
async def __aenter__(self):
    await self.initialize()
    return self

async def __aexit__(self, exc_type, exc_val, exc_tb):
    await self.cleanup()
```

### 3. Decorator Pattern
Retry logic is implemented as a decorator:
```python
@retry_with_backoff(max_retries=3, base_delay=1.0)
async def navigate(self, url: str) -> None:
    ...
```

### 4. Strategy Pattern
Configuration can be loaded from multiple sources (JSON, YAML, env vars) using a common interface.

### 5. Dataclass Pattern
Configuration and data models use Python dataclasses for clean, type-safe definitions.

## Data Flow

```
1. Configuration Loading
   CLI Args → Config File → Environment Vars → ScrapingConfig

2. Initialization
   ScrapingConfig → PlaywrightScraper.initialize() → Browser/Context/Page

3. Scraping Process
   Navigate → Login (if needed) → Extract Data → Handle Pagination → Store Data

4. Cleanup
   Close Page → Close Context → Close Browser
```

## Error Handling Strategy

### 1. Exception Hierarchy
Specific exceptions allow granular error handling:
```python
try:
    await scraper.scrape()
except AuthenticationError:
    # Handle login failure
except NavigationError:
    # Handle page load failure
except ElementNotFoundError:
    # Handle missing elements
```

### 2. Retry Logic
Transient failures are automatically retried with exponential backoff:
- Base delay: 1.0s
- Max delay: 60.0s
- Jitter: 0-10% of delay

### 3. Graceful Degradation
Individual item extraction failures don't stop the entire scraping process.

## Configuration Priority

Configuration values are resolved in the following priority (highest to lowest):

1. Command-line arguments
2. Environment variables (SCRAPER_*)
3. Configuration file (JSON/YAML)
4. Default values in `ScrapingConfig`

## Testing Strategy

### Unit Tests
- Test individual components in isolation
- Mock external dependencies (Playwright)
- Test configuration validation
- Test exception handling

### Integration Tests
- Test with real browser instances
- Test against actual websites (in CI)
- Test Docker container builds

### Test Organization
```
tests/
├── conftest.py          # Shared fixtures
├── test_config.py       # Configuration tests
├── test_exceptions.py   # Exception tests
└── test_scraper.py      # Main scraper tests
```

## Security Considerations

### 1. Credential Management
- Passwords can be provided via environment variables
- Configuration files should not be committed with credentials
- Support for `.env` file loading

### 2. Request Interception
- Block unnecessary resources (images, stylesheets) to reduce attack surface
- Whitelist/blacklist URLs for additional control

### 3. Container Security
- Run as non-root user in Docker
- Minimal base image (python:3.12-slim)
- Multi-stage builds to reduce image size

## Performance Optimizations

### 1. Resource Blocking
- Block images, stylesheets, and JavaScript when not needed
- Reduces bandwidth and improves scraping speed

### 2. Connection Pooling
- Browser context reuse for multiple pages
- Proper cleanup to prevent resource leaks

### 3. Concurrent Operations
- Async/await for non-blocking I/O
- Potential for parallel page processing

## Extensibility

### Adding New Data Sources
1. Create a new configuration class inheriting from `ScrapingConfig`
2. Override `extract_data_from_page()` method
3. Implement custom selectors

### Adding New Storage Formats
1. Implement new save method in `PlaywrightScraper`
2. Follow the pattern of `save_to_json()` and `save_to_csv()`

### Adding New Authentication Methods
1. Extend `login()` method with new authentication strategies
2. Add configuration options for new auth types

## Deployment Options

### 1. Local Development
```bash
pip install -e ".[dev]"
python scraper.py --url https://example.com
```

### 2. Docker
```bash
docker build -t scraper .
docker run -v $(pwd)/output:/app/output scraper --url https://example.com
```

### 3. Docker Compose
```bash
docker-compose up scraper
```

### 4. CI/CD Pipeline
GitHub Actions workflow handles:
- Linting (black, isort, flake8, mypy)
- Testing (pytest)
- Docker image building
- Publishing to PyPI and Docker Hub

## Future Enhancements

1. **Distributed Scraping**: Support for scraping across multiple instances
2. **Queue Integration**: RabbitMQ/Redis for job queuing
3. **Monitoring**: Prometheus metrics export
4. **Proxy Rotation**: Automatic proxy switching
5. **Captcha Solving**: Integration with captcha solving services
6. **Data Validation**: Schema-based validation for scraped data
7. **Rate Limiting**: More sophisticated rate limiting strategies
