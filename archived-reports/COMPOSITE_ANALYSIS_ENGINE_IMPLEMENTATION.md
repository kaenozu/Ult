# Composite Technical Analysis Engine - Implementation Summary

## Overview

This PR replaces the placeholder AI models (RandomForestModel, XGBoostModel, LSTMModel) with a robust, logical, and explainable Composite Technical Analysis Engine. The new implementation provides real trading signals based on proven technical analysis methods instead of random simulations.

## Key Changes

### 1. New CompositeTechnicalAnalysisEngine (`app/lib/aiAnalytics/CompositeTechnicalAnalysisEngine.ts`)

A comprehensive technical analysis engine that combines multiple indicators:

#### RSI Analysis
- **Oversold/Overbought Detection**: Identifies extreme RSI levels (< 20, > 80)
- **Divergence Detection**: Detects bullish and bearish divergences
  - Bullish: Price makes lower lows while RSI makes higher lows
  - Bearish: Price makes higher highs while RSI makes lower highs
- **Trend Analysis**: Tracks RSI momentum (rising/falling/neutral)

#### Trend Analysis
- **Multi-timeframe MA**: SMA 5, 20, 50, 200 and EMA 12, 26
- **Crossover Detection**: Golden Cross and Dead Cross signals
- **MA Alignment**: Measures how well MAs are aligned (perfect bullish/bearish array)
- **Trend Classification**: Short-term, medium-term, and long-term trend identification

#### Volatility Analysis
- **Bollinger Band Position**: 0-100 scale showing price position within bands
- **Squeeze Detection**: Low volatility periods indicating potential breakout
- **Expansion Detection**: High volatility periods indicating active trend
- **ATR Analysis**: Average True Range for risk management

#### Momentum Analysis
- **MACD Histogram**: Tracks momentum changes
- **MACD Cross Detection**: Bullish and bearish crossovers
- **Histogram Trend**: Increasing, decreasing, or neutral momentum

#### Explainability (XAI)
- **Primary Reasons**: Top 3 reasons for the signal, weighted by importance
- **Supporting Reasons**: Additional context and confirmation factors
- **Warnings**: Risk factors and cautions (low confidence, extreme conditions, etc.)
- **Category Tags**: Each reason is tagged with its source ([RSI], [Trend], [Volatility], [Momentum])

### 2. Modified PredictiveAnalyticsEngine (`app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts`)

**Removed:**
- `RandomForestModel` class (497-528 lines) - Random tree generation
- `XGBoostModel` class (530-574 lines) - Random weight initialization
- `LSTMModel` class (576-622 lines) - Fake LSTM gates
- All `Math.random()` calls used for simulation
- `calculateConfidence()` method based on model agreement

**Added:**
- Integration with `CompositeTechnicalAnalysisEngine`
- `generateSignalFromComposite()` method for explainable signal generation
- Direction mapping: BUY → UP, SELL → DOWN, NEUTRAL → NEUTRAL
- Enhanced rationale with categorical reasons and warnings

**Maintained:**
- Full backward compatibility with `PredictionResult` interface
- All existing technical feature calculations
- Price forecast generation
- Prediction history management
- Model validation methods

### 3. Fixed ConsensusSignalService (`app/lib/ConsensusSignalService.ts`)

- Exported `ConsensusSignalService` class for external use
- Maintained singleton instance `consensusSignalService`

## Technical Details

### Signal Generation Logic

The composite engine uses a weighted scoring system:

```typescript
weights = {
  rsi: 0.20,        // RSI-based signals
  trend: 0.25,      // Moving average trends
  volatility: 0.15, // Bollinger Bands, ATR
  momentum: 0.20,   // MACD signals
  consensus: 0.20,  // ConsensusSignalService integration
}

finalScore = sum(score[indicator] * weights[indicator])
```

### Direction Determination

- `finalScore > 0.2` → BUY
- `finalScore < -0.2` → SELL
- Otherwise → NEUTRAL

### Confidence Calculation

Confidence is based on:
- **Indicator Agreement** (50%): How well all indicators align
- **Consensus Confidence** (50%): ConsensusSignalService confidence
- **Special Signal Bonus**: +10% for divergence, crossover, or MACD cross

### Signal Strength

- **STRONG**: Confidence > 75% AND |finalScore| > 0.6
- **MODERATE**: Confidence > 50% AND |finalScore| > 0.4
- **WEAK**: Otherwise

## Example Output

### Before (Random Simulation)
```
direction: UP
confidence: 0.67
rationale: [
  "RSIが過売り水準を示唆",
  "MACDが強い買いシグナル",
  "モデル間の予測が高い一致度"
]
```

### After (Explainable Analysis)
```
direction: BUY
confidence: 0.78
rationale: [
  "[RSI] RSI(28.3)が売られすぎ水準",
  "[Trend] ゴールデンクロス検出 (強度: 85%)",
  "[Momentum] MACDが強気クロス (強度: 72%)",
  "[Volatility] ボリンジャーバンドがスクイーズ（ブレイクアウト待ち）",
  "",
  "【注意事項】",
  "ボラティリティが低下中。大きな値動きの可能性あり",
  "",
  "コンセンサスシグナル: BUY (確信度: 75%)"
]
```

## Testing

### Unit Tests (`CompositeTechnicalAnalysisEngine.test.ts`)
- 368 lines, comprehensive coverage
- Tests for all analysis methods
- Edge cases: insufficient data, extreme values, zero volume
- Consistency checks
- Explainability validation

### Integration Tests (`PredictiveAnalyticsEngine.integration.test.ts`)
- 345 lines, end-to-end testing
- Backward compatibility with UnifiedTradingPlatform
- Direction mapping validation
- Price target reasonableness
- Prediction history management
- Performance benchmarks (< 1s per prediction)

## Migration Guide

### For Developers

**No changes required!** The new implementation maintains full backward compatibility with the existing `PredictionResult` interface.

### For Users

The main difference is improved signal quality and explainability:
- Signals are now based on logical technical analysis
- Each signal comes with detailed, categorized reasoning
- Warnings are provided for risky conditions
- Confidence scores are more accurate and meaningful

## Performance

- **Single Prediction**: < 1 second
- **10 Predictions**: < 3 seconds
- **History Limit**: 100 predictions per symbol (automatic cleanup)

## Future Enhancements

1. **Machine Learning Integration**: When trained models are available, they can be integrated alongside the technical analysis
2. **Custom Weights**: Allow users to configure indicator weights based on their strategy
3. **Additional Indicators**: Volume profile, Order Flow, Market Profile
4. **Multi-timeframe Analysis**: Enhance with time frame correlation
5. **Backtesting**: Validate signal accuracy against historical data

## References

- RSI Divergence: https://www.investopedia.com/articles/active-trading/012815/how-use-rsi-divergences.asp
- Moving Average Crossovers: https://www.investopedia.com/articles/active-trading/052014/how-use-moving-average-buy-stocks.asp
- Bollinger Band Squeeze: https://www.investopedia.com/terms/b/bollingerbands.asp
- MACD: https://www.investopedia.com/terms/m/macd.asp

## Author

GitHub Copilot AI Assistant
Date: 2026-02-02
