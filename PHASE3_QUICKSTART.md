# Phase 3: Realtime Synapse - Quick Start Guide

## Setup Instructions

### Backend Setup

```bash
cd backend

# Install dependencies (if not already done)
pip install -r requirements.txt

# Ensure FastAPI is installed
pip install fastapi uvicorn websockets

# Start the API server
python -m src.api_server
```

The server will start on `http://localhost:8000` with WebSocket endpoint at `ws://localhost:8000/ws/synapse`.

### Frontend Setup

```bash
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`.

---

## Usage Examples

### Example 1: Connect and Subscribe (Frontend)

```typescript
// app/dashboard/MarketStatus.tsx
'use client';

import { useSynapse } from '@/hooks/useSynapse';

export function MarketStatus() {
  const { state, isConnected, connect, disconnect, subscribe } = useSynapse({
    url: 'ws://localhost:8000/ws/synapse',
    userId: 'user_123',
  });

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (isConnected) {
      subscribe(['regime', 'price_alerts', 'portfolio_updates']);
    }
  }, [isConnected, subscribe]);

  return (
    <div>
      <div>Connection: {state}</div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
    </div>
  );
}
```

### Example 2: Receive Regime Updates (Persona Protocol)

```typescript
// app/dashboard/MarketStatusCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRegimeStream } from '@/hooks/useSynapse';
import { MarketRegime } from '@/types/websocket';

export function MarketStatusCard() {
  const [regime, setRegime] = useState<MarketRegime>(MarketRegime.SIDEWAYS);
  const [confidence, setConfidence] = useState<number>(0);
  const [vibe, setVibe] = useState<'neutral' | 'bull' | 'bear' | 'panic'>('neutral');

  // Receive regime updates
  useRegimeStream((message) => {
    setRegime(message.payload.regime);
    setConfidence(message.payload.confidence);

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

  // Visual styles based on vibe
  const vibeColors = {
    neutral: 'bg-gray-500',
    bull: 'bg-green-500 animate-pulse',
    bear: 'bg-red-500',
    panic: 'bg-red-600 animate-pulse-fast',
  };

  return (
    <div className={`glass-panel p-6 rounded-lg ${vibeColors[vibe]}`}>
      <h2 className="text-2xl font-bold mb-2">Market Regime</h2>
      <div className="text-xl mb-2">{regime}</div>
      <div className="text-sm opacity-75">Confidence: {(confidence * 100).toFixed(1)}%</div>
      <div className="text-sm mt-2">
        {vibe === 'bull' && '🚀 TO THE MOON!'}
        {vibe === 'bear' && '🐻 Time to be careful'}
        {vibe === 'panic' && '🔥 SELL EVERYTHING!'}
        {vibe === 'neutral' && '😐 Steady as she goes'}
      </div>
    </div>
  );
}
```

### Example 3: Receive Price Alerts

```typescript
// app/dashboard/PriceAlerts.tsx
'use client';

import { useState } from 'react';
import { usePriceAlerts } from '@/hooks/useSynapse';

export function PriceAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  usePriceAlerts((message) => {
    setAlerts((prev) => [...prev, message.payload].slice(-10));
  });

  return (
    <div className="glass-panel p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Price Alerts</h2>
      {alerts.length === 0 && <div>No alerts yet</div>}
      {alerts.map((alert, i) => (
        <div key={i} className="mb-3 p-3 bg-gray-800 rounded">
          <div className="font-bold">{alert.ticker} - {alert.name}</div>
          <div className="text-sm">
            {alert.current_price} ({alert.change_percent > 0 ? '+' : ''}{alert.change_percent.toFixed(2)}%)
          </div>
          <div className={`text-xs ${alert.severity === 'critical' ? 'text-red-400' : 'text-gray-400'}`}>
            {alert.alert_type} - {alert.severity}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Example 4: Manually Broadcast Regime (Backend)

```python
# backend/src/api/synapse_controller.py

