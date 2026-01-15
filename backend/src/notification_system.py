"""
AGStock 通知システム
メール・Slack通知機能
"""

import json
import logging
import smtplib
import time
from dataclasses import dataclass
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

import requests

from src.config_loader import get_notification_config
from src.database_manager import db_manager

logger = logging.getLogger(__name__)


@dataclass
class Notification:
    """通知データクラス"""

    type: str
    title: str
    message: str
    severity: str = "info"
    metadata: Optional[Dict[str, Any]] = None


class EmailNotifier:
    """メール通知クラス"""

    def __init__(self):
        self.config = get_notification_config().get("email", {})
        self.enabled = self.config.get("enabled", False)
        self.smtp_server = self.config.get("smtp_server", "")
        self.smtp_port = self.config.get("smtp_port", 587)
        self.sender_email = self.config.get("sender_email", "")
        self.receiver_emails = self.config.get("receiver_emails", [])

    def send(self, notification: Notification) -> bool:
        """メール送信"""
        if not self.enabled:
            return False
        try:
            msg = MIMEMultipart()
            msg["From"] = self.sender_email
            msg["To"] = ", ".join(self.receiver_emails)
            msg["Subject"] = f"[AGStock] {notification.title}"
            msg.attach(MIMEText(notification.message, "plain"))
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, "password")
            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent: {notification.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False


class SlackNotifier:
    """Slack通知クラス"""

    def __init__(self):
        self.config = get_notification_config().get("slack", {})
        self.enabled = self.config.get("enabled", False)
        self.webhook_url = self.config.get("webhook_url", "")

    def send(self, notification: Notification) -> bool:
        """Slack送信"""
        if not self.enabled or not self.webhook_url:
            return False
        try:
            payload = {
                "text": f"*{notification.title}*\n{notification.message}",
                "attachments": [
                    {
                        "color": self._get_color(notification.severity),
                        "fields": [
                            {
                                "title": "Type",
                                "value": notification.type,
                                "short": True,
                            },
                            {
                                "title": "Severity",
                                "value": notification.severity,
                                "short": True,
                            },
                        ],
                    }
                ],
            }
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info(f"Slack notification sent: {notification.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
            return False

    def _get_color(self, severity: str) -> str:
        """severityに応じた色取得"""
        colors = {
            "info": "good",
            "warning": "warning",
            "critical": "danger",
        }
        return colors.get(severity, "good")


class LINENotifier:
    """LINE Notify通知クラス"""

    def __init__(self):
        self.config = get_notification_config().get("line", {})
        self.enabled = self.config.get("enabled", False)
        self.token = self.config.get("token", "")

    def send(self, notification: Notification) -> bool:
        if not self.enabled or not self.token:
            return False
        try:
            url = "https://notify-api.line.me/api/notify"
            headers = {"Authorization": f"Bearer {self.token}"}
            payload = {"message": f"\n[{notification.title}]\n{notification.message}"}
            response = requests.post(url, headers=headers, data=payload, timeout=10)
            response.raise_for_status()
            logger.info(f"LINE notification sent: {notification.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send LINE notification: {e}")
            return False


class DiscordNotifier:
    """Discord Webhook通知クラス"""

    def __init__(self):
        self.config = get_notification_config().get("discord", {})
        self.enabled = self.config.get("enabled", False)
        self.webhook_url = self.config.get("webhook_url", "")

    def send(self, notification: Notification) -> bool:
        if not self.enabled or not self.webhook_url:
            return False
        try:
            payload = {
                "content": f"**[{notification.title}]**\n{notification.message}",
                "username": "AGStock AI"
            }
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info(f"Discord notification sent: {notification.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Discord notification: {e}")
            return False


class NotificationManager:
    """通知管理クラス"""

    _instance: Optional["NotificationManager"] = None

    def __new__(cls) -> "NotificationManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.email_notifier = EmailNotifier()
        self.slack_notifier = SlackNotifier()
        self.line_notifier = LINENotifier()
        self.discord_notifier = DiscordNotifier()
        self.notification_history: List[Dict[str, Any]] = []
        self.alert_thresholds = get_notification_config().get("alert_thresholds", {})

    def notify(
        self,
        notification_type: str,
        title: str,
        message: str,
        severity: str = "info",
        metadata: Optional[Dict[str, Any]] = None,
        save_to_db: bool = True,
    ) -> bool:
        """通知送信（全プラットフォーム）"""
        notification = Notification(
            type=notification_type,
            title=title,
            message=message,
            severity=severity,
            metadata=metadata,
        )
        # 各プラットフォームに送信
        email_sent = self.email_notifier.send(notification)
        slack_sent = self.slack_notifier.send(notification)
        line_sent = self.line_notifier.send(notification)
        discord_sent = self.discord_notifier.send(notification)
        
        success = any([email_sent, slack_sent, line_sent, discord_sent]) or \
                  not any([self.email_notifier.enabled, self.slack_notifier.enabled, 
                          self.line_notifier.enabled, self.discord_notifier.enabled])

        if save_to_db and (self.email_notifier.enabled or self.slack_notifier.enabled):
            db_manager.save_alert(
                alert_type=notification_type,
                message=f"{title}: {message}",
                severity=severity,
                metadata=metadata,
            )

        if success:
            self.notification_history.append(
                {
                    "timestamp": datetime.now().isoformat(),
                    "type": notification_type,
                    "title": title,
                    "severity": severity,
                }
            )

        return success

    def check_alert_thresholds(
        self,
        price_change_percent: float,
        portfolio_drop_percent: float,
        daily_loss_percent: float,
    ) -> List[str]:
        """アラート閾値チェック"""
        alerts = []
        thresholds = self.alert_thresholds

        if abs(price_change_percent) >= thresholds.get("price_change_percent", 5):
            self.notify(
                notification_type="price_alert",
                title="Significant Price Movement",
                message=f"Price change: {price_change_percent:+.2f}%",
                severity="warning" if abs(price_change_percent) < 10 else "critical",
            )
            alerts.append(f"Price alert: {price_change_percent:+.2f}%")

        if portfolio_drop_percent >= thresholds.get("portfolio_drop_percent", 3):
            self.notify(
                notification_type="portfolio_alert",
                title="Portfolio Drop Alert",
                message=f"Portfolio dropped by {portfolio_drop_percent:.2f}%",
                severity="warning",
            )
            alerts.append(f"Portfolio alert: {portfolio_drop_percent:.2f}%")

        if daily_loss_percent >= thresholds.get("daily_loss_percent", 2):
            self.notify(
                notification_type="loss_alert",
                title="Daily Loss Alert",
                message=f"Daily loss: {daily_loss_percent:.2f}%",
                severity="critical" if daily_loss_percent > 5 else "warning",
            )
            alerts.append(f"Loss alert: {daily_loss_percent:.2f}%")

        return alerts

    def get_notification_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """通知履歴取得"""
        return self.notification_history[-limit:]


notification_manager = NotificationManager()


def send_price_alert(symbol: str, price: float, change_percent: float) -> bool:
    """価格アラート送信"""
    return notification_manager.notify(
        notification_type="price",
        title=f"Price Alert: {symbol}",
        message=f"{symbol} is now ${price:.2f} ({change_percent:+.2f}%)",
        severity="warning" if abs(change_percent) > 5 else "info",
        metadata={"symbol": symbol, "price": price, "change_percent": change_percent},
    )


def send_trade_notification(symbol: str, action: str, quantity: float, price: float) -> bool:
    """取引通知送信"""
    return notification_manager.notify(
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


def send_system_alert(message: str, severity: str = "warning") -> bool:
    """システムアラート送信"""
    return notification_manager.notify(
        notification_type="system",
        title="System Alert",
        message=message,
        severity=severity,
    )
