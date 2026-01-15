import logging
"""
AGStock Personal Edition - Safety Features
個人投資家向け安全・安心機能
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from src.log_config import get_logger
from src.database_manager import db_manager
from src.notification_system import notification_manager

logger = get_logger("safety_features")


@dataclass
class SafetySettings:
    """安全設定"""

    max_daily_loss_percent: float = 2.0
    max_position_size_percent: float = 20.0
    forced_stop_loss_percent: float = 5.0
    diversification_min_stocks: int = 5
    trading_hours_only: bool = True
    family_sharing_enabled: bool = False
    emergency_contact: Optional[str] = None


@dataclass
class RiskAlert:
    """リスクアラート"""

    id: str
    type: str  # "loss_limit", "concentration", "volatility", "suspicious_activity"
    severity: str  # "info", "warning", "critical", "emergency"
    message: str
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = ""
    resolved: bool = False
    auto_actions_taken: List[str] = field(default_factory=list)


class SafetyManager:
    """安全管理者クラス"""

    _instance: Optional["SafetyManager"] = None

    def __new__(cls) -> "SafetyManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True
        self.settings = self._load_safety_settings()
        self.risk_alerts = []
        self.trading_suspended = False
        self.emergency_mode = False

    def _load_safety_settings(self) -> SafetySettings:
        """安全設定読み込み"""
        try:
            saved = db_manager.get_config("safety_settings")
            if saved:
                return SafetySettings(**saved)
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")
        return SafetySettings()

    def save_safety_settings(self, settings: SafetySettings):
        """安全設定保存"""
        self.settings = settings
        db_manager.save_config("safety_settings", settings.__dict__, "safety")
        logger.info("Safety settings saved")

    def check_daily_loss_limit(self, current_portfolio: Dict[str, Any]) -> Optional[RiskAlert]:
        """日次損失リミットチェック"""
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # 本日の取引取得
        today_trades = [t for t in db_manager.get_trades() if datetime.fromisoformat(t["timestamp"]) >= today_start]

        if not today_trades:
            return None

        # 本日の損益計算
        daily_pnl = sum(t.get("pnl", 0) for t in today_trades)
        portfolio_value = current_portfolio.get("total_value", 100000)
        loss_percent = abs(daily_pnl) / portfolio_value * 100 if daily_pnl < 0 else 0

        if loss_percent >= self.settings.max_daily_loss_percent:
            return RiskAlert(
                id=f"loss_limit_{int(time.time())}",
                type="loss_limit",
                severity="critical" if loss_percent >= 5.0 else "warning",
                message=f"日次損失リミット超過！現在の損失率: {loss_percent:.2f}%",
                data={
                    "daily_pnl": daily_pnl,
                    "loss_percent": loss_percent,
                    "limit": self.settings.max_daily_loss_percent,
                    "portfolio_value": portfolio_value,
                },
                timestamp=datetime.now().isoformat(),
            )

        return None

    def check_position_concentration(self, current_portfolio: Dict[str, Any]) -> Optional[RiskAlert]:
        """ポジション集中リスクチェック"""
        positions = current_portfolio.get("positions", {})
        if not positions:
            return None

        portfolio_value = current_portfolio.get("total_value", 1)

        # 最大ポジション確認
        max_position_value = 0
        max_position_symbol = ""

        for symbol, position_data in positions.items():
            if isinstance(position_data, dict):
                value = position_data.get("value", 0)
            else:
                value = float(position_data) if position_data else 0

            if value > max_position_value:
                max_position_value = value
                max_position_symbol = symbol

        max_position_percent = (max_position_value / portfolio_value) * 100

        if max_position_percent > self.settings.max_position_size_percent:
            return RiskAlert(
                id=f"concentration_{int(time.time())}",
                type="concentration",
                severity="warning",
                message=f"ポジション集中リスク！{max_position_symbol}がポートフォリオの{max_position_percent:.1f}%を占めています。",
                data={
                    "symbol": max_position_symbol,
                    "value": max_position_value,
                    "percentage": max_position_percent,
                    "limit": self.settings.max_position_size_percent,
                },
                timestamp=datetime.now().isoformat(),
            )

        # 銘柄分散度チェック
        stock_count = len(positions)
        if stock_count < self.settings.diversification_min_stocks:
            return RiskAlert(
                id=f"diversification_{int(time.time())}",
                type="concentration",
                severity="info",
                message=f"分散不足！現在{stock_count}銘柄のみ。{self.settings.diversification_min_stocks}銘柄以上を推薦。",
                data={
                    "current_stocks": stock_count,
                    "recommended": self.settings.diversification_min_stocks,
                },
                timestamp=datetime.now().isoformat(),
            )

        return None

    def check_forced_stop_loss(self, current_portfolio: Dict[str, Any]) -> None:
        """強制損切り実行"""
        positions = current_portfolio.get("positions", {})

        for symbol, position_data in positions.items():
            if isinstance(position_data, dict):
                entry_price = position_data.get("entry_price", 0)
                current_price = position_data.get("current_price", 0)
                quantity = position_data.get("quantity", 0)
            else:
                continue

            if entry_price > 0 and current_price > 0:
                change_percent = (current_price - entry_price) / entry_price * 100

                if change_percent <= -self.settings.forced_stop_loss_percent:
                    # 強制損切り実行
                    self._execute_emergency_sell(symbol, quantity, current_price)

                    alert = RiskAlert(
                        id=f"forced_stop_{symbol}_{int(time.time())}",
                        type="forced_stop",
                        severity="emergency",
                        message=f"強制損切り実行！{symbol}が{change_percent:.1f}%下落。{quantity}株を売却。",
                        data={
                            "symbol": symbol,
                            "quantity": quantity,
                            "current_price": current_price,
                            "change_percent": change_percent,
                            "sale_value": quantity * current_price,
                        },
                        timestamp=datetime.now().isoformat(),
                        resolved=True,
                        auto_actions_taken=["emergency_sell"],
                    )
                    self.risk_alerts.append(alert)

    def check_trading_hours(self, trade_request: Dict[str, Any]) -> bool:
        """取引時間チェック"""
        if not self.settings.trading_hours_only:
            return True

        now = datetime.now()

        # 市場時間チェック（東京市場）
        market_hours = {
            "start": now.replace(hour=9, minute=0, second=0, microsecond=0),
            "end": now.replace(hour=15, minute=0, second=0, microsecond=0),
        }

        # 週末チェック
        if now.weekday() >= 5:  # 金・土・日
            notification_manager.notify(
                notification_type="trading_hours",
                title="取引時間外",
                message="市場が閉まっている時間です。取引を実行できません。",
                severity="warning",
            )
            return False

        # 時間チェック
        if not (market_hours["start"] <= now <= market_hours["end"]):
            notification_manager.notify(
                notification_type="trading_hours",
                title="取引時間外",
                message="現在は取引時間外です。取引を許可しません。",
                severity="warning",
            )
            return False

        return True

    def check_suspicious_activity(self, user_id: str = "default") -> Optional[RiskAlert]:
        """不審な活動チェック"""
        # 最近の取引パターン分析
        recent_trades = db_manager.get_trades(limit=20)

        if len(recent_trades) < 5:
            return None

        # 短時間での多頻度取引チェック
        time_window = 300  # 5分
        now = datetime.now()

        suspicious_trades = []
        for trade in recent_trades:
            trade_time = datetime.fromisoformat(trade["timestamp"])
            if (now - trade_time).total_seconds() <= time_window:
                suspicious_trades.append(trade)

        if len(suspicious_trades) > 5:  # 5分以内に5回以上
            return RiskAlert(
                id=f"suspicious_{int(time.time())}",
                type="suspicious_activity",
                severity="critical",
                message=f"不審な活動検知！短時間での多頻度取引が確認されました。",
                data={
                    "trade_count": len(suspicious_trades),
                    "time_window": time_window,
                    "user_id": user_id,
                },
                timestamp=datetime.now().isoformat(),
            )

        return None

    def _execute_emergency_sell(self, symbol: str, quantity: float, price: float) -> bool:
        """緊急売却実行"""
        try:
            trade_id = db_manager.save_trade(
                symbol=symbol,
                action="SELL",
                quantity=quantity,
                price=price,
                status="executed",
            )

            notification_manager.notify(
                notification_type="emergency_sell",
                title="緊急損切り実行",
                message=f"{symbol} {quantity}株を{price}で緊急売却しました。",
                severity="critical",
                metadata={
                    "symbol": symbol,
                    "quantity": quantity,
                    "price": price,
                    "total": quantity * price,
                    "trade_id": trade_id,
                },
            )

            logger.warning(f"Emergency sell executed: {symbol} {quantity} @ {price}")
            return True

        except Exception as e:
            logger.error(f"Emergency sell failed: {e}")
            return False

    def activate_emergency_mode(self, reason: str = "") -> None:
        """緊急モード有効化"""
        self.emergency_mode = True

        notification_manager.notify(
            notification_type="emergency_mode",
            title="緊急モード有効化",
            message=f"緊急モードを有効化しました。{reason}",
            severity="emergency",
        )

        # データベースに記録
        db_manager.save_config(
            "emergency_mode",
            {"active": True, "reason": reason, "timestamp": datetime.now().isoformat()},
            "safety",
        )

        logger.critical(f"Emergency mode activated: {reason}")

    def deactivate_emergency_mode(self) -> None:
        """緊急モード無効化"""
        self.emergency_mode = False

        db_manager.save_config(
            "emergency_mode",
            {"active": False, "timestamp": datetime.now().isoformat()},
            "safety",
        )

        logger.info("Emergency mode deactivated")

    def validate_trade_request(self, trade_request: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """取引リクエスト検証"""
        # 基本的な検証
        if not self.check_trading_hours(trade_request):
            return False, "取引時間外です。"

        # ポジションサイズチェック
        if "quantity" in trade_request and "price" in trade_request:
            trade_value = trade_request["quantity"] * trade_request["price"]
            current_portfolio = self._get_current_portfolio()
            portfolio_value = current_portfolio.get("total_value", 100000)

            position_percent = (trade_value / portfolio_value) * 100
            if position_percent > self.settings.max_position_size_percent:
                return (
                    False,
                    f"ポジションサイズが大きすぎます。最大{self.settings.max_position_size_percent:.1f}%まで。",
                )

        return True, None

    def _get_current_portfolio(self) -> Dict[str, Any]:
        """現在のポートフォリオ取得"""
        # ダミー実装
        return {
            "total_value": 1000000,
            "positions": {
                "AAPL": {
                    "quantity": 100,
                    "current_price": 175.50,
                    "entry_price": 170.00,
                    "value": 17550,
                },
                "MSFT": {
                    "quantity": 50,
                    "current_price": 375.25,
                    "entry_price": 380.00,
                    "value": 18762.5,
                },
            },
        }

    def run_safety_check(self, portfolio: Dict[str, Any] = None) -> List[RiskAlert]:
        """安全チェック実行"""
        if portfolio is None:
            portfolio = self._get_current_portfolio()

        alerts = []

        # 日次損失リミットチェック
        loss_alert = self.check_daily_loss_limit(portfolio)
        if loss_alert:
            alerts.append(loss_alert)
            self.risk_alerts.append(loss_alert)

        # ポジション集中リスクチェック
        concentration_alert = self.check_position_concentration(portfolio)
        if concentration_alert:
            alerts.append(concentration_alert)
            self.risk_alerts.append(concentration_alert)

        # 強制損切りチェック
        if not self.emergency_mode:
            self.check_forced_stop_loss(portfolio)

        # 不審な活動チェック
        suspicious_alert = self.check_suspicious_activity()
        if suspicious_alert:
            alerts.append(suspicious_alert)
            self.risk_alerts.append(suspicious_alert)
            # 緊急モード有効化
            self.activate_emergency_mode("不審な活動検知")

        # 通知送信
        for alert in alerts:
            notification_manager.notify(
                notification_type=alert.type,
                title=f"安全アラート: {alert.type}",
                message=alert.message,
                severity=alert.severity,
                metadata=alert.data,
            )

        return alerts

    def get_safety_report(self) -> Dict[str, Any]:
        """安全レポート取得"""
        active_alerts = [a for a in self.risk_alerts if not a.resolved]
        critical_alerts = [a for a in active_alerts if a.severity == "critical"]

        return {
            "settings": self.settings.__dict__,
            "emergency_mode": self.emergency_mode,
            "trading_suspended": self.trading_suspended,
            "total_alerts": len(self.risk_alerts),
            "active_alerts": len(active_alerts),
            "critical_alerts": len(critical_alerts),
            "recent_alerts": active_alerts[:10],
            "safety_score": self._calculate_safety_score(),
        }

    def _calculate_safety_score(self) -> int:
        """安全スコア計算（0-100）"""
        active_alerts = [a for a in self.risk_alerts if not a.resolved]
        critical_count = sum(1 for a in active_alerts if a.severity == "critical")
        warning_count = sum(1 for a in active_alerts if a.severity == "warning")

        # 基礎スコア
        base_score = 100

        # アラートで減点
        base_score -= critical_count * 20
        base_score -= warning_count * 10

        # 設定で加減点
        if self.settings.forced_stop_loss_percent <= 3:
            base_score += 10  # 厳しい損切り設定
        if self.settings.max_position_size_percent <= 15:
            base_score += 10  # 分散投資設定
        if self.settings.trading_hours_only:
            base_score += 5  # 時間制限設定

        return max(0, min(100, base_score))


safety_manager = SafetyManager()


def get_safety_manager() -> SafetyManager:
    """安全管理者取得"""
    return safety_manager


def setup_family_sharing(user_id: str, family_members: List[str]) -> bool:
    """家族共有設定"""
    try:
        family_config = {
            "user_id": user_id,
            "family_members": family_members,
            "sharing_enabled": True,
            "permissions": {
                "view_portfolio": True,
                "view_trades": True,
                "receive_alerts": True,
                "execute_trades": False,
            },
            "created_at": datetime.now().isoformat(),
        }

        db_manager.save_config("family_sharing", family_config, "safety")
        logger.info(f"Family sharing set up for user: {user_id}")
        return True

    except Exception as e:
        logger.error(f"Family sharing setup failed: {e}")
        return False


def get_market_status_message() -> str:
    """市場状況メッセージ取得"""
    now = datetime.now()

    if now.weekday() >= 5:
        return "🔴 市場は閉まっています"

    market_open = now.replace(hour=9, minute=0, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=0, second=0, microsecond=0)

    if market_open <= now <= market_close:
        return "🟢 市場は開いています"
    else:
        return "🟡 市場は閉まっています"
