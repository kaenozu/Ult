# Implementation Plan - Phase 3: Realtime Synapse & Persona Protocol

## Status: ARCHITECTURE COMPLETE

**"Condemn Loose Data, Embrace Schema"** - All WebSocket communication is now strictly typed with Pydantic schemas.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   STRICTLY TYPED WEBSOCKET                    │
│              Every byte validated by Pydantic                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
  ┌───────────▼────┐  ┌───▼────────┐  ┌─▼──────────┐
  │ Frontend        │  │ Backend    │  │ Broadcaster  │
  │ (Next.js/TS)    │  │ (FastAPI)  │  │ (Background) │
  │ - useSynapse    │  │ - Manager   │  │ - Regime    │
  │ - Type Guards   │  │ - Router    │  │   Feed       │
  └─────────────────┘  └────────────┘  └─────────────┘
```

---

## Completed Components

### Backend (Python/FastAPI)

| File                                       | Status  | Description                                                        |
| ------------------------------------------ | ------- | ------------------------------------------------------------------ |
| `backend/src/api/websocket_types.py`       | ✅ DONE | Pydantic schemas (WsMessageEnvelope, all payloads, MessageFactory) |
| `backend/src/api/websocket_manager.py`     | ✅ DONE | Typed connection manager (TypedConnection, TypedWebSocketManager)  |
| `backend/src/api/routers/websocket.py`     | ✅ DONE | FastAPI WebSocket router (`/ws/synapse`, handlers)                 |
| `backend/src/api/websocket_broadcaster.py` | ✅ DONE | Background broadcaster (MarketDataBroadcaster, regime feed)        |
| `backend/src/api_server.py`                | ✅ DONE | Updated to include WebSocket router and broadcaster startup        |

### Frontend (Next.js/TypeScript)

| File                      | Status  | Description                                                     |
| ------------------------- | ------- | --------------------------------------------------------------- |
| `src/types/websocket.ts`  | ✅ DONE | TypeScript types (WsMessageEnvelope, all payloads, type guards) |
| `src/hooks/useSynapse.ts` | ✅ DONE | React hook (useSynapse, useRegimeStream, usePriceAlerts)        |

### Documentation

| File                               | Status  | Description                         |
| ---------------------------------- | ------- | ----------------------------------- |
| `PHASE3_WEBSOCKET_ARCHITECTURE.md` | ✅ DONE | Complete architecture documentation |
| `PHASE3_QUICKSTART.md`             | ✅ DONE | Quick start guide with examples     |

---

## Remaining Tasks

### Backend Integration

- [ ] **Test WebSocket Router**: Test `/ws/synapse` endpoint with real connections
- [ ] **Verify Broadcaster Integration**: Ensure MarketDataBroadcaster starts with API server
- [ ] **Add Test Endpoints**: Create test endpoints for manual regime/price alert broadcasts
- [ ] **Monitor Connection Stats**: Add metrics/logging for connection monitoring

### Frontend Implementation

- [ ] **Implement MarketStatusCard**: Create component with vibe-based styling (Persona Protocol)
  - Bull regime → Green/Neon, "TO THE MOON"
  - Bear regime → Red, "Time to be careful"
  - Crash regime → Red pulsing, "SELL EVERYTHING!"
  - Neutral regime → Standard view
- [ ] **Implement PriceAlerts Component**: Display price alerts with severity colors
- [ ] **Implement PortfolioUpdates Component**: Show real-time PnL updates
- [ ] **Add TradeExecution Notifications**: Display trade confirmations
- [ ] **Integrate in Dashboard**: Add components to main dashboard

### Testing

- [ ] **Backend Unit Tests**: Test all Pydantic schemas (websocket_types.py)
- [ ] **Backend Integration Tests**: Test WebSocket connection, subscription, broadcasting
- [ ] **Frontend Unit Tests**: Test type guards, MessageFactory, validation functions
- [ **Frontend Integration Tests**: Test useSynapse hook, subscription handlers

### Manual Verification

- [ ] **Visual Check**: Open dashboard, manually trigger regime change, verify UI "Vibe" shift
- [ ] **Network Tab**: Confirm WS connection (101 Switching Protocols) and frame data
- [ ] **Multi-Client Test**: Open multiple browser tabs, verify all receive same updates
- [ ] **Error Handling**: Test error scenarios (invalid payload, unknown message type)

---

## Implementation Steps

### Step 1: Backend Testing (Priority: HIGH)

```bash
cd backend
python -m src.api_server
```

Test with wscat:

```bash
wscat -c "ws://localhost:8000/ws/synapse"
# Send: {"msg_id":"test-001","type":"subscribe","payload":{"channels":["regime"],"user_id":"test"},"direction":"c2s","timestamp":"2026-01-16T12:00:00Z"}
```

### Step 2: Frontend Component Implementation

Create `src/components/dashboard/MarketStatusCard.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRegimeStream } from '@/hooks/useSynapse';
import { MarketRegime } from '@/types/websocket';

