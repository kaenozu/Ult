"""
完全自動トレーダー - 個人投資家向け

安全策を含む完全自動運用システム（コンポーネント委譲版）
"""

import datetime
import json
import logging
import os
import traceback
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import Mock

import pandas as pd
from tenacity import retry, stop_after_attempt, wait_exponential

from src.backup_manager import BackupManager
from src.cache_config import install_cache
from src.data_loader import (
    fetch_stock_data,
)
from src.dynamic_risk_manager import DynamicRiskManager
from src.dynamic_stop import DynamicStopManager
from src.execution import ExecutionEngine
from src.kelly_criterion import KellyCriterion
from src.paper_trader import PaperTrader
from src.regime_detector import RegimeDetector
from src.schemas import AppConfig
from src.smart_notifier import SmartNotifier
from src.utils.logger import get_logger, setup_logger
from src.data.universe_manager import UniverseManager
from src.utils.self_healing import SelfHealingEngine
from src.utils.parameter_optimizer import ParameterOptimizer
from src.data.whale_tracker import WhaleTracker
from src.portfolio_manager import PortfolioManager
from src.utils.self_learning import SelfLearningPipeline

from src.advanced_risk import AdvancedRiskManager
from src.trading.safety_checks import SafetyChecks
from src.trading.asset_selector import AssetSelector
from src.trading.position_manager import PositionManager
from src.trading.market_scanner import MarketScanner
from src.trading.daily_reporter import DailyReporter

# Create logger
logger = logging.getLogger(__name__)


