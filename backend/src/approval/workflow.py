"""
Approval Workflow Management
承認ワークフローの管理とロジック
"""

import logging
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable

from .models import (
    ApprovalRequest,
    ApprovalResponse,
    ApprovalRule,
    ApprovalStatus,
    ApprovalType,
    Priority,
)

logger = logging.getLogger(__name__)


class ApprovalWorkflow:
    """承認ワークフロー管理クラス"""

    def __init__(self):
        self.pending_requests: Dict[str, ApprovalRequest] = {}
        self.rules: Dict[str, ApprovalRule] = {}
        self.callbacks: Dict[ApprovalType, List[Callable]] = {}

    def register_callback(
        self, approval_type: ApprovalType, callback: Callable
    ) -> None:
        """承認タイプのコールバックを登録"""
        if approval_type not in self.callbacks:
            self.callbacks[approval_type] = []
        self.callbacks[approval_type].append(callback)

    def create_request(
        self,
        approval_type: ApprovalType,
        title: str,
        description: str,
        requested_by: str,
        context: dict = None,
        priority: Priority = Priority.MEDIUM,
        expires_in_minutes: int = 60,
    ) -> str:
        """新しい承認リクエストを作成"""

        request_id = secrets.token_urlsafe(16)
        expires_at = datetime.now() + timedelta(minutes=expires_in_minutes)

        # ルールチェック
        rule = self._get_matching_rule(approval_type, priority)

        request = ApprovalRequest(
            request_id=request_id,
            type=approval_type,
            priority=priority,
            context=context or {},
            title=title,
            description=description,
            requested_by=requested_by,
            requested_at=datetime.now(),
            expires_at=expires_at,
            status=ApprovalStatus.PENDING,
        )

        self.pending_requests[request_id] = request

        # 自動承認チェック
        if rule and rule.auto_approve:
            self._auto_approve(request, rule)
        else:
            self._notify_approvers(request)

        return request_id

    def respond_to_request(
        self,
        request_id: str,
        responder: str,
        status: ApprovalStatus,
        reason: str = None,
    ) -> bool:
        """承認リクエストに応答"""

        if request_id not in self.pending_requests:
            logger.warning(f"Request {request_id} not found")
            return False

        request = self.pending_requests[request_id]

        # ステータスチェック
        if request.status != ApprovalStatus.PENDING:
            logger.warning(f"Request {request_id} is not pending")
            return False

        # 期限チェック
        if datetime.now() > (request.expires_at or datetime.now()):
            request.status = ApprovalStatus.EXPIRED
            logger.info(f"Request {request_id} expired")
            return False

        response = ApprovalResponse(
            request_id=request_id,
            responder=responder,
            status=status,
            reason=reason,
            responded_at=datetime.now(),
        )

        request.status = status

        # 結果を通知
        self._notify_result(request, response)

        # ペンディングから削除
        if status in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]:
            del self.pending_requests[request_id]

        return True

    def get_pending_requests(self, user: str = None) -> List[ApprovalRequest]:
        """ペンディング中の承認リクエストを取得"""
        requests = list(self.pending_requests.values())

        # 期限切れチェック
        now = datetime.now()
        for request in requests[:]:
            if request.expires_at and now > request.expires_at:
                request.status = ApprovalStatus.EXPIRED
                del self.pending_requests[request.request_id]
                requests.remove(request)

        # ユーザーフィルタリング
        if user:
            requests = [r for r in requests if r.requested_by == user]

        return requests

    def cancel_request(self, request_id: str, user: str) -> bool:
        """承認リクエストをキャンセル"""

        if request_id not in self.pending_requests:
            return False

        request = self.pending_requests[request_id]

        if request.requested_by != user:
            logger.warning(f"User {user} not authorized to cancel request {request_id}")
            return False

        request.status = ApprovalStatus.CANCELLED
        del self.pending_requests[request_id]

        self._notify_cancellation(request)
        return True

    def add_rule(self, rule: ApprovalRule) -> None:
        """承認ルールを追加"""
        self.rules[rule.rule_id] = rule
        logger.info(f"Added approval rule: {rule.name}")

    def remove_rule(self, rule_id: str) -> bool:
        """承認ルールを削除"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            logger.info(f"Removed approval rule: {rule_id}")
            return True
        return False

    def _get_matching_rule(
        self, approval_type: ApprovalType, priority: Priority
    ) -> Optional[ApprovalRule]:
        """条件に一致する承認ルールを検索"""

        for rule in self.rules.values():
            if (
                rule.approval_type == approval_type
                and rule.priority_threshold == priority
            ):
                return rule
        return None

    def _auto_approve(self, request: ApprovalRequest, rule: ApprovalRule) -> None:
        """自動承認を実行"""

        response = ApprovalResponse(
            request_id=request.request_id,
            responder="system",
            status=ApprovalStatus.APPROVED,
            reason=f"Auto-approved by rule: {rule.name}",
            responded_at=datetime.now(),
        )

        request.status = ApprovalStatus.APPROVED
        del self.pending_requests[request.request_id]

        self._notify_result(request, response)
        logger.info(f"Auto-approved request {request.request_id}")

    def _notify_approvers(self, request: ApprovalRequest) -> None:
        """承認者に通知"""

        if request.type in self.callbacks:
            for callback in self.callbacks[request.type]:
                try:
                    callback(request)
                except Exception as e:
                    logger.error(
                        f"Callback error for request {request.request_id}: {e}"
                    )

    def _notify_result(
        self, request: ApprovalRequest, response: ApprovalResponse
    ) -> None:
        """承認結果を通知"""

        # WebSocketブロードキャスト
        try:
            from ..api.websocket_broadcaster import broadcast_approval_response

            broadcast_approval_response(response)
        except ImportError:
            logger.warning("WebSocket broadcast not available")

        # コールバック実行
        if request.type in self.callbacks:
            for callback in self.callbacks[request.type]:
                try:
                    callback(response)
                except Exception as e:
                    logger.error(
                        f"Callback error for response {response.request_id}: {e}"
                    )

    def _notify_cancellation(self, request: ApprovalRequest) -> None:
        """キャンセルを通知"""

        logger.info(f"Request {request.request_id} cancelled by {request.requested_by}")

        # WebSocketブロードキャスト
        try:
            from ..api.websocket_broadcaster import broadcast_approval_cancellation

            broadcast_approval_cancellation(request.request_id)
        except ImportError:
            logger.warning("WebSocket broadcast not available")
