# Strictly Typed WebSocket Architecture
# Phase 3: Realtime Synapse

from typing import Literal, Union, Generic, TypeVar, Optional
from datetime import datetime
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum

T = TypeVar("T")


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
        extra="forbid",  # REJECT unknown fields
        str_strip_whitespace=True,
        validate_assignment=True,
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

    model_config = ConfigDict(extra="forbid")

    channels: list[
        Literal["regime", "price_alerts", "portfolio_updates", "trades", "all"]
    ]
    user_id: Optional[str] = None


class UnsubscribeRequest(BaseModel):
    """Unsubscribe from specific event types"""

    model_config = ConfigDict(extra="forbid")

    channels: list[
        Literal["regime", "price_alerts", "portfolio_updates", "trades", "all"]
    ]


class PingRequest(BaseModel):
    """Heartbeat ping with optional metadata"""

    model_config = ConfigDict(extra="forbid")

    sequence: int
    client_timestamp: datetime


class GetStatusRequest(BaseModel):
    """Request current connection status"""

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

    regime: MarketRegimeEnum
    previous_regime: Optional[MarketRegimeEnum] = None
    confidence: float = Field(ge=0.0, le=1.0)
    indicators: dict[str, float] = Field(default_factory=dict)
    strategy_recommendation: str
    timestamp: datetime


class PriceAlertPayload(BaseModel):
    """Price threshold breach alert"""

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

    alert_type: Literal["connection", "data_source", "api_rate_limit", "system_error"]
    severity: Literal["info", "warning", "error", "critical"]
    message: str
    code: Optional[str] = None
    details: Optional[dict[str, str]] = None
    timestamp: datetime


class AgentActivityPayload(BaseModel):
    """Agent thought or action event"""

    model_config = ConfigDict(extra="forbid")

    activity_type: Literal["THOUGHT", "ACTION"]
    content: dict # Keeping it flexible for ThoughtSchema/ActionSchema
    timestamp: datetime


# ============================================================================
# CONTROL FLOW: Bidirectional (Strictly Typed)
# ============================================================================


class PongPayload(BaseModel):
    """Heartbeat pong response"""

    model_config = ConfigDict(extra="forbid")

    sequence: int
    server_timestamp: datetime
    client_timestamp: datetime


class SubscriptionConfirmedPayload(BaseModel):
    """Subscription confirmation"""

    model_config = ConfigDict(extra="forbid")

    channels: list[str]
    message: str


class StatusResponsePayload(BaseModel):
    """Connection status response"""

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

    severity: ErrorSeverity
    code: str
    message: str
    details: Optional[dict[str, str]] = None
    request_msg_id: Optional[UUID] = None
    timestamp: datetime


# ============================================================================
# APPROVAL SYSTEM: Human-in-the-loop Controls
# ============================================================================


class ApprovalType(str, Enum):
    """Type of action requiring approval"""

    TRADE = "trade"
    TRADE_EXECUTION = "trade_execution"
    REBALANCE = "rebalance"
    STRATEGY_CHANGE = "strategy_change"
    BUDGET_INCREASE = "budget_increase"
    KILL_SWITCH_DEACTIVATE = "kill_switch_deactivate"
    SYSTEM_CONFIG = "system_config"


class ApprovalStatus(str, Enum):
    """Status of an approval request"""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ApprovalRequestPayload(BaseModel):
    """Approval request sent to human operator"""

    model_config = ConfigDict(extra="forbid")

    request_id: str
    type: ApprovalType
    title: str
    description: str
    context: dict  # Trade details, amounts, etc.
    requester: str  # Agent or system component name
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    expires_at: datetime
    created_at: datetime


class ApprovalResponsePayload(BaseModel):
    """Human operator's response to an approval request"""

    model_config = ConfigDict(extra="forbid")

    request_id: str
    status: ApprovalStatus
    responder: str  # Human operator identifier
    reason: Optional[str] = None
    responded_at: datetime


# ============================================================================
# CIRCUIT BREAKER: Hard Budget Limit & Kill Switch
# ============================================================================


class CircuitBreakerStateEnum(str, Enum):
    """Circuit breaker states"""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerTriggerTypeEnum(str, Enum):
    """What triggered the circuit breaker"""

    DAILY_LOSS_LIMIT = "daily_loss_limit"
    MAX_DRAWDOWN = "max_drawdown"
    HARD_BUDGET_LIMIT = "hard_budget_limit"
    EMERGENCY_KILL_SWITCH = "emergency_kill_switch"
    API_ERROR_THRESHOLD = "api_error_threshold"
    MANUAL = "manual"


