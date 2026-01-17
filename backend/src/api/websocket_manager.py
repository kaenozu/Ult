# Strictly Typed WebSocket Manager (FastAPI)
# Phase 3: Realtime Synapse

import asyncio
import logging
import json
from typing import Dict, Set, Callable, Awaitable, Optional, Any
from datetime import datetime
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from src.api.websocket_types import (
    WsMessageEnvelope,
    WsDirection,
    AnyClientMessage,
    AnyServerMessage,
    ClientPayloadMapping,
    ServerPayloadMapping,
    WsErrorPayload,
    ErrorSeverity,
    MessageFactory,
    PingRequest,
    PongPayload,
    SubscribeRequest,
    UnsubscribeRequest,
    GetStatusRequest,
)

logger = logging.getLogger(__name__)


# ============================================================================
# TYPE ALIASES
# ============================================================================

MessageTypeHandler = Callable[[Any], Awaitable[None]]
ErrorHandler = Callable[[WsErrorPayload], Awaitable[None]]


# ============================================================================
# CONNECTION CLASS (Typed)
# ============================================================================


class TypedConnection:
    """
    Strongly typed WebSocket connection wrapper.
    CONDEMNED: Dict[str, WebSocket]
    EMBRACED: TypedConnection with type-safe send/receive
    """

    def __init__(self, websocket: WebSocket, connection_id: str):
        self.websocket = websocket
        self.connection_id = connection_id
        self.subscriptions: Set[str] = set()
        self.is_authenticated = False
        self.connected_at = datetime.utcnow()
        self.user_id: Optional[str] = None

    async def send_message(self, message: WsMessageEnvelope) -> None:
        """
        Send a strictly typed message.
        Validates payload structure before sending.
        """
        try:
            message_dict = message.model_dump(mode='json')
            await self.websocket.send_json(message_dict)
            logger.debug(f"Sent message {message.msg_id} to {self.connection_id}")
        except Exception as e:
            logger.error(f"Error sending message to {self.connection_id}: {e}")
            raise

    async def send_error(
        self,
        code: str,
        message: str,
        severity: ErrorSeverity = ErrorSeverity.SYSTEM,
        request_msg_id: Optional[UUID] = None,
    ) -> None:
        """Send a structured error message"""
        error_msg = MessageFactory.error(code=code, message=message, severity=severity)
        error_msg.payload.request_msg_id = request_msg_id
        await self.send_message(error_msg)

    async def receive_message(self) -> Optional[AnyClientMessage]:
        """
        Receive and validate a client message.
        Returns None if validation fails (error sent to client).
        """
        try:
            data = await self.websocket.receive_json()

            # Validate message structure
            if not isinstance(data, dict):
                await self.send_error(
                    "INVALID_MESSAGE", "Message must be a JSON object"
                )
                return None

            if "type" not in data or "payload" not in data:
                await self.send_error(
                    "MISSING_FIELDS", "Message must have 'type' and 'payload' fields"
                )
                return None

            msg_type = data["type"]
            payload = data["payload"]

            # Get expected payload type
            payload_cls = ClientPayloadMapping.get(msg_type)
            if payload_cls is None:
                await self.send_error(
                    "UNKNOWN_MESSAGE_TYPE", f"Unknown message type: {msg_type}"
                )
                return None

            # Validate and parse payload
            try:
                validated_payload = payload_cls.model_validate(payload)
            except ValidationError as e:
                logger.warning(f"Validation error for {msg_type}: {e}")
                await self.send_error(
                    "VALIDATION_ERROR", f"Invalid payload: {e.errors()[0]['msg']}"
                )
                return None

            # Reconstruct with validated payload
            data["payload"] = validated_payload

            # Direction check
            if data.get("direction") != WsDirection.CLIENT_TO_SERVER:
                logger.warning(f"Invalid direction from client {self.connection_id}")

            return WsMessageEnvelope.model_validate(data)

        except WebSocketDisconnect:
            raise
        except Exception as e:
            logger.error(f"Error receiving message from {self.connection_id}: {e}")
            await self.send_error("RECEIVE_ERROR", str(e))
            return None


# ============================================================================
# MANAGER CLASS (Typed)
# ============================================================================


