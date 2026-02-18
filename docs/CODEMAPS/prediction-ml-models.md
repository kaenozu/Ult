# CODEMAP: ML Prediction Models

**Domain**: `trading-platform/app/domains/prediction/models/ml/`
**Last Updated**: 2025-01-28 (PR #606)
**Status**: Stub Implementation (Full implementation in tasks #5-8)

---

## Overview

The ML prediction models domain provides machine learning capabilities for stock price prediction. The current implementation is a simplified stub version created in PR #606 to resolve build issues. Full ML model integration is planned for tasks #5-8.

## Directory Structure

```
trading-platform/app/domains/prediction/models/ml/
├── MLPredictionIntegration.ts          # Main integration service (STUB)
├── MLPredictionIntegration.ts.disabled # Backup of previous implementation
├── FeatureEngineering.ts               # Feature calculation + compatibility layer
├── EnsembleModel.ts                    # Ensemble strategy (ready for models)
├── ModelDriftDetector.ts               # Model drift monitoring
├── PredictionQualityMonitor.ts         # Prediction quality tracking
├── MLService.ts                        # ML service wrapper
├── ModelPipeline.ts                    # TensorFlow.js pipeline
├── index.ts                            # Module exports
└── README.md                           # Documentation
```

---

## Core Components

### 1. MLPredictionIntegration.ts (Stub)

**Purpose**: Simplified integration service providing basic prediction API
**Status**: ✅ Stub Implementation (66 lines)
**Dependencies**: None (minimal)

#### Key Methods

```typescript
class MLPredictionIntegration {
  // Initialize service (simplified, no model loading)
  async initialize(): Promise<void>

  // Generate prediction signal (stub - random values)
  async predict(stock: Stock, ohlcvData: OHLCV[]): Promise<Signal>

  // Update actual values (stub)
  updatePredictionActual(predictionId: string, actualValue: number): void
}
```

#### Implementation Notes

- **Initialization**: Sets `isModelLoaded = true` without loading models
- **Prediction Logic**: Returns random predictions (-2.5% to +2.5% change)
- **Confidence**: Random values between 50-80%
- **Signal Generation**: Basic BUY/SELL/HOLD based on predicted change threshold (±1.5%)

#### API Changes from Previous Version

| Before | After | Impact |
|--------|-------|--------|
| `predictWithML(stock, data, indexData)` | `predict(stock, data)` | Breaking change |
| Complex initialization | Simple flag setting | Simplified |
| Performance tracking | Stub method | Deferred to tasks #5-8 |

---

### 2. FeatureEngineering.ts

**Purpose**: Calculate technical features and provide compatibility layer
**Status**: ✅ Active with new compatibility methods
**Dependencies**: `@/app/lib/utils`, `@/app/constants`

#### Feature Categories

1. **Technical Features** (35+ indicators)
   - Price: RSI, SMA, EMA, MACD, Bollinger Bands
   - Momentum: ROC, Momentum indicators
   - Oscillators: Stochastic, Williams %R, CCI
   - Volume: Volume ratios, trends
   - Volatility: ATR, price velocity/acceleration

2. **Time Series Features**
   - Lag features (1, 5, 10, 20 periods)
   - Moving averages (5, 10, 20, 50 periods)
   - Seasonality (day-of-week, month effects)
   - Trend strength and direction
   - Cyclicality detection

3. **Macro Economic Features** (Optional)
   - Interest rates
   - GDP growth
   - CPI and inflation
   - Currency rates (USDJPY for Japanese market)

4. **Sentiment Features** (Optional)
   - News sentiment
   - Social media sentiment
   - Analyst ratings

#### Key Methods

```typescript
class FeatureEngineering {
  // Main feature calculation (60+ features)
  calculateAllFeatures(
    data: OHLCV[],
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): AllFeatures

  // Calculate technical indicators
  calculateTechnicalFeatures(data: OHLCV[]): TechnicalFeatures

  // Calculate time series features
  calculateTimeSeriesFeatures(data: OHLCV[]): TimeSeriesFeatures

  // === COMPATIBILITY LAYER (Added in PR #606) ===

  // @deprecated Use calculateAllFeatures instead
  extractFeatures(data: OHLCV[], windowSize: number): AllFeatures

  // @deprecated Features already normalized in calculateAllFeatures
  normalizeFeatures(features: AllFeatures): { normalized: AllFeatures; stats: any }
}
```

#### New Compatibility Methods (PR #606)

Added to maintain backward compatibility with previous API:

```typescript
/**
 * Legacy compatibility: Maps to calculateAllFeatures()
 */
extractFeatures(data: OHLCV[], windowSize: number): AllFeatures {
  return this.calculateAllFeatures(data);
}

/**
 * Legacy compatibility: Returns features as-is with empty stats
 */
normalizeFeatures(features: AllFeatures): { normalized: AllFeatures; stats: any } {
  return {
    normalized: features,
    stats: { means: {}, stds: {} }
  };
}
```

#### Data Quality Assessment

```typescript
private assessDataQuality(data: OHLCV[]): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
```

- **EXCELLENT**: 252+ days, no missing data
- **GOOD**: 100+ days, <5% missing
- **FAIR**: 50+ days, <20% missing
- **POOR**: Below fair thresholds

---

### 3. EnsembleModel.ts

**Purpose**: Combine multiple ML models (RF, XGBoost, LSTM)
**Status**: ⏳ Ready for trained models
**Dependencies**: TensorFlow.js (when models available)

#### Ensemble Strategy

```typescript
interface EnsemblePrediction {
  ensembleResult: {
    prediction: number;           // Weighted average prediction
    confidence: number;            // 0-100 confidence score
    weights: ModelWeights;         // Individual model weights
    modelPredictions: ModelPrediction[];
    marketRegime: MarketRegime;    // TRENDING/RANGING
    reasoning: string;             // Human-readable explanation
    timestamp: string;
  };
}
```

#### Model Types

1. **Random Forest (RF)**: Tree-based ensemble
2. **XGBoost (XGB)**: Gradient boosting
3. **LSTM**: Long Short-Term Memory neural network

#### Weight Calculation

Dynamic weights based on recent performance:
- Default: RF=25%, XGB=35%, LSTM=25%, Technical=15%
- Adjusted based on hit rates and market regime

---

### 4. ModelDriftDetector.ts

**Purpose**: Detect model performance degradation
**Status**: ✅ Active (will be fully utilized in tasks #5-8)

#### Drift Detection Methods

```typescript
class ModelDriftDetector {
  // Record prediction for tracking
  recordPrediction(prediction: PredictionRecord): void

  // Update with actual outcome
  updateActual(predictionId: string, actualValue: number): void

  // Check for drift
  detectDrift(modelId: string): DriftDetectionResult

  // Get performance metrics
  getMetrics(modelId: string): ModelMetrics
}
```

#### Drift Indicators

- **Accuracy Degradation**: >15% drop from baseline
- **Distribution Shift**: PSI (Population Stability Index) > 0.2
- **Error Increase**: MAE/RMSE trends upward
- **Confidence Calibration**: Predicted vs actual confidence mismatch

---

### 5. PredictionQualityMonitor.ts

**Purpose**: Track and report prediction quality
**Status**: ✅ Active

#### Quality Metrics

```typescript
interface QualityMetrics {
  accuracy: number;          // % of correct directional predictions
  mae: number;               // Mean Absolute Error
  rmse: number;              // Root Mean Square Error
  mape: number;              // Mean Absolute Percentage Error
  r2Score: number;           // R² coefficient
  confidenceCalibration: number;  // Confidence vs accuracy alignment
}
```

#### Monitoring Methods

```typescript
class PredictionQualityMonitor {
  // Record new prediction
  recordPrediction(
    symbol: string,
    prediction: PredictionData,
    modelId: string
  ): string

  // Update with actual result
  updateActual(predictionId: string, actualValue: number): void

  // Generate quality report
  generateReport(modelId: string): QualityReport

  // Get recent performance
  getRecentPerformance(modelId: string, windowDays: number): PerformanceStats
}
```

---

### 6. MLService.ts

**Purpose**: High-level ML service wrapper
**Status**: ✅ Active

#### Service Methods

```typescript
class MLService {
  // Get ML prediction
  async predict(features: AllFeatures): Promise<MLPredictionResult>

  // Check if retraining needed
  shouldRetrain(): RetrainingRecommendation

  // Trigger model retraining
  async retrain(trainingData: TrainingData): Promise<void>
}
```

---

### 7. ModelPipeline.ts

**Purpose**: TensorFlow.js model training and inference
**Status**: ⏳ Ready for implementation

#### Pipeline Components

1. **Data Preparation**: Sequence generation, normalization
2. **Model Training**: LSTM, Transformer architectures
3. **Model Persistence**: IndexedDB storage
4. **Inference**: Batch and real-time prediction

---

## Data Flow

### Current Flow (Stub Implementation)

```
User Request
    ↓
MLPredictionIntegration.predict()
    ↓
Generate Random Prediction
    ↓
Convert to Signal
    ↓
Return to Caller
```

### Future Flow (Tasks #5-8)

```
User Request
    ↓
MLPredictionIntegration.predict()
    ↓
FeatureEngineering.calculateAllFeatures()
    ↓
EnsembleModel.predictEnsemble()
    ├─→ LSTM.predict()
    ├─→ Transformer.predict()
    └─→ GradientBoosting.predict()
    ↓
Weighted Ensemble Result
    ↓
PredictionQualityMonitor.recordPrediction()
    ↓
Convert to Signal
    ↓
Return to Caller
```

---

## Integration Points

### Service Layer

The ML models integrate with the service layer through:

1. **IntegratedPredictionService**: Orchestrates predictions
2. **EnhancedMLService**: Wraps ML functionality
3. **FeatureCalculationService**: Prepares features

### External Dependencies

```typescript
// Type imports
import { OHLCV, Stock, Signal } from '@/app/types';

// Utility functions
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR
} from '@/app/lib/utils';

// Constants
import {
  RSI_CONFIG,
  SMA_CONFIG,
  MACD_CONFIG,
  BOLLINGER_BANDS
} from '@/app/constants/technical';
```

---

## Export Structure

```typescript
// index.ts exports
export {
  // Feature Engineering
  featureEngineering,
  FeatureEngineering,
  featureEngineering as featureEngineeringService, // Alias
} from './FeatureEngineering';

export type {
  TechnicalFeatures,
  MacroEconomicFeatures,
  SentimentFeatures,
  TimeSeriesFeatures,
  AllFeatures,
} from './FeatureEngineering';

export {
  // Ensemble Model
  ensembleModel,
  EnsembleModel,
  EnsembleModel as ensembleStrategy, // Alias
} from './EnsembleModel';

export {
  // Quality Monitoring
  predictionQualityMonitor,
  PredictionQualityMonitor,
} from './PredictionQualityMonitor';

export {
  // ML Service
  mlService,
  MLService,
} from './MLService';

// ... other exports
```

---

## Testing

### Test Coverage

- **FeatureEngineering**: 16+ tests
- **ModelPipeline**: 13+ tests
- **PredictionQualityMonitor**: 18+ tests
- **Total**: 47+ tests

### Testing the Stub

```typescript
import { mlPredictionIntegration } from '@/app/domains/prediction/models/ml';

describe('MLPredictionIntegration (Stub)', () => {
  it('should initialize successfully', async () => {
    await mlPredictionIntegration.initialize();
    expect(mlPredictionIntegration['isModelLoaded']).toBe(true);
  });

  it('should generate stub predictions', async () => {
    const signal = await mlPredictionIntegration.predict(mockStock, mockData);
    expect(signal.type).toMatch(/BUY|SELL|HOLD/);
    expect(signal.confidence).toBeGreaterThanOrEqual(50);
    expect(signal.confidence).toBeLessThanOrEqual(80);
  });
});
```

---

## Future Enhancements (Tasks #5-8)

### Task #5: Feature Engineering Integration
- [ ] Integrate macro economic data sources
- [ ] Add real-time sentiment data
- [ ] Implement feature quality validation
- [ ] Add feature importance tracking

### Task #6: Ensemble Model Integration
- [ ] Load trained LSTM model
- [ ] Load trained Transformer model
- [ ] Load trained Gradient Boosting model
- [ ] Implement dynamic weight adjustment
- [ ] Add model performance tracking

### Task #7: Quality Monitoring
- [ ] Activate real-time drift detection
- [ ] Implement automated alerts
- [ ] Add performance degradation handling
- [ ] Create monitoring dashboard

### Task #8: Production Deployment
- [ ] Train production models
- [ ] Implement model versioning
- [ ] Add A/B testing framework
- [ ] Set up automated retraining pipeline

---

## Configuration

### Model Configuration

Located in `app/lib/constants/prediction.ts`:

```typescript
export const ML_MODEL_CONFIG = {
  MODELS_TRAINED: false,        // Set to true when models ready
  REQUIRE_MODELS: false,         // Enforce model availability
  MIN_DIRECTIONAL_ACCURACY: 0.55,
  MIN_PROFIT_FACTOR: 1.5,
  MAX_DRAWDOWN: 0.20,
  DRIFT_THRESHOLD: 0.15,
  RETRAIN_FREQUENCY_DAYS: 30,
} as const;
```

---

## Performance Characteristics

### Current (Stub)

- **Initialization**: <10ms
- **Prediction**: <5ms
- **Memory**: <1MB

### Expected (Full Implementation)

- **Initialization**: 2-5s (model loading)
- **Prediction**: 50-100ms
- **Memory**: 50-100MB (models in memory)
- **Feature Extraction**: <1s for 500 data points

---

## References

- [ML Training Guide](../../../../../docs/ML_TRAINING_GUIDE.md)
- [TensorFlow ML Models Guide](../../../../../docs/TENSORFLOW_ML_MODELS_GUIDE.md)
- [Main README](./README.md)
- [Documentation Update Report](../../../../../documentation-update-report.md)

---

**Last Reviewed**: 2025-01-28
**Reviewer**: Documentation Team
**Status**: Current - Reflects PR #606 changes
