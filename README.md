# Ult Trading System (G.H.O.S.T Interface)

Advanced AI-powered trading platform with a "Cyberpunk Ghost" aesthetic. This system provides automated trading capabilities with real-time monitoring, risk management, and an immersive cyberpunk UI.

## Features

- **AI-Powered Trading:** Automated buy/sell decisions using LightGBM and RSI strategies
- **Continuous Learning:** Claude Code-inspired skill extraction and autonomous improvement
- **Real-Time Monitoring:** Live portfolio tracking and market data visualization
- **Risk Management:** Circuit breaker system with configurable safety limits
- **Interactive Dashboard:** 3D visualizations and approval workflows
- **Multi-Asset Support:** Stocks, crypto, forex, and commodities
- **Notification System:** Swipe-based notifications and alerts
- **Security & Monitoring:** JWT authentication, structured logging, error handling, metrics
- **Testing:** Comprehensive test suite with 80%+ coverage
- **API Documentation:** Auto-generated OpenAPI docs with FastAPI

## Architecture

- **Frontend:** Next.js (App Router), TypeScript, TailwindCSS, Recharts, Framer Motion, React Three Fiber
- **Backend:** Python, FastAPI, SQLite, Pandas, Scikit-learn, YFinance
- **AI Core:** "Oracle" Regime Detection, LightGBM/XGBoost prediction engines
- **Database:** SQLite with data caching and historical storage

## Technical Pillars (The 5 Commandments)

1. **Trust No Float:** All financial calculations use `Decimal` for precision.
2. **Async Irony:** State-mutating operations are protected by `asyncio.Lock` to prevent race conditions.
3. **Fail-Safe First:** Systems are resilient to API failures (Circuit Breakers, Fallbacks).
4. **Schema Sanctity:** API I/O must be strictly typed via Pydantic; no naked dictionaries.
5. **Audit Trail:** Every trade decision and system state change is logged.

## Security & Monitoring

- **Authentication:** JWT-based API authentication (required for production)
- **Logging:** Structured JSON logging with automatic rotation
- **Error Handling:** Comprehensive exception handling with standardized responses
- **Metrics:** Application metrics endpoint at `/metrics`
- **Security Scanning:** Integrated CodeQL and Trivy vulnerability scanning

## UI/UX Principles (The Vibe Check)

- **No Default UI:** All elements must be styled (`glass-panel`, `neon-text`).
- **Alive Data:** Interfaces must breathe; no static placeholders.
- **The Ghost Speaks:** System communication embodies a distinct "Ghost in the Machine" persona.

## Installation & Setup

### Prerequisites

- Python 3.8+
- Node.js 18+
- SQLite3

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Environment variables (create .env file)
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_secure_jwt_secret
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Run
python -m src.api.server
```

### Frontend Setup

```bash
npm install
npm run dev
```

### Testing

```bash
# Backend tests with coverage
cd backend
pytest --cov=src --cov-report=html

# Frontend tests
npm test
```

## API Documentation

Access auto-generated API docs at `http://localhost:8000/docs` when running the backend.

## API Documentation

### Portfolio Endpoints

#### GET /api/v1/portfolio

Get current portfolio status including positions, balance, and performance metrics.

**Response:**

```json
{
  "total_equity": 1000000.0,
  "cash": 500000.0,
  "invested_amount": 500000.0,
  "positions": [
    {
      "ticker": "7203.T",
      "quantity": 100,
      "avg_price": 1500.0,
      "current_price": 1550.0,
      "pnl": 5000.0
    }
  ]
}
```

#### POST /api/v1/portfolio/trade

Execute a trade order.

**Request:**

```json
{
  "ticker": "7203.T",
  "action": "BUY",
  "quantity": 100,
  "price": 1500.0
}
```

### Market Data Endpoints

#### GET /api/v1/market/summary

Get market summary with major indices and commodities.

#### GET /api/v1/market/realtime/{ticker}

Get real-time price data for a specific ticker.

### System Endpoints

#### GET /api/v1/system/status

Get system health and circuit breaker status.

#### POST /api/v1/system/kill-switch

Activate emergency kill switch.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+
- npm or yarn

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m src.api_server
```

### Frontend Setup

```bash
npm install
npm run dev
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Configuration

### Environment Variables

- `REALTIME_TTL_SECONDS`: Cache TTL for real-time data (default: 300)
- `MAX_CONCURRENT_REQUESTS`: Max concurrent API requests (default: 10)

### Trading Parameters

Configure via `backend/src/core/config.py`:

- Max position size
- Risk limits
- Strategy parameters

## Development

### Code Quality

- TypeScript for type safety
- ESLint for code quality
- Jest for unit testing
- Prettier for code formatting

### Architecture Patterns

- Component composition over inheritance
- Custom hooks for state management
- Lazy loading for performance
- Error boundaries for resilience

## Status

- **Phase 12 Complete:** Technical Audit & Frontend Vibe Check verified.
- **Recent Updates:** Code refactoring, component extraction, test coverage improvements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
