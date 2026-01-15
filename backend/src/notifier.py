import json
import logging
import os

import requests

logger = logging.getLogger(__name__)


class NotificationService:
    """通知サービスの基底クラス"""

    def send(self, alert) -> bool:
        """
        アラートを送信

        Args:
            alert: Alertオブジェクト

        Returns:
            bool: 送信成功したかどうか
        """
        raise NotImplementedError


class LINENotifyService(NotificationService):
    """LINE Notify通知サービス"""

    def __init__(self, access_token: str):
        """
        Args:
            access_token: LINE Notifyのアクセストークン
        """
        self.access_token = access_token
        self.api_url = "https://notify-api.line.me/api/notify"

    def send(self, alert) -> bool:
        """LINE Notifyでメッセージを送信"""
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}

            data = {
                "message": f"\n{alert.message}\n\n[{alert.priority.value.upper()}] {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
            }

            response = requests.post(self.api_url, headers=headers, data=data)

            if response.status_code == 200:
                logger.info("LINE notification sent successfully")
                return True
            else:
                logger.error(f"LINE notification failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending LINE notification: {e}")
            return False


class DiscordWebhookService(NotificationService):
    """Discord Webhook通知サービス"""

    def __init__(self, webhook_url: str):
        """
        Args:
            webhook_url: Discord WebhookのURL
        """
        self.webhook_url = webhook_url

    def send(self, alert) -> bool:
        """Discord Webhookでメッセージを送信"""
        try:
            # 優先度に応じた色設定
            color_map = {
                "low": 0x808080,  # Gray
                "medium": 0x0099FF,  # Blue
                "high": 0xFF9900,  # Orange
                "critical": 0xFF0000,  # Red
            }

            embed = {
                "title": f"{alert.alert_type.value.upper()} Alert",
                "description": alert.message,
                "color": color_map.get(alert.priority.value, 0x0099FF),
                "timestamp": alert.timestamp.isoformat(),
                "footer": {"text": f"Priority: {alert.priority.value.upper()}"},
            }

            data = {"embeds": [embed]}

            response = requests.post(
                self.webhook_url,
                data=json.dumps(data),
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 204:
                logger.info("Discord notification sent successfully")
                return True
            else:
                logger.error(f"Discord notification failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending Discord notification: {e}")
            return False


class SlackWebhookService(NotificationService):
    """Slack Webhook通知サービス"""

    def __init__(self, webhook_url: str):
        """
        Args:
            webhook_url: Slack WebhookのURL
        """
        self.webhook_url = webhook_url

    def send(self, alert) -> bool:
        """Slack Webhookでメッセージを送信"""
        try:
            # 優先度に応じたアイコン
            icon_map = {
                "low": ":information_source:",
                "medium": ":warning:",
                "high": ":rotating_light:",
                "critical": ":sos:",
            }

            data = {
                "text": f"{icon_map.get(alert.priority.value, ':bell:')} *{alert.alert_type.value.upper()} Alert*",
                "blocks": [
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": alert.message},
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"Priority: *{alert.priority.value.upper()}* | {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
                            }
                        ],
                    },
                ],
            }

            response = requests.post(
                self.webhook_url,
                data=json.dumps(data),
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 200:
                logger.info("Slack notification sent successfully")
                return True
            else:
                logger.error(f"Slack notification failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")
            return False


# 既存のNotifierクラスを保持（後方互換性のため）
class Notifier:
    def __init__(self):
        self.slack_webhook = os.getenv("SLACK_WEBHOOK_URL")
        self.email_enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email_from = os.getenv("EMAIL_FROM")
        self.email_password = os.getenv("EMAIL_PASSWORD")
        self.email_to = os.getenv("EMAIL_TO")

    def notify_slack(self, message: str, title: str = "AGStock Alert") -> bool:
        """Send notification to Slack."""
        if not self.slack_webhook:
            return False

        payload = {"text": f"*{title}*\n{message}"}

        try:
            response = requests.post(self.slack_webhook, json=payload, timeout=10)
            if response.status_code == 200:
                print("✓ Slack notification sent")
                return True
            else:
                print(f"✗ Slack notification failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Slack notification error: {e}")
            return False