class TypedWebSocketManager:
    """
    Strictly typed WebSocket connection manager.

    Features:
    - Type-safe message routing
    - Payload validation
    - Automatic error responses
    - Subscription management
    """

    def __init__(self):
        self._connections: Dict[str, TypedConnection] = {}
        self._subscriptions: Dict[str, Set[str]] = {}  # channel -> connection_ids
        self._message_handlers: Dict[str, MessageTypeHandler] = {}
        self._error_handler: Optional[ErrorHandler] = None
        self._connection_counter = 0

    # =========================================================================
    # CONNECTION MANAGEMENT
    # =========================================================================

    async def accept_connection(
        self, websocket: WebSocket, user_id: Optional[str] = None
    ) -> TypedConnection:
        """Accept a new WebSocket connection with typing"""
        await websocket.accept()

        self._connection_counter += 1
        connection_id = f"conn_{self._connection_counter}"

        connection = TypedConnection(websocket, connection_id)
        connection.user_id = user_id

        self._connections[connection_id] = connection
        logger.info(f"Connection accepted: {connection_id} (user: {user_id})")

        return connection

    async def disconnect(self, connection_id: str) -> None:
        """Disconnect a connection and clean up"""
        if connection_id in self._connections:
            conn = self._connections[connection_id]

            # Remove from subscriptions
            for channel in conn.subscriptions:
                if channel in self._subscriptions:
                    self._subscriptions[channel].discard(connection_id)

            # Remove connection
            del self._connections[connection_id]
            logger.info(f"Connection disconnected: {connection_id}")

    # =========================================================================
    # MESSAGE HANDLING
    # =========================================================================

    async def handle_message(
        self, connection: TypedConnection, message: AnyClientMessage
    ) -> None:
        """Route message to appropriate handler"""
        try:
            handler = self._message_handlers.get(message.type)
            if handler:
                await handler(message)
            else:
                logger.warning(f"No handler for message type: {message.type}")
                await connection.send_error(
                    "NO_HANDLER",
                    f"No handler registered for type: {message.type}",
                    request_msg_id=message.msg_id,
                )
        except Exception as e:
            logger.error(f"Error handling message {message.msg_id}: {e}")
            await connection.send_error(
                "HANDLER_ERROR",
                str(e),
                ErrorSeverity.BUSINESS,
                request_msg_id=message.msg_id,
            )

    async def process_client_messages(self, connection: TypedConnection) -> None:
        """Process incoming messages from a client"""
        try:
            while True:
                message = await connection.receive_message()
                if message is None:
                    # Validation error, already sent to client
                    continue
                await self.handle_message(connection, message)
        except WebSocketDisconnect:
            await self.disconnect(connection.connection_id)
        except Exception as e:
            logger.error(
                f"Error processing messages for {connection.connection_id}: {e}"
            )
            await self.disconnect(connection.connection_id)

    # =========================================================================
    # MESSAGE ROUTING
    # =========================================================================

    def register_handler(self, message_type: str, handler: MessageTypeHandler) -> None:
        """Register a handler for a specific message type"""
        self._message_handlers[message_type] = handler
        logger.debug(f"Handler registered for: {message_type}")

    def register_error_handler(self, handler: ErrorHandler) -> None:
        """Register a global error handler"""
        self._error_handler = handler

    # =========================================================================
    # BROADCASTING
    # =========================================================================

    async def broadcast(
        self, message: AnyServerMessage, channel: Optional[str] = None
    ) -> int:
        """
        Broadcast a message to connections.
        If channel is specified, only send to subscribed connections.
        Returns number of messages sent.
        """
        target_connections: Set[TypedConnection] = set()

        if channel:
            # Get subscribed connections
            subscribed_ids = self._subscriptions.get(channel, set())
            for conn_id in subscribed_ids:
                if conn_id in self._connections:
                    target_connections.add(self._connections[conn_id])
        else:
            # Broadcast to all
            target_connections = set(self._connections.values())

        sent_count = 0
        failed_connections: list[str] = []

        for conn in target_connections:
            try:
                await conn.send_message(message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send to {conn.connection_id}: {e}")
                failed_connections.append(conn.connection_id)

        # Clean up failed connections
        for conn_id in failed_connections:
            await self.disconnect(conn_id)

        logger.debug(
            f"Broadcast {message.type} to {sent_count} connections (channel: {channel})"
        )
        return sent_count

    async def broadcast_to_user(self, message: AnyServerMessage, user_id: str) -> int:
        """Broadcast to a specific user"""
        sent_count = 0
        for conn in self._connections.values():
            if conn.user_id == user_id:
                try:
                    await conn.send_message(message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to send to {conn.connection_id}: {e}")
                    await self.disconnect(conn.connection_id)

        return sent_count

    # =========================================================================
    # SUBSCRIPTION MANAGEMENT
    # =========================================================================

    async def subscribe(self, connection_id: str, channels: list[str]) -> None:
        """Subscribe a connection to channels"""
        if connection_id not in self._connections:
            logger.warning(f"Cannot subscribe unknown connection: {connection_id}")
            return

        conn = self._connections[connection_id]

        for channel in channels:
            conn.subscriptions.add(channel)
            if channel not in self._subscriptions:
                self._subscriptions[channel] = set()
            self._subscriptions[channel].add(connection_id)

        logger.info(f"Connection {connection_id} subscribed to: {channels}")

    async def unsubscribe(self, connection_id: str, channels: list[str]) -> None:
        """Unsubscribe a connection from channels"""
        if connection_id not in self._connections:
            return

        conn = self._connections[connection_id]

        for channel in channels:
            conn.subscriptions.discard(channel)
            if channel in self._subscriptions:
                self._subscriptions[channel].discard(connection_id)

        logger.info(f"Connection {connection_id} unsubscribed from: {channels}")

    # =========================================================================
    # STATUS & STATS
    # =========================================================================

    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": len(self._connections),
            "channel_counts": {
                ch: len(conns) for ch, conns in self._subscriptions.items()
            },
            "connections": [
                {
                    "id": conn.connection_id,
                    "user_id": conn.user_id,
                    "subscriptions": list(conn.subscriptions),
                    "is_authenticated": conn.is_authenticated,
                }
                for conn in self._connections.values()
            ],
        }

    def get_connection_by_id(self, connection_id: str) -> Optional[TypedConnection]:
        """Get a connection by ID"""
        return self._connections.get(connection_id)


    async def broadcast_agent_thought(self, thought: dict) -> int:
        """Broadcast an agent thought"""
        # Phase 4: Construct a proper message envelope
        msg = MessageFactory.agent_activity(
            activity_type="THOUGHT",
            data=thought
        )
        return await self.broadcast(msg, channel="agent_activity")

    async def broadcast_agent_action(self, action: dict) -> int:
        """Broadcast an agent action"""
        # Phase 4: Construct a proper message envelope
        msg = MessageFactory.agent_activity(
            activity_type="ACTION",
            data=action
        )
        return await self.broadcast(msg, channel="agent_activity")


# ============================================================================
# GLOBAL INSTANCE
# ============================================================================

manager = TypedWebSocketManager()
