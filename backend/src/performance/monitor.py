"""
パフォーマンス監視モジュール
"""

import logging
from datetime import datetime
from typing import Callable, Dict, List, Optional

import pandas as pd

from .metrics import calculate_max_drawdown, calculate_sharpe_ratio, calculate_returns

logger = logging.getLogger(__name__)


class Alert:
    """アラートデータクラス"""
    def __init__(self, alert_type: str, message: str, severity: str = "warning"):
        self.alert_type = alert_type
        self.message = message
        self.severity = severity
        self.timestamp = datetime.now()
    
    def __repr__(self):
        return f"Alert({self.alert_type}: {self.message})"


class PerformanceMonitor:
    """パフォーマンス監視クラス"""
    
    def __init__(
        self,
        max_drawdown_threshold: float = -0.15,
        min_sharpe_threshold: float = 0.5,
        alert_callback: Optional[Callable[[Alert], None]] = None,
    ):
        self.max_drawdown_threshold = max_drawdown_threshold
        self.min_sharpe_threshold = min_sharpe_threshold
        self.alert_callback = alert_callback
        self.alerts: List[Alert] = []
        self._last_check: Optional[datetime] = None
    
    def check(self, equity_curve: pd.Series) -> List[Alert]:
        """パフォーマンスをチェックしてアラートを生成"""
        new_alerts = []
        
        # ドローダウンチェック
        current_dd = calculate_max_drawdown(equity_curve)
        if current_dd < self.max_drawdown_threshold:
            alert = Alert(
                "drawdown",
                f"ドローダウンが閾値を超過: {current_dd:.2%} < {self.max_drawdown_threshold:.2%}",
                "critical"
            )
            new_alerts.append(alert)
        
        # シャープレシオチェック（直近30日）
        if len(equity_curve) > 30:
            recent_returns = calculate_returns(equity_curve.tail(30))
            recent_sharpe = calculate_sharpe_ratio(recent_returns)
            if recent_sharpe < self.min_sharpe_threshold:
                alert = Alert(
                    "sharpe",
                    f"シャープレシオが低下: {recent_sharpe:.2f} < {self.min_sharpe_threshold:.2f}",
                    "warning"
                )
                new_alerts.append(alert)
        
        # アラートを保存・通知
        for alert in new_alerts:
            self.alerts.append(alert)
            if self.alert_callback:
                self.alert_callback(alert)
            logger.warning(f"Performance Alert: {alert}")
        
        self._last_check = datetime.now()
        return new_alerts
    
    def get_recent_alerts(self, hours: int = 24) -> List[Alert]:
        """直近のアラートを取得"""
        cutoff = datetime.now() - pd.Timedelta(hours=hours)
        return [a for a in self.alerts if a.timestamp > cutoff]
    
    def clear_alerts(self):
        """アラートをクリア"""
        self.alerts = []


class HealthChecker:
    """システムヘルスチェック"""
    
    def __init__(self):
        self.checks: Dict[str, bool] = {}
    
    def check_data_freshness(self, last_update: datetime, max_age_hours: int = 1) -> bool:
        """データの鮮度をチェック"""
        age = datetime.now() - last_update
        is_fresh = age.total_seconds() < max_age_hours * 3600
        self.checks["data_freshness"] = is_fresh
        return is_fresh
    
    def check_position_limits(self, current_positions: int, max_positions: int) -> bool:
        """ポジション数をチェック"""
        within_limit = current_positions <= max_positions
        self.checks["position_limit"] = within_limit
        return within_limit
    
    def is_healthy(self) -> bool:
        """全体のヘルス状態"""
        return all(self.checks.values()) if self.checks else True
    
    def get_status(self) -> Dict[str, bool]:
        """ステータスを取得"""
        return self.checks.copy()
