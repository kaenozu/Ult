# Strictly Typed WebSocket Architecture
# Phase 3: Realtime Synapse

from typing import Literal, Union, Generic, TypeVar, Optional
from datetime import datetime
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum

T = TypeVar('T')


# ============================================================================
# MESSAGE ENVELOPE - The Foundation
# ============================================================================

class WsDirection(str, Enum):
    """Message direction for logging/metrics"""
    CLIENT_TO_SERVER = "c2s"
    SERVER_TO_CLIENT = "s2c"


class WsMessageEnvelope(BaseModel, Generic[T]):
    """
    Strict message envelope with UUID tracking and type discrimination.
    
    CONDEMNED: {'type': 'notification', 'data': {...}}  ← LOOSE
    EMBRACED: WsMessageEnvelope[RegimeUpdatePayload]   ← TYPED
    """
    model_config = ConfigDict(
        extra='forbid',  # REJECT unknown fields
        str_strip_whitespace=True,
        validate_assignment=True
    )
    
    msg_id: UUID = Field(default_factory=uuid4)
    type: str  # Discriminator field
    payload: T
    direction: WsDirection = Field(default=WsDirection.CLIENT_TO_SERVER)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    def to_server(self) -> "WsMessageEnvelope[T]":
        self.direction = WsDirection.CLIENT_TO_SERVER
        return self
    
    def to_client(self) -> "WsMessageEnvelope[T]":
        self.direction = WsDirection.SERVER_TO_CLIENT
        return self


# ============================================================================
# CLIENT → SERVER: REQUESTS (Strictly Typed)
# ============================================================================

class SubscribeRequest(BaseModel):
    """Subscribe to specific event types"""
    model_config = ConfigDict(extra='forbid')
    
    channels: list[Literal["regime", "price_alerts", "portfolio_updates", "trades", "all"]]
    user_id: Optional[str] = None


class UnsubscribeRequest(BaseModel):
    """Unsubscribe from specific event types"""
    model_config = ConfigDict(extra='forbid')
    
    channels: list[Literal["regime", "price_alerts", "portfolio_updates", "trades", "all"]]


class PingRequest(BaseModel):
    """Heartbeat ping with optional metadata"""
    model_config = ConfigDict(extra='forbid')
    
    sequence: int
    client_timestamp: datetime


class GetStatusRequest(BaseModel):
    """Request current connection status"""
    model_config = ConfigDict(extra='forbid')
    
    include_subscribers: bool = False


# ============================================================================
# SERVER → CLIENT: EVENTS (Strictly Typed)
# ============================================================================

class MarketRegimeEnum(str, Enum):
    """Strict enum for market regimes"""
    BULL = "BULL"
    BEAR = "BEAR"
    SIDEWAYS = "SIDEWAYS"
    VOLATILE = "VOLATILE"
    CRASH = "CRASH"
    UNCERTAIN = "UNCERTAIN"


class RegimeUpdatePayload(BaseModel):
    """Market regime change event"""
    model_config = ConfigDict(extra='forbid')
    
    regime: MarketRegimeEnum
    previous_regime: Optional[MarketRegimeEnum] = None
    confidence: float = Field(ge=0.0, le=1.0)
    indicators: dict[str, float] = Field(default_factory=dict)
    strategy_recommendation: str
    timestamp: datetime


class PriceAlertPayload(BaseModel):
    """Price threshold breach alert"""
    model_config = ConfigDict(extra='forbid')
    
    ticker: str
    name: Optional[str] = None
    current_price: float = Field(gt=0)
    previous_price: float = Field(gt=0)
    change_percent: float
    alert_type: Literal["threshold", "movement", "gap"]
    severity: Literal["low", "medium", "high", "critical"]
    timestamp: datetime


class PortfolioUpdatePayload(BaseModel):
    """Portfolio value change event"""
    model_config = ConfigDict(extra='forbid')
    
    total_equity: float = Field(ge=0)
    cash: float = Field(ge=0)
    invested_amount: float = Field(ge=0)
    unrealized_pnl: float
    daily_change: float
    daily_change_percent: float
    position_count: int = Field(ge=0)
    timestamp: datetime


