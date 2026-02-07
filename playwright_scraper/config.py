#!/usr/bin/env python3
"""
Configuration management for the Playwright Web Scraper.

Supports loading configuration from YAML, JSON files, environment variables,
and command-line arguments with proper validation.
"""

import json
import os
import re
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any, Dict, List, Optional, Pattern, Tuple, Union

from .exceptions import ConfigurationError


@dataclass
class ScrapingConfig:
    """Configuration for the scraping session."""
    
    # URL and authentication
    url: str = ""
    username: str = ""
    password: str = ""
    
    # Browser settings
    headless: bool = True
    viewport_width: int = 1920
    viewport_height: int = 1080
    
    # Selectors
    login_username_selector: str = "input[type='text'], input[name='username'], input[name='email'], #username, #email"
    login_password_selector: str = "input[type='password'], input[name='password'], #password"
    login_button_selector: str = "button[type='submit'], input[type='submit'], .login-btn, #login-btn"
    data_container_selector: str = ".data-container, .items-list, [data-testid='items']"
    item_selector: str = ".item, .data-row, [data-testid='item']"
    next_page_selector: str = ".next-page, .pagination-next, [aria-label='Next page']"
    
    # Pagination
    max_pages: int = 10
    
    # Retry settings
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    
    # Request interception
    block_images: bool = False
    block_stylesheets: bool = False
    block_javascript: bool = False
    allowed_urls: List[Pattern] = field(default_factory=list)
    blocked_urls: List[Pattern] = field(default_factory=list)
    
    # Output
    output_dir: str = "./output"
    json_filename: Optional[str] = None
    csv_filename: Optional[str] = None
    
    # Logging
    log_dir: str = "./logs"
    log_level: str = "INFO"
    log_max_bytes: int = 10 * 1024 * 1024  # 10MB
    log_backup_count: int = 5
    
    # Proxy settings
    proxy_server: Optional[str] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    
    # Advanced settings
    user_agent: Optional[str] = None
    extra_http_headers: Dict[str, str] = field(default_factory=dict)
    cookies: List[Dict[str, Any]] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        self.validate()
    
    def validate(self) -> None:
        """
        Validate the configuration values.
        
        Raises:
            ConfigurationError: If any configuration value is invalid
        """
        errors = []
        
        # Validate URL
        if not self.url:
            errors.append("URL is required")
        elif not self._is_valid_url(self.url):
            errors.append(f"Invalid URL format: {self.url}")
        
        # Validate numeric values
        if self.viewport_width < 100 or self.viewport_width > 7680:
            errors.append(f"Invalid viewport_width: {self.viewport_width} (must be between 100 and 7680)")
        
        if self.viewport_height < 100 or self.viewport_height > 4320:
            errors.append(f"Invalid viewport_height: {self.viewport_height} (must be between 100 and 4320)")
        
        if self.max_pages < 1:
            errors.append(f"Invalid max_pages: {self.max_pages} (must be at least 1)")
        
        if self.max_retries < 0:
            errors.append(f"Invalid max_retries: {self.max_retries} (must be non-negative)")
        
        if self.base_delay < 0:
            errors.append(f"Invalid base_delay: {self.base_delay} (must be non-negative)")
        
        if self.max_delay < self.base_delay:
            errors.append(f"Invalid max_delay: {self.max_delay} (must be >= base_delay)")
        
        # Validate log level
        valid_log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if self.log_level.upper() not in valid_log_levels:
            errors.append(f"Invalid log_level: {self.log_level} (must be one of {valid_log_levels})")
        
        # Validate selectors
        if not self.item_selector:
            errors.append("item_selector cannot be empty")
        
        # Validate proxy settings
        if self.proxy_server and not self._is_valid_url(self.proxy_server):
            errors.append(f"Invalid proxy_server: {self.proxy_server}")
        
        if errors:
            raise ConfigurationError(
                "Configuration validation failed",
                details={"errors": errors}
            )
    
    @staticmethod
    def _is_valid_url(url: str) -> bool:
        """Check if URL has valid format.
        
        Uses a comprehensive regex pattern that validates:
        - Protocol (http:// or https://)
        - Domain names (including subdomains)
        - IP addresses
        - Optional port numbers
        - Path components
        
        Args:
            url: URL string to validate
            
        Returns:
            True if URL format is valid, False otherwise
        """
        # Comprehensive URL validation pattern
        # Breakdown:
        # ^https?://          - Must start with http:// or https://
        # (?:                 - Non-capturing group for hostname options
        #   (?:               - Domain name option
        #     [A-Z0-9]        - First character must be alphanumeric
        #     (?:[A-Z0-9-]{0,61}[A-Z0-9])?  - Optional middle characters (max 63 total)
        #     \.              - Dot separator
        #   )+                - One or more domain parts
        #   [A-Z]{2,6}\.?     - TLD (2-6 letters, optional trailing dot)
        #   |localhost        - Or localhost
        #   |\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}  - Or IPv4 address
        # )                   - End hostname group
        # (?::\d+)?           - Optional port number
        # (?:/?|[/?]\S+)$     - Optional path (starts with / or ?)
        pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return bool(pattern.match(url))
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScrapingConfig":
        """
        Create configuration from dictionary.
        
        Args:
            data: Dictionary containing configuration values
            
        Returns:
            ScrapingConfig instance
            
        Raises:
            ConfigurationError: If configuration is invalid
        """
        # Convert string patterns to compiled regex
        if "allowed_urls" in data and isinstance(data["allowed_urls"], list):
            data["allowed_urls"] = [re.compile(pattern) for pattern in data["allowed_urls"]]
        
        if "blocked_urls" in data and isinstance(data["blocked_urls"], list):
            data["blocked_urls"] = [re.compile(pattern) for pattern in data["blocked_urls"]]
        
        # Filter only valid fields
        valid_fields = {f.name for f in fields(cls)}
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        
        try:
            return cls(**filtered_data)
        except TypeError as e:
            raise ConfigurationError(f"Invalid configuration: {e}")
    
    @classmethod
    def from_json(cls, filepath: Union[str, Path]) -> "ScrapingConfig":
        """
        Load configuration from JSON file.
        
        Args:
            filepath: Path to JSON configuration file
            
        Returns:
            ScrapingConfig instance
            
        Raises:
            ConfigurationError: If file cannot be loaded or parsed
        """
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise ConfigurationError(f"Configuration file not found: {filepath}")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise ConfigurationError(f"Invalid JSON in configuration file: {e}")
        except Exception as e:
            raise ConfigurationError(f"Error reading configuration file: {e}")
        
        return cls.from_dict(data)
    
    @classmethod
    def from_yaml(cls, filepath: Union[str, Path]) -> "ScrapingConfig":
        """
        Load configuration from YAML file.
        
        Args:
            filepath: Path to YAML configuration file
            
        Returns:
            ScrapingConfig instance
            
        Raises:
            ConfigurationError: If file cannot be loaded or parsed
        """
        try:
            import yaml
        except ImportError:
            raise ConfigurationError(
                "PyYAML is required for YAML configuration support. "
                "Install it with: pip install pyyaml"
            )
        
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise ConfigurationError(f"Configuration file not found: {filepath}")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            raise ConfigurationError(f"Invalid YAML in configuration file: {e}")
        except Exception as e:
            raise ConfigurationError(f"Error reading configuration file: {e}")
        
        return cls.from_dict(data)
    
    @classmethod
    def from_env(cls, prefix: str = "SCRAPER_") -> "ScrapingConfig":
        """
        Load configuration from environment variables.
        
        Environment variables should be prefixed with the given prefix.
        Example: SCRAPER_URL, SCRAPER_HEADLESS, etc.
        
        Args:
            prefix: Prefix for environment variables
            
        Returns:
            ScrapingConfig instance
        """
        data = {}
        
        # Mapping of env var names to config fields
        env_mapping = {
            f"{prefix}URL": "url",
            f"{prefix}USERNAME": "username",
            f"{prefix}PASSWORD": "password",
            f"{prefix}HEADLESS": "headless",
            f"{prefix}VIEWPORT_WIDTH": "viewport_width",
            f"{prefix}VIEWPORT_HEIGHT": "viewport_height",
            f"{prefix}MAX_PAGES": "max_pages",
            f"{prefix}MAX_RETRIES": "max_retries",
            f"{prefix}BASE_DELAY": "base_delay",
            f"{prefix}MAX_DELAY": "max_delay",
            f"{prefix}BLOCK_IMAGES": "block_images",
            f"{prefix}BLOCK_STYLESHEETS": "block_stylesheets",
            f"{prefix}BLOCK_JAVASCRIPT": "block_javascript",
            f"{prefix}OUTPUT_DIR": "output_dir",
            f"{prefix}LOG_DIR": "log_dir",
            f"{prefix}LOG_LEVEL": "log_level",
            f"{prefix}PROXY_SERVER": "proxy_server",
            f"{prefix}PROXY_USERNAME": "proxy_username",
            f"{prefix}PROXY_PASSWORD": "proxy_password",
        }
        
        for env_var, field_name in env_mapping.items():
            value = os.getenv(env_var)
            if value is not None:
                # Convert string values to appropriate types
                if field_name in ["headless", "block_images", "block_stylesheets", "block_javascript"]:
                    data[field_name] = value.lower() in ("true", "1", "yes", "on")
                elif field_name in ["viewport_width", "viewport_height", "max_pages", "max_retries", "log_max_bytes", "log_backup_count"]:
                    data[field_name] = int(value)
                elif field_name in ["base_delay", "max_delay"]:
                    data[field_name] = float(value)
                else:
                    data[field_name] = value
        
        return cls.from_dict(data)
    
    @classmethod
    def load(
        cls,
        config_file: Optional[Union[str, Path]] = None,
        file_format: Optional[str] = None,
        use_env: bool = True,
        env_prefix: str = "SCRAPER_"
    ) -> "ScrapingConfig":
        """
        Load configuration from multiple sources with priority:
        1. Configuration file (if provided)
        2. Environment variables (if use_env=True)
        3. Default values
        
        Args:
            config_file: Path to configuration file
            file_format: File format ('json', 'yaml', or auto-detect)
            use_env: Whether to load from environment variables
            env_prefix: Prefix for environment variables
            
        Returns:
            ScrapingConfig instance
        """
        # Start with empty config
        config_data = {}
        
        # Load from file if provided
        if config_file:
            config_file = Path(config_file)
            
            # Auto-detect format if not specified
            if file_format is None:
                suffix = config_file.suffix.lower()
                if suffix in ['.yaml', '.yml']:
                    file_format = 'yaml'
                elif suffix == '.json':
                    file_format = 'json'
                else:
                    raise ConfigurationError(f"Cannot determine file format for: {config_file}")
            
            # Load based on format
            if file_format == 'yaml':
                file_config = cls.from_yaml(config_file)
            else:
                file_config = cls.from_json(config_file)
            
            # Convert to dict
            config_data = {
                f.name: getattr(file_config, f.name)
                for f in fields(cls)
            }
        
        # Override with environment variables
        if use_env:
            env_config = cls.from_env(env_prefix)
            for field in fields(cls):
                env_value = getattr(env_config, field.name)
                # Only override if env var was set (not default)
                if env_value != field.default:
                    config_data[field.name] = env_value
        
        return cls.from_dict(config_data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        result = {}
        for field in fields(self):
            value = getattr(self, field.name)
            # Convert regex patterns to strings
            if field.name in ["allowed_urls", "blocked_urls"] and value:
                result[field.name] = [p.pattern for p in value]
            else:
                result[field.name] = value
        return result
    
    def to_json(self, filepath: Union[str, Path]) -> None:
        """Save configuration to JSON file."""
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
    
    def to_yaml(self, filepath: Union[str, Path]) -> None:
        """Save configuration to YAML file."""
        try:
            import yaml
        except ImportError:
            raise ConfigurationError("PyYAML is required for YAML export")
        
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(self.to_dict(), f, default_flow_style=False, allow_unicode=True)


def merge_configs(base: ScrapingConfig, override: ScrapingConfig) -> ScrapingConfig:
    """
    Merge two configurations, with override taking precedence.
    
    Args:
        base: Base configuration
        override: Configuration to override with
        
    Returns:
        Merged ScrapingConfig
    """
    base_dict = base.to_dict()
    override_dict = override.to_dict()
    
    # Override non-default values
    for field in fields(ScrapingConfig):
        override_value = override_dict[field.name]
        if override_value != field.default:
            base_dict[field.name] = override_value
    
    return ScrapingConfig.from_dict(base_dict)
