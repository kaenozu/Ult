# API Documentation

This document provides comprehensive API documentation for the AGStock Trading System.

## Overview

The AGStock API is built with FastAPI and provides RESTful endpoints for trading operations, portfolio management, market data, and system monitoring.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently implemented with JWT tokens (bearer authentication).

## Interactive Documentation

### Swagger UI

Access the interactive Swagger documentation at:

```
http://localhost:8000/docs
```

### ReDoc

Alternative documentation interface at:

```
http://localhost:8000/redoc
```

### OpenAPI Schema

Download the OpenAPI 3.0 specification at:

```
http://localhost:8000/openapi.json
```

## API Endpoints

### Health Check

- **GET** `/health`
  - Returns system health status
  - No authentication required

### Portfolio Management

- **GET** `/api/v1/portfolio`
  - Get current portfolio summary
- **POST** `/api/v1/portfolio/trade`
  - Execute a trade order
- **GET** `/api/v1/portfolio/positions`
  - Get detailed position information
- **GET** `/api/v1/portfolio/performance`
  - Get portfolio performance metrics

### Market Data

- **GET** `/api/v1/market/summary`
  - Get market indices summary
- **GET** `/api/v1/market/realtime/{ticker}`
  - Get real-time price data
- **GET** `/api/v1/market/history/{ticker}`
  - Get historical price data

### Trading Operations

- **POST** `/api/v1/trading/order`
  - Place a trading order
- **GET** `/api/v1/trading/orders`
  - Get order history
- **DELETE** `/api/v1/trading/order/{order_id}`
  - Cancel an order

### System Management

- **GET** `/api/v1/system/status`
  - Get system status and circuit breaker state
- **POST** `/api/v1/system/reset`
  - Reset circuit breaker
- **GET** `/api/v1/system/logs`
  - Get system logs

### Settings

- **GET** `/api/v1/settings`
  - Get user settings
- **PUT** `/api/v1/settings`
  - Update user settings

## WebSocket Endpoints

### Portfolio Updates

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/portfolio');

ws.onmessage = event => {
  const data = JSON.parse(event.data);
  console.log('Portfolio update:', data);
};
```

### Market Data Stream

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/market');

ws.onmessage = event => {
  const data = JSON.parse(event.data);
  console.log('Market data:', data);
};
```

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "ticker",
        "message": "Invalid ticker symbol"
      }
    ]
  }
}
```

## Rate Limiting

- **Authenticated endpoints**: 1000 requests/hour per user
- **Public endpoints**: 100 requests/hour per IP
- **WebSocket connections**: 10 concurrent connections per IP

## Data Formats

### Portfolio Response

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
      "pnl": 5000.0,
      "pnl_pct": 3.33
    }
  ],
  "performance": {
    "total_pnl": 5000.0,
    "total_pnl_pct": 0.5,
    "daily_pnl": 1000.0,
    "sharpe_ratio": 1.2,
    "max_drawdown": -5.0
  }
}
```

### Trade Request

```json
{
  "ticker": "7203.T",
  "action": "BUY",
  "quantity": 100,
  "price": 1500.0,
  "order_type": "MARKET",
  "reason": "Auto-pilot entry"
}
```

## SDKs and Libraries

### Python Client

```python
from agstock_client import AGStockClient

client = AGStockClient(api_key="your-api-key")
portfolio = client.get_portfolio()
```

### JavaScript/TypeScript Client

```javascript
import { AGStockAPI } from 'agstock-js';

const client = new AGStockAPI({ apiKey: 'your-api-key' });
const portfolio = await client.getPortfolio();
```

## Testing

### Unit Tests

```bash
cd backend
pytest tests/ -v
```

### Integration Tests

```bash
cd backend
pytest tests/integration/ -v
```

### Load Testing

```bash
cd backend
locust -f tests/load/locustfile.py
```

## Deployment

### Docker

```bash
docker build -t agstock-api .
docker run -p 8000:8000 agstock-api
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agstock-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agstock-api
  template:
    metadata:
      labels:
        app: agstock-api
    spec:
      containers:
        - name: agstock-api
          image: agstock-api:latest
          ports:
            - containerPort: 8000
          env:
            - name: ENVIRONMENT
              value: production
```

## Monitoring

### Health Checks

- **GET** `/health/live` - Liveness probe
- **GET** `/health/ready` - Readiness probe
- **GET** `/metrics` - Prometheus metrics

### Logging

All API requests are logged with structured JSON format including:

- Request ID
- User ID (if authenticated)
- Response time
- Error details

## Security

### HTTPS

All production deployments require HTTPS with valid certificates.

### CORS

CORS is configured to allow requests from approved frontend domains.

### Input Validation

All inputs are validated using Pydantic schemas with strict type checking.

### Rate Limiting

Implemented using Redis-based rate limiting with configurable thresholds.

## Support

For API support and questions:

- **Documentation**: https://docs.agstock.com
- **API Status**: https://status.agstock.com
- **Support Email**: support@agstock.com

## Changelog

### v2.0.0 (Current)

- Complete API redesign with OpenAPI 3.0 compliance
- Added WebSocket support for real-time data
- Enhanced error handling and validation
- Added comprehensive monitoring and metrics

### v1.5.0

- Added portfolio performance endpoints
- Implemented circuit breaker status API
- Added bulk trade operations

### v1.0.0

- Initial release with basic trading operations
- Portfolio management endpoints
- Market data integration