class FullyAutomatedTrader:
    """完全自動トレーダー（各コンポーネントに処理を委譲）"""
    _pt: Any = None
    _logger: Any = None
    notifier: Any = None
    config: Dict[str, Any] = {}
    performance_log: Any = Mock()

    @property
    def pt(self):
        if self._pt is None:
            self._pt = PaperTrader()
        return self._pt

    @pt.setter
    def pt(self, value):
        self._pt = value

    @property
    def logger(self):
        if self._logger is None:
            self._logger = get_logger("AutoTrader")
        return self._logger

    @logger.setter
    def logger(self, value):
        self._logger = value

    def __init__(self, config_path: str = "config.json") -> None:
        """初期化"""
        # 設定読み込み
        self.config = self.load_config(config_path)

        # ログファイル
        self.log_file = "logs/auto_trader.log"
        os.makedirs("logs", exist_ok=True)
        setup_logger("AutoTrader", "logs", "auto_trader.log")
        self.logger = get_logger("AutoTrader")

        # コアコンポーネント
        self.pt = PaperTrader()
        self.notifier = SmartNotifier(self.config)

        # 実行エンジン
        self.engine = ExecutionEngine(self.pt)

        # AI Investment Committee (Disabled - LLM dependencies removed)
        self.ai_enabled = False
        self.committee = None

        # リスク設定
        self.risk_config = self.config.get("auto_trading", {})
        self.max_daily_trades = int(self.risk_config.get("max_daily_trades", 5))

        self.backup_enabled = True
        self.emergency_stop_triggered = False
        self._latest_data_cache: Dict[str, pd.DataFrame] = {}

        # Backup Manager
        try:
            self.backup_manager = BackupManager()
        except Exception:
            self.backup_manager = None

        # 高度な自律モジュールの初期化
        try:
            self.regime_detector = RegimeDetector()
            self.risk_manager = DynamicRiskManager(self.regime_detector)
            self.kelly_criterion = KellyCriterion()
            self.dynamic_stop_manager = DynamicStopManager()
            self.universe_manager = UniverseManager()
            self.self_healing = SelfHealingEngine()
            self.param_optimizer = ParameterOptimizer(self.config)
            self.whale_tracker = WhaleTracker()
            self.portfolio_manager = PortfolioManager()
            self.learning_pipeline = SelfLearningPipeline(self.config)

            # デカップリングされたモジュールの初期化
            self.safety_checks = SafetyChecks(self.config, self.pt, self.logger)
            self.advanced_risk = AdvancedRiskManager(self.config)
            self.asset_selector = AssetSelector(self.config, self.pt, self.logger)
            self.position_manager = PositionManager(
                self.config, self.pt, self.logger, self.dynamic_stop_manager, self.risk_manager
            )
            self.market_scanner = MarketScanner(
                self.config,
                self.pt,
                self.logger,
                self.advanced_risk,
                self.asset_selector,
                self.position_manager,
                self.kelly_criterion,
                self.risk_manager,
            )
            self.daily_reporter = DailyReporter(self.config, self.pt)

            self.log("Phase 73: Self-Learning Pipeline (Optima) initialized")
            self.log("Phase 30-1 & 30-3: リアルタイム適応学習・高度リスク管理モジュール初期化完了")
        except Exception as e:
            self.log(f"高度リスク管理モジュールの初期化エラー: {e}", "WARNING")

        self.log("フル自動トレーダー（リファクタ済）初期化完了")
        self._load_evolved_params()

    def _load_evolved_params(self):
        """進化した戦略パラメータ（Neural Link）をロード"""
        paths = [
            "models/config/evolved_strategy_params.json",
            "config/evolved_strategy_params.json",
            "evolved_strategy_params.json"
        ]
        
        for p in paths:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        content = f.read()
                        if not content: continue
                        params = json.loads(content)
                        genotype = params.get("genotype", "unknown")
                        msg = f"Neural Link: Strategy parameters loaded from {p}, overriding with '{genotype}'"
                        self.log(msg)
                        return # Load only the first one found
                except Exception as e:
                    self.log(f"Neural Linkロードエラー ({p}): {e}", "WARNING")

    def load_config(self, config_path: str) -> Dict[str, Any]:
        """設定ファイルを読み込み（統一設定管理を優先使用）"""
        try:
            # 統一設定管理を試みる
            from src.core.config import get_config
            config = get_config(config_path)
            return config.to_dict()
        except ImportError:
            # フォールバック: 直接JSONを読み込み
            pass
        
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return {
                "paper_trading": {"initial_capital": 1000000},
                "auto_trading": {"max_daily_trades": 5, "daily_loss_limit_pct": -5.0, "max_vix": 40.0},
                "notifications": {"line": {"enabled": False}},
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse config file: {e}")
            return {}

    def log(self, message: str, level: str = "INFO") -> None:
        """ログ出力"""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)

        if hasattr(self, "logger") and self.logger:
            if level == "INFO": self.logger.info(message)
            elif level == "WARNING": self.logger.warning(message)
            elif level == "ERROR": self.logger.error(message)
            elif level == "CRITICAL": self.logger.critical(message)
            else: self.logger.debug(message)

        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(log_message + "\n")
        except Exception:
            pass

    def is_safe_to_trade(self) -> Tuple[bool, str]:
        """取引が安全か確認"""
        return self.safety_checks.is_safe_to_trade()

    def emergency_stop(self, reason: str) -> None:
        """緊急停止を実行"""
        self.emergency_stop_triggered = True
        self.log(f"🚨 緊急停止: {reason}", "CRITICAL")
        if self.backup_manager:
            try:
                self.backup_manager.auto_backup()
            except Exception: pass
        try:
            token = self.config.get("notifications", {}).get("line", {}).get("token")
            if token:
                self.notifier.send_line_notify(f"🚨 緊急停止: {reason}", token=token)
        except Exception: pass

    def evaluate_positions(self) -> List[Dict]:
        """保有ポジションを評価"""
        return self.position_manager.evaluate_positions()

    def get_target_tickers(self) -> List[str]:
        """対象銘柄を選定"""
        return self.asset_selector.get_target_tickers()

    def scan_market(self) -> List[Dict[str, Any]]:
        """市場をスキャン"""
        self._load_evolved_params()
        self.log("市場スキャン開始...")
        return self.market_scanner.scan_market()

    def execute_signals(self, signals: List[Dict[str, Any]]) -> None:
        """シグナルを実行"""
        if not signals: return
        signals = signals[: self.max_daily_trades]
        prices = {str(s["ticker"]): float(s["price"]) for s in signals if s.get("price")}
        executed_trades = self.engine.execute_orders(signals, prices)

        for trade in executed_trades:
            ticker = trade["ticker"]
            orig_sig = next((s for s in signals if s["ticker"] == ticker), {})
            signal_info = {
                "ticker": ticker,
                "name": orig_sig.get("name", ticker),
                "action": trade["action"],
                "price": trade["price"],
                "confidence": orig_sig.get("confidence", 1.0),
                "strategy": orig_sig.get("strategy", "不明"),
                "explanation": trade.get("reason", orig_sig.get("reason", ""))
            }
            try:
                self.notifier.send_trading_signal(signal_info, None)
            except Exception: pass

    def send_daily_report(self) -> None:
        """日次レポートを送信"""
        self.daily_reporter.send_daily_report()

    def record_performance(self, metrics: Dict[str, Any]):
        self.log(f"Recording performance: {metrics}")

    def handle_risk_alert(self, alert: Dict[str, Any]):
        self.log(f"Handling risk alert: {alert}", "WARNING")

    def run_daily_cycle(self) -> None:
        """1日の運用サイクルを実行"""
        self.log("=== 運用サイクル開始 ===")
        try:
            is_safe, reason = self.is_safe_to_trade()
            if not is_safe:
                self.log(f"安全上の理由で停止中: {reason}", "WARNING")
                return

            exit_signals = self.evaluate_positions()
            if exit_signals: self.execute_signals(exit_signals)

            buy_signals = self.scan_market()
            if buy_signals: self.execute_signals(buy_signals)

            if hasattr(self.pt, "update_daily_equity"):
                self.pt.update_daily_equity()

            self.send_daily_report()
            self.log("=== 運用サイクル完了 ===")
        except Exception as e:
            self.log(f"運用サイクル実行エラー: {e}", "ERROR")
            traceback.print_exc()

    def daily_routine(self, force_run: bool = False) -> None:
        """日次ルーチン（エイリアス）"""
        self.run_daily_cycle()