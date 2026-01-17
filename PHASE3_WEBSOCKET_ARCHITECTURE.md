# Phase 3: Realtime Synapse - Architecture Document

## "Condemn Loose Data, Embrace the Schema"

This document describes the strictly typed WebSocket architecture for Phase 3: Realtime Synapse. **Every byte of data flowing through the WebSocket connection is validated by Pydantic schemas.**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 3: REALTIME SYNAPSE                              │
│                   Strictly Typed WebSocket Architecture                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
         ┌──────────▼──────────┐  ┌────▼──────┐  ┌─────▼──────────┐
         │  Frontend (Next.js)  │  │  Backend  │  │  Broadcaster   │
         │  - useSynapse Hook   │  │  (FastAPI)│  │  (Background)  │
         │  - TypeScript Types   │  │  - Manager│  │  - Regime Feed │
         └──────────┬──────────┘  └────┬──────┘  └─────┬──────────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  WebSocket Types    │
                              │  - Pydantic Schemas │
                              │  - Type Guards      │
                              └─────────────────────┘
```

---

## Core Principles

### 1. Schema Sanctity (NO EXCEPTIONS)

**CONDEMNED:**

```python
# LOOSE DATA - FORBIDDEN
message = {
    "type": "regime_update",
    "data": {"regime": "BULL", "confidence": 0.85}  # Any field can be anything!
}
```

**EMBRACED:**

```python
# STRICTLY TYPED - REQUIRED
message = WsMessageEnvelope[RegimeUpdatePayload](
    type="regime_update",
    payload=RegimeUpdatePayload(
        regime=MarketRegimeEnum.BULL,
        confidence=0.85,
        strategy_recommendation="trend_following",
        indicators={"rsi": 65.4, "macd": 1.2},
        timestamp=datetime.utcnow()
    )
)
```

### 2. Type Discrimination Pattern

Every message has:

- `msg_id`: UUID for tracing
- `type`: String discriminator for routing
- `payload`: Strictly typed payload (Pydantic BaseModel)
- `direction`: CLIENT_TO_SERVER or SERVER_TO_CLIENT
- `timestamp`: ISO format timestamp

### 3. Rejection of Unknown Data

```python
class WsMessageEnvelope(BaseModel, Generic[T]):
    model_config = ConfigDict(
        extra='forbid',  # ← REJECT unknown fields
        str_strip_whitespace=True,
        validate_assignment=True
    )
```

---

## File Structure

```
backend/src/api/
├── websocket_types.py          # Pydantic schemas (Python)
│   ├── WsMessageEnvelope       # Generic envelope
│   ├── RegimeUpdatePayload     # Regime events
│   ├── PriceAlertPayload       # Price alerts
│   ├── PortfolioUpdatePayload  # Portfolio updates
│   ├── TradeExecutionPayload   # Trade confirmations
│   ├── MessageFactory          # Factory methods
│   └── ErrorSeverity         # Error enum
│
├── websocket_manager.py       # Connection manager (Python)
│   ├── TypedConnection        # Single connection wrapper
│   ├── TypedWebSocketManager   # Connection pool
│   ├── register_handler()     # Handler registration
│   └── broadcast()           # Typed broadcasting
│
├── websocket_router.py        # FastAPI router (Python)
│   ├── /ws/synapse endpoint   # Main WS endpoint
│   ├── handle_ping()          # Ping/pong
│   ├── handle_subscribe()      # Subscription
│   └── handle_unsubscribe()    # Unsubscription
│
└── websocket_broadcaster.py    # Background tasks (Python)
    └── MarketDataBroadcaster  # Regime feed

src/
├── types/websocket.ts         # TypeScript types
│   ├── WsMessageEnvelope     # Generic envelope
│   ├── RegimeUpdatePayload   # Regime events
│   ├── PriceAlertPayload     # Price alerts
│   ├── PortfolioUpdatePayload # Portfolio updates
│   ├── MessageFactory        # Factory methods
│   ├── Type Guards          # Runtime validation
│   └── MessageHandlerMap   # Handler types
│
└── hooks/useSynapse.ts      # React hook (TypeScript)
    ├── useSynapse()         # Main hook
    ├── connect()            # Connection mgmt
    ├── subscribe()          # Channel subscription
    ├── useRegimeStream()    # Regime hook
    ├── usePriceAlerts()     # Alert hook
    └── usePortfolioUpdates() # Portfolio hook