class TradeExecutionPayload(BaseModel):
    """Trade execution confirmation"""
    model_config = ConfigDict(extra='forbid')
    
    order_id: str
    ticker: str
    action: Literal["BUY", "SELL"]
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    total_value: float = Field(gt=0)
    strategy: Optional[str] = None
    status: Literal["pending", "filled", "cancelled", "failed"]
    execution_time: datetime


class SystemAlertPayload(BaseModel):
    """System status/alert event"""
    model_config = ConfigDict(extra='forbid')
    
    alert_type: Literal["connection", "data_source", "api_rate_limit", "system_error"]
    severity: Literal["info", "warning", "error", "critical"]
    message: str
    code: Optional[str] = None
    details: Optional[dict[str, str]] = None
    timestamp: datetime


# ============================================================================
# CONTROL FLOW: Bidirectional (Strictly Typed)
# ============================================================================

class PongPayload(BaseModel):
    """Heartbeat pong response"""
    model_config = ConfigDict(extra='forbid')
    
    sequence: int
    server_timestamp: datetime
    client_timestamp: datetime


class SubscriptionConfirmedPayload(BaseModel):
    """Subscription confirmation"""
    model_config = ConfigDict(extra='forbid')
    
    channels: list[str]
    message: str


class StatusResponsePayload(BaseModel):
    """Connection status response"""
    model_config = ConfigDict(extra='forbid')
    
    connection_id: str
    connected_at: datetime
    is_authenticated: bool
    channels_subscribed: list[str]
    subscriber_count: int
    uptime_seconds: float
    queue_size: int


# ============================================================================
# ERROR HANDLING: Strictly Typed
# ============================================================================

class ErrorSeverity(str, Enum):
    VALIDATION = "validation_error"
    BUSINESS = "business_logic_error"
    SYSTEM = "system_error"
    AUTHENTICATION = "authentication_error"


class WsErrorPayload(BaseModel):
    """Structured error response"""
    model_config = ConfigDict(extra='forbid')
    
    severity: ErrorSeverity
    code: str
    message: str
    details: Optional[dict[str, str]] = None
    request_msg_id: Optional[UUID] = None
    timestamp: datetime


# ============================================================================
# MESSAGE TYPE LITERALS (Compile-time type safety)
# ============================================================================

# Client → Server
ClientToServerTypes = Literal[
    "subscribe",
    "unsubscribe",
    "ping",
    "get_status"
]

# Server → Client Events
ServerToClientEventTypes = Literal[
    "regime_update",
    "price_alert",
    "portfolio_update",
    "trade_execution",
    "system_alert"
]

# Control Flow
ControlFlowTypes = Literal[
    "pong",
    "subscription_confirmed",
    "status_response"
]

# Error
ErrorTypes = Literal[
    "error"
]

# All server responses
ServerToClientTypes = Union[ServerToClientEventTypes, ControlFlowTypes, ErrorTypes]


# ============================================================================
# PAYLOAD MAPPINGS (Type-safe routing)
# ============================================================================

ClientPayloadMapping: dict[ClientToServerTypes, type[BaseModel]] = {
    "subscribe": SubscribeRequest,
    "unsubscribe": UnsubscribeRequest,
    "ping": PingRequest,
    "get_status": GetStatusRequest,
}

ServerPayloadMapping: dict[ServerToClientTypes, type[BaseModel]] = {
    "regime_update": RegimeUpdatePayload,
    "price_alert": PriceAlertPayload,
    "portfolio_update": PortfolioUpdatePayload,
    "trade_execution": TradeExecutionPayload,
    "system_alert": SystemAlertPayload,
    "pong": PongPayload,
    "subscription_confirmed": SubscriptionConfirmedPayload,
    "status_response": StatusResponsePayload,
    "error": WsErrorPayload,
}


# ============================================================================
# TYPE ALIASES (Convenience)
# ============================================================================

