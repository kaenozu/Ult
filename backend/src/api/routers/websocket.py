# WebSocket Router for FastAPI
# Phase 3: Realtime Synapse

import logging
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

    except Exception as e:
        logger.error(f"WebSocket error for {connection.connection_id}: {e}")
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

    except Exception as e:
        logger.error(f"Error handling ping: {e}")


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
            subscriber_count=len(manager._connections),
            uptime_seconds=0.0,  # TODO: implement uptime tracking
            queue_size=0,  # TODO: implement queue tracking
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