```

---

## Message Types

### Client → Server (Requests)

| Type          | Payload                     | Description               |
| ------------- | --------------------------- | ------------------------- |
| `subscribe`   | `SubscribeRequestPayload`   | Subscribe to channels     |
| `unsubscribe` | `UnsubscribeRequestPayload` | Unsubscribe from channels |
| `ping`        | `PingRequestPayload`        | Heartbeat ping            |
| `get_status`  | `GetStatusRequestPayload`   | Request connection status |

### Server → Client (Events)

| Type               | Payload                  | Channel             |
| ------------------ | ------------------------ | ------------------- |
| `regime_update`    | `RegimeUpdatePayload`    | `regime`            |
| `price_alert`      | `PriceAlertPayload`      | `price_alerts`      |
| `portfolio_update` | `PortfolioUpdatePayload` | `portfolio_updates` |
| `trade_execution`  | `TradeExecutionPayload`  | `trades`            |
| `system_alert`     | `SystemAlertPayload`     | Broadcast           |

### Server → Client (Control Flow)

| Type                     | Payload                        | Description        |
| ------------------------ | ------------------------------ | ------------------ |
| `pong`                   | `PongPayload`                  | Heartbeat response |
| `subscription_confirmed` | `SubscriptionConfirmedPayload` | Subscription ack   |
| `status_response`        | `StatusResponsePayload`        | Status info        |

### Error

| Type    | Payload          | Description      |
| ------- | ---------------- | ---------------- |
| `error` | `WsErrorPayload` | Structured error |

---

## Message Flow Example

### 1. Connection & Subscription

```typescript
// Frontend (useSynapse.ts)
const { connect, subscribe } = useSynapse({
  url: "ws://localhost:8000/ws/synapse",
  userId: "user_123",
});

connect();
subscribe(["regime", "price_alerts"]);
```

```python
# Backend (websocket_router.py)
# Message received:
{
  "msg_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "subscribe",
  "payload": {
    "channels": ["regime", "price_alerts"],
    "user_id": "user_123"
  },
  "direction": "c2s",
  "timestamp": "2026-01-16T12:00:00Z"
}

# Response sent:
MessageFactory.subscription_confirmed(
  channels=["regime", "price_alerts"],
  message="Subscribed to: regime, price_alerts"
)
```

### 2. Regime Update Broadcast

```python
# Backend (websocket_broadcaster.py)
regime_msg = MessageFactory.regime_update(
    regime=MarketRegimeEnum.BULL,
    confidence=0.85,
    strategy="trend_following",
)

regime_msg.payload.indicators = {
    "rsi": 65.4,
    "macd": 1.2,
}

await manager.broadcast(regime_msg, channel="regime")
```

```typescript
// Frontend (Component)
useRegimeStream((message) => {
  console.log("Regime:", message.payload.regime);
  console.log("Confidence:", message.payload.confidence);
  console.log("Indicators:", message.payload.indicators);
});
```

---

## Type Safety Guarantees

### Python (Pydantic)

```python
# Compile-time type checking
def handle_regime(message: WsMessageEnvelope[RegimeUpdatePayload]):
    # message.payload is GUARANTEED to be RegimeUpdatePayload
    regime: MarketRegimeEnum = message.payload.regime
    confidence: float = message.payload.confidence

    # Runtime validation
    # - Wrong type? → ValidationError
    # - Missing field? → ValidationError
    # - Extra field? → ValidationError (extra='forbid')
    # - Invalid enum value? → ValidationError
```

### TypeScript

```typescript
// Compile-time type checking
const { onMessage } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });

onMessage<RegimeUpdateMessage>("regime_update", (message) => {
  // message.payload is GUARANTEED to be RegimeUpdatePayload
  const regime: MarketRegime = message.payload.regime;
  const confidence: number = message.payload.confidence;

  // Compile error if accessing non-existent field:
  // message.payload.unknownField; // ← TypeScript ERROR
});

// Type guard for runtime validation
if (isRegimeUpdateMessage(msg)) {
  // Narrowed type: msg is RegimeUpdateMessage
}
```

---

## Integration Points

### 1. API Server (`api_server.py`)

```python
from src.api.routers import websocket
from src.api.websocket_broadcaster import broadcaster

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start broadcaster on startup
    asyncio.create_task(broadcaster.start())

    yield

    # Stop broadcaster on shutdown
    await broadcaster.stop()

app.include_router(websocket.router, tags=["WebSocket"])
```

### 2. Regime Detector Integration

```python
# Existing RegimeDetector from regime_detector.py
# Integrated into websocket_broadcaster.py

class MarketDataBroadcaster:
    def __init__(self):
        self.regime_detector = RegimeDetector()

    async def _fetch_and_broadcast_regime(self):
        df = await fetch_realtime_data("7203.T", period="5d", interval="15m")
        regime_str = self.regime_detector.detect_regime(df)
        regime_enum = self._map_regime_to_enum(regime_str)

        await manager.broadcast(
            MessageFactory.regime_update(
                regime=regime_enum,
                confidence=0.85,
                strategy=self.regime_detector.get_regime_strategy(regime_str).get("strategy", "unknown")
            ),
            channel="regime"
        )
```

### 3. Frontend Integration

```typescript
// MarketStatusCard.tsx (Persona Protocol)
import { useRegimeStream } from '@/hooks/useSynapse';