# Specific message types for strict typing
SubscribeMessage = WsMessageEnvelope[SubscribeRequest]
UnsubscribeMessage = WsMessageEnvelope[UnsubscribeRequest]
PingMessage = WsMessageEnvelope[PingRequest]
GetStatusMessage = WsMessageEnvelope[GetStatusRequest]

RegimeUpdateMessage = WsMessageEnvelope[RegimeUpdatePayload]
PriceAlertMessage = WsMessageEnvelope[PriceAlertPayload]
PortfolioUpdateMessage = WsMessageEnvelope[PortfolioUpdatePayload]
TradeExecutionMessage = WsMessageEnvelope[TradeExecutionPayload]
SystemAlertMessage = WsMessageEnvelope[SystemAlertPayload]

PongMessage = WsMessageEnvelope[PongPayload]
SubscriptionConfirmedMessage = WsMessageEnvelope[SubscriptionConfirmedPayload]
StatusResponseMessage = WsMessageEnvelope[StatusResponsePayload]
ErrorMessage = WsMessageEnvelope[WsErrorPayload]


# ============================================================================
# UNION TYPES FOR ROUTING
# ============================================================================

AnyClientMessage = Union[
    SubscribeMessage,
    UnsubscribeMessage,
    PingMessage,
    GetStatusMessage,
]

AnyServerMessage = Union[
    RegimeUpdateMessage,
    PriceAlertMessage,
    PortfolioUpdateMessage,
    TradeExecutionMessage,
    SystemAlertMessage,
    PongMessage,
    SubscriptionConfirmedMessage,
    StatusResponseMessage,
    ErrorMessage,
]


# ============================================================================
# MESSAGE BUILDERS (Factory pattern for safety)
# ============================================================================

class MessageFactory:
    """Factory for creating properly typed messages"""
    
    @staticmethod
    def subscribe(channels: list[str], user_id: Optional[str] = None) -> SubscribeMessage:
        payload = SubscribeRequest(channels=channels, user_id=user_id)
        return WsMessageEnvelope[SubscribeRequest](
            type="subscribe",
            payload=payload
        ).to_server()
    
    @staticmethod
    def unsubscribe(channels: list[str]) -> UnsubscribeMessage:
        payload = UnsubscribeRequest(channels=channels)
        return WsMessageEnvelope[UnsubscribeRequest](
            type="unsubscribe",
            payload=payload
        ).to_server()
        
    @staticmethod
    def ping(sequence: int) -> PingMessage:
        payload = PingRequest(sequence=sequence, client_timestamp=datetime.utcnow())
        return WsMessageEnvelope[PingRequest](
            type="ping",
            payload=payload
        ).to_server()
    
    @staticmethod
    def getStatus(includeSubscribers = False) -> GetStatusMessage:
        payload = GetStatusRequest(include_subscribers=includeSubscribers)
        return WsMessageEnvelope[GetStatusRequest](
            type="get_status",
            payload=payload
        ).to_server()
    
    @staticmethod
    def pong(sequence: int, client_timestamp: datetime) -> PongMessage:
        payload = PongPayload(sequence=sequence, server_timestamp=datetime.utcnow(), client_timestamp=client_timestamp)
        return WsMessageEnvelope[PongPayload](
            type="pong",
            payload=payload
        ).to_client()
    
    @staticmethod
    def regime_update(regime: MarketRegimeEnum, confidence: float, strategy: str) -> RegimeUpdateMessage:
        payload = RegimeUpdatePayload(
            regime=regime,
            confidence=confidence,
            strategy_recommendation=strategy,
            timestamp=datetime.utcnow()
        )
        return WsMessageEnvelope[RegimeUpdatePayload](
            type="regime_update",
            payload=payload
        ).to_client()
    
    @staticmethod
    def error(code: str, message: str, severity: ErrorSeverity = ErrorSeverity.SYSTEM) -> ErrorMessage:
        payload = WsErrorPayload(
            severity=severity,
            code=code,
            message=message,
            timestamp=datetime.utcnow()
        )
        return WsMessageEnvelope[WsErrorPayload](
            type="error",
            payload=payload
        ).to_client()
