"""
セキュアな設定管理モジュール
APIキーや機密情報を安全に管理する
"""

import os
import json
import logging
import sys
from typing import Dict, Any, Optional
from pathlib import Path
from pydantic import BaseModel, Field, validator

logger = logging.getLogger(__name__)


class SecurityConfig(BaseModel):
    """セキュリティ関連の設定"""

    max_api_calls_per_minute: int = Field(default=60, ge=1, le=1000)
    max_data_size_mb: int = Field(default=100, ge=1, le=1000)
    enable_rate_limiting: bool = True
    enable_input_validation: bool = True
    enable_audit_logging: bool = True


class TradingLimits(BaseModel):
    """取引リスク管理設定"""

    max_position_size_pct: float = Field(default=0.1, ge=0.01, le=1.0)
    max_daily_trades: int = Field(default=3, ge=1, le=50)
    daily_loss_limit_pct: float = Field(default=-3.0, ge=-50.0, le=0.0)
    max_vix_threshold: float = Field(default=40.0, ge=0.0, le=100.0)
    enable_circuit_breaker: bool = True
    emergency_stop_loss_pct: float = Field(default=-10.0, ge=-50.0, le=0.0)


class APIKeyConfig(BaseModel):
    """APIキー設定"""

    gemini_enabled: bool = False
    openai_enabled: bool = False
    gemini_key_env: str = "GEMINI_API_KEY"
    openai_key_env: str = "OPENAI_API_KEY"

    @validator("gemini_key_env", "openai_key_env")
    def validate_env_names(cls, v):
        if not v or not v.startswith("AGSTOCK_"):
            return f"AGSTOCK_{v}"
        return v