export function MarketStatusCard() {
  const [regime, setRegime] = useState<MarketRegime>(MarketRegime.SIDEWAYS);
  const [vibe, setVibe] = useState<'neutral' | 'bull' | 'bear' | 'panic'>('neutral');

  useRegimeStream((message) => {
    setRegime(message.payload.regime);

    // Persona Protocol: Update vibe based on regime
    switch (message.payload.regime) {
      case MarketRegime.BULL:
        setVibe('bull');
        break;
      case MarketRegime.BEAR:
        setVibe('bear');
        break;
      case MarketRegime.CRASH:
        setVibe('panic');
        break;
      default:
        setVibe('neutral');
    }
  });

  return (
    <div className={`glass-panel vibe-${vibe}`}>
      <h2>Market Regime: {regime}</h2>
      {/* Visual updates based on vibe */}
    </div>
  );
}
```

---

## Error Handling

### Structured Errors

```python
# Backend
await connection.send_error(
    code="VALIDATION_ERROR",
    message="Invalid payload: 'confidence' must be between 0.0 and 1.0",
    severity=ErrorSeverity.VALIDATION,
    request_msg_id=message.msg_id
)
```

```typescript
// Frontend
const { onError } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });

onError((error) => {
  console.error("WebSocket error:", error);
  // Show user-friendly error
  toast.error(error.message);
});
```

---

## Testing Strategy

### Backend Tests

```python
# tests/test_websocket_types.py
import pytest
from src.api.websocket_types import RegimeUpdatePayload, MarketRegimeEnum

def test_regime_update_validation():
    # Valid payload
    payload = RegimeUpdatePayload(
        regime=MarketRegimeEnum.BULL,
        confidence=0.85,
        strategy_recommendation="trend_following",
        indicators={"rsi": 65.4},
        timestamp=datetime.utcnow()
    )
    assert payload.regime == MarketRegimeEnum.BULL

    # Invalid confidence (should raise)
    with pytest.raises(ValidationError):
        RegimeUpdatePayload(
            regime=MarketRegimeEnum.BULL,
            confidence=1.5,  # > 1.0
            strategy_recommendation="trend_following",
            indicators={},
            timestamp=datetime.utcnow()
        )

def test_message_rejects_extra_fields():
    # Extra field should be rejected
    with pytest.raises(ValidationError):
        RegimeUpdatePayload(
            regime=MarketRegimeEnum.BULL,
            confidence=0.85,
            strategy_recommendation="trend_following",
            indicators={},
            timestamp=datetime.utcnow(),
            extra_field="not_allowed"  # ← Should fail
        )
```

### Frontend Tests

```typescript
// __tests__/websocket.test.ts
import {
  isRegimeUpdateMessage,
  validateRegimeUpdatePayload,
} from "@/types/websocket";

test("isRegimeUpdateMessage type guard", () => {
  const validMsg = {
    msg_id: "550e8400-e29b-41d4-a716-446655440000",
    type: "regime_update",
    payload: {
      regime: "BULL",
      confidence: 0.85,
      strategy_recommendation: "trend_following",
      indicators: { rsi: 65.4 },
      timestamp: "2026-01-16T12:00:00Z",
    },
    direction: "s2c",
    timestamp: "2026-01-16T12:00:00Z",
  };

  expect(isRegimeUpdateMessage(validMsg)).toBe(true);
  expect(isRegimeUpdateMessage({ type: "unknown" } as any)).toBe(false);
});

test("validateRegimeUpdatePayload runtime validation", () => {
  const validPayload = {
    regime: "BULL",
    confidence: 0.85,
    strategy_recommendation: "trend_following",
    indicators: { rsi: 65.4 },
    timestamp: "2026-06-16T12:00:00Z",
  };

  expect(validateRegimeUpdatePayload(validPayload)).toBe(true);

  const invalidPayload = {
    ...validPayload,
    confidence: 1.5, // Invalid (> 1.0)
  };

  expect(validateRegimeUpdatePayload(invalidPayload)).toBe(false);
});
```

---

## Performance Considerations

1. **Validation Overhead**: Pydantic validation is fast, but for high-frequency data, consider:
   - Using `pydantic-core` (faster JSON parsing)
   - Caching validated models

2. **Broadcast Efficiency**:
   - Channel-based filtering (only send to subscribed clients)
   - Parallel sending with `asyncio.gather()`

3. **Frontend State**:
   - Debounce rapid updates (e.g., portfolio updates)
   - Use React memoization for re-renders

---

## Future Enhancements

1. **Message Compression**: Enable WebSocket compression (`permessage-deflate`)
2. **Binary Protocol**: Consider MessagePack for smaller payloads
3. **Backpressure**: Implement backpressure handling for slow clients
4. **Message Persistence**: Store messages for replay on reconnection

---

## Conclusion

**"Condemn Loose Data, Embrace the Schema"**

This architecture ensures that:

- Every message is validated at runtime
- Type errors are caught at compile time
- Unknown data is rejected
- Errors are structured and actionable
- The system is rock-solid and maintainable

No more `dict["field"]` guessing. No more `any` types. Every byte is sacred.
