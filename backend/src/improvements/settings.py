"""型安全な設定管理（Pydantic Settings v2）
"""

import os
from typing import Any, Dict, Optional

try:
    from pydantic_settings import BaseSettings
    from pydantic import Field, field_validator

    PYDANTIC_AVAILABLE = True
except ImportError:
    # Fallback for environments without pydantic-settings
    PYDANTIC_AVAILABLE = False
    BaseSettings = object

    def Field(**kwargs):
        """Fallback Field function"""
        return kwargs.get("default")

    def field_validator(*args, **kwargs):
        """Fallback field_validator decorator"""

        def decorator(f):
            return f

        return decorator


class RiskSettings:
    """リスク設定"""

    max_daily_loss_pct: float = -5.0
    max_position_size_pct: float = 10.0
    max_sector_exposure_pct: float = 35.0
    max_volatility_threshold: float = 40.0
    stop_loss_pct: float = -7.0
    take_profit_pct: float = 15.0


class TradingSettings:
    """取引設定"""

    default_position_size_usd: float = 10000.0
    min_stock_price_threshold: float = 5.0
    max_positions: int = 20
    rebalance_threshold_pct: float = 5.0


class CacheSettings:
    """キャッシュ設定"""

    realtime_ttl_seconds: int = 30
    realtime_backoff_seconds: float = 1.0
    fundamental_ttl_hours: int = 24
    market_summary_ttl_minutes: int = 5


class NotificationSettings:
    """通知設定"""

    line_notify_token: Optional[str] = None
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    quiet_hours: Optional[str] = None  # e.g., "22:00-07:00"


class AISettings:
    """АИ設定"""

    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    analyst_model: str = "gpt-4-turbo-preview"
    analyst_max_tokens: int = 2000
    analyst_timeout: int = 30
    analyst_quiet: bool = False


if PYDANTIC_AVAILABLE:

    class AGStockSettings(BaseSettings):
        """メイン設定クラス"""

        model_config = {
            "env_file": ".env",
            "env_prefix": "AGSTOCK_",
            "extra": "ignore",
        }

        # リスク設定
        max_daily_loss_pct: float = Field(default=-5.0, description="日次最大損失率")
        max_position_size_pct: float = Field(default=10.0, description="銀柄ごとの最大ポジション率")
        max_sector_exposure_pct: float = Field(default=35.0, description="セクターごとの最大エクスポージャー")
        max_volatility_threshold: float = Field(default=40.0, description="VIX閾値")
        stop_loss_pct: float = Field(default=-7.0, description="ストップロス率")
        take_profit_pct: float = Field(default=15.0, description="利確定率")

        # 取引設定
        default_position_size_usd: float = Field(default=10000.0, description="デフォルトポジションサイズ")
        min_stock_price_threshold: float = Field(default=5.0, description="最小株価閾値")
        max_positions: int = Field(default=20, description="最大ポジション数")
        rebalance_threshold_pct: float = Field(default=5.0, description="リバランス閾値")

        # キャッシュ設定
        realtime_ttl_seconds: int = Field(default=30, description="リアルタイムTTL秒")
        realtime_backoff_seconds: float = Field(default=1.0, description="リトライ間隔")

        # 通知設定
        line_notify_token: Optional[str] = Field(default=None, description="LINE Notifyトークン")
        slack_webhook_url: Optional[str] = Field(default=None, description="Slack Webhook URL")
        discord_webhook_url: Optional[str] = Field(default=None, description="Discord Webhook URL")
        quiet_hours: Optional[str] = Field(default=None, description="静音時間帯")

        # AI設定
        openai_api_key: Optional[str] = Field(default=None, description="OpenAI APIキー")
        gemini_api_key: Optional[str] = Field(default=None, description="Gemini APIキー")
        analyst_model: str = Field(default="gpt-4-turbo-preview", description="AIモデル")
        analyst_max_tokens: int = Field(default=2000, description="最大トークン数")
        analyst_timeout: int = Field(default=30, description="タイムアウト秒")

        # デバッグ
        use_demo_data: bool = Field(default=False, description="デモデータ使用")
        safe_mode: bool = Field(default=False, description="安全モード")
        trading_scenario: str = Field(default="neutral", description="取引シナリオ")

        @property
        def risk_limits(self) -> Dict[str, float]:
            """リスク制限辞書を取得"""
            return {
                "max_daily_loss": self.max_daily_loss_pct,
                "max_position": self.max_position_size_pct,
                "max_sector": self.max_sector_exposure_pct,
                "max_volatility": self.max_volatility_threshold,
                "stop_loss": self.stop_loss_pct,
                "take_profit": self.take_profit_pct,
            }

        @property
        def trading_config(self) -> Dict[str, Any]:
            """取引設定辞書を取得"""
            return {
                "default_position_size": self.default_position_size_usd,
                "min_price": self.min_stock_price_threshold,
                "max_positions": self.max_positions,
                "rebalance_threshold": self.rebalance_threshold_pct,
            }

        @field_validator("trading_scenario")
        @classmethod
        def validate_scenario(cls, v: str) -> str:
            allowed = ["conservative", "neutral", "aggressive"]
            if v not in allowed:
                raise ValueError(f"trading_scenario must be one of {allowed}")
            return v

