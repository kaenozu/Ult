"""
Approval Workflow System with Interactive Slack/Discord Buttons
承認ワークフローシステム（対話型Slack/Discordボタン付き）
"""

import json
import logging
import secrets
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, asdict
import requests

logger = logging.getLogger(__name__)


class ApprovalStatus(str, Enum):
    """承認ステータス"""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ApprovalType(str, Enum):
    """承認タイプ"""

    TRADE_EXECUTION = "trade_execution"
    STRATEGY_CHANGE = "strategy_change"
    CONFIG_UPDATE = "config_update"
    RISK_LIMIT_CHANGE = "risk_limit_change"
    MANUAL_INTERVENTION = "manual_intervention"
    CIRCUIT_BREAKER_RESET = "circuit_breaker_reset"
    EMERGENCY_ACTION = "emergency_action"


@dataclass
class ApprovalContext:
    """承認コンテキスト情報"""

    ticker: Optional[str] = None
    action: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    strategy: Optional[str] = None
    confidence: Optional[float] = None
    risk_level: Optional[str] = None
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ApprovalRequest:
    """承認リクエスト"""

    request_id: str
    type: ApprovalType
    title: str
    description: str
    context: ApprovalContext
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    platform: Optional[str] = None  # 'slack', 'discord', 'web'
    message_id: Optional[str] = None  # Platform message ID for updating


from src.database_manager import db_manager

