"""
金融リスク管理モジュール
無制限トレーディング防止とサーキットブレーカー機能を実装
"""

import logging
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import threading

from .secure_config import get_secure_config, log_security_event
from .secure_data_manager import get_secure_data_manager

logger = logging.getLogger(__name__)


class TradingState(Enum):
    """取引状態"""

    NORMAL = "normal"
    WARNING = "warning"
    CIRCUIT_BREAKER = "circuit_breaker"
    EMERGENCY_STOP = "emergency_stop"


class RiskLevel(Enum):
    """リスクレベル"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class TradingMetrics:
    """取引メトリクス"""

    daily_trades: int = 0
    daily_pnl: float = 0.0
    total_exposure: float = 0.0
    max_position_size: float = 0.0
    vix_level: float = 0.0
    consecutive_losses: int = 0
    last_trade_time: Optional[datetime] = None


@dataclass
class RiskAlert:
    """リスクアラート"""

    level: RiskLevel
    message: str
    timestamp: datetime
    metrics: Dict[str, Any]


class CircuitBreaker:
    """サーキットブレーカー"""

    def __init__(self):
        self.state = TradingState.NORMAL
        self.trigger_time: Optional[datetime] = None
        self.cooldown_period = timedelta(hours=1)
        self.max_cooldowns = 3
        self.cooldown_count = 0
        self._lock = threading.Lock()

    def trigger(self, reason: str, level: RiskLevel) -> bool:
        """サーキットブレーカーを作動"""
        with self._lock:
            if self.state == TradingState.EMERGENCY_STOP:
                return False

            if level == RiskLevel.CRITICAL:
                self.state = TradingState.EMERGENCY_STOP
                self.trigger_time = datetime.now()
                logger.critical(f"緊急停止を作動: {reason}")
                log_security_event("EMERGENCY_STOP", {"reason": reason})
                return True

            elif level == RiskLevel.HIGH:
                if self.cooldown_count >= self.max_cooldowns:
                    self.state = TradingState.EMERGENCY_STOP
                    self.trigger_time = datetime.now()
                    logger.critical(f"最大クールダウン回数に達したため緊急停止: {reason}")
                    log_security_event("EMERGENCY_STOP", {"reason": f"Max cooldowns: {reason}"})
                    return True
                else:
                    self.state = TradingState.CIRCUIT_BREAKER
                    self.trigger_time = datetime.now()
                    self.cooldown_count += 1
                    logger.warning(f"サーキットブレーカーを作動: {reason}")
                    return True

            return False

    def can_trade(self) -> Tuple[bool, str]:
        """取引可能か判定"""
        with self._lock:
            if self.state == TradingState.NORMAL:
                return True, "取引可能"

            elif self.state == TradingState.WARNING:
                return True, "警告状態ですが取引可能"

            elif self.state == TradingState.CIRCUIT_BREAKER:
                if self.trigger_time and datetime.now() - self.trigger_time > self.cooldown_period:
                    self.state = TradingState.NORMAL
                    self.trigger_time = None
                    logger.info("サーキットブレーカーが解除されました")
                    return True, "サーキットブレーカー解除"
                else:
                    remaining = self.cooldown_period - (datetime.now() - self.trigger_time)
                    return False, f"サーキットブレーカー作動中 (残り: {remaining})"

            elif self.state == TradingState.EMERGENCY_STOP:
                return False, "緊急停止状態 - 取引できません"

            return False, "不明な状態"

    def reset(self) -> None:
        """サーキットブレーカーをリセット"""
        with self._lock:
            self.state = TradingState.NORMAL
            self.trigger_time = None
            self.cooldown_count = 0
            logger.info("サーキットブレーカーをリセットしました")


class RiskManager:
    """リスク管理クラス"""

    def __init__(self):
        self.config_manager = get_secure_config()
        self.data_manager = get_secure_data_manager()
        self.circuit_breaker = CircuitBreaker()
        self.metrics = TradingMetrics()
        self.risk_alerts: List[RiskAlert] = []
        self._lock = threading.Lock()

        # リスク閾値
        self.risk_thresholds = {
            "max_daily_loss_pct": -3.0,
            "max_consecutive_losses": 5,
            "max_position_exposure_pct": 0.5,
            "min_vix_for_warning": 30.0,
            "max_vix_for_stop": 50.0,
            "max_daily_trades": 10,
            "trade_cooldown_minutes": 5,
        }

    def evaluate_trade_risk(self, ticker: str, action: str, quantity: int, price: float) -> Tuple[bool, str, RiskLevel]:
        """取引リスクを評価"""
        with self._lock:
            try:
                # 基本検証
                if not self._validate_trade_params(ticker, action, quantity, price):
                    return False, "無効な取引パラメータ", RiskLevel.CRITICAL

                # サーキットブレーカー確認
                can_trade, reason = self.circuit_breaker.can_trade()
                if not can_trade:
                    return False, reason, RiskLevel.CRITICAL

                # リスク評価
                risk_level = self._calculate_trade_risk(ticker, action, quantity, price)

                # リスクレベルに基づく判定
                if risk_level == RiskLevel.CRITICAL:
                    self.circuit_breaker.trigger(f"クリティカルリスク: {ticker}", risk_level)
                    return False, "クリティカルリスク - 取引拒否", risk_level

                elif risk_level == RiskLevel.HIGH:
                    can_trade, cb_reason = self.circuit_breaker.can_trade()
                    if not can_trade:
                        return False, cb_reason, risk_level
                    return True, "高リスクですが取引可能", risk_level

                else:
                    return True, "取引可能", risk_level

            except Exception as e:
                logger.error(f"取引リスク評価エラー: {e}")
                return False, f"リスク評価エラー: {e}", RiskLevel.CRITICAL

    def _validate_trade_params(self, ticker: str, action: str, quantity: int, price: float) -> bool:
        """取引パラメータを検証"""
        if not ticker or len(ticker) > 10:
            return False

        if action.lower() not in ["buy", "sell"]:
            return False

        if quantity <= 0 or quantity > 10000:
            return False

        if price <= 0 or price > 1000000:
            return False

        return True

    def _calculate_trade_risk(self, ticker: str, action: str, quantity: int, price: float) -> RiskLevel:
        """取引リスクを計算"""
        risk_factors = []

        # ポジションサイズリスク
        trade_value = quantity * price
        trading_limits = self.config_manager.get_trading_limits()
        max_position = trading_limits.max_position_size_pct

        if trade_value > 1000000:  # 100万円超
            risk_factors.append(RiskLevel.HIGH)
        elif trade_value > 500000:  # 50万円超
            risk_factors.append(RiskLevel.MEDIUM)

        # 日次取引回数リスク
        if self.metrics.daily_trades >= trading_limits.max_daily_trades:
            risk_factors.append(RiskLevel.CRITICAL)
        elif self.metrics.daily_trades >= trading_limits.max_daily_trades * 0.8:
            risk_factors.append(RiskLevel.HIGH)

        # 連続損失リスク
        if self.metrics.consecutive_losses >= 5:
            risk_factors.append(RiskLevel.CRITICAL)
        elif self.metrics.consecutive_losses >= 3:
            risk_factors.append(RiskLevel.HIGH)

        # VIXレベルリスク
        if self.metrics.vix_level >= 50.0:
            risk_factors.append(RiskLevel.CRITICAL)
        elif self.metrics.vix_level >= 30.0:
            risk_factors.append(RiskLevel.HIGH)

        # 時間的リスク（クールダウン）
        if self.metrics.last_trade_time:
            time_since_last = datetime.now() - self.metrics.last_trade_time
            if time_since_last < timedelta(minutes=1):
                risk_factors.append(RiskLevel.HIGH)

        # 最も高いリスクレベルを返す
        if risk_factors:
            return max(risk_factors)

        return RiskLevel.LOW

    def update_metrics(self, trade_result: Dict[str, Any]) -> None:
        """取引メトリクスを更新"""
        with self._lock:
            try:
                # 日次取引回数
                if trade_result.get("timestamp"):
                    trade_date = datetime.fromisoformat(trade_result["timestamp"]).date()
                    today = datetime.now().date()

                    if trade_date == today:
                        self.metrics.daily_trades += 1
                    else:
                        # 日付が変わったらリセット
                        self.metrics.daily_trades = 1
                        self.metrics.daily_pnl = 0.0

                # 損益更新
                if "pnl" in trade_result:
                    pnl = trade_result["pnl"]
                    self.metrics.daily_pnl += pnl

                    # 連続損失カウント
                    if pnl < 0:
                        self.metrics.consecutive_losses += 1
                    else:
                        self.metrics.consecutive_losses = 0

                # 最終取引時間
                self.metrics.last_trade_time = datetime.now()

                # リスク評価
                self._evaluate_overall_risk()

            except Exception as e:
                logger.error(f"メトリクス更新エラー: {e}")

    def _evaluate_overall_risk(self) -> None:
        """全体リスクを評価"""
        alerts = []

        # 日次損失リスク
        trading_limits = self.config_manager.get_trading_limits()
        daily_loss_limit = trading_limits.daily_loss_limit_pct

        if self.metrics.daily_pnl <= daily_loss_limit * 10000:  # 簡易計算
            alert = RiskAlert(
                level=RiskLevel.HIGH,
                message=f"日次損失リミット接近: {self.metrics.daily_pnl:.0f}",
                timestamp=datetime.now(),
                metrics={"daily_pnl": self.metrics.daily_pnl},
            )
            alerts.append(alert)

        # 連続損失リスク
        if self.metrics.consecutive_losses >= 3:
            alert = RiskAlert(
                level=RiskLevel.HIGH,
                message=f"連続損失: {self.metrics.consecutive_losses}回",
                timestamp=datetime.now(),
                metrics={"consecutive_losses": self.metrics.consecutive_losses},
            )
            alerts.append(alert)

        # アラートを処理
        for alert in alerts:
            self.risk_alerts.append(alert)
            logger.warning(f"リスクアラート: {alert.message}")

            # 高リスクの場合はサーキットブレーカーを作動
            if alert.level == RiskLevel.HIGH:
                self.circuit_breaker.trigger(alert.message, alert.level)

    def get_risk_summary(self) -> Dict[str, Any]:
        """リスク概要を取得"""
        with self._lock:
            can_trade, cb_reason = self.circuit_breaker.can_trade()

            return {
                "trading_state": self.circuit_breaker.state.value,
                "can_trade": can_trade,
                "circuit_breaker_reason": cb_reason,
                "daily_trades": self.metrics.daily_trades,
                "daily_pnl": self.metrics.daily_pnl,
                "consecutive_losses": self.metrics.consecutive_losses,
                "vix_level": self.metrics.vix_level,
                "last_trade_time": self.metrics.last_trade_time.isoformat() if self.metrics.last_trade_time else None,
                "recent_alerts": [
                    {
                        "level": alert.level.value,
                        "message": alert.message,
                        "timestamp": alert.timestamp.isoformat(),
                    }
                    for alert in self.risk_alerts[-5:]  # 最新5件
                ],
            }

    def reset_daily_metrics(self) -> None:
        """日次メトリクスをリセット"""
        with self._lock:
            self.metrics.daily_trades = 0
            self.metrics.daily_pnl = 0.0
            self.metrics.consecutive_losses = 0
            logger.info("日次メトリクスをリセットしました")

    def emergency_stop(self, reason: str) -> None:
        """緊急停止を実行"""
        self.circuit_breaker.trigger(reason, RiskLevel.CRITICAL)
        logger.critical(f"手動緊急停止: {reason}")
        log_security_event("MANUAL_EMERGENCY_STOP", {"reason": reason})


# グローバルインスタンス
risk_manager = RiskManager()


def get_risk_manager() -> RiskManager:
    """リスクマネージャーを取得"""
    return risk_manager
