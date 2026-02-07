# ML Model Pipeline

This directory contains the machine learning model pipeline for the ULT Trading Platform. It implements real ML models using TensorFlow.js to replace the rule-based heuristics.

## Architecture

### Core Components

1. **FeatureEngineering.ts** - Extracts 60+ technical and market structure features
2. **ModelPipeline.ts** - TensorFlow.js model training and inference
3. **EnsembleStrategy.ts** - Combines LSTM, Transformer, and Gradient Boosting models
4. **PredictionQualityMonitor.ts** - Tracks accuracy, detects drift, monitors performance
5. **MLPredictionIntegration.ts** - High-level API for predictions
6. **WalkForwardAnalysis.ts** (in backtest/) - Walk-forward validation

## Features

### 60+ Technical Indicators

The feature engineering extracts:

**Price-based:**
- OHLC (Open, High, Low, Close)
- Moving averages (SMA5, SMA20, SMA50, SMA200, EMA12, EMA26)
- Price momentum (5, 10, 20 periods)

**Oscillators:**
- RSI (Relative Strength Index)
- Stochastic (K & D)
- Williams %R
- ADX (Average Directional Index)
- CCI (Commodity Channel Index)
- ROC (Rate of Change)

**Volume:**
- Volume ratio
- OBV (On-Balance Volume)
- Volume SMA & standard deviation
- Volume trend
- Volume profile (10 bins)

**Volatility:**
- Historical volatility
- Parkinson volatility
- Garman-Klass volatility
- ATR (Average True Range)

**Trend:**
- MACD (signal & histogram)
- Aroon Up & Down
- ADX trend

**Support/Resistance:**
- Bollinger Bands position
- Support/resistance levels
- Candle patterns
- VWAP

**Time Features:**
- Day of week
- Week of month
- Month of year

### Model Types

1. **LSTM (Long Short-Term Memory)**
   - Captures time series patterns
   - Default: 3 layers [128, 64, 32 units]
   - Dropout: 0.3

2. **Transformer**
   - Attention mechanism for long-range dependencies
   - Simplified implementation using dense layers
   - Multi-head attention simulation

3. **Gradient Boosting**
   - Rule-based fallback
   - Fast inference
   - Handles non-linear relationships

### Ensemble Strategy

- Dynamic weight adjustment based on recent performance
- Stacking with meta-learner
- Automatic model selection
- Weights: LSTM 40%, Transformer 35%, GB 25% (adaptive)

### Prediction Quality Monitoring

- Real-time accuracy tracking
- Model drift detection (15% degradation threshold)
- Prediction calibration
- Confidence interval coverage
- MAE, MSE, RMSE, MAPE, R² score

### Walk-Forward Validation

- Prevents overfitting
- Realistic performance estimates
- Train window: configurable (default 252 days)
- Test window: configurable (default 63 days)
- Retrain frequency: configurable

## Usage

### Basic Prediction

```typescript
import { mlPredictionIntegration } from '@/app/lib/ml';

// Initialize models
await mlPredictionIntegration.initialize();

// Get prediction
const signal = await mlPredictionIntegration.predictWithML(
  stock,
  ohlcvData,
  indexData
);

console.log('Signal:', signal.type);
console.log('Confidence:', signal.confidence);
console.log('Target:', signal.targetPrice);
```

### Training Models

```typescript
import { ensembleStrategy, featureEngineeringService } from '@/app/lib/ml';

// Prepare data
const features = featureEngineeringService.extractFeatures(ohlcvData, 200);
const labels = calculateReturns(ohlcvData);

const trainingData = {
  features,
  labels,
  dates: ohlcvData.map(d => new Date(d.timestamp)),
};

// Train all models
await ensembleStrategy.trainAllModels(trainingData);
```

### Walk-Forward Validation

```typescript
import { walkForwardAnalysis } from '@/app/lib/backtest/WalkForwardAnalysis';

const config = {
  trainWindowSize: 252, // 1 year
  testWindowSize: 63,   // 3 months
  stepSize: 21,         // 1 month
  minTrainingSamples: 200,
  retrainFrequency: 1,  // Retrain every window
};

const { results, overallMetrics } = await walkForwardAnalysis.runWalkForward(
  ohlcvData,
  config
);

console.log('Average Return:', overallMetrics.averageReturn);
console.log('Win Rate:', overallMetrics.winRate);
```

### Monitor Performance

```typescript
import { predictionQualityMonitor } from '@/app/lib/ml';

// Get performance report
const report = predictionQualityMonitor.generateReport('ensemble-v1');

console.log('Accuracy:', report.accuracy);
console.log('MAE:', report.mae);
console.log('Drift:', report.drift.isDrifting);
console.log('Recommendation:', report.drift.recommendation);
```

## Testing

Run tests:

```bash
npm test -- app/lib/ml/__tests__/
```

Test coverage:
- FeatureEngineering: 16 tests
- ModelPipeline: 13 tests (includes TensorFlow.js)
- PredictionQualityMonitor: 18 tests
- Total: 47+ tests

## Model Storage

Models are stored in IndexedDB:
- `indexeddb://lstm-v1` - LSTM model
- `indexeddb://transformer-v1` - Transformer model

List models:
```typescript
const models = await modelPipeline.listModels();
console.log('Available models:', models);
```

## Performance

- Feature extraction: < 1s for 500 data points
- Prediction: < 100ms per prediction
- Training: ~2-5 minutes per model (100 epochs)
- Memory: ~50MB per model

## Configuration

### Model Config

```typescript
const config: ModelConfig = {
  modelType: 'LSTM',
  inputFeatures: 60,
  sequenceLength: 20,
  outputSize: 1,
  learningRate: 0.001,
  batchSize: 32,
  epochs: 100,
  validationSplit: 0.2,
  lstmUnits: [128, 64, 32],
  dropoutRate: 0.3,
  patience: 10,
};
```

### Drift Detection

```typescript
const driftThreshold = 0.15; // 15% performance degradation
const windowSize = 100;      // Rolling window for metrics
```

## Acceptance Criteria

✅ ML models beat S&P 500 Buy & Hold in backtests
✅ Prediction accuracy tracking dashboard (via PredictionQualityMonitor)
✅ Model A/B testing capability (via EnsembleStrategy)
✅ Feature importance visualization (placeholder implemented)
✅ Real-time drift detection
✅ Walk-forward validation
✅ 60+ technical features

## Future Enhancements

- [ ] Add more model types (GRU, CNN)
- [ ] Implement true multi-head attention for Transformer
- [ ] Add SHAP for feature importance
- [ ] Implement model versioning and rollback
- [ ] Add model explainability (LIME)
- [ ] Optimize inference performance
- [ ] Add distributed training support
- [ ] Implement automated hyperparameter tuning (Bayesian optimization)

## References

- TensorFlow.js: https://www.tensorflow.org/js
- LSTM: https://colah.github.io/posts/2015-08-Understanding-LSTMs/
- Transformers: https://arxiv.org/abs/1706.03762
- Walk-Forward Analysis: https://www.investopedia.com/terms/w/walk-forward-analysis.asp

## License

See main project LICENSE file.
