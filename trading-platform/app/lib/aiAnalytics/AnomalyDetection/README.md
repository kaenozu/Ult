# Anomaly Detection and Market Prediction System

**TRADING-010: 異常検知と市場予測システムの実装**

## Overview

This system provides comprehensive anomaly detection and market prediction capabilities for the ULT Trading Platform. It uses multiple detection algorithms and machine learning-inspired approaches to identify market anomalies, predict events, and assess risk.

## Features

### 1. Anomaly Detection

- **Statistical Detector**: Uses z-scores and IQR methods to detect statistical anomalies
- **Isolation Forest**: Unsupervised machine learning algorithm for anomaly detection
- **Multi-Detector Ensemble**: Combines multiple detectors for robust anomaly identification

### 2. Specialized Detection

- **Flash Crash Detection**: Identifies sudden, severe price drops with volume spikes
- **Liquidity Crisis Detection**: Monitors order book depth, spread, and imbalance
- **Market Regime Change Detection**: Identifies transitions between market states (trending, ranging, volatile)

### 3. Event Prediction

- **Market Event Prediction**: Predicts events like crashes, rallies, breakouts
- **Price Movement Prediction**: Forecasts future price movements with uncertainty bounds
- **Tail Risk Assessment**: Calculates VaR, CVaR, and extreme value analysis
- **Risk Correlation Analysis**: Analyzes portfolio diversification and correlations

### 4. Alert Management

- **Severity-Based Alerts**: LOW, MEDIUM, HIGH, CRITICAL
- **Alert Aggregation**: Groups similar alerts within time windows
- **Escalation Rules**: Automatic escalation based on conditions
- **Alert Analysis**: Tracks false positives, response times, and trends

## Architecture

```
AnomalyDetection/
├── types.ts                  # Type definitions
├── StatisticalDetector.ts    # Statistical anomaly detection
├── IsolationForest.ts        # Isolation Forest algorithm
├── AnomalyDetector.ts        # Main detector orchestrator
├── EventPredictor.ts         # Event and price prediction
├── AlertManager.ts           # Alert management system
├── index.ts                  # Module exports
├── example.ts                # Usage examples
└── __tests__/                # Unit tests
    ├── StatisticalDetector.test.ts
    ├── AnomalyDetector.test.ts
    └── EventPredictor.test.ts
```

## Usage

### Basic Anomaly Detection

```typescript
import { AnomalyDetector } from '@/app/lib/aiAnalytics/AnomalyDetection';

const detector = new AnomalyDetector({
  flashCrashThreshold: 0.05,
  volumeSpikeThreshold: 3.0,
  anomalyThreshold: 0.7,
});

const marketData = {
  symbol: 'AAPL',
  timestamp: new Date(),
  ohlcv: [...], // Your OHLCV data
  volume: 1000000,
  price: 150.0,
};

const result = detector.detectAnomaly(marketData);

if (result.isAnomaly) {
  console.log(`Anomaly detected! Severity: ${result.severity}`);
  console.log(`Score: ${result.anomalyScore}`);
}
```

### Flash Crash Detection

```typescript
const flashCrashAlert = detector.detectFlashCrash(ohlcv);

if (flashCrashAlert) {
  console.log('FLASH CRASH DETECTED!');
  console.log(`Price drop: ${flashCrashAlert.priceDrop * 100}%`);
  console.log(`Action: ${flashCrashAlert.recommendedAction}`);
}
```

### Event Prediction

```typescript
import { EventPredictor } from '@/app/lib/aiAnalytics/AnomalyDetection';

const predictor = new EventPredictor();

const eventPrediction = await predictor.predictEvent(ohlcv);

console.log(`Event: ${eventPrediction.eventType}`);
console.log(`Probability: ${eventPrediction.probability * 100}%`);
console.log(`Expected: ${eventPrediction.expectedTime}`);
console.log(`Actions: ${eventPrediction.recommendedActions.join(', ')}`);
```

### Price Movement Prediction

```typescript
const pricePrediction = await predictor.predictPriceMovement(
  'AAPL',
  ohlcv,
  5 // 5-day horizon
);

pricePrediction.predictions.forEach((pred, i) => {
  console.log(`Day ${i + 1}: $${pred.price.toFixed(2)} (${pred.confidence * 100}% confidence)`);
});
```

### Tail Risk Assessment

