import pytest
import os
from unittest.mock import patch
from src.core.config import Config, SystemSettings, TradingSettings


class TestConfiguration:
    """Configuration system tests."""

    @pytest.fixture
    def clean_env(self):
        """Clean environment variables for testing."""
        original_env = os.environ.copy()
        # Remove test-related env vars
        test_vars = ["CORS_ORIGINS", "LOG_LEVEL", "GEMINI_API_KEY", "OPENAI_API_KEY"]
        for var in test_vars:
            os.environ.pop(var, None)
        yield
        # Restore original env
        os.environ.clear()
        os.environ.update(original_env)

    def test_system_settings_defaults(self, clean_env):
        """Test system settings with defaults."""
        settings = SystemSettings()

        assert settings.cors_origins == [
            "http://localhost:3000",
            "http://localhost:3001",
        ]
        assert settings.log_level == "INFO"
        assert settings.cors_allow_credentials is True

    def test_system_settings_custom_cors(self, clean_env):
        """Test custom CORS origins."""
        os.environ["CORS_ORIGINS"] = "https://example.com,https://app.example.com"

        settings = SystemSettings()
        expected_origins = ["https://example.com", "https://app.example.com"]

        assert settings.cors_origins == expected_origins

    def test_system_settings_log_level(self, clean_env):
        """Test custom log level."""
        os.environ["LOG_LEVEL"] = "DEBUG"

        settings = SystemSettings()
        assert settings.log_level == "DEBUG"

    def test_trading_settings_defaults(self, clean_env):
        """Test trading settings defaults."""
        settings = TradingSettings()

        assert settings.max_position_size > 0
        assert settings.max_daily_loss > 0
        assert settings.tickers_jp == ["7203.T", "9984.T", "6758.T", "8035.T", "6861.T"]
        assert settings.tickers_us == ["AAPL", "MSFT", "AMZN", "NVDA", "TSLA"]

    def test_config_initialization_with_env(self, clean_env):
        """Test full config initialization with environment variables."""
        os.environ.update(
            {
                "CORS_ORIGINS": "http://localhost:3000",
                "LOG_LEVEL": "WARNING",
                "GEMINI_API_KEY": "test_gemini_key",
                "OPENAI_API_KEY": "test_openai_key",
            }
        )

        config = Config()

        assert config.system.cors_origins == ["http://localhost:3000"]
        assert config.system.log_level == "WARNING"
        assert config.gemini_api_key == "test_gemini_key"
        assert config.openai_api_key == "test_openai_key"

    @patch.dict(os.environ, {"GEMINI_API_KEY": "", "OPENAI_API_KEY": ""}, clear=True)
    def test_config_validation_missing_api_keys(self, clean_env):
        """Test config validation when API keys are missing."""
        # This should work since API keys are optional at config level
        # Validation happens at app startup
        config = Config()

        assert config.gemini_api_key is None
        assert config.openai_api_key is None

    def test_config_validation_cors_empty_strings(self, clean_env):
        """Test CORS filtering of empty strings."""
        os.environ["CORS_ORIGINS"] = "http://localhost:3000,,https://example.com,"

        config = Config()
        # Empty strings should be filtered out
        assert config.system.cors_origins == [
            "http://localhost:3000",
            "https://example.com",
        ]

    def test_config_data_types(self, clean_env):
        """Test configuration data types."""
        config = Config()

        # Test that all fields have correct types
        assert isinstance(config.system.cors_origins, list)
        assert isinstance(config.system.log_level, str)
        assert isinstance(config.trading.max_position_size, (int, float))
        assert isinstance(config.trading.tickers_jp, list)
        assert isinstance(config.trading.tickers_us, list)

    def test_config_json_serialization(self, clean_env):
        """Test configuration can be serialized to JSON."""
        config = Config()

        # Should be able to serialize without errors
        json_str = config.json()
        assert isinstance(json_str, str)
        assert len(json_str) > 0

        # Should contain expected fields
        assert "system" in json_str
        assert "trading" in json_str