class ApprovalWorkflowManager:
    """承認ワークフローマネージャー"""

    def __init__(self, redis_store=None):
        self.active_approvals: Dict[str, ApprovalRequest] = {}
        self.approval_history: List[ApprovalRequest] = []
        self.approval_callbacks: Dict[str, Callable[[ApprovalRequest], None]] = {}
        self.default_expiry_minutes = 30
        self.redis_store = redis_store
        
        # Load pending requests from DB
        self._load_active_requests()

    def _load_active_requests(self):
        """DBから承認待ちリクエストを読み込む"""
        try:
            pending_requests = db_manager.get_approval_requests(status="pending", limit=100)
            for req_data in pending_requests:
                try:
                    # Convert created_at string to datetime
                    if isinstance(req_data["created_at"], str):
                        req_data["created_at"] = datetime.fromisoformat(req_data["created_at"])
                    if req_data.get("expires_at") and isinstance(req_data["expires_at"], str):
                        req_data["expires_at"] = datetime.fromisoformat(req_data["expires_at"])
                    
                    # reconstruct context
                    context_data = req_data.get("context", {})
                    context = ApprovalContext(**context_data)
                    
                    request = ApprovalRequest(
                        request_id=req_data["request_id"],
                        type=ApprovalType(req_data["type"]),
                        title=req_data["title"],
                        description=req_data["description"],
                        context=context,
                        status=ApprovalStatus(req_data["status"]),
                        created_at=req_data["created_at"],
                        expires_at=req_data["expires_at"],
                        platform=req_data.get("platform"),
                        message_id=req_data.get("message_id")
                    )
                    self.active_approvals[request.request_id] = request
                    logger.info(f"Loaded pending approval request from DB: {request.request_id}")
                except Exception as e:
                    logger.error(f"Failed to load approval request {req_data.get('request_id')}: {e}")
        except Exception as e:
            logger.error(f"Failed to load active requests from DB: {e}")

    def create_approval_request(
        self,
        approval_type: ApprovalType,
        title: str,
        description: str,
        context: ApprovalContext,
        expiry_minutes: Optional[int] = None,
    ) -> ApprovalRequest:
        """
        承認リクエストを作成

        Args:
            approval_type: 承認タイプ
            title: タイトル
            description: 詳細説明
            context: コンテキスト情報
            expiry_minutes: 有効期限（分）

        Returns:
            ApprovalRequest: 作成された承認リクエスト
        """
        request_id = secrets.token_urlsafe(16)
        created_at = datetime.now()
        expires_at = created_at + timedelta(
            minutes=expiry_minutes or self.default_expiry_minutes
        )

        request = ApprovalRequest(
            request_id=request_id,
            type=approval_type,
            title=title,
            description=description,
            context=context,
            created_at=created_at,
            expires_at=expires_at,
            status=ApprovalStatus.PENDING,
        )

        self.active_approvals[request_id] = request
        logger.info(f"Created approval request: {request_id} - {title}")

        # SQLiteに保存（永続化）
        try:
            req_dict = asdict(request)
            req_dict["created_at"] = req_dict["created_at"].isoformat()
            if req_dict.get("expires_at"):
                req_dict["expires_at"] = req_dict["expires_at"].isoformat()
            req_dict["type"] = req_dict["type"].value
            req_dict["status"] = req_dict["status"].value
            # context is handled by asdict but needs to be careful with nested objects if any
            # simple dataclass to dict is fine here
            
            db_manager.save_approval_request(req_dict)
        except Exception as e:
            logger.error(f"Failed to save approval request to DB: {e}")

        # Redisに保存（監査用、TTL 60秒 -> PubSub/Audit用として残す）
        if self.redis_store:
            # from dataclasses import asdict # already imported

            self.redis_store.store_approval_request(
                request_id=request_id,
                approval_data=asdict(request),
                ttl=60,
            )
            self.redis_store.store_audit_event(
                request_id=request_id,
                event_type="created",
                event_data={
                    "title": title,
                    "type": approval_type.value,
                    "description": description,
                    "context": asdict(context),
                },
                ttl=60,
            )

        return request

    def register_callback(
        self, request_id: str, callback: Callable[[ApprovalRequest], None]
    ):
        """承認完了時のコールバックを登録"""
        self.approval_callbacks[request_id] = callback

    def approve(
        self,
        request_id: str,
        approved_by: str,
        platform: str = "web",
        message_id: Optional[str] = None,
    ) -> bool:
        """
        承認を承認

        Args:
            request_id: リクエストID
            approved_by: 承認者
            platform: プラットフォーム
            message_id: プラットフォームメッセージID

        Returns:
            bool: 成功時True
        """
        request = self.active_approvals.get(request_id)
        if not request:
            logger.error(f"Approval request not found: {request_id}")
            return False

        if request.status != ApprovalStatus.PENDING:
            logger.warning(
                f"Approval request not pending: {request_id} - {request.status}"
            )
            return False

        if request.expires_at and datetime.now() > request.expires_at:
            logger.warning(f"Approval request expired: {request_id}")
            request.status = ApprovalStatus.EXPIRED
            return False

        request.status = ApprovalStatus.APPROVED
        request.approved_by = approved_by
        request.approved_at = datetime.now()
        request.platform = platform
        request.message_id = message_id

        logger.info(f"Approval approved: {request_id} by {approved_by}")

        # Redisステータスを更新
        if self.redis_store:
            self.redis_store.update_approval_status(
                request_id=request_id,
                status="approved",
                updated_by=approved_by,
                metadata={
                    "platform": platform,
                    "message_id": message_id,
                    "approved_at": request.approved_at.isoformat(),
                },
            )

        # SQLite更新
        try:
            db_manager.update_approval_status(request_id, {
                "status": "approved",
                "approved_by": approved_by,
                "approved_at": request.approved_at.isoformat(),
                "platform": platform,
                "message_id": message_id
            })
        except Exception as e:
            logger.error(f"Failed to update approval status in DB: {e}")

        # コールバック実行
        if request_id in self.approval_callbacks:
            try:
                callback = self.approval_callbacks.pop(request_id)
                callback(request)
            except Exception as e:
                logger.error(f"Error executing approval callback: {e}")

        # 履歴に移動
        self.approval_history.append(request)
        del self.active_approvals[request_id]

        return True

    def reject(
        self,
        request_id: str,
        rejected_by: str,
        reason: Optional[str] = None,
        platform: str = "web",
        message_id: Optional[str] = None,
    ) -> bool:
        """
        承認を却下

        Args:
            request_id: リクエストID
            rejected_by: 却下者
            reason: 却下理由
            platform: プラットフォーム
            message_id: プラットフォームメッセージID

        Returns:
            bool: 成功時True
        """
        request = self.active_approvals.get(request_id)
        if not request:
            logger.error(f"Approval request not found: {request_id}")
            return False

        if request.status != ApprovalStatus.PENDING:
            logger.warning(
                f"Approval request not pending: {request_id} - {request.status}"
            )
            return False

        request.status = ApprovalStatus.REJECTED
        request.rejected_by = rejected_by
        request.rejected_at = datetime.now()
        request.rejection_reason = reason
        request.platform = platform
        request.message_id = message_id

        logger.info(f"Approval rejected: {request_id} by {rejected_by} - {reason}")

        # Redisステータスを更新
        if self.redis_store:
            self.redis_store.update_approval_status(
                request_id=request_id,
                status="rejected",
                updated_by=rejected_by,
                metadata={
                    "reason": reason,
                    "platform": platform,
                    "message_id": message_id,
                    "rejected_at": request.rejected_at.isoformat(),
                },
            )

        # SQLite更新
        try:
            db_manager.update_approval_status(request_id, {
                "status": "rejected",
                "rejected_by": rejected_by,
                "rejected_at": request.rejected_at.isoformat(),
                "rejection_reason": reason,
                "platform": platform,
                "message_id": message_id
            })
        except Exception as e:
            logger.error(f"Failed to update rejection status in DB: {e}")

        # 履歴に移動
        self.approval_history.append(request)
        del self.active_approvals[request_id]

        return True

    def cancel(self, request_id: str, cancelled_by: str) -> bool:
        """承認をキャンセル"""
        request = self.active_approvals.get(request_id)
        if not request:
            return False

        request.status = ApprovalStatus.CANCELLED
        logger.info(f"Approval cancelled: {request_id} by {cancelled_by}")

        # SQLite更新
        try:
            db_manager.update_approval_status(request_id, {
                "status": "cancelled",
                "rejected_by": cancelled_by, # storing canceller as rejected_by for now or add cancelled_by column? 
                                             # Schema has rejected_by, let's use that or just status.
                                             # Actually let's just update status.
            })
        except Exception as e:
            logger.error(f"Failed to update cancel status in DB: {e}")

        self.approval_history.append(request)
        del self.active_approvals[request_id]

        return True

    def get_request(self, request_id: str) -> Optional[ApprovalRequest]:
        """承認リクエストを取得"""
        # Try memory first
        req = self.active_approvals.get(request_id)
        if req:
            return req
        
        # Try DB
        try:
            req_data = db_manager.get_approval_request(request_id)
            if req_data:
                # Reconstruct (simplified)
                # Note: fully reconstructing objects purely from DB might be needed if looking up old history
                return ApprovalRequest(
                    request_id=req_data["request_id"],
                    type=ApprovalType(req_data["type"]),
                    title=req_data["title"],
                    description=req_data["description"],
                    context=ApprovalContext(**req_data.get("context", {})),
                    status=ApprovalStatus(req_data["status"]),
                    # ... other fields
                )
        except Exception:
            pass
            
        return None

    def get_active_requests(self) -> List[ApprovalRequest]:
        """アクティブな承認リクエスト一覧"""
        return list(self.active_approvals.values())

    def get_history(
        self, limit: int = 50, approval_type: Optional[ApprovalType] = None
    ) -> List[ApprovalRequest]:
        """承認履歴を取得"""
        # Prefer DB source of truth
        try:
            history_data = db_manager.get_approval_requests(limit=limit)
            history_objs = []
            for h in history_data:
                # Filter by type if needed (DB method didn't implement type filter, so do it here or update DB method)
                if approval_type and h["type"] != approval_type:
                    continue
                    
                history_objs.append(ApprovalRequest(
                    request_id=h["request_id"],
                    type=ApprovalType(h["type"]),
                    title=h["title"],
                    description=h["description"],
                    context=ApprovalContext(**h.get("context", {})),
                    status=ApprovalStatus(h["status"]),
                    created_at=datetime.fromisoformat(h["created_at"]) if isinstance(h["created_at"], str) else h["created_at"],
                    # ... Map other fields as needed for display
                    approved_by=h.get("approved_by"),
                    rejected_by=h.get("rejected_by"),
                ))
            return history_objs
        except Exception as e:
            logger.error(f"Failed to fetch history from DB: {e}")
            # Fallback to in-memory
            history = self.approval_history[-limit:]
            if approval_type:
                history = [r for r in history if r.type == approval_type]
            return history

    def cleanup_expired(self):
        """期限切れのリクエストをクリーンアップ"""
        now = datetime.now()
        expired_ids = [
            rid
            for rid, req in self.active_approvals.items()
            if req.expires_at and req.expires_at < now
        ]

        for rid in expired_ids:
            request = self.active_approvals[rid]
            request.status = ApprovalStatus.EXPIRED
            logger.info(f"Approval expired and cleaned up: {rid}")
            self.approval_history.append(request)
            del self.active_approvals[rid]


