# CODEMAP: Prediction Services

**Domain**: `trading-platform/app/domains/prediction/services/`
**Last Updated**: 2025-01-28 (PR #606)
**Status**: Active - Unchanged in PR #606

---

## Overview

The prediction services layer orchestrates ML model predictions, feature calculation, and signal generation. This layer remained **unchanged** during PR #606's ML prediction refactoring, demonstrating the clean separation of concerns in the architecture.

## Directory Structure

```
trading-platform/app/domains/prediction/services/
├── integrated-prediction-service.ts    # Main orchestration service
├── enhanced-ml-service.ts              # ML service wrapper
├── feature-calculation-service.ts      # Feature computation
├── advanced-prediction-service.ts      # Advanced prediction logic
├── ml-model-service.ts                 # Model management
├── tensorflow-model-service.ts         # TensorFlow integration
├── model-training-example.ts           # Training examples
└── index.ts                            # Service exports
```

---

## Core Services

### 1. IntegratedPredictionService

**File**: `integrated-prediction-service.ts`
**Purpose**: Main orchestration layer combining ML predictions with signal generation
**Status**: ✅ Active - Unchanged in PR #606

#### Architecture

```typescript
class IntegratedPredictionService {
  private featureService: FeatureCalculationService;

  // Main prediction method
  async generatePrediction(
    stock: Stock,
    data: OHLCV[],
    indexData?: OHLCV[]
  ): Promise<IntegratedPredictionResult>

  // Update with actual results
  async updateWithActualResult(
    symbol: string,
    prediction: number,
    actualChange: number
  ): Promise<void>

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics

  // Trigger model retraining
  async retrainModels(): Promise<void>
}
```

#### Prediction Flow

```
generatePrediction()
    ↓
1. Calculate Features
    featureService.calculateFeatures(data)
    ↓
2. Get Enhanced Prediction
    enhancedMLService.predictEnhanced(features, stock, data)
    ↓
3. Check Quality Threshold
    enhancedMLService.shouldTakeSignal(prediction)
    ↓
4. Generate Signal
    generateSignal() with Kelly Criterion sizing
    ↓
5. Get Model Statistics
    enhancedMLService.getModelStats()
    ↓
6. Return Result
    { signal, enhancedMetrics, modelStats }
```

#### Signal Generation Logic

```typescript
private generateSignal(
  stock: Stock,
  data: OHLCV[],
  enhancedPrediction: EnhancedPrediction,
  shouldTrade: boolean,
  indexData?: OHLCV[]
): Signal
```

**Decision Criteria**:
- BUY: `shouldTrade && prediction > 1.0`
- SELL: `shouldTrade && prediction < -1.0`
- HOLD: Otherwise

**Position Sizing**:
- Uses Kelly Criterion (`kellyFraction`) to adjust target/stop distances
- Incorporates ATR for volatility-based sizing
- Applies risk management multipliers

#### Enhanced Metrics

```typescript
interface EnhancedMetrics {
  expectedValue: number;           // Expected return
  kellyFraction: number;           // Kelly Criterion position size
  recommendedPositionSize: number; // Recommended % of capital
  driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  marketRegime: {
    regime: 'TRENDING' | 'RANGING';
    volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  volatility: number;
}
```

#### Model Statistics

```typescript
interface ModelStats {
  rfHitRate: number;      // Random Forest hit rate
  xgbHitRate: number;     // XGBoost hit rate
  lstmHitRate: number;    // LSTM hit rate
  ensembleWeights: {
    RF: number;
    XGB: number;
    LSTM: number;
  };
}
```

---

### 2. EnhancedMLService

**File**: `enhanced-ml-service.ts`
**Purpose**: Wrapper around ML models with quality checks and performance tracking
**Status**: ✅ Active - Unchanged in PR #606

#### Core Functionality

```typescript
class EnhancedMLService {
  // Get enhanced prediction with confidence and metrics
  async predictEnhanced(
    features: AllFeatures,
    stock: Stock,
    data: OHLCV[]
  ): Promise<EnhancedPrediction>

  // Check if signal meets quality threshold
  shouldTakeSignal(prediction: EnhancedPrediction): boolean

  // Update model performance
  updatePerformance(
    modelId: string,
    prediction: number,
    actualChange: number
  ): void

  // Get model statistics
  getModelStats(): ModelStatistics

  // Trigger model retraining
  async triggerRetrain(): Promise<void>
}
```

#### Enhanced Prediction Structure

```typescript
interface EnhancedPrediction {
  prediction: number;              // Predicted price change (%)
  confidence: number;              // 0-100 confidence score
  expectedValue: number;           // Expected return considering probability
  kellyFraction: number;           // Kelly Criterion fraction
  recommendedPositionSize: number; // % of capital to allocate
  driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  marketRegime: {
    regime: 'TRENDING' | 'RANGING' | 'UNKNOWN';
    volatility: 'HIGH' | 'MEDIUM' | 'LOW';
    confidence: number;
  };
  volatility: {
    historical: number;
    implied: number;
    atr: number;
  };
}
```

#### Quality Thresholds

```typescript
shouldTakeSignal(prediction: EnhancedPrediction): boolean {
  return (
    prediction.confidence >= MIN_CONFIDENCE &&
    prediction.expectedValue > MIN_EXPECTED_VALUE &&
    prediction.driftRisk !== 'HIGH' &&
    Math.abs(prediction.prediction) >= MIN_PREDICTION_MAGNITUDE
  );
}
```

**Default Thresholds**:
- `MIN_CONFIDENCE`: 60%
- `MIN_EXPECTED_VALUE`: 1.0
- `MIN_PREDICTION_MAGNITUDE`: 1.0%

#### Performance Tracking

Maintains performance history for each model:
- **Hit Rate**: % of correct directional predictions
- **Sharpe Ratio**: Risk-adjusted returns
- **Average Error**: Mean prediction error
- **Profit Factor**: Gross profit / gross loss

#### Drift Detection Integration

```typescript
private checkDrift(): 'LOW' | 'MEDIUM' | 'HIGH' {
  const driftScore = modelDriftDetector.detectDrift('ensemble');

  if (driftScore > 0.3) return 'HIGH';
  if (driftScore > 0.15) return 'MEDIUM';
  return 'LOW';
}
```

---

### 3. FeatureCalculationService

**File**: `feature-calculation-service.ts`
**Purpose**: Calculate features from raw OHLCV data
**Status**: ✅ Active - Unchanged in PR #606

#### Feature Calculation

```typescript
class FeatureCalculationService {
  // Main feature calculation
  calculateFeatures(data: OHLCV[]): AllFeatures

  // Calculate specific feature categories
  private calculateTechnicalIndicators(data: OHLCV[]): TechnicalFeatures
  private calculatePriceFeatures(data: OHLCV[]): PriceFeatures
  private calculateVolumeFeatures(data: OHLCV[]): VolumeFeatures
  private calculateVolatilityFeatures(data: OHLCV[]): VolatilityFeatures
  private calculateMomentumFeatures(data: OHLCV[]): MomentumFeatures
}
```

#### Feature Categories

1. **Technical Indicators**
   - RSI, MACD, Bollinger Bands
   - Moving averages (SMA, EMA)
   - ATR, ADX

2. **Price Features**
   - Price trends
   - Support/resistance levels
   - Candle patterns

3. **Volume Features**
   - Volume ratios
   - Volume trends
   - OBV (On-Balance Volume)

4. **Volatility Features**
   - Historical volatility
   - Realized volatility
   - ATR-based metrics

5. **Momentum Features**
   - Rate of change
   - Momentum indicators
   - Stochastic oscillators

#### Data Validation

```typescript
private validateData(data: OHLCV[]): boolean {
  return (
    data.length >= MIN_DATA_POINTS &&
    this.hasCompleteOHLCV(data) &&
    this.hasReasonableValues(data)
  );
}
```

---

### 4. AdvancedPredictionService

**File**: `advanced-prediction-service.ts`
**Purpose**: Advanced prediction strategies and algorithms
**Status**: ✅ Active

#### Advanced Strategies

```typescript
class AdvancedPredictionService {
  // Multi-timeframe analysis
  predictMultiTimeframe(
    stock: Stock,
    dailyData: OHLCV[],
    weeklyData: OHLCV[],
    monthlyData: OHLCV[]
  ): MultiTimeframePrediction

  // Correlation-based prediction
  predictWithCorrelation(
    stock: Stock,
    stockData: OHLCV[],
    indexData: OHLCV[]
  ): CorrelationPrediction

  // Regime-aware prediction
  predictByRegime(
    stock: Stock,
    data: OHLCV[],
    regime: MarketRegime
  ): RegimePrediction
}
```

#### Multi-Timeframe Analysis

Combines signals from different timeframes:
- **Daily**: Short-term trends
- **Weekly**: Medium-term direction
- **Monthly**: Long-term context

Weights are adjusted based on regime and volatility.

---

### 5. MLModelService

**File**: `ml-model-service.ts`
**Purpose**: Direct ML model management
**Status**: ✅ Active

#### Model Management

```typescript
class MLModelService {
  // Load model from storage
  async loadModel(modelId: string): Promise<MLModel>

  // Save model to storage
  async saveModel(modelId: string, model: MLModel): Promise<void>

  // List available models
  async listModels(): Promise<string[]>

  // Delete model
  async deleteModel(modelId: string): Promise<void>

  // Get model metadata
  async getModelMetadata(modelId: string): Promise<ModelMetadata>
}
```

#### Model Storage

Models are stored in IndexedDB:
- **Key**: Model ID (e.g., 'lstm-v1', 'xgb-v2')
- **Value**: Serialized model + metadata
- **Metadata**: Version, training date, performance metrics

---

### 6. TensorFlowModelService

**File**: `tensorflow-model-service.ts`
**Purpose**: TensorFlow.js specific model operations
**Status**: ⏳ Ready for implementation

#### TensorFlow Operations

```typescript
class TensorFlowModelService {
  // Load TensorFlow model
  async loadTFModel(modelPath: string): Promise<tf.LayersModel>

  // Train TensorFlow model
  async trainModel(
    trainingData: TrainingData,
    config: ModelConfig
  ): Promise<tf.LayersModel>

  // Make prediction with TF model
  async predict(
    model: tf.LayersModel,
    features: number[][]
  ): Promise<number[]>

  // Save TF model
  async saveModel(
    model: tf.LayersModel,
    savePath: string
  ): Promise<void>
}
```

---

## Service Integration Map

```
┌─────────────────────────────────────┐
│  IntegratedPredictionService        │  ← Main Entry Point
│  (Orchestrates everything)          │
└────────────┬────────────────────────┘
             │
             ├─→ FeatureCalculationService
             │   (Calculate raw features)
             │
             ├─→ EnhancedMLService
             │   ├─→ ML Models (RF, XGB, LSTM)
             │   ├─→ ModelDriftDetector
             │   └─→ PredictionQualityMonitor
             │
             ├─→ AdvancedPredictionService
             │   (Multi-timeframe, correlation)
             │
             └─→ MLModelService
                 └─→ TensorFlowModelService
```

---

## Data Flow Example

### Complete Prediction Flow

```typescript
// 1. User requests prediction
const result = await integratedPredictionService.generatePrediction(
  stock,
  ohlcvData,
  indexData
);

// Behind the scenes:

// 2. Calculate features
const features = featureCalculationService.calculateFeatures(ohlcvData);
// → TechnicalFeatures, VolumeFeatures, VolatilityFeatures, etc.

// 3. Get enhanced prediction
const prediction = await enhancedMLService.predictEnhanced(
  features,
  stock,
  ohlcvData
);
// → Calls ML models (RF, XGB, LSTM)
// → Calculates ensemble weighted average
// → Adds confidence, expected value, Kelly fraction
// → Checks drift risk

// 4. Quality check
const shouldTrade = enhancedMLService.shouldTakeSignal(prediction);
// → Checks confidence >= 60%
// → Checks expected value > 1.0
// → Checks drift risk != HIGH

// 5. Generate signal
const signal = generateSignal(
  stock,
  ohlcvData,
  prediction,
  shouldTrade,
  indexData
);
// → Determines BUY/SELL/HOLD
// → Calculates target and stop loss (Kelly-adjusted)
// → Generates human-readable reason

// 6. Return complete result
return {
  signal,                 // Trading signal
  enhancedMetrics,        // EV, Kelly, drift risk, etc.
  modelStats,             // RF/XGB/LSTM performance
};
```

---

## Performance Characteristics

### Service Layer Performance

| Service | Initialization | Execution | Memory |
|---------|---------------|-----------|--------|
| IntegratedPredictionService | <10ms | 50-200ms | 5-10MB |
| EnhancedMLService | <10ms | 30-100ms | 3-5MB |
| FeatureCalculationService | <5ms | 20-50ms | 2-3MB |
| AdvancedPredictionService | <5ms | 10-30ms | 1-2MB |
| MLModelService | 100-500ms | 10-50ms | 1-5MB |

### Bottlenecks

- **Feature Calculation**: O(n) where n = data points
- **ML Prediction**: O(m) where m = number of features
- **Ensemble Combining**: O(k) where k = number of models

---

## Error Handling

### Service-Level Error Handling

```typescript
try {
  const result = await integratedPredictionService.generatePrediction(
    stock,
    data,
    indexData
  );
} catch (error) {
  if (error instanceof InsufficientDataError) {
    // Handle insufficient data
  } else if (error instanceof ModelNotAvailableError) {
    // Fall back to technical analysis
  } else if (error instanceof DriftDetectedError) {
    // Use with caution or skip
  }
}
```

### Error Types

1. **InsufficientDataError**: Not enough historical data
2. **ModelNotAvailableError**: ML models not loaded
3. **DriftDetectedError**: Model drift detected
4. **FeatureCalculationError**: Feature computation failed
5. **PredictionError**: Prediction generation failed

---

## Configuration

### Service Configuration

```typescript
// app/lib/constants/prediction.ts
export const PREDICTION_CONFIG = {
  MIN_DATA_POINTS: 200,
  MIN_CONFIDENCE: 60,
  MIN_EXPECTED_VALUE: 1.0,
  MIN_PREDICTION_MAGNITUDE: 1.0,
  ENABLE_DRIFT_DETECTION: true,
  ENABLE_QUALITY_MONITORING: true,
} as const;

export const KELLY_CONFIG = {
  MAX_KELLY_FRACTION: 0.25,  // Max 25% of capital
  FRACTIONAL_KELLY: 0.5,     // Use half Kelly for safety
  MIN_WIN_RATE: 0.55,        // Minimum win rate for Kelly
} as const;

export const RISK_MANAGEMENT = {
  DEFAULT_ATR_MULTIPLIER: 2.0,
  STOP_LOSS_RATIO: 0.5,
  MAX_POSITION_SIZE: 0.10,   // Max 10% per position
} as const;
```

---

## Testing

### Service Tests

```typescript
describe('IntegratedPredictionService', () => {
  it('should generate prediction with valid data', async () => {
    const result = await service.generatePrediction(stock, data);
    expect(result.signal.type).toMatch(/BUY|SELL|HOLD/);
    expect(result.enhancedMetrics.confidence).toBeGreaterThan(0);
  });

  it('should apply Kelly Criterion sizing', async () => {
    const result = await service.generatePrediction(stock, data);
    expect(result.enhancedMetrics.kellyFraction).toBeLessThanOrEqual(0.25);
  });

  it('should reject low-quality predictions', async () => {
    const lowQualityPrediction = { confidence: 30, expectedValue: 0.5 };
    const shouldTrade = enhancedMLService.shouldTakeSignal(lowQualityPrediction);
    expect(shouldTrade).toBe(false);
  });
});
```

---

## Export Structure

```typescript
// index.ts
export { AdvancedPredictionService } from './advanced-prediction-service';
export { MLModelService } from './ml-model-service';
export { FeatureCalculationService } from './feature-calculation-service';
export { EnhancedMLService } from './enhanced-ml-service';
export { IntegratedPredictionService } from './integrated-prediction-service';

// Singleton instances
export const integratedPredictionService = new IntegratedPredictionService();
export const enhancedMLService = new EnhancedMLService();
export const featureCalculationService = new FeatureCalculationService();
```

---

## Future Enhancements

### Planned Improvements

1. **Multi-Asset Prediction**
   - Portfolio-level predictions
   - Cross-asset correlation analysis

2. **Real-Time Updates**
   - Streaming feature calculation
   - Incremental model updates

3. **Advanced Risk Management**
   - VaR (Value at Risk) integration
   - CVaR (Conditional VaR) calculations
   - Portfolio optimization

4. **Explainability**
   - SHAP values for feature importance
   - LIME for local interpretability
   - Counterfactual explanations

5. **Performance Optimization**
   - Feature caching
   - Parallel model execution
   - WebAssembly for compute-intensive operations

---

## References

- [ML Models CODEMAP](./prediction-ml-models.md)
- [ML Training Guide](../ML_TRAINING_GUIDE.md)
- [Architecture Documentation](../../README.md)
- [Documentation Update Report](../../documentation-update-report.md)

---

**Last Reviewed**: 2025-01-28
**Reviewer**: Documentation Team
**Status**: Current - Reflects PR #606 context (services unchanged)