else:
    # Fallback class without Pydantic
    class AGStockSettings:
        """メイン設定クラス（フォールバック）"""

        def __init__(self):
            # リスク設定
            self.max_daily_loss_pct = float(os.getenv("AGSTOCK_MAX_DAILY_LOSS_PCT", -5.0))
            self.max_position_size_pct = float(os.getenv("AGSTOCK_MAX_POSITION_SIZE_PCT", 10.0))
            self.max_sector_exposure_pct = float(os.getenv("AGSTOCK_MAX_SECTOR_EXPOSURE_PCT", 35.0))
            self.max_volatility_threshold = float(os.getenv("AGSTOCK_MAX_VOLATILITY_THRESHOLD", 40.0))
            self.stop_loss_pct = float(os.getenv("AGSTOCK_STOP_LOSS_PCT", -7.0))
            self.take_profit_pct = float(os.getenv("AGSTOCK_TAKE_PROFIT_PCT", 15.0))

            # 取引設定
            self.default_position_size_usd = float(os.getenv("AGSTOCK_DEFAULT_POSITION_SIZE_USD", 10000.0))
            self.min_stock_price_threshold = float(os.getenv("AGSTOCK_MIN_STOCK_PRICE_THRESHOLD", 5.0))
            self.max_positions = int(os.getenv("AGSTOCK_MAX_POSITIONS", 20))
            self.rebalance_threshold_pct = float(os.getenv("AGSTOCK_REBALANCE_THRESHOLD_PCT", 5.0))

            # キャッシュ設定
            self.realtime_ttl_seconds = int(os.getenv("AGSTOCK_REALTIME_TTL_SECONDS", 30))
            self.realtime_backoff_seconds = float(os.getenv("AGSTOCK_REALTIME_BACKOFF_SECONDS", 1.0))

            # 通知設定
            self.line_notify_token = os.getenv("AGSTOCK_LINE_NOTIFY_TOKEN")
            self.slack_webhook_url = os.getenv("AGSTOCK_SLACK_WEBHOOK_URL")
            self.discord_webhook_url = os.getenv("AGSTOCK_DISCORD_WEBHOOK_URL")
            self.quiet_hours = os.getenv("AGSTOCK_QUIET_HOURS")

            # AI設定
            self.openai_api_key = os.getenv("AGSTOCK_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
            self.gemini_api_key = os.getenv("AGSTOCK_GEMINI_API_KEY")
            self.analyst_model = os.getenv("AGSTOCK_ANALYST_MODEL", "gpt-4-turbo-preview")
            self.analyst_max_tokens = int(os.getenv("AGSTOCK_ANALYST_MAX_TOKENS", 2000))
            self.analyst_timeout = int(os.getenv("AGSTOCK_ANALYST_TIMEOUT", 30))

            # デバッグ
            self.use_demo_data = os.getenv("USE_DEMO_DATA", "").lower() in ("1", "true", "yes")
            self.safe_mode = os.getenv("SAFE_MODE", "").lower() in ("1", "true", "yes")
            self.trading_scenario = os.getenv("TRADING_SCENARIO", "neutral")

        @property
        def risk_limits(self) -> Dict[str, float]:
            return {
                "max_daily_loss": self.max_daily_loss_pct,
                "max_position": self.max_position_size_pct,
                "max_sector": self.max_sector_exposure_pct,
                "max_volatility": self.max_volatility_threshold,
                "stop_loss": self.stop_loss_pct,
                "take_profit": self.take_profit_pct,
            }

        @property
        def trading_config(self) -> Dict[str, Any]:
            return {
                "default_position_size": self.default_position_size_usd,
                "min_price": self.min_stock_price_threshold,
                "max_positions": self.max_positions,
                "rebalance_threshold": self.rebalance_threshold_pct,
            }


# シングルトンインスタンス
_settings: Optional[AGStockSettings] = None


def get_settings() -> AGStockSettings:
    """設定のシングルトンインスタンスを取得"""
    global _settings
    if _settings is None:
        _settings = AGStockSettings()
    return _settings


def reload_settings() -> AGStockSettings:
    """設定を再読み込み"""
    global _settings
    _settings = AGStockSettings()
    return _settings
