# Implementation Plan - Phase 3: Realtime Synapse & Persona Protocol

This phase focuses on establishing a real-time communication channel (WebSocket) between the backend and frontend to stream market regime data and enable dynamic "Persona" UI updates.

## User Review Required

> [!IMPORTANT]
> **WebSocket Strategy**: We will use a standard `WebSocket` connection. The backend will broadcast the `market_regime` and critical alerts.
> **Persona Logic**: The "Persona" (e.g., Big Pickle, MiniMax) will react to this stream.

## Proposed Changes

### Backend (Python/FastAPI)

#### [NEW] [websocket_manager.py](file:///c:/gemini-thinkpad/Ult/backend/src/api/websocket_manager.py)
- Create a `ConnectionManager` class to handle active websocket connections.
- Methods: `connect`, `disconnect`, `broadcast`.

#### [MODIFY] [market.py](file:///c:/gemini-thinkpad/Ult/backend/src/api/routers/market.py)
- Add WebSocket endpoint `/ws/market-stream`.
- Integrate `ConnectionManager`.
- Implement a background task (or hook into the existing loop) to push updates when `MarketRegime` changes.

### Frontend (Next.js/TypeScript)

#### [NEW] [useMarketStream.ts](file:///c:/gemini-thinkpad/Ult/src/hooks/useMarketStream.ts)
- Custom hook to manage WebSocket connection.
- Handles reconnection logic and state updates (Redux or Context).

#### [MODIFY] [MarketStatusCard.tsx](file:///c:/gemini-thinkpad/Ult/src/components/dashboard/MarketStatusCard.tsx)
- Connect to `useMarketStream`.
- Visual updates based on "Vibe" (Regime).
    - **Crash/Panic**: Red pulsing, "SELL EVERYTHING" (Big Pickle persona)
    - **Bull/Euphoria**: Green/Neon, "TO THE MOON"
    - **Neutral**: Standard view.

## Verification Plan

### Automated Tests
- Unit test for `websocket_manager.py`.
- Integration test checking connection and message receipt.

### Manual Verification
- **Visual Check**: Open the dashboard, manually trigger a regime change (via a dev tool or mock), and verify the UI "Vibe" shift (Colors, Text).
- **Network Tab**: Confirm WS connection `101 Switching Protocols` and frame data.
