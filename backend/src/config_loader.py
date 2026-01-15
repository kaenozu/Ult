"""
AGStock 設定ローダー
分割された設定ファイルを統合管理
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

CONFIG_DIR = Path(__file__).parent.parent / "config"
DEFAULT_CONFIG_PATH = CONFIG_DIR / "settings.json"
ENV_PREFIX = "AGSTOCK_"


class ConfigLoader:
    """設定ローダークラス"""

    _instance: Optional["ConfigLoader"] = None
    _config: Dict[str, Any] = {}

    def __new__(cls) -> "ConfigLoader":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def __init__(self):
        if self._loaded:
            return
        self._loaded = True
        self._load_config()

    def _load_config(self):
        """設定ファイル読み込み"""
        if DEFAULT_CONFIG_PATH.exists():
            with open(DEFAULT_CONFIG_PATH, "r", encoding="utf-8") as f:
                self._config = json.load(f)
            logger.info(f"Config loaded from {DEFAULT_CONFIG_PATH}")
        else:
            logger.warning(f"Config file not found: {DEFAULT_CONFIG_PATH}")
            self._config = {}

    def reload(self):
        """設定再読み込み"""
        self._load_config()

    def get(self, key: str, default: Any = None) -> Any:
        """設定値取得（ドット記法対応）"""
        keys = key.split(".")
        value = self._config
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return default
            if value is None:
                return default
        return value

    def get_section(self, section: str) -> Dict[str, Any]:
        """セクション全体取得"""
        return self._config.get(section, {})

    def get_all(self) -> Dict[str, Any]:
        """全設定取得"""
        return self._config.copy()

    def set(self, key: str, value: Any):
        """設定値設定（メモリ上のみ）"""
        keys = key.split(".")
        config = self._config
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        config[keys[-1]] = value

    def get_env_override(self, key: str) -> Any:
        """環境変数によるオーバーライド取得"""
        env_key = ENV_PREFIX + key.upper().replace(".", "_")
        import os

        env_value = os.environ.get(env_key)
        if env_value is not None:
            return env_value
        return None

    def get_with_env_override(self, key: str, default: Any = None) -> Any:
        """設定値取得（環境変数オーバーライド付き）"""
        env_value = self.get_env_override(key)
        if env_value is not None:
            return env_value
        return self.get(key, default)


config = ConfigLoader()


def get_config(key: str, default: Any = None) -> Any:
    """設定値取得ヘルパー関数"""
    return config.get(key, default)


def get_trading_config() -> Dict[str, Any]:
    """取引設定取得"""
    return config.get_section("trading")


def get_ai_config() -> Dict[str, Any]:
    """AI設定取得"""
    return config.get_section("ai")


def get_market_config() -> Dict[str, Any]:
    """市場設定取得"""
    return config.get_section("market")


def get_notification_config() -> Dict[str, Any]:
    """通知設定取得"""
    return config.get_section("notifications")


def get_security_config() -> Dict[str, Any]:
    """セキュリティ設定取得"""
    return config.get_section("security")


def get_api_config() -> Dict[str, Any]:
    """API設定取得"""
    return config.get_section("api")


def get_defi_config() -> Dict[str, Any]:
    """DeFi設定取得"""
    return config.get_section("defi")


def get_personalization_config() -> Dict[str, Any]:
    """パーソナライゼーション設定取得"""
    return config.get_section("personalization")