class CircuitBreakerStatusPayload(BaseModel):
    """Current circuit breaker status"""

    model_config = ConfigDict(extra="forbid")

    state: CircuitBreakerStateEnum
    can_trade: bool
    total_losses: float
    peak_loss: float
    failure_count: int
    kill_switch_active: bool
    manual_reset_required: bool
    config: dict[str, float]
    timestamp: datetime


class CircuitBreakerTrippedPayload(BaseModel):
    """Circuit breaker was triggered"""

    model_config = ConfigDict(extra="forbid")

    state: CircuitBreakerStateEnum
    trigger_type: CircuitBreakerTriggerTypeEnum
    trigger_reason: str
    total_losses: float
    kill_switch_active: bool
    manual_reset_required: bool
    timestamp: datetime


class CircuitBreakerResetPayload(BaseModel):
    """Circuit breaker was reset"""

    model_config = ConfigDict(extra="forbid")

    previous_state: CircuitBreakerStateEnum
    triggered_at: Optional[str]
    reset_type: str
    timestamp: datetime


class CircuitBreakerConfigRequest(BaseModel):
    """Request to update circuit breaker config"""

    model_config = ConfigDict(extra="forbid")

    hard_budget_limit: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    max_drawdown_limit: Optional[float] = None
    failure_threshold: Optional[int] = None
    failure_timeout: Optional[int] = None
    enable_kill_switch: Optional[bool] = None


class CircuitBreakerKillSwitchRequest(BaseModel):
    """Request to activate/deactivate kill switch"""

    model_config = ConfigDict(extra="forbid")

    activate: bool
    reason: Optional[str] = None


class CircuitBreakerResetRequest(BaseModel):
    """Request to manually reset circuit breaker"""

    model_config = ConfigDict(extra="forbid")

    force: bool = False


class EmptyPayload(BaseModel):
    """Empty payload for requests that don't need data"""

    model_config = ConfigDict(extra="forbid")
    pass


# ============================================================================
# MESSAGE TYPE LITERALS (Compile-time type safety)
# ============================================================================

# Client → Server
ClientToServerTypes = Literal[
    "subscribe",
    "unsubscribe",
    "ping",
    "get_status",
    "get_circuit_breaker_status",
    "update_circuit_breaker_config",
    "activate_kill_switch",
    "deactivate_kill_switch",
    "manual_reset_circuit_breaker",
    "submit_approval_response",
]

# Server → Client Events
ServerToClientEventTypes = Literal[
    "regime_update",
    "price_alert",
    "portfolio_update",
    "trade_execution",
    "system_alert",
    "agent_activity",
    "approval_request",
    "approval_response",
]

# Control Flow
ControlFlowTypes = Literal["pong", "subscription_confirmed", "status_response"]

# Error
ErrorTypes = Literal["error"]

# Circuit Breaker
CircuitBreakerEventTypes = Literal[
    "circuit_breaker_status",
    "circuit_breaker_tripped",
    "circuit_breaker_reset",
]

# All server responses
ServerToClientTypes = Union[
    ServerToClientEventTypes, ControlFlowTypes, ErrorTypes, CircuitBreakerEventTypes
]


# ============================================================================
# PAYLOAD MAPPINGS (Type-safe routing)
# ============================================================================

ClientPayloadMapping: dict[ClientToServerTypes, type[BaseModel]] = {
    "subscribe": SubscribeRequest,
    "unsubscribe": UnsubscribeRequest,
    "ping": PingRequest,
    "get_status": GetStatusRequest,
    "submit_approval_response": ApprovalResponsePayload,
}

ServerPayloadMapping: dict[ServerToClientTypes, type[BaseModel]] = {
    "regime_update": RegimeUpdatePayload,
    "price_alert": PriceAlertPayload,
    "portfolio_update": PortfolioUpdatePayload,
    "trade_execution": TradeExecutionPayload,
    "system_alert": SystemAlertPayload,
    "agent_activity": AgentActivityPayload,
    "approval_request": ApprovalRequestPayload,
    "approval_response": ApprovalResponsePayload,
    "circuit_breaker_status": CircuitBreakerStatusPayload,
    "circuit_breaker_tripped": CircuitBreakerTrippedPayload,
    "circuit_breaker_reset": CircuitBreakerResetPayload,
    "pong": PongPayload,
    "subscription_confirmed": SubscriptionConfirmedPayload,
    "status_response": StatusResponsePayload,
    "error": WsErrorPayload,
}

