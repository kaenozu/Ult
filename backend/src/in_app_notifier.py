"""
In-App Swipe Notification System Backend Integration
Replaces Slack Webhooks with In-App notifications
"""

import json
import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class InAppNotifier:
    """In-App Swipe通知クラス - Slack Webhookを置き換える"""

    def __init__(self, api_base_url: str = "http://localhost:3000"):
        self.api_base_url = api_base_url.rstrip("/")
        self.enabled = True
        self.notification_queue = []

    def send_notification(
        self,
        notification_type: str,
        title: str,
        message: str,
        severity: str = "info",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """In-App通知送信"""
        try:
            payload = {
                "type": notification_type,
                "title": title,
                "message": message,
                "severity": severity,
                "metadata": metadata or {},
            }

            # APIエンドポイントに通知を送信
            response = requests.post(
                f"{self.api_base_url}/api/notifications", json=payload, timeout=10
            )
            response.raise_for_status()

            logger.info(f"In-App notification sent: {title}")
            return True

        except Exception as e:
            logger.error(f"Failed to send In-App notification: {e}")
            # フォールバック: キューに保存して後で再試行
            self.notification_queue.append(
                {"payload": payload, "timestamp": datetime.now(), "retry_count": 0}
            )
            return False

    def send_trade_notification(
        self, symbol: str, action: str, quantity: float, price: float
    ) -> bool:
        """取引通知"""
        return self.send_notification(
            notification_type="trade",
            title=f"Trade Executed: {action} {symbol}",
            message=f"{action} {quantity} {symbol} @ ${price:.2f}",
            severity="info",
            metadata={
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "price": price,
            },
        )

    def send_price_alert(
        self, symbol: str, current_price: float, change_percent: float
    ) -> bool:
        """価格アラート"""
        severity = "critical" if abs(change_percent) > 5 else "warning"
        return self.send_notification(
            notification_type="price_alert",
            title=f"Price Alert: {symbol}",
            message=f"{symbol} is now ${current_price:.2f} ({change_percent:+.2f}%)",
            severity=severity,
            metadata={
                "symbol": symbol,
                "currentPrice": current_price,
                "changePercent": change_percent,
            },
        )

    def send_portfolio_alert(self, drop_percent: float, current_value: float) -> bool:
        """ポートフォリオアラート"""
        severity = "critical" if drop_percent > 5 else "warning"
        return self.send_notification(
            notification_type="portfolio",
            title="Portfolio Drop Alert",
            message=f"Portfolio down {drop_percent:.2f}% (${current_value:.2f})",
            severity=severity,
            metadata={"dropPercent": drop_percent, "currentValue": current_value},
        )

    def send_system_alert(
        self, title: str, message: str, severity: str = "info"
    ) -> bool:
        """システムアラート"""
        return self.send_notification(
            notification_type="system", title=title, message=message, severity=severity
        )

    def retry_failed_notifications(self) -> int:
        """失敗した通知の再試行"""
        retried_count = 0
        remaining_queue = []

        for item in self.notification_queue:
            if item["retry_count"] >= 3:
                # 3回以上失敗した場合はスキップ
                remaining_queue.append(item)
                continue

            try:
                response = requests.post(
                    f"{self.api_base_url}/api/notifications",
                    json=item["payload"],
                    timeout=10,
                )
                response.raise_for_status()
                retried_count += 1
                logger.info(f"Retry successful for: {item['payload']['title']}")

            except Exception as e:
                logger.error(f"Retry failed for {item['payload']['title']}: {e}")
                item["retry_count"] += 1
                remaining_queue.append(item)

        self.notification_queue = remaining_queue
        return retried_count


# グローバルインスタンス
in_app_notifier = InAppNotifier()


def send_trade_alert(symbol: str, action: str, quantity: float, price: float) -> bool:
    """取引アラート送信（後方互換性のため）"""
    return in_app_notifier.send_trade_notification(symbol, action, quantity, price)


def send_price_alert(symbol: str, price: float, change_percent: float) -> bool:
    """価格アラート送信（後方互換性のため）"""
    return in_app_notifier.send_price_alert(symbol, price, change_percent)


def send_portfolio_alert(drop_percent: float, current_value: float) -> bool:
    """ポートフォリオアラート送信（後方互換性のため）"""
    return in_app_notifier.send_portfolio_alert(drop_percent, current_value)


def send_system_alert(message: str, severity: str = "warning") -> bool:
    """システムアラート送信（後方互換性のため）"""
    return in_app_notifier.send_system_alert("System Alert", message, severity)


# 既存のnotification_system.pyと互換性を持つためのエイリアス
class NotificationManager:
    """既存コードとの互換性用ラッパー"""

    def notify(
        self,
        notification_type: str,
        title: str,
        message: str,
        severity: str = "info",
        metadata: Optional[Dict[str, Any]] = None,
        save_to_db: bool = True,  # 後方互換性のためのパラメータ（無視）
    ) -> bool:
        return in_app_notifier.send_notification(
            notification_type, title, message, severity, metadata
        )

    def check_alert_thresholds(
        self,
        price_change_percent: float,
        portfolio_drop_percent: float,
        daily_loss_percent: float,
    ) -> list:
        """アラート閾値チェック"""
        alerts = []

        if abs(price_change_percent) >= 5:
            self.send_price_alert("", 0, price_change_percent)
            alerts.append(f"Price alert: {price_change_percent:+.2f}%")

        if portfolio_drop_percent >= 3:
            self.send_portfolio_alert(portfolio_drop_percent, 0)
            alerts.append(f"Portfolio alert: {portfolio_drop_percent:.2f}%")

        if daily_loss_percent >= 2:
            self.send_system_alert(f"Daily loss: {daily_loss_percent:.2f}%", "critical")
            alerts.append(f"Loss alert: {daily_loss_percent:.2f}%")

        return alerts


# エクスポート用インスタンス
notification_manager = NotificationManager()
