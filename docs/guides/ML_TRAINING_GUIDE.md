# ML Model Training and Integration Guide

## Current Status

### ✅ Infrastructure Complete
- **ML Integration Service**: Ready to load and serve ML models
- **Graceful Fallback**: System works with rule-based predictions when models unavailable
- **Accuracy Thresholds**: Tightened to 10% error threshold (was 40%)
- **Performance Requirements**: 60% baseline accuracy (was 55%)

### ⏳ Pending: Model Training
The ML model code exists but **models are not yet trained**. This guide explains how to train and deploy them.

---

## Phase 1: Prepare Training Data

### 1. Collect Historical Data
```bash
# Use the existing MarketDataService to collect historical data
# Minimum requirements:
# - 2+ years of daily OHLCV data
# - Multiple market conditions (bull, bear, ranging)
# - At least 500 data points per symbol
```

### 2. Data Requirements
- **Training Set**: 70% (oldest data)
- **Validation Set**: 15% (middle data)
- **Test Set**: 15% (most recent data)

Minimum data points:
- LSTM: 252 days (1 year) per symbol
- Transformer: 126 days (6 months) per symbol
- Gradient Boosting: 63 days (3 months) per symbol

---

## Phase 2: Train Models

### LSTM Model Training

```python
# backend/src/ml_training/train_lstm.py
import numpy as np
import tensorflow as tf
from tensorflow import keras

def create_lstm_model(input_shape):
    model = keras.Sequential([
        keras.layers.LSTM(128, return_sequences=True, input_shape=input_shape),
        keras.layers.Dropout(0.2),
        keras.layers.LSTM(64, return_sequences=True),
        keras.layers.Dropout(0.2),
        keras.layers.LSTM(32),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(16, activation='relu'),
        keras.layers.Dense(1)  # Price change prediction
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae', 'mse']
    )
    
    return model

def train_lstm(X_train, y_train, X_val, y_val):
    model = create_lstm_model((X_train.shape[1], X_train.shape[2]))
    
    early_stopping = keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=100,
        batch_size=32,
        callbacks=[early_stopping],
        verbose=1
    )
    
    return model, history

# Train and save
model, history = train_lstm(X_train, y_train, X_val, y_val)
model.save('trading-platform/public/models/lstm_model.h5')
print("LSTM model saved to: trading-platform/public/models/lstm_model.h5")
```

### Transformer Model Training

```python
# backend/src/ml_training/train_transformer.py
import tensorflow as tf
from tensorflow import keras

def create_transformer_model(input_shape):
    # Simplified transformer for time series
    inputs = keras.Input(shape=input_shape)
    
    # Multi-head attention
    attention = keras.layers.MultiHeadAttention(
        num_heads=4,
        key_dim=32
    )(inputs, inputs)
    
    # Add & Norm
    x = keras.layers.Add()([inputs, attention])
    x = keras.layers.LayerNormalization()(x)
    
    # Feed Forward
    ff = keras.layers.Dense(128, activation='relu')(x)
    ff = keras.layers.Dropout(0.2)(ff)
    ff = keras.layers.Dense(input_shape[-1])(ff)
    
    # Add & Norm
    x = keras.layers.Add()([x, ff])
    x = keras.layers.LayerNormalization()(x)
    
    # Global pooling and output
    x = keras.layers.GlobalAveragePooling1D()(x)
    x = keras.layers.Dense(32, activation='relu')(x)
    outputs = keras.layers.Dense(1)(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    
    return model

# Train and save as JSON
model = create_transformer_model((20, 15))  # 20 timesteps, 15 features
# ... training code ...
model.save('trading-platform/public/models/transformer_model', save_format='tf')
```

### Gradient Boosting Model

```python
# backend/src/ml_training/train_gradient_boosting.py
import xgboost as xgb
import pickle

def train_xgboost(X_train, y_train, X_val, y_val):
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='reg:squarederror'
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=10,
        verbose=True
    )
    
    return model

# Train and save
model = train_xgboost(X_train, y_train, X_val, y_val)
with open('trading-platform/public/models/gradient_boosting_model.pkl', 'wb') as f:
    pickle.dump(model, f)
```

---

## Phase 3: Validate Model Performance

### Minimum Performance Requirements (from ML_MODEL_CONFIG)

```typescript
MIN_DIRECTIONAL_ACCURACY: 0.55  // 55% minimum direction prediction
MIN_PROFIT_FACTOR: 1.5          // Gross profit / Gross loss
MAX_DRAWDOWN: 0.20              // Maximum 20% drawdown
```

### Validation Script

