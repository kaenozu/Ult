# Contributing to Playwright Web Scraper

Thank you for your interest in contributing to the Playwright Web Scraper! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Python 3.9 or higher
- pip
- Docker (optional, for containerized development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/example/playwright-scraper.git
cd playwright-scraper
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install development dependencies:
```bash
pip install -e ".[dev]"
playwright install chromium
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write clean, readable code
- Follow PEP 8 style guidelines
- Add type hints to all functions
- Update documentation as needed

### 3. Run Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=playwright_scraper

# Run specific test file
pytest tests/test_config.py -v
```

### 4. Run Linters

```bash
# Format code
black .
isort .

# Check code style
flake8 .
mypy playwright_scraper
```

### 5. Commit Changes

Follow conventional commit messages:
```
feat: add new feature
fix: fix bug in pagination
docs: update README
test: add tests for config module
refactor: improve error handling
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### Python Code Style

We use the following tools to maintain code quality:

- **Black**: Code formatting (line length: 100)
- **isort**: Import sorting
- **flake8**: Linting
- **mypy**: Type checking

### Type Hints

All functions should have type hints:

```python
def process_data(data: List[Dict[str, Any]]) -> List[ScrapedItem]:
    """Process raw data into scraped items."""
    ...
```

### Documentation

- Use Google-style docstrings
- Document all public functions and classes
- Include type information in docstrings

Example:
```python
def scrape_page(self, url: str, max_items: int = 100) -> List[ScrapedItem]:
    """Scrape data from a single page.
    
    Args:
        url: The URL to scrape
        max_items: Maximum number of items to extract
        
    Returns:
        List of scraped items
        
    Raises:
        NavigationError: If page navigation fails
        ElementNotFoundError: If expected elements are not found
    """
```

## Testing Guidelines

### Writing Tests

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test with real browser instances
3. **Use Fixtures**: Create reusable test fixtures in `conftest.py`
4. **Mock External Dependencies**: Use `unittest.mock` for Playwright objects

### Test Structure

```python
class TestFeatureName:
    """Test cases for feature name."""
    
    def test_specific_behavior(self):
        """Test description."""
        # Arrange
        input_data = ...
        
        # Act
        result = function_to_test(input_data)
        
        # Assert
        assert result == expected_output
```

### Running Tests

```bash
# Run all tests
make test

# Run with coverage
make test-cov

# Run specific test
pytest tests/test_scraper.py::TestPlaywrightScraper::test_navigate_success -v
```

## Adding New Features

### 1. Configuration Options

When adding new configuration options:

1. Add field to `ScrapingConfig` dataclass
2. Add validation in `validate()` method
3. Add CLI argument in `create_argument_parser()`
4. Update example configuration files
5. Add tests

### 2. New Exceptions

When adding new exceptions:

1. Create exception class in `exceptions.py`
2. Inherit from appropriate base exception
3. Add to `__init__.py` exports
4. Add tests in `test_exceptions.py`

### 3. New Storage Formats

When adding new output formats:

1. Implement save method in `PlaywrightScraper`
2. Follow naming convention: `save_to_<format>()`
3. Add configuration option for filename
4. Add tests
5. Update documentation

## Docker Development

### Building Images

```bash
# Production image
docker build --target production -t scraper:prod .

# Development image
docker build --target development -t scraper:dev .
```

### Running Tests in Docker

```bash
docker-compose -f docker-compose.yml run --rm scraper-dev
```

### Interactive Development

```bash
docker-compose -f docker-compose.yml run --rm scraper-shell
```

## Documentation

### Updating Documentation

- Update `README.md` for user-facing changes
- Update `ARCHITECTURE.md` for architectural changes
- Update `CHANGELOG.md` with version changes
- Add docstrings to all public APIs

### Building Documentation

```bash
# Install Sphinx (if not already installed)
pip install sphinx sphinx-rtd-theme

# Build documentation
cd docs
make html
```

## Release Process

1. Update version in `__init__.py`
2. Update `CHANGELOG.md`
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will automatically:
   - Run tests
   - Build and publish to PyPI
   - Build and push Docker images
   - Create GitHub release

## Getting Help

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards others

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