export function MarketStatusCard() {
  const [regime, setRegime] = useState<MarketRegime>(MarketRegime.SIDEWAYS);
  const [vibe, setVibe] = useState<'neutral' | 'bull' | 'bear' | 'panic'>('neutral');

  useRegimeStream((message) => {
    setRegime(message.payload.regime);
    // Set vibe based on regime
    switch (message.payload.regime) {
      case MarketRegime.BULL: setVibe('bull'); break;
      case MarketRegime.BEAR: setVibe('bear'); break;
      case MarketRegime.CRASH: setVibe('panic'); break;
      default: setVibe('neutral');
    }
  });

  return (
    <div className={`glass-panel p-6 vibe-${vibe}`}>
      <h2 className="text-2xl font-bold">Market Regime</h2>
      <div className="text-xl">{regime}</div>
      {/* Persona text based on vibe */}
    </div>
  );
}
```

### Step 3: Dashboard Integration

Update `src/app/dashboard/page.tsx` to include MarketStatusCard.

### Step 4: Verification

1. Start backend: `cd backend && python -m src.api_server`
2. Start frontend: `npm run dev`
3. Open browser to `http://localhost:3000/dashboard`
4. Observe MarketStatusCard updates every 30 seconds (regime broadcast)
5. Verify vibe changes based on market regime

---

## Architecture Highlights

### Type Safety

**Before (CONDEMNED):**

```python
# Loose data - any field can be anything!
message = {"type": "regime", "data": {"regime": "BULL"}}
```

**After (EMBRACED):**

```python
# Strictly typed - Pydantic validates everything!
message = WsMessageEnvelope[RegimeUpdatePayload](
    type="regime_update",
    payload=RegimeUpdatePayload(
        regime=MarketRegimeEnum.BULL,
        confidence=0.85,
        strategy_recommendation="trend_following",
        timestamp=datetime.utcnow()
    )
)
```

### Message Flow

```
Client                  Manager                   Broadcaster
  │                        │                          │
  ├─── Subscribe ───────>│                          │
  │<─── Confirmed ───────┤                          │
  │                        │                          │
  │                        │<─── RegimeUpdate ───────┤
  │<─── RegimeUpdate ────┤                          │
  │                        │                          │
  │                        │<─── PriceAlert ──────────┤
  │<─── PriceAlert ───────┤                          │
```

### Error Handling

All errors are structured with:

- `severity`: validation_error, business_logic_error, system_error
- `code`: Error code for logging/tracking
- `message`: Human-readable error message
- `request_msg_id`: Link to original request (if applicable)

---

## Persona Protocol

The "Persona" (Big Pickle, MiniMax) reacts to regime updates:

| Regime   | Vibe    | UI Color    | Persona Message         |
| -------- | ------- | ----------- | ----------------------- |
| BULL     | bull    | Green/Neon  | "TO THE MOON! 🚀"       |
| BEAR     | bear    | Red         | "Time to be careful 🐻" |
| CRASH    | panic   | Red pulsing | "SELL EVERYTHING! 🔥"   |
| SIDEWAYS | neutral | Standard    | "Steady as she goes 😐" |

---

## References

- **Architecture**: `PHASE3_WEBSOCKET_ARCHITECTURE.md`
- **Quick Start**: `PHASE3_QUICKSTART.md`
- **Backend Types**: `backend/src/api/websocket_types.py`
- **Frontend Types**: `src/types/websocket.ts`
- **Hook**: `src/hooks/useSynapse.ts`

---

## Summary

✅ **Architecture Complete**: All files created, types defined, manager implemented
⏳ **Integration Pending**: Connect frontend components to WebSocket stream
⏳ **Testing Pending**: Unit tests, integration tests, manual verification

**Next Action**: Start backend, test WebSocket connection, implement MarketStatusCard component
