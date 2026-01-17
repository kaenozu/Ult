# Ult Trading System (G.H.O.S.T Interface)

Advanced AI-powered trading platform with a "Cyberpunk Ghost" aesthetic.

## Architecture
- **Frontend:** Next.js (App Router), TailwindCSS, Recharts, Framer Motion
- **Backend:** FastAPI (Router-based Architecture), SQLite, Pandas, Scikit-learn
- **AI Core:** "Oracle" Regime Detection, LightGBM/XGBoost prediction engines

## Technical Pillars (The 5 Commandments)
1.  **Trust No Float:** All financial calculations use `Decimal` for precision.
2.  **Async Irony:** State-mutating operations are protected by `asyncio.Lock` to prevent race conditions.
3.  **Fail-Safe First:** Systems are resilient to API failures (Circuit Breakers, Fallbacks).
4.  **Schema Sanctity:** API I/O must be strictly typed via Pydantic; no naked dictionaries.
5.  **Audit Trail:** Every trade decision and system state change is logged.

## UI/UX Principles (The Vibe Check)
- **No Default UI:** All elements must be styled (`glass-panel`, `neon-text`).
- **Alive Data:** Interfaces must breathe; no static placeholders.
- **The Ghost Speaks:** System communication embodies a distinct "Ghost in the Machine" persona.

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate
pip install -r requirements.txt
python -m src.api_server
```

### Frontend
```bash
npm install
npm run dev
```

## Status
- **Phase 12 Complete:** Technical Audit & Frontend Vibe Check verified.
