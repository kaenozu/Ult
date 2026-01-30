"""Pytest configuration and fixtures."""

import json
import tempfile
from pathlib import Path
from typing import Generator

import pytest

from playwright_scraper.config import ScrapingConfig
from playwright_scraper.exceptions import (
    AuthenticationError,
    ConfigurationError,
    ElementNotFoundError,
    NavigationError,
    ScraperException,
)


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield Path(tmp_dir)


@pytest.fixture
def sample_config() -> ScrapingConfig:
    """Create a sample configuration for testing."""
    return ScrapingConfig(
        url="https://example.com",
        username="test_user",
        password="test_pass",
        headless=True,
        max_pages=5,
        output_dir="./test_output",
        log_dir="./test_logs",
    )


@pytest.fixture
def config_file_json(temp_dir: Path) -> Path:
    """Create a sample JSON configuration file."""
    config_data = {
        "url": "https://example.com",
        "username": "json_user",
        "password": "json_pass",
        "headless": False,
        "max_pages": 10,
    }
    config_path = temp_dir / "config.json"
    with open(config_path, "w") as f:
        json.dump(config_data, f)
    return config_path


@pytest.fixture
def config_file_yaml(temp_dir: Path) -> Path:
    """Create a sample YAML configuration file."""
    yaml = pytest.importorskip("yaml")
    config_data = {
        "url": "https://example.com",
        "username": "yaml_user",
        "password": "yaml_pass",
        "headless": True,
        "max_pages": 15,
    }
    config_path = temp_dir / "config.yaml"
    with open(config_path, "w") as f:
        yaml.dump(config_data, f)
    return config_path


@pytest.fixture
def mock_scraped_items():
    """Create sample scraped items for testing."""
    from playwright_scraper.scraper import ScrapedItem
    
    return [
        ScrapedItem(
            title="Item 1",
            url="https://example.com/item1",
            content="Content for item 1",
        ),
        ScrapedItem(
            title="Item 2",
            url="https://example.com/item2",
            content="Content for item 2",
        ),
        ScrapedItem(
            title="Item 3",
            url="https://example.com/item3",
            content="Content for item 3",
        ),
    ]