class SecureConfigManager:
    """セキュアな設定管理クラス"""

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = Path(config_path) if config_path else Path("config.json")
        self._config_cache: Optional[Dict[str, Any]] = None
        self._security_config: Optional[SecurityConfig] = None
        self._trading_limits: Optional[TradingLimits] = None
        self._api_config: Optional[APIKeyConfig] = None

    def load_config(self) -> Dict[str, Any]:
        """設定を安全に読み込む"""
        if self._config_cache is not None:
            return self._config_cache

        if not self.config_path.exists():
            raise FileNotFoundError(f"設定ファイルが見つかりません: {self.config_path}")

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            # 設定の検証
            self._validate_config(config)
            self._config_cache = config

            logger.info(f"設定ファイルを読み込みました: {self.config_path}")
            return config

        except json.JSONDecodeError as e:
            logger.error(f"設定ファイルのJSON形式が不正です: {e}")
            raise ValueError(f"無効なJSON形式: {e}")
        except Exception as e:
            logger.error(f"設定ファイルの読み込みに失敗しました: {e}")
            raise

    def get_api_key(self, service: str) -> str:
        """APIキーを安全に取得する"""
        self._validate_service_name(service)

        # 環境変数から取得
        env_key = f"AGSTOCK_{service.upper()}_API_KEY"
        api_key = os.getenv(env_key)

        if not api_key:
            # 設定ファイルから環境変数名を取得
            config = self.load_config()
            if service.lower() == "gemini" and config.get("gemini", {}).get("api_key"):
                env_key = config["gemini"].get("api_key", "")
                api_key = os.getenv(env_key)
            elif service.lower() == "openai" and config.get("openai_api_key"):
                env_key = config["openai_api_key"]
                api_key = os.getenv(env_key)

        if not api_key or api_key in ["", "YOUR_API_KEY_HERE"]:
            raise ValueError(f"APIキーが設定されていません: {service} (環境変数: {env_key})")

        # APIキーの形式を検証
        self._validate_api_key(api_key, service)

        return api_key

    def get_security_config(self) -> SecurityConfig:
        """セキュリティ設定を取得"""
        if self._security_config is None:
            config = self.load_config()
            security_config = config.get("security", {})

            self._security_config = SecurityConfig(
                max_api_calls_per_minute=security_config.get("max_api_calls_per_minute", 60),
                max_data_size_mb=security_config.get("max_data_size_mb", 100),
                enable_rate_limiting=security_config.get("enable_rate_limiting", True),
                enable_input_validation=security_config.get("enable_input_validation", True),
                enable_audit_logging=security_config.get("enable_audit_logging", True),
            )

        return self._security_config

    def get_trading_limits(self) -> TradingLimits:
        """取引リミット設定を取得"""
        if self._trading_limits is None:
            config = self.load_config()
            risk_config = config.get("risk", {})
            auto_config = config.get("auto_trading", {})

            self._trading_limits = TradingLimits(
                max_position_size_pct=risk_config.get("max_position_size", 0.1),
                max_daily_trades=auto_config.get("max_daily_trades", 3),
                daily_loss_limit_pct=auto_config.get("daily_loss_limit_pct", -3.0),
                max_vix_threshold=auto_config.get("max_vix", 40.0),
                enable_circuit_breaker=auto_config.get("enable_circuit_breaker", True),
                emergency_stop_loss_pct=risk_config.get("emergency_stop_loss_pct", -10.0),
            )

        return self._trading_limits

    def _validate_config(self, config: Dict[str, Any]) -> None:
        """設定内容を検証"""
        required_sections = ["risk", "auto_trading"]

        for section in required_sections:
            if section not in config:
                logger.warning(f"必須設定セクションが見つかりません: {section}")

        # APIキーのハードコーディングチェック
        api_keys_found = []
        if config.get("gemini_api_key") and config["gemini_api_key"] != "":
            api_keys_found.append("gemini_api_key")
        if config.get("openai_api_key") and config["openai_api_key"] != "":
            api_keys_found.append("openai_api_key")

        if api_keys_found:
            if os.getenv("AGSTOCK_ALLOW_HARDCODED_KEYS") == "1":
                logger.warning(f"ハードコードされたAPIキーを許可します（テスト用）: {api_keys_found}")
            else:
                logger.error(f"設定ファイルにAPIキーがハードコーディングされています: {api_keys_found}")
                raise ValueError("APIキーは環境変数で管理してください")

    def _validate_service_name(self, service: str) -> None:
        """サービス名を検証"""
        allowed_services = ["gemini", "openai", "anthropic", "google"]
        if service.lower() not in allowed_services:
            raise ValueError(f"サポートされていないサービスです: {service}")

    def _validate_api_key(self, api_key: str, service: str) -> None:
        """APIキーの形式を検証"""
        if len(api_key) < 10:
            raise ValueError(f"無効なAPIキーの形式です: {service}")

        # サービス固有の検証
        if service.lower() == "openai" and not api_key.startswith("sk-"):
            logger.warning(f"OpenAI APIキーの形式が異常です: {api_key[:10]}...")
        elif service.lower() == "gemini" and len(api_key) < 20:
            logger.warning(f"Gemini APIキーの形式が異常です: {api_key[:10]}...")

    def reload_config(self) -> None:
        """設定を再読み込みする"""
        self._config_cache = None
        self._security_config = None
        self._trading_limits = None
        self._api_config = None
        logger.info("設定を再読み込みしました")


# グローバルインスタンス
config_manager = SecureConfigManager()


def get_secure_config() -> SecureConfigManager:
    """セキュアな設定マネージャーを取得"""
    return config_manager


def validate_input_data(data: Any, data_type: str) -> bool:
    """入力データを検証"""
    security_config = config_manager.get_security_config()

    if not security_config.enable_input_validation:
        return True

    if data_type == "ticker_symbol":
        if isinstance(data, str):
            return len(data) > 0 and len(data) <= 10 and data.replace(".", "").isalnum()
        return False

    elif data_type == "price_data":
        if isinstance(data, (int, float)):
            return 0 < data < 1000000  # 0より大きく100万以下
        return False

    elif data_type == "json_data":
        try:
            if isinstance(data, str):
                json.loads(data)
            elif isinstance(data, dict):
                json.dumps(data)
            else:
                return False
            return True
        except (json.JSONDecodeError, TypeError):
            return False

    return True


def log_security_event(event_type: str, details: Dict[str, Any]) -> None:
    """セキュリティイベントをログ記録"""
    security_config = config_manager.get_security_config()

    if security_config.enable_audit_logging:
        logger.warning(f"セキュリティイベント: {event_type} - {details}")
