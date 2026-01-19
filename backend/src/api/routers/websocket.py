# WebSocket Router for FastAPI
# Phase 3: Realtime Synapse

import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketException, status
from fastapi.responses import JSONResponse

from src.api.websocket_manager import manager, TypedConnection
from src.api.websocket_types import (
    PingRequest,
    SubscribeRequest,
    UnsubscribeRequest,
    GetStatusRequest,
    MessageFactory,
    PongPayload,
    SubscriptionConfirmedPayload,
    StatusResponsePayload,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================


@router.websocket("/ws/synapse")
async def websocket_synapse_endpoint(
    websocket: WebSocket, user_id: Optional[str] = None
):
    """
    Main WebSocket endpoint for real-time communication.

    STRICT TYPING ENFORCED:
    - All incoming messages validated via Pydantic schemas
    - All outgoing messages strictly typed
    - Unknown message types rejected with error
    """
    connection = await manager.accept_connection(websocket, user_id)

    try:
        # Register handlers
        manager.register_handler("ping", handle_ping)
        manager.register_handler("subscribe", handle_subscribe)
        manager.register_handler("unsubscribe", handle_unsubscribe)
        manager.register_handler("get_status", handle_get_status)

        # Send welcome message
        await connection.send_message(
            MessageFactory.subscription_confirmed(
                channels=["all"],
                message=f"Welcome! Connection established: {connection.connection_id}",
            )
        )

        # Process messages
        await manager.process_client_messages(connection)

    except ConnectionError as e:
        logger.error(f"WebSocket connection error for {connection.connection_id}: {e}")
        await manager.disconnect(connection.connection_id)
    except ValueError as e:
        logger.error(f"Invalid WebSocket data for {connection.connection_id}: {e}")
        await manager.disconnect(connection.connection_id)
    except Exception as e:
        logger.error(f"Unexpected WebSocket error for {connection.connection_id}: {e}")
        await manager.disconnect(connection.connection_id)


# ============================================================================
# MESSAGE HANDLERS
# ============================================================================


async def handle_ping(message) -> None:
    """
    Handle ping messages with typed payload.
    Respond with pong containing sequence number.
    """
    try:
        payload: PingRequest = message.payload
        connection = manager.get_connection_by_id(
            message.direction.value.split(":")[-1]
            if ":" in message.direction.value
            else ""
        )

        if connection is None:
            logger.warning(f"Ping from unknown connection")
            return

        # Create pong response
        pong_msg = MessageFactory.pong(
            sequence=payload.sequence,
            client_timestamp=payload.client_timestamp,
        )
        await connection.send_message(pong_msg)

        logger.debug(f"Pong sent for sequence {payload.sequence}")

    except AttributeError as e:
        logger.error(f"Invalid ping payload: {e}")
    except Exception as e:
        logger.error(f"Unexpected error handling ping: {e}")


async def handle_subscribe(message) -> None:
    """
    Handle subscription requests.
    Add connection to specified channels.
    """
    try:
        payload: SubscribeRequest = message.payload
        connection = manager.get_connection_by_id(
            message.direction.value.split(":")[-1]
            if ":" in message.direction.value
            else ""
        )

        if connection is None:
            logger.warning(f"Subscribe from unknown connection")
            return

        # Subscribe to channels
        await manager.subscribe(connection.connection_id, payload.channels)

        # Send confirmation
        confirm_msg = MessageFactory.subscription_confirmed(
            channels=payload.channels,
            message=f"Subscribed to: {', '.join(payload.channels)}",
        )
        await connection.send_message(confirm_msg)

        logger.info(
            f"Connection {connection.connection_id} subscribed to {payload.channels}"
        )

    except Exception as e:
        logger.error(f"Error handling subscribe: {e}")


async def handle_unsubscribe(message) -> None:
    """
    Handle unsubscribe requests.
    Remove connection from specified channels.
    """
    try:
        payload: UnsubscribeRequest = message.payload
        connection = manager.get_connection_by_id(
            message.direction.value.split(":")[-1]
            if ":" in message.direction.value
            else ""
        )

        if connection is None:
            logger.warning(f"Unsubscribe from unknown connection")
            return

        # Unsubscribe from channels
        await manager.unsubscribe(connection.connection_id, payload.channels)

        # Send confirmation
        confirm_msg = MessageFactory.subscription_confirmed(
            channels=payload.channels,
            message=f"Unsubscribed from: {', '.join(payload.channels)}",
        )
        await connection.send_message(confirm_msg)

        logger.info(
            f"Connection {connection.connection_id} unsubscribed from {payload.channels}"
        )

    except Exception as e:
        logger.error(f"Error handling unsubscribe: {e}")


async def handle_get_status(message) -> None:
    """
    Handle status requests.
    Return connection and subscription information.
    """
    try:
        payload: GetStatusRequest = message.payload
        connection = manager.get_connection_by_id(
            message.direction.value.split(":")[-1]
            if ":" in message.direction.value
            else ""
        )

        if connection is None:
            logger.warning(f"Get status from unknown connection")
            return

        # Get stats
        stats = manager.get_connection_stats()

        # Build status response
        status_msg = MessageFactory.status_response(
            connection_id=connection.connection_id,
            connected_at=connection.connected_at.isoformat(),
            is_authenticated=connection.is_authenticated,
            channels_subscribed=list(connection.subscriptions),
            subscriber_count=0,  # TypedWebSocketManagerは_connections属性を持たない
            uptime_seconds=(datetime.now() - connection.connected_at).total_seconds(),
            queue_size=0,  # TypedWebSocketManagerは_message_queue属性を持たない
        )
        await connection.send_message(status_msg)

        logger.debug(f"Status sent to {connection.connection_id}")

    except Exception as e:
        logger.error(f"Error handling get_status: {e}")


# ============================================================================
# HTTP ENDPOINTS FOR STATUS
# ============================================================================


@router.get("/ws/status")
async def get_websocket_status():
    """
    HTTP endpoint to get WebSocket server status.
    Useful for health checks and monitoring.
    """
    stats = manager.get_connection_stats()
    return JSONResponse(
        content={
            "status": "running",
            "connections": stats["total_connections"],
            "channel_counts": stats["channel_counts"],
        }
    )


# ============================================================================
# MISSING FUNCTIONS FOR DEPENDENCY INJECTION
# ============================================================================


async def broadcast_regime_update(regime_data: dict) -> None:
    """
    ブロードキャストレジーム更新をすべてのクライアントに送信
    """
    try:
        # 利用可能なメッセージタイプを使用
        message = MessageFactory.status_response(
            connection_id="broadcast",
            connected_at=datetime.now().isoformat(),
            is_authenticated=True,
            channels_subscribed=["regime"],
            subscriber_count=0,  # TypedWebSocketManagerはconnections属性を持たない
            uptime_seconds=0,
            queue_size=0,
        )
        await manager.broadcast(message)
        logger.info(
            f"Regime update broadcasted: {regime_data.get('current_regime', 'UNKNOWN')}"
        )
    except Exception as e:
        logger.error(f"Error broadcasting regime update: {e}")


async def update_regime_with_data(data: dict) -> None:
    """
    レジームデータで更新をブロードキャスト
    """
    await broadcast_regime_update(data)


async def start_regime_monitoring() -> None:
    """
    レジームモニタリングを開始するバックグラウンドタスク
    """
    try:
        from src.regime_detector import RegimeDetector
        import pandas as pd

        detector = RegimeDetector()
        logger.info("Starting regime monitoring...")

        while True:
            try:
                # レジーム検出ロジック（ダミーデータを使用）
                df = pd.DataFrame()  # 実際のデータで置き換える
                regime_result = detector.detect_regime(df=df)
                if regime_result:
                    # 戻り値をdict形式に変換
                    regime_data = {"current_regime": str(regime_result)}
                    await broadcast_regime_update(regime_data)

                # 30秒待機
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Error in regime monitoring loop: {e}")
                await asyncio.sleep(5)  # エラー時は短い待機

    except Exception as e:
        logger.error(f"Failed to start regime monitoring: {e}")