from src.api.websocket_broadcaster import broadcaster
from src.api.websocket_types import MarketRegimeEnum

async def manual_regime_update():
    """Manually trigger a regime update (e.g., from external event)"""
    await broadcaster.broadcast_regime_update(
        regime=MarketRegimeEnum.BULL,
        confidence=0.92,
        strategy="momentum_following",
        indicators={"rsi": 72.3, "macd": 1.8}
    )
```

### Example 5: Broadcast Price Alert (Backend)

```python
# backend/src/api/trading_alerts.py

from src.api.websocket_broadcaster import broadcaster

async def send_price_alert(ticker: str, current_price: float, previous_price: float):
    """Send a price alert when threshold is breached"""
    await broadcaster.broadcast_price_alert(
        ticker=ticker,
        name=TICKER_NAMES.get(ticker, ticker),
        current_price=current_price,
        previous_price=previous_price,
        alert_type="threshold",
        severity="high" if abs((current_price - previous_price) / previous_price) > 0.05 else "medium"
    )
```

---

## Testing the System

### Test WebSocket Connection

```bash
# Using wscat (install with: npm install -g wscat)
wscat -c "ws://localhost:8000/ws/synapse"

# Send a subscription message
{"msg_id":"test-001","type":"subscribe","payload":{"channels":["regime"],"user_id":"test-user"},"direction":"c2s","timestamp":"2026-01-16T12:00:00Z"}

# You should receive a subscription confirmation
# Then receive regime updates every 30 seconds
```

### Manual Broadcast Test

```python
# Create a test endpoint in backend/src/api/routers/test.py

from fastapi import APIRouter
from src.api.websocket_broadcaster import broadcaster
from src.api.websocket_types import MarketRegimeEnum

router = APIRouter()

@router.post("/test/regime/{regime}")
async def test_regime_broadcast(regime: str):
    """Test endpoint to broadcast regime updates"""
    regime_map = {
        "bull": MarketRegimeEnum.BULL,
        "bear": MarketRegimeEnum.BEAR,
        "crash": MarketRegimeEnum.CRASH,
    }

    await broadcaster.broadcast_regime_update(
        regime=regime_map.get(regime, MarketRegimeEnum.SIDEWAYS),
        confidence=0.95,
        strategy="test_strategy",
    )

    return {"message": f"Broadcasting {regime}"}
```

Then test with:

```bash
curl -X POST http://localhost:8000/api/v1/test/regime/bull
```

---

## Debugging

### Backend Logs

```bash
# Backend logs show WebSocket connections and broadcasts
tail -f backend/logs/app.log | grep -i websocket
```

### Browser Console

```typescript
// Add error logging
const { onError } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });

onError((error) => {
  console.error("[WebSocket Error]", error);
});
```

### Network Tab

Open browser DevTools → Network → WS filter to see WebSocket frames.

---

## Common Issues

### Issue: WebSocket Connection Fails

**Cause**: CORS or port mismatch

**Solution**:

- Check `api_server.py` CORS settings
- Verify frontend URL matches backend URL
- Check firewall settings

### Issue: No Messages Received

**Cause**: Not subscribed to channel

**Solution**:

```typescript
// Make sure you subscribe
const { subscribe } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });
subscribe(["regime"]); // ← Required!
```

### Issue: Type Errors

**Cause**: Using wrong message type

**Solution**:

```typescript
// Use type-safe factory
import { MessageFactory } from "@/types/websocket";

// WRONG
const msg = { type: "subscribe", data: { channels: ["regime"] } };

// RIGHT
const msg = MessageFactory.subscribe(["regime"]);
```

---

## Next Steps

1. **Implement MarketStatusCard** with vibe-based styling
2. **Add PriceAlerts component** with severity colors
3. **Implement PortfolioUpdates** for real-time PnL
4. **Add TradeExecution** notifications
5. **Test with multiple clients** (different browser tabs)

---

## Questions?

Check the architecture document: `PHASE3_WEBSOCKET_ARCHITECTURE.md`