```typescript
const portfolio = {
  assets: [...],
  totalValue: 100000,
  cash: 10000,
  getHistoricalReturns: () => [...],
};

const tailRisk = predictor.assessTailRisk(portfolio);

console.log(`VaR (95%): ${tailRisk.var95}`);
console.log(`CVaR (99%): ${tailRisk.cvar99}`);
console.log(`Risk Level: ${tailRisk.riskLevel}`);
```

### Alert Management

```typescript
import { AlertManager } from '@/app/lib/aiAnalytics/AnomalyDetection';

const alertManager = new AlertManager({
  duplicateWindow: 300000, // 5 minutes
  escalationRules: [
    {
      condition: { severity: 'CRITICAL' },
      action: 'IMMEDIATE_NOTIFICATION',
      delay: 0,
    },
  ],
});

await alertManager.sendAlert({
  id: 'alert-1',
  type: 'ANOMALY_DETECTED',
  severity: 'HIGH',
  timestamp: new Date(),
  data: result,
  acknowledged: false,
  message: 'Anomaly detected in AAPL',
});

// Get aggregated alerts
const aggregated = alertManager.aggregateAlerts(3600000); // Last hour
console.log(`Total alerts: ${aggregated.length}`);
```

## API Endpoints

### POST /api/anomaly

Perform anomaly detection operations.

**Request Body:**
```json
{
  "action": "detect|flash-crash|liquidity-crisis|regime-change|predict-event|predict-price|tail-risk|risk-correlation",
  "data": {
    // Action-specific data
  }
}
```

**Example: Detect Anomaly**
```json
{
  "action": "detect",
  "data": {
    "symbol": "AAPL",
    "ohlcv": [...],
    "volume": 1000000,
    "price": 150.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "anomaly": {
    "isAnomaly": true,
    "anomalyScore": 0.85,
    "severity": "HIGH",
    "detectorResults": [...]
  }
}
```

### GET /api/anomaly

Get system capabilities and status.

**Response:**
```json
{
  "success": true,
  "capabilities": {
    "actions": ["detect", "flash-crash", ...],
    "description": "Anomaly detection and market prediction system",
    "version": "1.0.0"
  },
  "status": "operational"
}
```

## Configuration

### Anomaly Detection Config

```typescript
{
  flashCrashThreshold: 0.05,        // 5% price drop
  volumeSpikeThreshold: 3.0,        // 3x volume spike
  liquidityDropThreshold: 0.5,      // 50% liquidity drop
  spreadThreshold: 0.01,            // 1% bid-ask spread
  depthThreshold: 100000,           // Minimum order book depth
  imbalanceThreshold: 0.7,          // 70% order imbalance
  criticalSpread: 0.02,             // 2% critical spread
  anomalyThreshold: 0.7,            // 70% anomaly confidence
}
```

### Alert Manager Config

```typescript
{
  duplicateWindow: 300000,          // 5 minutes
  maxHistorySize: 1000,             // Keep 1000 alerts
  channels: [],                     // Notification channels
  escalationRules: [...]            // Escalation rules
}
```

## Testing

All components have comprehensive unit tests:

```bash
npm test -- app/lib/aiAnalytics/AnomalyDetection/__tests__
```

**Test Coverage:**
- StatisticalDetector: 7 tests
- AnomalyDetector: 12 tests
- EventPredictor: 12 tests
- **Total: 31 tests, all passing**

## Integration Example

See `example.ts` for a complete integration example showing:
- Real-time anomaly monitoring
- Alert management
- Portfolio risk analysis

## Performance Considerations

1. **Detector Caching**: Detectors train incrementally on data
2. **Alert Deduplication**: Prevents alert spam within time windows
3. **Configurable Thresholds**: Tune sensitivity to your needs
4. **Efficient Algorithms**: Optimized for real-time processing

## Future Enhancements

- [ ] LSTM-based temporal anomaly detection
- [ ] Autoencoder for complex pattern recognition
- [ ] Transformer models for event prediction
- [ ] Real-time WebSocket integration
- [ ] Historical backtesting framework
- [ ] Machine learning model training pipeline

## Security

- Rate limiting on API endpoints
- Input validation and sanitization
- No sensitive data logging
- Secure configuration management

## Related Files

- `app/lib/MarketRegimeDetector.ts` - Market regime detection
- `app/lib/alertService.ts` - Legacy alert service
- `app/lib/riskManagement.ts` - Risk management utilities

## License

Part of the ULT Trading Platform. See main project LICENSE for details.