```python
# backend/src/ml_training/validate_models.py
def validate_model(model, X_test, y_test, prices_test):
    predictions = model.predict(X_test)
    
    # Calculate directional accuracy
    direction_correct = np.sign(predictions.flatten()) == np.sign(y_test)
    directional_accuracy = direction_correct.mean()
    
    # Calculate profit factor (simulated trades)
    profits = []
    for i, pred in enumerate(predictions):
        if pred > 0:  # Buy signal
            profit = y_test[i]
        elif pred < 0:  # Sell signal
            profit = -y_test[i]
        else:
            profit = 0
        profits.append(profit)
    
    gross_profit = sum(p for p in profits if p > 0)
    gross_loss = abs(sum(p for p in profits if p < 0))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
    
    # Calculate max drawdown
    equity = 100
    peak = 100
    max_dd = 0
    for profit in profits:
        equity *= (1 + profit)
        if equity > peak:
            peak = equity
        dd = (peak - equity) / peak
        max_dd = max(max_dd, dd)
    
    return {
        'directional_accuracy': directional_accuracy,
        'profit_factor': profit_factor,
        'max_drawdown': max_dd,
        'passes_requirements': (
            directional_accuracy >= 0.55 and
            profit_factor >= 1.5 and
            max_dd <= 0.20
        )
    }
```

---

## Phase 4: Deploy Models

### 1. Move Trained Models

```bash
# Place trained models in the public directory
mkdir -p trading-platform/public/models
mv lstm_model.h5 trading-platform/public/models/
mv transformer_model/ trading-platform/public/models/
mv gradient_boosting_model.pkl trading-platform/public/models/
```

### 2. Update Configuration

```typescript
// trading-platform/app/lib/constants/prediction.ts
export const ML_MODEL_CONFIG = {
  MODELS_TRAINED: true,  // ← Change this to true
  REQUIRE_MODELS: false, // ← Can be true to enforce model availability
  // ... rest remains the same
} as const;
```

### 3. Implement Model Loading

Update `MLIntegrationService.ts`:

```typescript
// In performInitialization() method
if (ML_MODEL_CONFIG.MODELS_TRAINED) {
  try {
    // Load TensorFlow.js models
    const lstmModel = await tf.loadLayersModel('/models/lstm_model.h5');
    const transformerModel = await tf.loadGraphModel('/models/transformer_model/model.json');
    
    // Store models
    this.models = {
      lstm: lstmModel,
      transformer: transformerModel,
      // GB model would need separate loading mechanism
    };
    
    this.modelStatus = {
      available: true,
      initialized: true,
      modelsLoaded: ['lstm', 'transformer', 'gb'],
      lastCheck: new Date().toISOString(),
    };
    
    console.info('[ML Integration] Models loaded successfully');
  } catch (error) {
    console.error('[ML Integration] Model loading failed:', error);
    // Fall back to rule-based
  }
}
```

---

## Phase 5: Monitor and Retrain

### Model Drift Detection

The system includes `ModelDriftDetector` which monitors:
- Prediction accuracy over time
- Distribution shifts in input data
- Performance degradation

When drift is detected:
1. Alert is logged
2. Confidence scores are reduced
3. System can automatically fall back to rule-based

### Retraining Schedule

Recommended retraining frequency:
- **Weekly**: Check for drift
- **Monthly**: Retrain if drift detected
- **Quarterly**: Full retraining with expanded data

---

## Testing Checklist

Before deploying trained models:

- [ ] Models meet minimum accuracy requirements (55%+)
- [ ] Profit factor > 1.5 on validation set
- [ ] Max drawdown < 20% in backtest
- [ ] Models load successfully in browser
- [ ] Graceful fallback works if model fails
- [ ] Performance monitoring active
- [ ] Drift detection configured

---

## Current System Behavior

**Without Trained Models** (Current State):
- ✅ System runs normally with rule-based predictions
- ✅ `MLIntegrationService` initializes but reports unavailable
- ✅ No errors or warnings for end users
- ✅ All features work as expected

**With Trained Models** (Future State):
- ✅ ML predictions used when confidence > threshold
- ✅ Rule-based fallback for low-confidence scenarios
- ✅ Performance tracking and drift detection active
- ✅ Automatic model selection based on market regime

---

## Support

For questions about ML model training:
1. Check existing ML code in `app/domains/prediction/models/ml/`
2. Review feature engineering in `FeatureEngineering.ts`
3. See ensemble logic in `EnsembleModel.ts`
4. Refer to drift detection in `ModelDriftDetector.ts`

The infrastructure is ready - just add trained models!
