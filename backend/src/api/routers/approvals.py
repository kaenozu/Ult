"""
Approval Workflow API Router
承認ワークフローAPIルーター
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends
from pydantic import BaseModel, Field

from src.approval_system import (
    ApprovalStatus,
    ApprovalType,
    ApprovalContext,
    ApprovalRequest,
    get_approval_system,
)
from src.api.dependencies import get_paper_trader, get_portfolio_manager
from src.approval_redis_store import get_approval_redis_store

router = APIRouter()
logger = logging.getLogger(__name__)


# Request/Response Schemas
class CreateApprovalRequest(BaseModel):
    approval_type: ApprovalType
    title: str
    description: str
    context: ApprovalContext
    platform: str = Field(default="both", pattern="^(slack|discord|both)$")
    expiry_minutes: Optional[int] = Field(default=None, gt=0)


class ApprovalDecisionRequest(BaseModel):
    request_id: str
    decision: str = Field(..., pattern="^(approve|reject)$")
    reason: Optional[str] = None


class TradeApprovalRequest(BaseModel):
    ticker: str
    action: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)
    price: Optional[float] = None
    strategy: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    reason: Optional[str] = None


class ApprovalResponse(BaseModel):
    request_id: str
    status: str
    message: str
    created_at: datetime


class ApprovalListResponse(BaseModel):
    total: int
    approvals: List[Dict]


class ApprovalSyncResponse(BaseModel):
    success: bool
    approvals: List[Dict]
    redis_available: bool


# Endpoints
@router.post("/approvals", response_model=ApprovalResponse)
async def create_approval(
    request: CreateApprovalRequest,
    background_tasks: BackgroundTasks,
):
    """
    新規承認リクエストを作成

    Args:
        request: 承認リクエストデータ
        background_tasks: バックグラウンドタスク

    Returns:
        ApprovalResponse: 作成された承認リクエスト
    """
    try:
        system = get_approval_system()

        # 承認リクエストを作成し通知を送信
        # TODO: Get actual user from auth context
        user = "Web User"
        approval_req = system.create_and_notify_approval(
            approval_type=request.approval_type,
            title=request.title,
            description=request.description,
            context=request.context,
            platform=request.platform,
            expiry_minutes=request.expiry_minutes,
            requester=user,
        )

        return ApprovalResponse(
            request_id=approval_req.request_id,
            status=approval_req.status.value,
            message=f"Approval request created and notification sent to {request.platform}",
            created_at=approval_req.created_at,
        )

    except Exception as e:
        logger.error(f"Error creating approval: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approvals/trade")
async def request_trade_approval(
    request: TradeApprovalRequest,
    background_tasks: BackgroundTasks,
    pt=Depends(get_paper_trader),
    pm=Depends(get_portfolio_manager),
):
    """
    取引承認リクエストを作成（Semi-Auto Mode用）

    Args:
        request: 取引承認リクエスト
        background_tasks: バックグラウンドタスク
        pt: PaperTraderインスタンス
        pm: PortfolioManagerインスタンス

    Returns:
        ApprovalResponse: 作成された承認リクエスト
    """
    try:
        system = get_approval_system()

        # 価格を取得（指定がなければ最新価格）
        price = request.price
        if price is None:
            from src.data_temp.data_loader import fetch_stock_data, get_latest_price

            data_map = fetch_stock_data([request.ticker], period="5d")
            df = data_map.get(request.ticker)
            price = get_latest_price(df)

            if price <= 0:
                raise HTTPException(status_code=400, detail="Could not fetch price")

        # コンテキストを作成
        context = ApprovalContext(
            ticker=request.ticker,
            action=request.action,
            quantity=request.quantity,
            price=price,
            strategy=request.strategy,
            confidence=request.confidence,
            reason=request.reason,
            metadata={"estimated_value": price * request.quantity},
        )

        # 承認リクエストを作成
        title = f"{request.action} {request.quantity} {request.ticker}"
        description = f"Trade execution request: {request.action} {request.quantity} shares of {request.ticker} @ ${price:.2f}"
        if request.strategy:
            description += f"\nStrategy: {request.strategy}"
        if request.reason:
            description += f"\nReason: {request.reason}"

        # コールバックを定義（承認時に取引を実行）
        def execute_trade_callback(approval_request: ApprovalRequest):
            try:
                success = pt.execute_trade(
                    ticker=approval_request.context.ticker,
                    action=approval_request.context.action,
                    quantity=approval_request.context.quantity,
                    price=approval_request.context.price,
                    strategy=approval_request.context.strategy,
                )

                if success:
                    from src.notification_system import send_trade_notification

                    if (
                        approval_request.context.ticker
                        and approval_request.context.action
                    ):
                        send_trade_notification(
                            symbol=approval_request.context.ticker or "",
                            action=approval_request.context.action or "",
                            quantity=float(approval_request.context.quantity or 0),
                            price=float(approval_request.context.price or 0),
                        )
                        logger.info(
                            f"Trade executed after approval: {approval_request.request_id}"
                        )
                        logger.info(
                            f"Trade executed after approval: {approval_request.request_id}"
                        )
                else:
                    logger.error(
                        f"Trade execution failed after approval: {approval_request.request_id}"
                    )
            except Exception as e:
                logger.error(f"Error in trade execution callback: {e}")

        # 承認リクエストを作成し通知を送信
        approval_req = system.create_and_notify_approval(
            approval_type=ApprovalType.TRADE_EXECUTION,
            title=title,
            description=description,
            context=context,
            callback=execute_trade_callback,
            platform="both",  # 両方のプラットフォームに通知
            expiry_minutes=30,
            requester="Trading System",
        )

        return ApprovalResponse(
            request_id=approval_req.request_id,
            status=approval_req.status.value,
            message=f"Trade approval request created and notification sent. Waiting for approval.",
            created_at=approval_req.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating trade approval: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/approvals/{request_id}")
async def get_approval(request_id: str):
    """
    承認リクエストを取得

    Args:
        request_id: リクエストID

    Returns:
        ApprovalRequest: 承認リクエスト
    """
    try:
        system = get_approval_system()
        request = system.workflow.get_request(request_id)

        if not request:
            raise HTTPException(status_code=404, detail="Approval request not found")

        return request

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting approval: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/approvals")
async def list_approvals(status: Optional[str] = None, limit: int = 50):
    """
    承認リクエスト一覧を取得

    Args:
        status: ステータスでフィルタリング
        limit: 最大件数

    Returns:
        ApprovalListResponse: 承認リクエスト一覧
    """
    try:
        system = get_approval_system()

        if status == "pending":
            approvals = system.workflow.get_active_requests()
        else:
            approvals = system.workflow.get_history(limit=limit)
            if status:
                approvals = [a for a in approvals if a.status.value == status]

        return ApprovalListResponse(
            total=len(approvals),
            approvals=[asdict(a) for a in approvals],
        )

    except Exception as e:
        logger.error(f"Error listing approvals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approvals/decision")
async def make_approval_decision(
    request: ApprovalDecisionRequest, http_request: Request
):
    """
    承認決定を行う

    Args:
        request: 承認決定データ
        http_request: HTTPリクエスト（ユーザー情報取得用）

    Returns:
        Dict: 結果
    """
    try:
        system = get_approval_system()

        # ユーザー情報を取得（簡易実装）
        user = "web_user"  # 認証システムと統合する場合はここで取得

        if request.decision == "approve":
            success = system.workflow.approve(
                request_id=request.request_id,
                approved_by=user,
                platform="web",
            )
        else:
            success = system.workflow.reject(
                request_id=request.request_id,
                rejected_by=user,
                reason=request.reason,
                platform="web",
            )

        if not success:
            raise HTTPException(
                status_code=400, detail="Failed to process approval decision"
            )

        return {
            "success": True,
            "message": f"Approval {request.decision}ed successfully",
            "request_id": request.request_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error making approval decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/approvals/{request_id}")
async def cancel_approval(request_id: str, http_request: Request):
    """
    承認リクエストをキャンセル

    Args:
        request_id: リクエストID
        http_request: HTTPリクエスト（ユーザー情報取得用）

    Returns:
        Dict: 結果
    """
    try:
        system = get_approval_system()
        user = "web_user"

        success = system.workflow.cancel(request_id, user)

        if not success:
            raise HTTPException(status_code=400, detail="Failed to cancel approval")

        return {
            "success": True,
            "message": "Approval cancelled successfully",
            "request_id": request_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling approval: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Webhook Callback Endpoints
@router.post("/webhooks/slack/approve")
async def slack_approve_webhook(request: Request):
    """
    Slack承認ボタンコールバックエンドポイント
    """
    try:
        system = get_approval_system()

        # リクエストからパラメータを取得
        form_data = await request.form()
        request_id = form_data.get("request_id")
        user = form_data.get("user", {}).get("name", "slack_user")
        message_ts = form_data.get("message_ts")

        if not request_id:
            raise HTTPException(status_code=400, detail="Request ID is required")

        # 承認を実行
        approval_req = system.workflow.get_request(request_id)
        if not approval_req:
            raise HTTPException(status_code=404, detail="Approval request not found")

        success = system.workflow.approve(
            request_id=request_id,
            approved_by=user,
            platform="slack",
            message_id=message_ts,
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to approve")

        # Slackメッセージを更新
        if message_ts and approval_req.message_id:
            system.slack_notifier.update_approval_status(
                request=approval_req,
                message_id=approval_req.message_id,
                original_message_ts=message_ts,
            )

        # JSONレスポンス（Slackの応答）
        return {
            "response_type": "in_channel",
            "text": f"✅ Approved: {approval_req.title} by {user}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Slack approve webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/slack/reject")
async def slack_reject_webhook(request: Request):
    """
    Slack却下ボタンコールバックエンドポイント
    """
    try:
        system = get_approval_system()

        form_data = await request.form()
        request_id = form_data.get("request_id")
        user = form_data.get("user", {}).get("name", "slack_user")
        message_ts = form_data.get("message_ts")
        reason = form_data.get("text", "")  # ユーザーが入力した理由

        if not request_id:
            raise HTTPException(status_code=400, detail="Request ID is required")

        approval_req = system.workflow.get_request(request_id)
        if not approval_req:
            raise HTTPException(status_code=404, detail="Approval request not found")

        success = system.workflow.reject(
            request_id=request_id,
            rejected_by=user,
            reason=reason,
            platform="slack",
            message_id=message_ts,
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to reject")

        if message_ts and approval_req.message_id:
            system.slack_notifier.update_approval_status(
                request=approval_req,
                message_id=approval_req.message_id,
                original_message_ts=message_ts,
            )

        return {
            "response_type": "in_channel",
            "text": f"❌ Rejected: {approval_req.title} by {user}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Slack reject webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhooks/discord/approve")
async def discord_approve_webhook(request: Request):
    """
    Discord承認ボタンコールバックエンドポイント
    """
    try:
        system = get_approval_system()

        request_id = request.query_params.get("request_id")
        user = "discord_user"
        message_id = request.query_params.get("message_id")
        channel_id = request.query_params.get("channel_id")

        if not request_id:
            raise HTTPException(status_code=400, detail="Request ID is required")

        approval_req = system.workflow.get_request(request_id)
        if not approval_req:
            raise HTTPException(status_code=404, detail="Approval request not found")

        success = system.workflow.approve(
            request_id=request_id,
            approved_by=user,
            platform="discord",
            message_id=message_id,
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to approve")

        if message_id and channel_id:
            system.discord_notifier.update_approval_status(
                request=approval_req,
                message_id=message_id,
                channel_id=channel_id,
            )

        return {
            "success": True,
            "message": f"✅ Approved: {approval_req.title}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Discord approve webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhooks/discord/reject")
async def discord_reject_webhook(request: Request):
    """
    Discord却下ボタンコールバックエンドポイント
    """
    try:
        system = get_approval_system()

        request_id = request.query_params.get("request_id")
        user = "discord_user"
        message_id = request.query_params.get("message_id")
        channel_id = request.query_params.get("channel_id")
        reason = request.query_params.get("reason", "")

        if not request_id:
            raise HTTPException(status_code=400, detail="Request ID is required")

        approval_req = system.workflow.get_request(request_id)
        if not approval_req:
            raise HTTPException(status_code=404, detail="Approval request not found")

        success = system.workflow.reject(
            request_id=request_id,
            rejected_by=user,
            reason=reason,
            platform="discord",
            message_id=message_id,
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to reject")

        if message_id and channel_id:
            system.discord_notifier.update_approval_status(
                request=approval_req,
                message_id=message_id,
                channel_id=channel_id,
            )

        return {
            "success": True,
            "message": f"❌ Rejected: {approval_req.title}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Discord reject webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approvals/cleanup")
async def cleanup_expired_approvals():
    """
    期限切れの承認リクエストをクリーンアップ
    """
    try:
        system = get_approval_system()
        system.workflow.cleanup_expired()

        return {
            "success": True,
            "message": "Expired approvals cleaned up",
        }

    except Exception as e:
        logger.error(f"Error cleaning up approvals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/approvals/sync", response_model=ApprovalSyncResponse)
async def sync_approvals_from_redis():
    """
    Redisからアクティブな承認リクエストを取得（フロントエンド同期用）
    """
    try:
        redis_store = get_approval_redis_store()
        redis_available = redis_store.health_check()

        approvals = []

        if redis_available:
            approvals = redis_store.get_all_active_approvals()
            logger.info(f"Fetched {len(approvals)} approvals from Redis for sync")
        else:
            logger.warning("Redis not available for approval sync")

        # 追加のシステムステータスも含める
        system = get_approval_system()
        local_approvals = system.workflow.get_active_requests()

        return ApprovalSyncResponse(
            success=True,
            approvals=approvals,
            redis_available=redis_available,
        )

    except Exception as e:
        logger.error(f"Error syncing approvals: {e}")
        return ApprovalSyncResponse(
            success=False,
            approvals=[],
            redis_available=False,
        )