class SlackApprovalNotifier:
    """Slack承認通知（対話型ボタン付き）"""

    def __init__(self, webhook_url: str, app_token: Optional[str] = None):
        self.webhook_url = webhook_url
        self.app_token = app_token  # For Slack API (app_mention, dm)

    def send_approval_request(
        self, request: ApprovalRequest, callback_url: str
    ) -> Optional[str]:
        """
        Slackに承認リクエストを送信（対話型ボタン付き）

        Args:
            request: 承認リクエスト
            callback_url: コールバックURL

        Returns:
            str: SlackメッセージID
        """
        try:
            context_fields = []
            if request.context.ticker:
                context_fields.append(
                    {"title": "Ticker", "value": request.context.ticker, "short": True}
                )
            if request.context.action:
                context_fields.append(
                    {"title": "Action", "value": request.context.action, "short": True}
                )
            if request.context.quantity:
                context_fields.append(
                    {
                        "title": "Quantity",
                        "value": str(request.context.quantity),
                        "short": True,
                    }
                )
            if request.context.price:
                context_fields.append(
                    {
                        "title": "Price",
                        "value": f"${request.context.price:.2f}",
                        "short": True,
                    }
                )
            if request.context.confidence:
                context_fields.append(
                    {
                        "title": "Confidence",
                        "value": f"{request.context.confidence:.1%}",
                        "short": True,
                    }
                )
            if request.context.risk_level:
                context_fields.append(
                    {
                        "title": "Risk Level",
                        "value": request.context.risk_level,
                        "short": True,
                    }
                )
            if request.context.reason:
                context_fields.append(
                    {"title": "Reason", "value": request.context.reason, "short": False}
                )

            payload = {
                "text": f"*Approval Required: {request.title}*",
                "attachments": [
                    {
                        "color": "warning",
                        "fields": [
                            {
                                "title": "Request ID",
                                "value": request.request_id,
                                "short": True,
                            },
                            {
                                "title": "Type",
                                "value": request.type.value.replace("_", " ").title(),
                                "short": True,
                            },
                            {
                                "title": "Expires",
                                "value": request.expires_at.strftime(
                                    "%Y-%m-%d %H:%M:%S"
                                )
                                if request.expires_at
                                else "N/A",
                                "short": True,
                            },
                        ]
                        + context_fields,
                        "footer": f"Description: {request.description}",
                    }
                ],
                "actions": [
                    {
                        "type": "button",
                        "text": "✅ Approve",
                        "style": "primary",
                        "url": f"{callback_url}/webhooks/slack/approve?request_id={request.request_id}",
                        "confirm": {
                            "title": "Confirm Approval",
                            "text": f"Are you sure you want to approve {request.title}?",
                            "confirm_text": "Yes, Approve",
                            "dismiss_text": "Cancel",
                        },
                    },
                    {
                        "type": "button",
                        "text": "❌ Reject",
                        "style": "danger",
                        "url": f"{callback_url}/webhooks/slack/reject?request_id={request.request_id}",
                    },
                ],
            }

            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()

            response_data = response.json()
            message_id = response_data.get("ts") or response_data.get(
                "message", {}
            ).get("ts")

            logger.info(
                f"Slack approval request sent: {request.request_id}, message_id: {message_id}"
            )
            return message_id

        except Exception as e:
            logger.error(f"Failed to send Slack approval request: {e}")
            return None

    def update_approval_status(
        self, request: ApprovalRequest, message_id: str, original_message_ts: str
    ) -> bool:
        """
        Slackメッセージを更新（承認ステータスを反映）

        Args:
            request: 承認リクエスト
            message_id: メッセージID
            original_message_ts: 元のメッセージタイムスタンプ

        Returns:
            bool: 成功時True
        """
        try:
            if not self.app_token:
                logger.warning("Slack app token not configured for message updates")
                return False

            # Slack APIを使用してメッセージを更新
            headers = {
                "Authorization": f"Bearer {self.app_token}",
                "Content-Type": "application/json",
            }

            status_emoji = {"approved": "✅", "rejected": "❌", "expired": "⏰"}.get(
                request.status.value, "⏳"
            )

            payload = {
                "channel": request.platform or "",
                "ts": original_message_ts,
                "attachments": [
                    {
                        "color": "good"
                        if request.status == ApprovalStatus.APPROVED
                        else "danger",
                        "fields": [
                            {
                                "title": "Status",
                                "value": f"{status_emoji} {request.status.value.title()}",
                                "short": True,
                            },
                            {
                                "title": "Request ID",
                                "value": request.request_id,
                                "short": True,
                            },
                        ],
                        "footer": f"Processed by {request.approved_by or request.rejected_by or 'System'}",
                    }
                ],
            }

            response = requests.post(
                "https://slack.com/api/chat.update",
                headers=headers,
                json=payload,
                timeout=10,
            )
            response.raise_for_status()

            logger.info(f"Slack message updated: {request.request_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update Slack message: {e}")
            return False


