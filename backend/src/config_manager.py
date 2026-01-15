"""設定管理モジュール

このモジュールは、AGStockプロジェクトの設定値の読み込み、検証、管理を行うための機能を提供します。
設定値はJSONファイルから読み込まれ、型検証とエラーハンドリングが行われます。

主な機能:
    pass
- 設定ファイルの読み込みと検証
- 設定値の取得と更新
- デフォルト設定の提供
- 設定値の保存
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional, Union

from .errors import ConfigurationError


@dataclass
class TradingConfig:
    """取引設定データクラス

    取引システム全体の設定値を保持するためのデータクラスです。

    Attributes:
        initial_capital (float): 初期資本金
        paper_trading_initial_capital (float): ペ拟取引の初期資本金
        risk_management (Dict[str, Any]): リスク管理設定
        mini_stock (Dict[str, Any]): ミニ株設定
        backtest (Dict[str, Any]): バックテスト設定
    """

    initial_capital: float = 1000000.0
    paper_trading_initial_capital: float = 1000000.0
    risk_management: Dict[str, Any] = field(default_factory=dict)
    mini_stock: Dict[str, Any] = field(default_factory=dict)
    backtest: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """初期化後の検証を行う"""
        # データ型の検証
        if not isinstance(self.initial_capital, (int, float)) or self.initial_capital <= 0:
            raise ConfigurationError(
                message="Initial capital must be a positive number",
                config_key="initial_capital",
            )

        if not isinstance(self.paper_trading_initial_capital, (int, float)) or self.paper_trading_initial_capital <= 0:
            raise ConfigurationError(
                message="Paper trading initial capital must be a positive number",
                config_key="paper_trading_initial_capital",
            )


class ConfigManager:
    """設定管理クラス

    設定ファイルの読み込み、検証、更新、保存を行うためのクラスです。
    設定はJSON形式で保存・読み込みされ、型検証とエラーハンドリングが行われます。

    Attributes:
        config_path (Path): 設定ファイルのパス
        config_data (Dict[str, Any]): 設定データ
    """

    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        """ConfigManagerの初期化

        Args:
            config_path (Optional[Union[str, Path]]): 設定ファイルのパス
        """
        self.config_path = Path(config_path) if config_path else Path("config.json")
        self.config_data: Dict[str, Any] = {}
        self.load_config()

    def load_config(self) -> TradingConfig:
        """設定を読み込む

        Returns:
            TradingConfig: 読み込まれた設定オブジェクト
        """
        if not self.config_path.exists():
            # デフォルト設定を生成
            self.config_data = self._get_default_config()
        else:
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self.config_data = json.load(f)
            except json.JSONDecodeError as e:
                raise ConfigurationError(
                    message=f"Failed to parse config file: {self.config_path}",
                    config_key="config_file",
                    details={
                        "file_path": str(self.config_path),
                        "original_error": str(e),
                    },
                ) from e
            except Exception as e:
                raise ConfigurationError(
                    message=f"Failed to load config file: {self.config_path}",
                    config_key="config_file",
                    details={
                        "file_path": str(self.config_path),
                        "original_error": str(e),
                    },
                ) from e

        return self._validate_and_create_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """デフォルト設定を取得

        Returns:
            Dict[str, Any]: デフォルト設定の辞書
        """
        return {
            "initial_capital": 1000000.0,
            "paper_trading": {"initial_capital": 1000000.0},
            "risk_management": {
                "daily_loss_limit_pct": -5.0,
                "max_position_size_pct": 10.0,
                "max_vix": 40.0,
                "max_drawdown_limit_pct": -20.0,
            },
            "mini_stock": {
                "enabled": True,
                "unit_size": 1,
                "min_order_amount": 500.0,
                "spread_rate": 0.0022,
            },
            "backtest": {"default_period": "2y", "default_interval": "1d"},
        }

    def _validate_and_create_config(self) -> TradingConfig:
        """設定データを検証してTradingConfigオブジェクトを作成

        Returns:
            TradingConfig: 検証された設定オブジェクト
        """
        try:
            # 必須キーの検証
            required_keys = ["initial_capital"]
            for key in required_keys:
                if key not in self.config_data:
                    raise ConfigurationError(
                        message=f"Missing required configuration key: {key}",
                        config_key=key,
                    )

            # 各セクションの検証
            paper_trading = self.config_data.get("paper_trading", {})
            risk_management = self.config_data.get("risk_management", {})
            mini_stock = self.config_data.get("mini_stock", {})
            backtest = self.config_data.get("backtest", {})

            # TradingConfigオブジェクトの作成
            config = TradingConfig(
                initial_capital=self.config_data.get("initial_capital", 1000000.0),
                paper_trading_initial_capital=paper_trading.get("initial_capital", 1000000.0),
                risk_management=risk_management,
                mini_stock=mini_stock,
                backtest=backtest,
            )

            return config
        except ConfigurationError:
            # ConfigurationErrorは既に適切に処理されているので再スロー
            raise
        except Exception as e:
            raise ConfigurationError(
                message="Invalid configuration format",
                config_key="config_validation",
                details={"original_error": str(e)},
            ) from e

    def get(self, key: str, default: Any = None) -> Any:
        """設定値を取得

        Args:
            key (str): 設定キー
            default (Any): デフォルト値

        Returns:
            Any: 設定値。存在しない場合はデフォルト値
        """
        return self.config_data.get(key, default)

    def get_nested(self, path: str, default: Any = None) -> Any:
        """ネストされた設定値をパスで取得 (例: "risk_management.daily_loss_limit_pct")

        Args:
            path (str): ドス表記された設定キー（ドット区切り）
            default (Any): デフォルト値

        Returns:
            Any: 設定値。存在しない場合はデフォルト値
        """
        keys = path.split(".")
        value = self.config_data

        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default

        return value

    def update_config(self, new_config: Dict[str, Any]):
        """設定を更新

        Args:
            new_config (Dict[str, Any]): 新しい設定値の辞書
        """
        self.config_data.update(new_config)

        # 設定の再検証
        self._validate_and_create_config()

    def save_config(self, output_path: Optional[Union[str, Path]] = None):
        """設定をファイルに保存

        Args:
            output_path (Optional[Union[str, Path]]): 保存先パス。Noneの場合は初期化時のパスを使用
        """
        path = Path(output_path) if output_path else self.config_path

        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(self.config_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            raise ConfigurationError(
                message=f"Failed to save config file: {path}",
                config_key="config_save",
                details={"file_path": str(path), "original_error": str(e)},
            ) from e


# グローバル設定マネージャー（必要に応じて）
_global_config_manager: Optional[ConfigManager] = None


def get_global_config_manager() -> ConfigManager:
    """グローバル設定マネージャーを取得

    Returns:
        ConfigManager: シングルトンの設定マネージャーインスタンス
    """
    global _global_config_manager
    if _global_config_manager is None:
        _global_config_manager = ConfigManager()
    return _global_config_manager


def get_config_value(key: str, default: Any = None) -> Any:
    """グローバル設定マネージャーから設定値を取得

    Args:
        key (str): 設定キー
        default (Any): デフォルト値

    Returns:
        Any: 設定値。存在しない場合はデフォルト値
    """
    config_manager = get_global_config_manager()
    return config_manager.get(key, default)
