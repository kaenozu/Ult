"""Tests for configuration management."""

import json
import os
from pathlib import Path

import pytest

from playwright_scraper.config import ScrapingConfig, merge_configs
from playwright_scraper.exceptions import ConfigurationError


class TestScrapingConfig:
    """Test cases for ScrapingConfig."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = ScrapingConfig(url="https://example.com")
        
        assert config.url == "https://example.com"
        assert config.headless is True
        assert config.viewport_width == 1920
        assert config.viewport_height == 1080
        assert config.max_pages == 10
        assert config.max_retries == 3
        assert config.base_delay == 1.0
    
    def test_config_validation_empty_url(self):
        """Test that empty URL raises ConfigurationError."""
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig(url="")
        
        assert "URL is required" in str(exc_info.value)
    
    def test_config_validation_invalid_url(self):
        """Test that invalid URL raises ConfigurationError."""
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig(url="not-a-valid-url")
        
        assert "Invalid URL format" in str(exc_info.value)
    
    def test_config_validation_invalid_viewport(self):
        """Test viewport validation."""
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig(
                url="https://example.com",
                viewport_width=50,  # Too small
            )
        
        assert "viewport_width" in str(exc_info.value)
    
    def test_config_validation_invalid_max_pages(self):
        """Test max_pages validation."""
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig(
                url="https://example.com",
                max_pages=0,
            )
        
        assert "max_pages" in str(exc_info.value)
    
    def test_config_validation_invalid_log_level(self):
        """Test log_level validation."""
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig(
                url="https://example.com",
                log_level="INVALID",
            )
        
        assert "log_level" in str(exc_info.value)
    
    def test_from_dict(self):
        """Test creating config from dictionary."""
        data = {
            "url": "https://example.com",
            "username": "test_user",
            "headless": False,
            "max_pages": 20,
        }
        
        config = ScrapingConfig.from_dict(data)
        
        assert config.url == "https://example.com"
        assert config.username == "test_user"
        assert config.headless is False
        assert config.max_pages == 20
    
    def test_from_dict_with_regex_patterns(self):
        """Test creating config with regex patterns."""
        import re
        
        data = {
            "url": "https://example.com",
            "blocked_urls": [r"google\.com", r"facebook\.com"],
        }
        
        config = ScrapingConfig.from_dict(data)
        
        assert len(config.blocked_urls) == 2
        assert all(isinstance(p, type(re.compile(""))) for p in config.blocked_urls)
    
    def test_from_json(self, temp_dir: Path):
        """Test loading config from JSON file."""
        config_data = {
            "url": "https://example.com",
            "username": "json_user",
            "max_pages": 25,
        }
        
        config_path = temp_dir / "config.json"
        with open(config_path, "w") as f:
            json.dump(config_data, f)
        
        config = ScrapingConfig.from_json(config_path)
        
        assert config.url == "https://example.com"
        assert config.username == "json_user"
        assert config.max_pages == 25
    
    def test_from_json_file_not_found(self):
        """Test loading from non-existent JSON file."""
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig.from_json("/nonexistent/config.json")
        
        assert "not found" in str(exc_info.value)
    
    def test_from_json_invalid_json(self, temp_dir: Path):
        """Test loading from invalid JSON file."""
        config_path = temp_dir / "invalid.json"
        with open(config_path, "w") as f:
            f.write("{invalid json}")
        
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig.from_json(config_path)
        
        assert "Invalid JSON" in str(exc_info.value)
    
    def test_from_yaml(self, temp_dir: Path):
        """Test loading config from YAML file."""
        yaml = pytest.importorskip("yaml")
        
        config_data = {
            "url": "https://example.com",
            "username": "yaml_user",
            "max_pages": 30,
        }
        
        config_path = temp_dir / "config.yaml"
        with open(config_path, "w") as f:
            yaml.dump(config_data, f)
        
        config = ScrapingConfig.from_yaml(config_path)
        
        assert config.url == "https://example.com"
        assert config.username == "yaml_user"
        assert config.max_pages == 30
    
    def test_from_yaml_without_pyyaml(self, temp_dir: Path, monkeypatch):
        """Test YAML loading without PyYAML installed."""
        # Simulate PyYAML not being installed by raising ImportError
        def mock_import(name, *args, **kwargs):
            if name == "yaml":
                raise ImportError("No module named 'yaml'")
            return __import__(name, *args, **kwargs)
        
        monkeypatch.setattr("builtins.__import__", mock_import)
        
        with pytest.raises(ConfigurationError) as exc_info:
            ScrapingConfig.from_yaml(temp_dir / "dummy.yaml")
        
        assert "PyYAML is required" in str(exc_info.value)
    
    def test_from_env(self, monkeypatch):
        """Test loading config from environment variables."""
        env_vars = {
            "SCRAPER_URL": "https://env.example.com",
            "SCRAPER_USERNAME": "env_user",
            "SCRAPER_HEADLESS": "false",
            "SCRAPER_MAX_PAGES": "50",
            "SCRAPER_LOG_LEVEL": "DEBUG",
        }
        
        for key, value in env_vars.items():
            monkeypatch.setenv(key, value)
        
        config = ScrapingConfig.from_env()
        
        assert config.url == "https://env.example.com"
        assert config.username == "env_user"
        assert config.headless is False
        assert config.max_pages == 50
        assert config.log_level == "DEBUG"
    
    def test_to_dict(self, sample_config: ScrapingConfig):
        """Test converting config to dictionary."""
        config_dict = sample_config.to_dict()
        
        assert config_dict["url"] == "https://example.com"
        assert config_dict["username"] == "test_user"
        assert config_dict["headless"] is True
    
    def test_to_json(self, sample_config: ScrapingConfig, temp_dir: Path):
        """Test saving config to JSON file."""
        config_path = temp_dir / "output.json"
        sample_config.to_json(config_path)
        
        assert config_path.exists()
        
        with open(config_path) as f:
            data = json.load(f)
        
        assert data["url"] == "https://example.com"
        assert data["username"] == "test_user"
    
    def test_to_yaml(self, sample_config: ScrapingConfig, temp_dir: Path):
        """Test saving config to YAML file."""
        yaml = pytest.importorskip("yaml")
        
        config_path = temp_dir / "output.yaml"
        sample_config.to_yaml(config_path)
        
        assert config_path.exists()
        
        with open(config_path) as f:
            data = yaml.safe_load(f)
        
        assert data["url"] == "https://example.com"


class TestMergeConfigs:
    """Test cases for merge_configs function."""
    
    def test_merge_configs(self):
        """Test merging two configurations."""
        base = ScrapingConfig(
            url="https://base.com",
            username="base_user",
            max_pages=10,
        )
        
        override = ScrapingConfig(
            url="https://override.com",
            max_pages=20,
        )
        
        merged = merge_configs(base, override)
        
        assert merged.url == "https://override.com"
        assert merged.username == "base_user"  # Not overridden
        assert merged.max_pages == 20
    
    def test_merge_configs_default_values_not_overridden(self):
        """Test that default values in override don't affect base."""
        base = ScrapingConfig(
            url="https://base.com",
            headless=False,
        )
        
        override = ScrapingConfig(
            url="https://override.com",
            # headless not specified, uses default True
        )
        
        merged = merge_configs(base, override)
        
        # base.headless should be preserved since override uses default
        assert merged.headless is False