class DiscordApprovalNotifier:
    """Discord承認通知（対話型ボタン付き）"""

    def __init__(self, webhook_url: str, bot_token: Optional[str] = None):
        self.webhook_url = webhook_url
        self.bot_token = bot_token  # For Discord API (message updates)

    def send_approval_request(
        self, request: ApprovalRequest, callback_url: str
    ) -> Optional[str]:
        """
        Discordに承認リクエストを送信（対話型ボタン付き）

        Args:
            request: 承認リクエスト
            callback_url: コールバックURL

        Returns:
            str: DiscordメッセージID
        """
        try:
            # Build embed fields
            embed_fields = [
                {
                    "name": "Request ID",
                    "value": f"`{request.request_id}`",
                    "inline": True,
                },
                {
                    "name": "Type",
                    "value": request.type.value.replace("_", " ").title(),
                    "inline": True,
                },
                {
                    "name": "Expires",
                    "value": request.expires_at.strftime("%Y-%m-%d %H:%M:%S")
                    if request.expires_at
                    else "N/A",
                    "inline": True,
                },
            ]

            if request.context.ticker:
                embed_fields.append(
                    {"name": "Ticker", "value": request.context.ticker, "inline": True}
                )
            if request.context.action:
                embed_fields.append(
                    {"name": "Action", "value": request.context.action, "inline": True}
                )
            if request.context.quantity:
                embed_fields.append(
                    {
                        "name": "Quantity",
                        "value": str(request.context.quantity),
                        "inline": True,
                    }
                )
            if request.context.price:
                embed_fields.append(
                    {
                        "name": "Price",
                        "value": f"${request.context.price:.2f}",
                        "inline": True,
                    }
                )
            if request.context.confidence:
                embed_fields.append(
                    {
                        "name": "Confidence",
                        "value": f"{request.context.confidence:.1%}",
                        "inline": True,
                    }
                )
            if request.context.risk_level:
                embed_fields.append(
                    {
                        "name": "Risk Level",
                        "value": request.context.risk_level,
                        "inline": True,
                    }
                )
            if request.context.reason:
                embed_fields.append(
                    {"name": "Reason", "value": request.context.reason, "inline": False}
                )

            status_color = 0xFFAA00  # Orange for pending
            if request.status == ApprovalStatus.APPROVED:
                status_color = 0x00FF00  # Green
            elif request.status == ApprovalStatus.REJECTED:
                status_color = 0xFF0000  # Red

            payload = {
                "content": f"🔔 **Approval Required: {request.title}**",
                "embeds": [
                    {
                        "title": request.description,
                        "color": status_color,
                        "fields": embed_fields,
                        "footer": {
                            "text": f"Request ID: {request.request_id} | Type: {request.type.value}",
                        },
                        "timestamp": request.created_at.isoformat()
                        if request.created_at
                        else datetime.now().isoformat(),
                    }
                ],
                "components": [
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 3,
                                "label": "✅ Approve",
                                "custom_id": f"approve_{request.request_id}",
                                "url": f"{callback_url}/webhooks/discord/approve?request_id={request.request_id}",
                            },
                            {
                                "type": 2,
                                "style": 4,
                                "label": "❌ Reject",
                                "custom_id": f"reject_{request.request_id}",
                                "url": f"{callback_url}/webhooks/discord/reject?request_id={request.request_id}",
                            },
                        ],
                    }
                ],
            }

            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()

            response_data = response.json()
            message_id = response_data.get("id")

            logger.info(
                f"Discord approval request sent: {request.request_id}, message_id: {message_id}"
            )
            return message_id

        except Exception as e:
            logger.error(f"Failed to send Discord approval request: {e}")
            return None

    def update_approval_status(
        self,
        request: ApprovalRequest,
        message_id: str,
        channel_id: Optional[str] = None,
    ) -> bool:
        """
        Discordメッセージを更新（承認ステータスを反映）

        Args:
            request: 承認リクエスト
            message_id: メッセージID
            channel_id: チャンネルID

        Returns:
            bool: 成功時True
        """
        try:
            if not self.bot_token or not channel_id:
                logger.warning(
                    "Discord bot token or channel ID not configured for message updates"
                )
                return False

            headers = {
                "Authorization": f"Bot {self.bot_token}",
                "Content-Type": "application/json",
            }

            status_color = (
                0x00FF00 if request.status == ApprovalStatus.APPROVED else 0xFF0000
            )
            status_emoji = {"approved": "✅", "rejected": "❌", "expired": "⏰"}.get(
                request.status.value, "⏳"
            )

            payload = {
                "embeds": [
                    {
                        "color": "warning",
                        "fields": [
                            {
                                "title": "Request ID",
                                "value": request.request_id,
                                "short": True,
                            },
                            {
                                "title": "Type",
                                "value": request.type.value.replace("_", " ").title(),
                                "short": True,
                            },
                            {
                                "title": "Expires",
                                "value": request.expires_at.strftime(
                                    "%Y-%m-%d %H:%M:%S"
                                )
                                if request.expires_at
                                else "N/A",
                                "short": True,
                            },
                        ],
                        "footer": f"Description: {request.description}",
                    }
                ],
                "components": [],  # Remove buttons after decision
            }

            response = requests.patch(
                f"https://discord.com/api/v10/channels/{channel_id}/messages/{message_id}",
                headers=headers,
                json=payload,
                timeout=10,
            )
            response.raise_for_status()

            logger.info(f"Discord message updated: {request.request_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update Discord message: {e}")
            return False


