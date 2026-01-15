"""
Push notification system for AGStock
LINE Notify、Slack、メール通知に対応
"""

import requests
import logging
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
import os

logger = logging.getLogger(__name__)


@dataclass
class PushNotification:
    """プッシュ通知のデータ構造"""

    notification_id: str
    user_id: str
    title: str
    message: str
    channel: str  # 'line', 'slack', 'email', 'browser'
    priority: str  # 'low', 'medium', 'high', 'critical'
    data: Dict
    timestamp: datetime
    delivered: bool = False
    delivery_attempts: int = 0


class LineNotifyClient:
    """LINE Notifyクライアント"""

    def __init__(self, access_token: str = None):
        self.access_token = access_token or os.getenv("LINE_NOTIFY_ACCESS_TOKEN")
        self.api_url = "https://notify-api.line.me/api/notify"

    async def send_notification(self, notification: PushNotification) -> bool:
        """
        LINE通知を送信

        Args:
            notification: 通知データ

        Returns:
            送信成功フラグ
        """
        if not self.access_token:
            logger.warning("LINE Notify access token not configured")
            return False

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/x-www-form-urlencoded",
        }

        data = {"message": f"{notification.title}\\n\\n{notification.message}"}

        # 添付ファイル（オプション）
        if notification.channel == "line_with_image" and "chart_image" in notification.data:
            files = {"imageFile": notification.data["chart_image"]}
            headers.pop("Content-Type")  # Multipartでは自動設定

            try:
                response = requests.post(self.api_url, headers=headers, data=data, files=files, timeout=10)
            except requests.RequestException as e:
                logger.error(f"LINE notification with image failed: {e}")
                return False
        else:
            try:
                response = requests.post(self.api_url, headers=headers, data=data, timeout=10)
            except requests.RequestException as e:
                logger.error(f"LINE notification failed: {e}")
                return False

        return response.status_code == 200

    async def test_connection(self) -> bool:
        """接続テスト"""
        try:
            response = requests.get(
                "https://notify-api.line.me/api/status",
                headers={"Authorization": f"Bearer {self.access_token}"},
                timeout=5,
            )
            return response.status_code == 200
        except Exception:
            return False


