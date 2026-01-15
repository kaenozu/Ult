import copy
import json
import os

import yaml

DEFAULT_CONFIG = {
    "paper_trading": {"initial_capital": 1000000},
    "auto_trading": {
        "max_daily_trades": 5,
        "daily_loss_limit_pct": -5.0,
        "max_vix": 40.0,
    },
    "notifications": {"line": {"enabled": False}},
    "paths": {
        "log_dir": "logs",
        "auto_trader_log_file": "auto_trader.log",
    },
    "market_indices": {
        "vix": "^VIX",
        "japan_benchmark": "^N225",
    },
    "risk_management": {"min_cash_balance": 10000},
}


def _json_fallback_path(config_path: str) -> str:
    if config_path.endswith(".yaml"):
        return config_path.replace(".yaml", ".json")
    return f"{config_path}.json"


def _load_json_config(json_path: str) -> dict | None:
    if not os.path.exists(json_path):
        return None

    try:
        with open(json_path, "r", encoding="utf-8") as f_json:
            return json.load(f_json)
    except (OSError, json.JSONDecodeError):
        return None


def _default_config() -> dict:
    return copy.deepcopy(DEFAULT_CONFIG)


def load_config_from_yaml(config_path: str = "config.yaml") -> dict:
    """
    指定されたYAMLファイルから設定を読み込みます。
    ファイルが見つからない場合やパースに失敗した場合は、
    JSONのフォールバックまたはデフォルト設定を返します。
    """

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            loaded_config = yaml.safe_load(f)

        if not isinstance(loaded_config, dict):
            return _default_config()

        return loaded_config
    except FileNotFoundError:
        json_config_path = _json_fallback_path(config_path)
        json_config = _load_json_config(json_config_path)
        if json_config is not None:
            return json_config
        return _default_config()
    except yaml.YAMLError:
        return _default_config()