class IntegratedApprovalSystem:
    """統合承認システム"""

    def __init__(
        self,
        slack_webhook_url: str,
        discord_webhook_url: str,
        redis_store=None,
        websocket_manager=None,
    ):
        self.workflow = ApprovalWorkflowManager(redis_store=redis_store)
        self.slack_notifier = SlackApprovalNotifier(
            slack_webhook_url,
            app_token=None,  # Optional: set from config
        )
        self.discord_notifier = DiscordApprovalNotifier(
            discord_webhook_url,
            bot_token=None,  # Optional: set from config
        )
        self.base_callback_url = "http://localhost:8000"
        self.redis_store = redis_store
        self.websocket_manager = websocket_manager

    def send_approval_notification(
        self, request: ApprovalRequest, platform: str = "both"
    ) -> Dict[str, Optional[str]]:
        """
        承認通知を送信

        Args:
            request: 承認リクエスト
            platform: 'slack', 'discord', 'both'

        Returns:
            Dict: プラットフォームごとのメッセージID
        """
        message_ids = {}

        # Send via WebSocket for instant UI cards
        if self.websocket_manager:
            self._send_websocket_approval_request(request)

        if platform in ("slack", "both") and self.slack_notifier.webhook_url:
            slack_id = self.slack_notifier.send_approval_request(
                request, self.base_callback_url
            )
            if slack_id:
                message_ids["slack"] = slack_id
                request.platform = "slack"
                request.message_id = slack_id

        if platform in ("discord", "both") and self.discord_notifier.webhook_url:
            discord_id = self.discord_notifier.send_approval_request(
                request, self.base_callback_url
            )
            if discord_id:
                message_ids["discord"] = discord_id
                if not request.platform:
                    request.platform = "discord"
                    request.message_id = discord_id

        return message_ids

    def _send_websocket_approval_request(self, request: ApprovalRequest):
        """
        WebSocket経由で承認リクエストをブロードキャスト

        Args:
            request: 承認リクエスト
        """
        try:
            if not self.websocket_manager:
                return

            # Determine priority based on approval type and context
            priority = "medium"
            if request.type in [
                ApprovalType.CIRCUIT_BREAKER_RESET,
                ApprovalType.MANUAL_INTERVENTION,
            ]:
                priority = "critical"
            elif request.type == ApprovalType.RISK_LIMIT_CHANGE:
                priority = "high"
            elif request.context.risk_level == "high":
                priority = "high"

            # Build context dict from ApprovalContext
            context_dict = {}
            if request.context.ticker:
                context_dict["ticker"] = request.context.ticker
            if request.context.action:
                context_dict["action"] = request.context.action
            if request.context.quantity:
                context_dict["quantity"] = request.context.quantity
            if request.context.price:
                context_dict["price"] = request.context.price
            if request.context.strategy:
                context_dict["strategy"] = request.context.strategy
            if request.context.confidence:
                context_dict["confidence"] = request.context.confidence
            if request.context.risk_level:
                context_dict["risk_level"] = request.context.risk_level
            if request.context.reason:
                context_dict["reason"] = request.context.reason
            if request.context.metadata:
                context_dict.update(request.context.metadata)

            # Create WebSocket message
            websocket_payload = {
                "request_id": request.request_id,
                "type": request.type.value,
                "title": request.title,
                "description": request.description,
                "context": context_dict,
                "requester": "Trading System",  # TODO: Get from auth context
                "priority": priority,
                "expires_at": request.expires_at.isoformat()
                if request.expires_at
                else "",
                "created_at": request.created_at.isoformat()
                if request.created_at
                else "",
            }

            # Broadcast to all connected clients
            self.websocket_manager.broadcast_to_all(
                "approval_request", websocket_payload
            )
            logger.info(f"WebSocket approval request broadcasted: {request.request_id}")

        except Exception as e:
            logger.error(f"Failed to broadcast approval request via WebSocket: {e}")

    def broadcast_approval_response(
        self, request: ApprovalRequest, status: str, responder: str
    ):
        """
        承認レスポンスをWebSocketでブロードキャスト

        Args:
            request: 承認リクエスト
            status: 承認ステータス
            responder: レスポンダー
        """
        try:
            if not self.websocket_manager:
                return

            response_payload = {
                "request_id": request.request_id,
                "status": status,
                "responder": responder,
                "responded_at": datetime.now().isoformat(),
            }

            # Broadcast to all connected clients
            self.websocket_manager.broadcast_to_all(
                "approval_response", response_payload
            )
            logger.info(
                f"WebSocket approval response broadcasted: {request.request_id} - {status}"
            )

        except Exception as e:
            logger.error(f"Failed to broadcast approval response via WebSocket: {e}")

    def create_and_notify_approval(
        self,
        approval_type: ApprovalType,
        title: str,
        description: str,
        context: ApprovalContext,
        callback: Optional[Callable[[ApprovalRequest], None]] = None,
        platform: str = "both",
        expiry_minutes: Optional[int] = None,
    ) -> ApprovalRequest:
        """
        承認リクエストを作成し通知を送信

        Args:
            approval_type: 承認タイプ
            title: タイトル
            description: 説明
            context: コンテキスト
            callback: コールバック関数
            platform: 通知先プラットフォーム
            expiry_minutes: 有効期限

        Returns:
            ApprovalRequest: 作成された承認リクエスト
        """
        request = self.workflow.create_approval_request(
            approval_type=approval_type,
            title=title,
            description=description,
            context=context,
            expiry_minutes=expiry_minutes,
        )

        if callback:
            self.workflow.register_callback(request.request_id, callback)

        self.send_approval_notification(request, platform)

        return request

    def approve(
        self,
        request_id: str,
        approved_by: str,
        platform: str = "web",
        message_id: Optional[str] = None,
    ) -> bool:
        """
        承認を承認（WebSocketブロードキャスト付き）

        Args:
            request_id: リクエストID
            approved_by: 承認者
            platform: プラットフォーム
            message_id: プラットフォームメッセージID

        Returns:
            bool: 成功時True
        """
        success = self.workflow.approve(request_id, approved_by, platform, message_id)

        if success:
            request = self.workflow.get_history(limit=1)[
                -1
            ]  # Get the most recent approval
            self.broadcast_approval_response(request, "approved", approved_by)

        return success

    def reject(
        self,
        request_id: str,
        rejected_by: str,
        reason: Optional[str] = None,
        platform: str = "web",
        message_id: Optional[str] = None,
    ) -> bool:
        """
        承認を却下（WebSocketブロードキャスト付き）

        Args:
            request_id: リクエストID
            rejected_by: 却下者
            reason: 却下理由
            platform: プラットフォーム
            message_id: プラットフォームメッセージID

        Returns:
            bool: 成功時True
        """
        success = self.workflow.reject(
            request_id, rejected_by, reason, platform, message_id
        )

        if success:
            request = self.workflow.get_history(limit=1)[
                -1
            ]  # Get the most recent approval
            self.broadcast_approval_response(request, "rejected", rejected_by)

        return success


# グローバルインスタンス
approval_system: Optional[IntegratedApprovalSystem] = None


def get_approval_system(websocket_manager=None) -> IntegratedApprovalSystem:
    """承認システムのインスタンスを取得"""
    global approval_system
    if approval_system is None:
        # Load from config
        from src.infra.config_loader import get_notification_config
        from src.approval_redis_store import get_approval_redis_store

        config = get_notification_config()
        slack_url = config.get("slack", {}).get("webhook_url", "")
        discord_url = config.get("discord", {}).get("webhook_url", "")

        # Redisストアを初期化
        redis_store = get_approval_redis_store()

        approval_system = IntegratedApprovalSystem(
            slack_webhook_url=slack_url,
            discord_webhook_url=discord_url,
            websocket_manager=websocket_manager,
            redis_store=redis_store,
        )

    return approval_system