ClientPayloadMapping: dict[ClientToServerTypes, type[BaseModel]] = {
    "subscribe": SubscribeRequest,
    "unsubscribe": UnsubscribeRequest,
    "ping": PingRequest,
    "get_status": GetStatusRequest,
    "get_circuit_breaker_status": EmptyPayload,
    "update_circuit_breaker_config": CircuitBreakerConfigRequest,
    "activate_kill_switch": CircuitBreakerKillSwitchRequest,
    "deactivate_kill_switch": CircuitBreakerKillSwitchRequest,
    "manual_reset_circuit_breaker": CircuitBreakerResetRequest,
    "submit_approval_response": ApprovalResponsePayload,
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
AgentActivityMessage = WsMessageEnvelope[AgentActivityPayload]
ApprovalRequestMessage = WsMessageEnvelope[ApprovalRequestPayload]
ApprovalResponseMessage = WsMessageEnvelope[ApprovalResponsePayload]

PongMessage = WsMessageEnvelope[PongPayload]
SubscriptionConfirmedMessage = WsMessageEnvelope[SubscriptionConfirmedPayload]
StatusResponseMessage = WsMessageEnvelope[StatusResponsePayload]
ErrorMessage = WsMessageEnvelope[WsErrorPayload]

CircuitBreakerStatusMessage = WsMessageEnvelope[CircuitBreakerStatusPayload]
CircuitBreakerTrippedMessage = WsMessageEnvelope[CircuitBreakerTrippedPayload]
CircuitBreakerResetMessage = WsMessageEnvelope[CircuitBreakerResetPayload]


# ============================================================================
# UNION TYPES FOR ROUTING
# ============================================================================

AnyClientMessage = Union[
    SubscribeMessage,
    UnsubscribeMessage,
    PingMessage,
    GetStatusMessage,
    ApprovalResponseMessage,
]

AnyServerMessage = Union[
    RegimeUpdateMessage,
    PriceAlertMessage,
    PortfolioUpdateMessage,
    TradeExecutionMessage,
    SystemAlertMessage,
    AgentActivityMessage,
    ApprovalRequestMessage,
    ApprovalResponseMessage,
    PongMessage,
    SubscriptionConfirmedMessage,
    StatusResponseMessage,
    ErrorMessage,
    CircuitBreakerStatusMessage,
    CircuitBreakerTrippedMessage,
    CircuitBreakerResetMessage,
]


# ============================================================================
# MESSAGE BUILDERS (Factory pattern for safety)
# ============================================================================


class MessageFactory:
    """Factory for creating properly typed messages"""

    @staticmethod
    def subscribe(
        channels: list[str], user_id: Optional[str] = None
    ) -> SubscribeMessage:
        payload = SubscribeRequest(channels=channels, user_id=user_id)
        return WsMessageEnvelope[SubscribeRequest](
            type="subscribe", payload=payload
        ).to_server()

    @staticmethod
    def unsubscribe(channels: list[str]) -> UnsubscribeMessage:
        payload = UnsubscribeRequest(channels=channels)
        return WsMessageEnvelope[UnsubscribeRequest](
            type="unsubscribe", payload=payload
        ).to_server()

    @staticmethod
    def ping(sequence: int) -> PingMessage:
        payload = PingRequest(sequence=sequence, client_timestamp=datetime.utcnow())
        return WsMessageEnvelope[PingRequest](type="ping", payload=payload).to_server()

    @staticmethod
    def getStatus(includeSubscribers=False) -> GetStatusMessage:
        payload = GetStatusRequest(include_subscribers=includeSubscribers)
        return WsMessageEnvelope[GetStatusRequest](
            type="get_status", payload=payload
        ).to_server()

    @staticmethod
    def pong(sequence: int, client_timestamp: datetime) -> PongMessage:
        payload = PongPayload(
            sequence=sequence,
            server_timestamp=datetime.utcnow(),
            client_timestamp=client_timestamp,
        )
        return WsMessageEnvelope[PongPayload](type="pong", payload=payload).to_client()

    @staticmethod
    def regime_update(
        regime: MarketRegimeEnum, confidence: float, strategy: str
    ) -> RegimeUpdateMessage:
        payload = RegimeUpdatePayload(
            regime=regime,
            confidence=confidence,
            strategy_recommendation=strategy,
            timestamp=datetime.utcnow(),
        )
        return WsMessageEnvelope[RegimeUpdatePayload](
            type="regime_update", payload=payload
        ).to_client()

    @staticmethod
    def subscription_confirmed(
        channels: list[str], message: str
    ) -> SubscriptionConfirmedMessage:
        payload = SubscriptionConfirmedPayload(channels=channels, message=message)
        return WsMessageEnvelope[SubscriptionConfirmedPayload](
            type="subscription_confirmed", payload=payload
        ).to_client()

    @staticmethod
    def status_response(
        connection_id: str,
        connected_at: str,
        is_authenticated: bool,
        channels_subscribed: list[str],
        subscriber_count: int,
        uptime_seconds: float,
        queue_size: int,
    ) -> StatusResponseMessage:
        payload = StatusResponsePayload(
            connection_id=connection_id,
            connected_at=datetime.fromisoformat(connected_at),
            is_authenticated=is_authenticated,
            channels_subscribed=channels_subscribed,
            subscriber_count=subscriber_count,
            uptime_seconds=uptime_seconds,
            queue_size=queue_size,
        )
        return WsMessageEnvelope[StatusResponsePayload](
            type="status_response", payload=payload
        ).to_client()

    @staticmethod
    def error(
        code: str, message: str, severity: ErrorSeverity = ErrorSeverity.SYSTEM
    ) -> ErrorMessage:
        payload = WsErrorPayload(
            severity=severity, code=code, message=message, timestamp=datetime.utcnow()
        )
        return WsMessageEnvelope[WsErrorPayload](
            type="error", payload=payload
        ).to_client()

    @staticmethod
    def agent_activity(
        activity_type: Literal["THOUGHT", "ACTION"],
        data: dict
    ) -> AgentActivityMessage:
        payload = AgentActivityPayload(
            activity_type=activity_type,
            content=data,
            timestamp=datetime.utcnow()
        )
        return WsMessageEnvelope[AgentActivityPayload](
            type="agent_activity", payload=payload
        ).to_client()

    @staticmethod
    def circuit_breaker_status(
        state: CircuitBreakerStateEnum,
        can_trade: bool,
        total_losses: float,
        peak_loss: float,
        failure_count: int,
        kill_switch_active: bool,
        manual_reset_required: bool,
        config: dict[str, float],
    ) -> CircuitBreakerStatusMessage:
        payload = CircuitBreakerStatusPayload(
            state=state,
            can_trade=can_trade,
            total_losses=total_losses,
            peak_loss=peak_loss,
            failure_count=failure_count,
            kill_switch_active=kill_switch_active,
            manual_reset_required=manual_reset_required,
            config=config,
            timestamp=datetime.utcnow(),
        )
        return WsMessageEnvelope[CircuitBreakerStatusPayload](
            type="circuit_breaker_status", payload=payload
        ).to_client()

    @staticmethod
    def circuit_breaker_tripped(
        state: CircuitBreakerStateEnum,
        trigger_type: CircuitBreakerTriggerTypeEnum,
        trigger_reason: str,
        total_losses: float,
        kill_switch_active: bool,
        manual_reset_required: bool,
    ) -> CircuitBreakerTrippedMessage:
        payload = CircuitBreakerTrippedPayload(
            state=state,
            trigger_type=trigger_type,
            trigger_reason=trigger_reason,
            total_losses=total_losses,
            kill_switch_active=kill_switch_active,
            manual_reset_required=manual_reset_required,
            timestamp=datetime.utcnow(),
        )
        return WsMessageEnvelope[CircuitBreakerTrippedPayload](
            type="circuit_breaker_tripped", payload=payload
        ).to_client()

    @staticmethod
    def circuit_breaker_reset(
        previous_state: CircuitBreakerStateEnum,
        triggered_at: Optional[str],
        reset_type: str,
    ) -> CircuitBreakerResetMessage:
        payload = CircuitBreakerResetPayload(
            previous_state=previous_state,
            triggered_at=triggered_at,
            reset_type=reset_type,
            timestamp=datetime.utcnow(),
        )
        return WsMessageEnvelope[CircuitBreakerResetPayload](
            type="circuit_breaker_reset", payload=payload
        ).to_client()

    @staticmethod
    def approval_request(
        request_id: str,
        approval_type: ApprovalType,
        title: str,
        description: str,
        context: dict,
        priority: str = "medium",
        expires_in_seconds: int = 60,
    ) -> ApprovalRequestMessage:
        now = datetime.utcnow()
        expires_at = datetime.fromtimestamp(now.timestamp() + expires_in_seconds)
        
        payload = ApprovalRequestPayload(
            request_id=request_id,
            type=approval_type,
            title=title,
            description=description,
            context=context,
            requester="AutonomousAgent",
            priority=priority,
            expires_at=expires_at,
            created_at=now,
        )
        return WsMessageEnvelope[ApprovalRequestPayload](
            type="approval_request", payload=payload
        ).to_client()

    @staticmethod
    def approval_response(
        request_id: str,
        status: ApprovalStatus,
        responder: str,
        reason: Optional[str] = None
    ) -> ApprovalResponseMessage:
        payload = ApprovalResponsePayload(
            request_id=request_id,
            status=status,
            responder=responder,
            reason=reason,
            responded_at=datetime.utcnow(),
        )
        return WsMessageEnvelope[ApprovalResponsePayload](
            type="approval_response", payload=payload
        ).to_server() # or to_client if confirming

