"""
External Integration for Approval System
承認システムの外部統合（Slack/Discordなど）
"""

import json
import logging
import requests
from typing import Dict, Any, Optional

from .models import ApprovalRequest, ApprovalResponse, ApprovalStatus

logger = logging.getLogger(__name__)


class ExternalNotifier:
    """外部通知クラス"""

    def __init__(self, config: dict = None):
        self.config = config or {}
        self.slack_webhook = self.config.get("slack_webhook_url")
        self.discord_webhook = self.config.get("discord_webhook_url")

    def notify_approval_request(self, request: ApprovalRequest) -> bool:
        """承認リクエストを外部に通知"""

        # Slack通知
        if self.slack_webhook:
            success = self._send_slack_notification(request)
            if success:
                logger.info(f"Slack notification sent for request {request.request_id}")

        # Discord通知
        if self.discord_webhook:
            success = self._send_discord_notification(request)
            if success:
                logger.info(
                    f"Discord notification sent for request {request.request_id}"
                )

        return True

    def notify_approval_response(
        self, response: ApprovalResponse, request: ApprovalRequest
    ) -> bool:
        """承認レスポンスを外部に通知"""

        # Slack通知
        if self.slack_webhook:
            success = self._send_slack_response_notification(response, request)
            if success:
                logger.info(
                    f"Slack response notification sent for {response.request_id}"
                )

        # Discord通知
        if self.discord_webhook:
            success = self._send_discord_response_notification(response, request)
            if success:
                logger.info(
                    f"Discord response notification sent for {response.request_id}"
                )

        return True

    def _send_slack_notification(self, request: ApprovalRequest) -> bool:
        """Slackに承認リクエストを送信"""

        try:
            color_map = {
                "low": "#36a64f",  # green
                "medium": "#ff9500",  # orange
                "high": "#ff3b30",  # red
                "critical": "#ff0000",  # bright red
            }

            emoji_map = {
                "trade_execution": "💰",
                "strategy_change": "📊",
                "config_update": "⚙️",
                "risk_limit_change": "⚠️",
                "manual_intervention": "👤",
                "circuit_breaker_reset": "🔄",
                "emergency_action": "🚨",
            }

            emoji = emoji_map.get(request.type.value, "📋")
            color = color_map.get(request.priority.value, "#36a64f")

            payload = {
                "attachments": [
                    {
                        "color": color,
                        "title": f"{emoji} {request.title}",
                        "text": request.description,
                        "fields": [
                            {
                                "title": "Request ID",
                                "value": request.request_id,
                                "short": True,
                            },
                            {
                                "title": "Priority",
                                "value": request.priority.value.upper(),
                                "short": True,
                            },
                            {
                                "title": "Requested By",
                                "value": request.requested_by,
                                "short": True,
                            },
                            {
                                "title": "Requested At",
                                "value": request.requested_at.strftime(
                                    "%Y-%m-%d %H:%M:%S"
                                ),
                                "short": True,
                            },
                        ],
                        "actions": [
                            {
                                "name": "approve",
                                "text": "✅ Approve",
                                "type": "button",
                                "value": request.request_id,
                                "style": "primary",
                            },
                            {
                                "name": "reject",
                                "text": "❌ Reject",
                                "type": "button",
                                "value": request.request_id,
                                "style": "danger",
                            },
                        ],
                        "callback_id": f"approval_action_{request.request_id}",
                    }
                ]
            }

            response = requests.post(self.slack_webhook, json=payload, timeout=10)

            return response.status_code == 200

        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")
            return False

    def _send_discord_notification(self, request: ApprovalRequest) -> bool:
        """Discordに承認リクエストを送信"""

        try:
            emoji_map = {
                "trade_execution": "💰",
                "strategy_change": "📊",
                "config_update": "⚙️",
                "risk_limit_change": "⚠️",
                "manual_intervention": "👤",
                "circuit_breaker_reset": "🔄",
                "emergency_action": "🚨",
            }

            emoji = emoji_map.get(request.type.value, "📋")
            color_map = {
                "low": 0x36A64F,  # green
                "medium": 0xFF9500,  # orange
                "high": 0xFF3B30,  # red
                "critical": 0xFF0000,  # bright red
            }
            color = color_map.get(request.priority.value, 0x36A64F)

            embed = {
                "title": f"{emoji} {request.title}",
                "description": request.description,
                "color": color,
                "fields": [
                    {"name": "Request ID", "value": request.request_id, "inline": True},
                    {
                        "name": "Priority",
                        "value": request.priority.value.upper(),
                        "inline": True,
                    },
                    {
                        "name": "Requested By",
                        "value": request.requested_by,
                        "inline": True,
                    },
                    {"name": "Type", "value": request.type.value, "inline": True},
                ],
                "footer": {
                    "text": f"Requested at {request.requested_at.strftime('%Y-%m-%d %H:%M:%S')}"
                },
            }

            payload = {"embeds": [embed]}

            response = requests.post(self.discord_webhook, json=payload, timeout=10)

            return response.status_code == 204

        except Exception as e:
            logger.error(f"Error sending Discord notification: {e}")
            return False

    def _send_slack_response_notification(
        self, response: ApprovalResponse, request: ApprovalRequest
    ) -> bool:
        """Slackに承認レスポンスを送信"""

        try:
            status_emoji = {
                ApprovalStatus.APPROVED: "✅",
                ApprovalStatus.REJECTED: "❌",
                ApprovalStatus.CANCELLED: "🚫",
            }

            emoji = status_emoji.get(response.status, "❓")
            status_text = response.status.value.upper()

            payload = {
                "text": f"{emoji} Approval {status_text} - {request.title}",
                "attachments": [
                    {
                        "color": "good"
                        if response.status == ApprovalStatus.APPROVED
                        else "danger",
                        "fields": [
                            {"title": "Request ID", "value": response.request_id},
                            {"title": "Responder", "value": response.responder},
                            {
                                "title": "Response Time",
                                "value": response.responded_at.strftime(
                                    "%Y-%m-%d %H:%M:%S"
                                ),
                            },
                        ],
                    }
                ],
            }

            if response.reason:
                payload["attachments"][0]["fields"].append(
                    {"title": "Reason", "value": response.reason}
                )

            response_obj = requests.post(self.slack_webhook, json=payload, timeout=10)

            return response_obj.status_code == 200

        except Exception as e:
            logger.error(f"Error sending Slack response notification: {e}")
            return False

    def _send_discord_response_notification(
        self, response: ApprovalResponse, request: ApprovalRequest
    ) -> bool:
        """Discordに承認レスポンスを送信"""

        try:
            status_emoji = {
                ApprovalStatus.APPROVED: "✅",
                ApprovalStatus.REJECTED: "❌",
                ApprovalStatus.CANCELLED: "🚫",
            }

            emoji = status_emoji.get(response.status, "❓")
            status_text = response.status.value.upper()

            color = 0x00FF00 if response.status == ApprovalStatus.APPROVED else 0xFF0000

            embed = {
                "title": f"{emoji} Approval {status_text}",
                "description": request.title,
                "color": color,
                "fields": [
                    {"name": "Request ID", "value": response.request_id},
                    {"name": "Responder", "value": response.responder},
                    {
                        "name": "Response Time",
                        "value": response.responded_at.strftime("%Y-%m-%d %H:%M:%S"),
                    },
                ],
                "footer": {"text": f"Original request by {request.requested_by}"},
            }

            if response.reason:
                embed["fields"].append({"name": "Reason", "value": response.reason})

            payload = {"embeds": [embed]}

            response_obj = requests.post(self.discord_webhook, json=payload, timeout=10)

            return response_obj.status_code == 204

        except Exception as e:
            logger.error(f"Error sending Discord response notification: {e}")
            return False


class ApprovalInterfaceManager:
    """承認インターフェース管理"""

    def __init__(self, notifier: ExternalNotifier = None):
        self.notifier = notifier or ExternalNotifier()

    def handle_webhook_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Webhookコールバックを処理"""

        try:
            action = payload.get("action")
            request_id = payload.get("request_id")
            user_id = payload.get("user", {}).get("id", "unknown")

            if not action or not request_id:
                return {"success": False, "error": "Missing required fields"}

            # 承認システムにレスポンスを送信
            from .workflow import ApprovalWorkflow

            workflow = ApprovalWorkflow()

            status = (
                ApprovalStatus.APPROVED
                if action == "approve"
                else ApprovalStatus.REJECTED
            )

            success = workflow.respond_to_request(
                request_id=request_id, responder=user_id, status=status
            )

            return {
                "success": success,
                "message": f"Request {request_id} {status.value}",
            }

        except Exception as e:
            logger.error(f"Error handling webhook callback: {e}")
            return {"success": False, "error": str(e)}