class SlackNotifyClient:
    """Slack通知クライアント"""

    def __init__(self, webhook_url: str = None, bot_token: str = None):
        self.webhook_url = webhook_url or os.getenv("SLACK_WEBHOOK_URL")
        self.bot_token = bot_token or os.getenv("SLACK_BOT_TOKEN")

    async def send_notification(self, notification: PushNotification) -> bool:
        """
        Slack通知を送信

        Args:
            notification: 通知データ

        Returns:
            送信成功フラグ
        """
        if not self.webhook_url and not self.bot_token:
            logger.warning("Slack not configured")
            return False

        # Webhook URLがある場合（推奨）
        if self.webhook_url:
            return await self._send_webhook_notification(notification)

        # Bot APIを使用
        return await self._send_bot_notification(notification)

    async def _send_webhook_notification(self, notification: PushNotification) -> bool:
        """Webhook通知を送信"""
        payload = {
            "text": f"*{notification.title}*\\n\\n{notification.message}",
            "attachments": [
                {
                    "color": self._get_color_by_priority(notification.priority),
                    "fields": [
                        {
                            "title": "優先度",
                            "value": notification.priority.upper(),
                            "short": True,
                        },
                        {
                            "title": "時刻",
                            "value": notification.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                            "short": True,
                        },
                    ],
                    "footer": "AGStock System",
                    "ts": notification.timestamp.timestamp(),
                }
            ],
        }

        # 添付データ
        if notification.data.get("chart_url"):
            payload["attachments"][0]["image_url"] = notification.data["chart_url"]

        try:
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Slack webhook notification failed: {e}")
            return False

    async def _send_bot_notification(self, notification: PushNotification) -> bool:
        """Bot API通知を送信"""
        channel = os.getenv("SLACK_DEFAULT_CHANNEL", "#general")

        payload = {
            "channel": channel,
            "text": f"*{notification.title}*\\n\\n{notification.message}",
        }

        headers = {
            "Authorization": f"Bearer {self.bot_token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                "https://slack.com/api/chat.postMessage",
                headers=headers,
                json=payload,
                timeout=10,
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Slack bot notification failed: {e}")
            return False

    def _get_color_by_priority(self, priority: str) -> str:
        """優先度による色付け"""
        colors = {
            "low": "#36a64f",  # green
            "medium": "#f39c12",  # yellow
            "high": "#ff0000",  # red
            "critical": "#8b0000",  # dark red
        }
        return colors.get(priority, "#36a64f")

    async def test_connection(self) -> bool:
        """接続テスト"""
        if self.webhook_url:
            try:
                response = requests.post(self.webhook_url, json={"text": "Connection test"}, timeout=5)
                return response.status_code == 200
            except Exception:
                return False

        return True


class EmailNotifyClient:
    """メール通知クライアント"""

    def __init__(self, smtp_config: Dict = None):
        self.smtp_config = smtp_config or {
            "server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
            "port": int(os.getenv("SMTP_PORT", "587")),
            "username": os.getenv("SMTP_USERNAME"),
            "password": os.getenv("SMTP_PASSWORD"),
            "from_email": os.getenv("SMTP_FROM_EMAIL"),
            "use_tls": os.getenv("SMTP_USE_TLS", "True").lower() == "true",
        }

    async def send_notification(self, notification: PushNotification) -> bool:
        """
        メール通知を送信

        Args:
            notification: 通知データ

        Returns:
            送信成功フラグ
        """
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.mime.image import MIMEImage
        import ssl

        try:
            msg = MIMEMultipart("alternative")

            # HTMLメッセージ
            html_body = f"""
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }}
                    .content {{
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 0 0 8px 8px;
                    }}
                    .priority {{
                        display: inline-block;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: bold;
                        background: {self._get_priority_color(notification.priority)};
                        color: white;
                    }}
                    .footer {{
                        text-align: center;
                        padding: 20px;
                        font-size: 12px;
                        color: #666;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📱 AGStock 通知</h1>
                    <div class="priority">{notification.priority.upper()}</div>
                </div>
                
                <div class="content">
                    <h2>{notification.title}</h2>
                    <p>{notification.message}</p>
                    <p><strong>時刻:</strong> {notification.timestamp.strftime("%Y年%m月%d日 %H:%M:%S")}</p>
                </div>
                
                <div class="footer">
                    <p>AGStock AI投資システム</p>
                    <p>このメールはシステムからの自動通知です</p>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(html_body, "html", "utf-8"))

            server = smtplib.SMTP(self.smtp_config["server"], self.smtp_config["port"])

            if self.smtp_config["use_tls"]:
                server.starttls()

            server.login(self.smtp_config["username"], self.smtp_config["password"])

            text = msg.as_string()
            server.sendmail(self.smtp_config["from_email"], [notification.user_id], text)
            server.quit()

            return True

        except Exception as e:
            logger.error(f"Email notification failed: {e}")
            return False

    def _get_priority_color(self, priority: str) -> str:
        """優先度による色付け"""
        colors = {
            "low": "#28a745",  # green
            "medium": "#ffc107",  # yellow
            "high": "#dc3545",  # red
            "critical": "#c82333",  # dark red
        }
        return colors.get(priority, "#28a745")


class BrowserPushClient:
    """ブラウザプッシュ通知クライアント"""

    def __init__(self):
        self.vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        self.vapid_email = os.getenv("VAPID_EMAIL")

    async def send_notification(self, notification: PushNotification, subscription_info: Dict = None) -> bool:
        """
        ブラウザプッシュ通知を送信

        Args:
            notification: 通知データ
            subscription_info: 購読情報

        Returns:
            送信成功フラグ
        """
        if not subscription_info:
            logger.warning("No subscription info for browser push")
            return False

        try:
            import pywebpush
            from pywebpush import webpush, WebPushException

            payload = {
                "title": notification.title,
                "body": notification.message,
                "icon": "/static/icons/icon-192.png",
                "badge": "/static/icons/badge.png",
                "tag": notification.notification_id,
                "data": notification.data,
                "timestamp": notification.timestamp.isoformat(),
                "actions": [
                    {
                        "action": "open",
                        "title": "AGStockを開く",
                        "icon": "/static/icons/open.png",
                    }
                ],
            }

            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={"sub": f"mailto:{self.vapid_email}"},
                ttl=86400,  # 24時間
            )

            return True

        except Exception as e:
            logger.error(f"Browser push notification failed: {e}")
            return False


class PushNotificationManager:
    """
    プッシュ通知マネージャー
    すべての通知チャネルを管理
    """

    def __init__(self):
        self.line_client = LineNotifyClient()
        self.slack_client = SlackNotifyClient()
        self.email_client = EmailNotifyClient()
        self.browser_client = BrowserPushClient()
        self.notification_queue = asyncio.Queue()
        self.is_running = False
        self.user_preferences = {}

    async def register_user_preferences(self, user_id: str, preferences: Dict):
        """
        ユーザーの通知設定を登録

        Args:
            user_id: ユーザーID
            preferences: 通知設定
        """
        self.user_preferences[user_id] = preferences
        logger.info(f"Registered preferences for user {user_id}")

    async def send_notification(self, notification: PushNotification) -> Dict[str, bool]:
        """
        通知を送信

        Args:
            notification: 通知データ

        Returns:
            チャネル別送信結果
        """
        user_prefs = self.user_preferences.get(notification.user_id, {})

        results = {"line": False, "slack": False, "email": False, "browser": False}

        # 各チャネルに送信
        if user_prefs.get("line_enabled", False):
            results["line"] = await self.line_client.send_notification(notification)

        if user_prefs.get("slack_enabled", False):
            results["slack"] = await self.slack_client.send_notification(notification)

        if user_prefs.get("email_enabled", False):
            results["email"] = await self.email_client.send_notification(notification)

        if user_prefs.get("browser_enabled", False):
            subscription_info = user_prefs.get("browser_subscription")
            if subscription_info:
                results["browser"] = await self.browser_client.send_notification(notification, subscription_info)

        return results

    async def send_bulk_notification(self, notifications: List[PushNotification]) -> Dict[str, int]:
        """
        一括通知を送信

        Args:
            notifications: 通知リスト

        Returns:
            チャネル別成功数
        """
        results = {"line": 0, "slack": 0, "email": 0, "browser": 0}

        for notification in notifications:
            channel_results = await self.send_notification(notification)

            for channel, success in channel_results.items():
                if success:
                    results[channel] += 1

        return results

    async def send_price_alert(
        self,
        user_id: str,
        ticker: str,
        current_price: float,
        change_pct: float,
        target_price: float = None,
    ) -> bool:
        """
        価格アラートを送信

        Args:
            user_id: ユーザーID
            ticker: 銘柄コード
            current_price: 現在価格
            change_pct: 変化率
            target_price: 目標価格（オプション）

        Returns:
            送信成功フラグ
        """
        title = f"価格アラート: {ticker}"

        if change_pct > 0:
            message = f"{ticker}が上昇中！現在: ¥{current_price:,}円（{change_pct:+.1f}%）"
            priority = "medium"
        else:
            message = f"{ticker}が下落中！現在: ¥{current_price:,}円（{change_pct:+.1f}%）"
            priority = "high"

        if target_price:
            message += f"\\n目標価格: ¥{target_price:,}円"

        notification = PushNotification(
            notification_id=f"price_{ticker}_{datetime.now().timestamp()}",
            user_id=user_id,
            title=title,
            message=message,
            channel="price_alert",
            priority=priority,
            data={
                "ticker": ticker,
                "current_price": current_price,
                "change_pct": change_pct,
                "target_price": target_price,
                "alert_type": "price_movement",
            },
            timestamp=datetime.now(),
        )

        results = await self.send_notification(notification)
        return any(results.values())

    async def send_trade_execution(
        self,
        user_id: str,
        ticker: str,
        action: str,
        quantity: int,
        price: float,
        amount: float,
    ) -> bool:
        """
        取引実行通知を送信

        Args:
            user_id: ユーザーID
            ticker: 銘柄コード
            action: 取引アクション
            quantity: 数量
            price: 価格
            amount: 金額

        Returns:
            送信成功フラグ
        """
        action_text = "買付" if action == "BUY" else "売却"
        title = f"取引実行通知: {ticker}"
        message = f"{action_text}注文を実行しました\\n銘柄: {ticker}\\n数量: {quantity:,}株\\n価格: ¥{price:,}円\\n金額: ¥{amount:,}円"
        priority = "high"

        notification = PushNotification(
            notification_id=f"trade_{ticker}_{datetime.now().timestamp()}",
            user_id=user_id,
            title=title,
            message=message,
            channel="trade_execution",
            priority=priority,
            data={
                "ticker": ticker,
                "action": action,
                "quantity": quantity,
                "price": price,
                "amount": amount,
            },
            timestamp=datetime.now(),
        )

        results = await self.send_notification(notification)
        return any(results.values())

    async def send_portfolio_update(
        self,
        user_id: str,
        portfolio_value: float,
        daily_change: float,
        daily_change_pct: float,
    ) -> bool:
        """
        ポートフォリオ更新通知を送信

        Args:
            user_id: ユーザーID
            portfolio_value: 総ポートフォリオ価値
            daily_change: 日次変化
            daily_change_pct: 日次変化率

        Returns:
            送信成功フラグ
        """
        title = "ポートフォリオ更新通知"

        if daily_change_pct > 0:
            message = f"本日のリターン: +{daily_change_pct:.1f}%\\n総資産: ¥{portfolio_value:,}円"
            priority = "low"
        else:
            message = f"本日のリターン: {daily_change_pct:.1f}%\\n総資産: ¥{portfolio_value:,}円"
            priority = "medium"

        notification = PushNotification(
            notification_id=f"portfolio_{user_id}_{datetime.now().timestamp()}",
            user_id=user_id,
            title=title,
            message=message,
            channel="portfolio_update",
            priority=priority,
            data={
                "portfolio_value": portfolio_value,
                "daily_change": daily_change,
                "daily_change_pct": daily_change_pct,
            },
            timestamp=datetime.now(),
        )

        results = await self.send_notification(notification)
        return any(results.values())

    async def test_all_channels(self) -> Dict[str, bool]:
        """
        すべてのチャネルの接続テストを実行

        Returns:
            チャネル別テスト結果
        """
        test_notification = PushNotification(
            notification_id=f"test_{datetime.now().timestamp()}",
            user_id="test_user",
            title="接続テスト",
            message="通知システムの接続テストです",
            channel="test",
            priority="low",
            data={},
            timestamp=datetime.now(),
        )

        results = {}
        results["line"] = await self.line_client.test_connection()
        results["slack"] = await self.slack_client.test_connection()

        # メールテスト（環境変数が設定されている場合）
        if self.email_client.smtp_config["username"]:
            results["email"] = await self.email_client.send_notification(test_notification)
        else:
            results["email"] = None  # 未設定

        return results


# グローバルインスタンス
push_manager = PushNotificationManager()
