"""
Centralized Configuration Management using Pydantic.
Replaces dispersed os.getenv calls and hardcoded constants.
"""

from typing import Any, List, Optional, Dict
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field, SecretStr
from dotenv import load_dotenv
import json
import os
import logging
from functools import lru_cache

# Load .env file explicitly if present
load_dotenv()

logger = logging.getLogger(__name__)


class TradingSettings(BaseSettings):
    """Trading-specific configurations."""

    max_daily_trades: int = Field(5, description="Maximum number of trades per day")
    daily_loss_limit_pct: float = Field(-5.0, description="Daily loss limit in percentage")
    max_position_size: float = Field(0.2, description="Max position size as fraction of portfolio")
    min_cash_reserve: float = Field(200000.0, description="Minimum cash to keep in JPY")

    # Risk Management
    initial_stop_loss_pct: float = 0.05
    take_profit_pct: float = 0.10
    trailing_stop_activation_pct: float = 0.03
    trailing_stop_callback_pct: float = 0.02

    # Timeframes
    default_period: str = "2y"
    default_interval: str = "1d"


class SystemSettings(BaseSettings):
    """System-wide infrastructure settings."""

    data_dir: Path = Path("data")
    db_path: Path = Path("data/stock_data.db")
    parquet_dir: Path = Path("data/parquet")
    models_dir: Path = Path("models")
    initial_capital: int = 10000000  # Legacy default

    # Caching
    realtime_ttl_seconds: int = 30
    realtime_backoff_seconds: int = 1

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


class RiskManagementSettings(BaseSettings):
    """Risk management settings."""

    max_position_size: float = 0.2


class Config(BaseSettings):
    """Root Configuration Object."""

    trading: TradingSettings = Field(default_factory=TradingSettings)
    system: SystemSettings = Field(default_factory=SystemSettings)
    risk_management: RiskManagementSettings = Field(default_factory=RiskManagementSettings)

    # Other legacy constants mapped
    tickers_jp: List[str] = ["7203.T", "9984.T", "6758.T", "8035.T", "6861.T"]
    tickers_us: List[str] = ["AAPL", "MSFT", "AMZN", "NVDA", "TSLA"]

    def ensure_dirs(self):
        """Create necessary directories."""
        self.system.data_dir.mkdir(parents=True, exist_ok=True)
        self.system.parquet_dir.mkdir(parents=True, exist_ok=True)
        self.system.models_dir.mkdir(parents=True, exist_ok=True)

    def get(self, key: str, default: Any = None) -> Any:
        """後方互換性のためのドット記法アクセス."""
        parts = key.split(".")
        obj: Any = self
        try:
            for part in parts:
                if isinstance(obj, dict):
                    obj = obj.get(part, default)
                elif hasattr(obj, part):
                    obj = getattr(obj, part)
                else:
                    return default
            return obj
        except (AttributeError, KeyError):
            return default

    def to_dict(self) -> Dict[str, Any]:
        """辞書として取得 (互換性のための簡易実装)"""
        # 実際にはより複雑な変換が必要だが、ここでは基本的なものを返す
        return self.model_dump() if hasattr(self, "model_dump") else self.dict()

    def get_api_key(self, service: str) -> Optional[str]:
        """APIキーを安全に取得 (PR #90 互換)"""
        if service == "openai":
            return os.getenv("OPENAI_API_KEY")
        return None


# Global Settings Instance (Pydantic)
settings = Config()
settings.ensure_dirs()


@lru_cache(maxsize=1)
def get_config(config_path: str = "config.json") -> Config:
    """設定インスタンスを取得 (PR #90 互換)"""
    return settings


def load_config(config_path: str = "config.json") -> Dict[str, Any]:
    """後方互換性のための関数"""
    return settings.to_dict()


# Backward compatible config instance (Singleton wrapper)
class ConfigSingleton:
    def __getattr__(self, name: str):
        return getattr(settings, name)

    def get(self, key: str, default: Any = None) -> Any:
        return settings.get(key, default)


config = ConfigSingleton()