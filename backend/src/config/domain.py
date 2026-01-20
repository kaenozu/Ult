"""
Configuration Management Domain
設定管理ドメイン
"""

import logging
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, field
from pathlib import Path
import os
import json
import yaml
from enum import Enum

logger = logging.getLogger(__name__)


class Environment(str, Enum):
    """環境タイプ"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


@dataclass
class DatabaseConfig:
    """データベース設定"""

    host: str = "localhost"
    port: int = 5432
    database: str = "trading_db"
    username: str = "postgres"
    password: str = ""
    ssl_mode: bool = False
    max_connections: int = 20
    pool_size: int = 10
    echo: bool = False
    timezone: str = "UTC"


@dataclass
class RedisConfig:
    """Redis設定"""

    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[str] = None
    max_connections: int = 10
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    ssl: bool = False
    decode_responses: bool = True


@dataclass
class APIConfig:
    """API設定"""

    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    reload: bool = False
    workers: int = 1
    access_log: bool = True
    cors_origins: List[str] = field(default_factory=lambda: ["http://localhost:3000"])
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = field(
        default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    cors_allow_headers: List[str] = field(default_factory=lambda: ["*"])
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window: int = 60


@dataclass
class SecurityConfig:
    """セキュリティ設定"""

    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    jwt_refresh_expiration_days: int = 7
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_symbols: bool = True
    session_timeout_minutes: int = 30
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15


@dataclass
class TradingConfig:
    """取引設定"""

    initial_capital: float = 1000000.0
    max_position_size: float = 100000.0
    max_positions_count: int = 20
    risk_limit_percentage: float = 2.0
    stop_loss_percentage: float = 5.0
    take_profit_percentage: float = 10.0
    trading_hours_enabled: bool = True
    market_open_hour: int = 9
    market_close_hour: int = 16
    trading_days: List[str] = field(
        default_factory=lambda: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    )
    auto_trade_enabled: bool = False
    approval_required_threshold: float = 50000.0


@dataclass
class MLConfig:
    """機械学習設定"""

    model_registry_path: str = "models/registry"
    model_backup_enabled: bool = True
    auto_retraining_enabled: bool = True
    retraining_interval_hours: int = 24
    model_validation_enabled: bool = True
    feature_engineering_enabled: bool = True
    ensemble_models: List[str] = field(
        default_factory=lambda: ["lightgbm", "random_forest", "neural_network"]
    )
    hyperparameter_tuning_enabled: bool = True
    cross_validation_folds: int = 5


@dataclass
class MonitoringConfig:
    """監視設定"""

    log_level: str = "INFO"
    log_format: str = "json"
    metrics_enabled: bool = True
    metrics_collection_interval_seconds: int = 60
    health_check_enabled: bool = True
    health_check_interval_seconds: int = 30
    performance_monitoring_enabled: bool = True
    alert_webhook_url: Optional[str] = None
    alert_email_enabled: bool = False
    alert_email_recipients: List[str] = field(default_factory=list)


@dataclass
class CacheConfig:
    """キャッシュ設定"""

    redis_enabled: bool = True
    memory_cache_size: int = 1000
    memory_cache_ttl_seconds: int = 300
    redis_ttl_seconds: int = 3600
    cache_key_prefix: str = "trading:"
    compression_enabled: bool = True
    cleanup_interval_minutes: int = 10


@dataclass
class ExternalAPIConfig:
    """外部API設定"""

    alpha_vantage_api_key: str = ""
    yahoo_finance_api_key: str = ""
    news_api_key: str = ""
    rate_limit_per_minute: int = 5
    timeout_seconds: int = 30
    retry_attempts: int = 3
    retry_backoff_seconds: float = 1.0


@dataclass
class ApplicationConfig:
    """アプリケーション設定"""

    name: str = "Trading System"
    version: str = "1.0.0"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = False
    log_level: str = "INFO"

    # サブ設定
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)
    api: APIConfig = field(default_factory=APIConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    trading: TradingConfig = field(default_factory=TradingConfig)
    ml: MLConfig = field(default_factory=MLConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    cache: CacheConfig = field(default_factory=CacheConfig)
    external_apis: ExternalAPIConfig = field(default_factory=ExternalAPIConfig)


class ConfigLoader:
    """設定ローダー"""

    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(exist_ok=True)

    def load_from_file(self, file_path: Union[str, Path]) -> Dict[str, Any]:
        """ファイルから設定を読み込み"""

        file_path = Path(file_path)

        if not file_path.exists():
            logger.warning(f"Config file not found: {file_path}")
            return {}

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                if file_path.suffix.lower() == ".json":
                    return json.load(f)
                elif file_path.suffix.lower() in [".yml", ".yaml"]:
                    return yaml.safe_load(f)
                else:
                    logger.error(f"Unsupported config file format: {file_path.suffix}")
                    return {}

        except Exception as e:
            logger.error(f"Failed to load config from {file_path}: {e}")
            return {}

    def load_from_env(self, prefix: str = "TRADING_") -> Dict[str, Any]:
        """環境変数から設定を読み込み"""

        config = {}

        for key, value in os.environ.items():
            if key.startswith(prefix):
                config_key = key[len(prefix) :].lower()
                config[config_key] = self._parse_env_value(value)

        return config

    def _parse_env_value(self, value: str) -> Any:
        """環境変数値を解析"""

        # ブール値
        if value.lower() in ["true", "false"]:
            return value.lower() == "true"

        # 数値
        try:
            if "." in value:
                return float(value)
            else:
                return int(value)
        except ValueError:
            pass

        # 文字列
        return value

    def save_to_file(self, config: Dict[str, Any], file_path: Union[str, Path]) -> bool:
        """設定をファイルに保存"""

        file_path = Path(file_path)

        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)

            with open(file_path, "w", encoding="utf-8") as f:
                if file_path.suffix.lower() == ".json":
                    json.dump(config, f, indent=2, ensure_ascii=False)
                elif file_path.suffix.lower() in [".yml", ".yaml"]:
                    yaml.dump(config, f, default_flow_style=False)
                else:
                    logger.error(f"Unsupported config file format: {file_path.suffix}")
                    return False

            logger.info(f"Config saved to {file_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to save config to {file_path}: {e}")
            return False


class ConfigurationManager:
    """設定管理マネージャー"""

    def __init__(self):
        self.loader = ConfigLoader()
        self._config: Optional[ApplicationConfig] = None
        self._config_sources: List[str] = []

    def load_config(
        self,
        environment: Optional[Union[str, Environment]] = None,
        config_file: Optional[str] = None,
    ) -> ApplicationConfig:
        """設定を読み込み"""

        # 環境を決定
        if environment:
            if isinstance(environment, str):
                environment = Environment(environment.lower())
        else:
            environment = Environment(os.getenv("ENVIRONMENT", "development"))

        # 設定ファイル名を決定
        config_filename = f"config.{environment.value}.yml"
        config_file_path = (
            Path(config_file)
            if config_file
            else self.loader.config_dir / config_filename
        )

        # 設定をマージ（優先順：環境変数 > 設定ファイル > デフォルト）
        config_data = {}

        # 1. デフォルト設定
        config_data.update(self._get_default_config())

        # 2. 設定ファイル
        file_config = self.loader.load_from_file(config_file_path)
        config_data.update(file_config)

        # 3. 環境変数
        env_config = self.loader.load_from_env()
        config_data.update(env_config)

        # 設定オブジェクトを作成
        self._config = self._create_config_from_dict(config_data)
        self._config.environment = environment

        logger.info(f"Configuration loaded for environment: {environment.value}")
        return self._config

    def _get_default_config(self) -> Dict[str, Any]:
        """デフォルト設定を取得"""

        default_config = ApplicationConfig()
        return {
            "database": default_config.database.__dict__,
            "redis": default_config.redis.__dict__,
            "api": default_config.api.__dict__,
            "security": default_config.security.__dict__,
            "trading": default_config.trading.__dict__,
            "ml": default_config.ml.__dict__,
            "monitoring": default_config.monitoring.__dict__,
            "cache": default_config.cache.__dict__,
            "external_apis": default_config.external_apis.__dict__,
        }

    def _create_config_from_dict(
        self, config_data: Dict[str, Any]
    ) -> ApplicationConfig:
        """辞書から設定オブジェクトを作成"""

        return ApplicationConfig(
            database=DatabaseConfig(**config_data.get("database", {})),
            redis=RedisConfig(**config_data.get("redis", {})),
            api=APIConfig(**config_data.get("api", {})),
            security=SecurityConfig(**config_data.get("security", {})),
            trading=TradingConfig(**config_data.get("trading", {})),
            ml=MLConfig(**config_data.get("ml", {})),
            monitoring=MonitoringConfig(**config_data.get("monitoring", {})),
            cache=CacheConfig(**config_data.get("cache", {})),
            external_apis=ExternalAPIConfig(**config_data.get("external_apis", {})),
        )

    def get_config(self) -> Optional[ApplicationConfig]:
        """現在の設定を取得"""
        return self._config

    def reload_config(self) -> ApplicationConfig:
        """設定を再読み込み"""
        if self._config:
            environment = self._config.environment
            return self.load_config(environment)

        return self.load_config()

    def validate_config(self) -> List[str]:
        """設定を検証"""

        if not self._config:
            return ["Configuration not loaded"]

        errors = []

        # 必須項目の検証
        if not self._config.database.username:
            errors.append("Database username is required")

        if not self._config.security.jwt_secret:
            errors.append("JWT secret is required")

        if (
            self._config.security.jwt_secret
            and len(self._config.security.jwt_secret) < 32
        ):
            errors.append("JWT secret must be at least 32 characters")

        # ポート範囲の検証
        if not (1 <= self._config.api.port <= 65535):
            errors.append("API port must be between 1 and 65535")

        # 取引設定の検証
        if self._config.trading.max_position_size < 0:
            errors.append("Max position size must be positive")

        return errors

    def get_database_url(self) -> str:
        """データベース接続URLを生成"""

        if not self._config:
            return ""

        db = self._config.database
        return (
            f"postgresql://{db.username}:{db.password}@"
            f"{db.host}:{db.port}/{db.database}"
            f"{'?sslmode=require' if db.ssl_mode else ''}"
        )

    def get_redis_url(self) -> str:
        """Redis接続URLを生成"""

        if not self._config:
            return ""

        redis = self._config.redis
        auth_part = f":{redis.password}@" if redis.password else ""
        return f"redis://{auth_part}{redis.host}:{redis.port}/{redis.db}"


# グローバル設定マネージャー
_config_manager: Optional[ConfigurationManager] = None


def get_config_manager() -> ConfigurationManager:
    """グローバル設定マネージャーを取得"""

    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigurationManager()

    return _config_manager


def load_config(
    environment: Optional[Union[str, Environment]] = None,
    config_file: Optional[str] = None,
) -> ApplicationConfig:
    """設定を読み込むユーティリティ関数"""

    return get_config_manager().load_config(environment, config_file)


def get_config() -> Optional[ApplicationConfig]:
    """現在の設定を取得するユーティリティ関数"""

    return get_config_manager().get_config()
