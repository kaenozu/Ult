# Advanced Technical Analysis System - Usage Guide

## Overview

The Advanced Technical Analysis System provides sophisticated market analysis capabilities including:

1. **Pattern Recognition** - Candlestick patterns, chart patterns, and geometric patterns
2. **Cycle Analysis** - FFT-based cycle detection and seasonality analysis
3. **Fractal Analysis** - Hurst exponent, fractal dimension, and self-similarity analysis
4. **Wavelet Analysis** - Discrete wavelet transform and signal denoising
5. **Integrated Analysis** - Combines all engines for comprehensive market insights

## Installation

The system is already integrated into the trading platform. No additional installation is required.

## Quick Start

### Basic Usage

```typescript
import { integratedTechnicalAnalyzer } from '@/app/lib/technicalAnalysis';
import { OHLCV } from '@/app/types/shared';

// Your market data
const marketData: OHLCV[] = [
  {
    symbol: '^N225',
    date: '2024-01-01',
    open: 33000,
    high: 33500,
    low: 32800,
    close: 33200,
    volume: 1500000
  },
  // ... more data points
];

// Perform comprehensive analysis
const analysis = integratedTechnicalAnalyzer.performComprehensiveAnalysis(marketData);

console.log('Signal:', analysis.integrated.overallSignal); // STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
console.log('Confidence:', analysis.integrated.confidence); // 0.0 to 1.0
console.log('Risk Level:', analysis.integrated.riskLevel); // LOW, MEDIUM, HIGH
console.log('Recommendations:', analysis.recommendations);
```

## Individual Engine Usage

### 1. Pattern Recognition

Detect candlestick patterns, chart patterns, and geometric patterns.

```typescript
import { PatternRecognizer, createDefaultPatternConfig } from '@/app/lib/technicalAnalysis';

const recognizer = new PatternRecognizer(createDefaultPatternConfig());

// Detect candlestick patterns
const candlestickPatterns = recognizer.recognizeCandlestickPatterns(marketData);
candlestickPatterns.forEach(pattern => {
  console.log(`${pattern.name} (${pattern.type}) - Confidence: ${pattern.confidence}`);
});

// Detect chart patterns (support/resistance levels)
const chartPatterns = recognizer.recognizeChartPatterns(marketData);

// Calculate geometric patterns (Fibonacci, Pivot Points)
const geometricPatterns = recognizer.recognizeGeometricPatterns(marketData);
```

**Supported Candlestick Patterns:**
- Doji
- Hammer
- Bullish/Bearish Engulfing
- Morning/Evening Star
- Three White Soldiers
- Three Black Crows
- Piercing Pattern
- Dark Cloud Cover

### 2. Cycle Analysis

Analyze price cycles and seasonality patterns.

```typescript
import { CycleAnalyzer, createDefaultCycleConfig } from '@/app/lib/technicalAnalysis';

const cycleAnalyzer = new CycleAnalyzer(createDefaultCycleConfig());

// Detect price cycles using FFT
const cycles = cycleAnalyzer.detectPriceCycles(marketData);
console.log('Dominant cycle period:', cycles.dominantCycle.period);
console.log('Cycle strength:', cycles.cycleStrength);

// Analyze seasonality
const seasonality = cycleAnalyzer.analyzeSeasonality(marketData);
console.log('Monthly patterns:', seasonality.monthly);
console.log('Weekly patterns:', seasonality.weekly);

// Predict based on cycles
const cyclePrediction = cycleAnalyzer.predictFromCycles(marketData, 5);
cyclePrediction.predictions.forEach(pred => {
  console.log(`Step ${pred.step}: Expected change ${pred.expectedChange.toFixed(4)}`);
});

// Detect cycle turning points
const turningPoints = cycleAnalyzer.detectCycleTurningPoints(marketData);
```

### 3. Fractal Analysis

Calculate fractal characteristics and Hurst exponent.

```typescript
import { FractalAnalyzer, createDefaultFractalConfig } from '@/app/lib/technicalAnalysis';

const fractalAnalyzer = new FractalAnalyzer(createDefaultFractalConfig());

// Calculate fractal dimension
const fractalDim = fractalAnalyzer.calculateFractalDimension(marketData);
console.log('Fractal dimension:', fractalDim.fractalDimension);
console.log('Interpretation:', fractalDim.interpretation);

// Calculate Hurst exponent (persistence measure)
const hurst = fractalAnalyzer.calculateHurstExponent(marketData);
console.log('Hurst exponent:', hurst.hurstExponent);
console.log('Interpretation:', hurst.interpretation);
// H > 0.5: Persistent (trending)
// H = 0.5: Random walk
// H < 0.5: Anti-persistent (mean-reverting)

// Analyze self-similarity across scales
const selfSimilarity = fractalAnalyzer.analyzeSelfSimilarity(marketData);

// Multi-timeframe analysis
const multiTF = fractalAnalyzer.analyzeMultiTimeframe(marketData, ['1D', '1W', '1M']);

// Fractal-based prediction
const fractalPred = fractalAnalyzer.predictFromFractals(marketData, 5);
```

### 4. Wavelet Analysis

Perform wavelet transforms and signal denoising.

```typescript
import { WaveletAnalyzer, createDefaultWaveletConfig } from '@/app/lib/technicalAnalysis';

const waveletAnalyzer = new WaveletAnalyzer(createDefaultWaveletConfig());

// Discrete Wavelet Transform
const dwt = waveletAnalyzer.performDiscreteWaveletTransform(marketData, 3);
dwt.levels.forEach(level => {
  console.log(`Level ${level.level}: Energy ${level.energy}`);
});

// Denoise signal using wavelets
const denoised = waveletAnalyzer.denoiseWithWavelets(marketData);
console.log('Signal-to-Noise Ratio:', denoised.signalToNoiseRatio, 'dB');
console.log('Noise characteristics:', denoised.noiseCharacteristics);

// Wavelet-based prediction
const waveletPred = waveletAnalyzer.predictFromWavelets(marketData, 5);
```

## Advanced Usage

### Integrated Predictions

Combine predictions from all engines for robust forecasts.

```typescript
const prediction = await integratedTechnicalAnalyzer.integratePredictions(marketData, 5);

prediction.predictions.forEach(forecast => {
  console.log(`Step ${forecast.step}:`);
  console.log(`  Cycle prediction: ${forecast.cyclePrediction}`);
  console.log(`  Fractal prediction: ${forecast.fractalPrediction}`);
  console.log(`  Wavelet prediction: ${forecast.waveletPrediction}`);
  console.log(`  Ensemble prediction: ${forecast.ensemblePrediction}`);
  console.log(`  Confidence: ${forecast.confidence}`);
});
```

### Custom Configuration

Customize each engine's configuration:

```typescript
import { IntegratedTechnicalAnalyzer } from '@/app/lib/technicalAnalysis';

const customAnalyzer = new IntegratedTechnicalAnalyzer({
  pattern: {
    candlestick: {
      minBodySize: 0.05,
      wickThreshold: 0.4
    },
    chart: {
      minPatternBars: 15,
      tolerancePercent: 0.03
    },
    geometric: {
      fibonacciLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0],
      gannAngles: [45, 63.75, 71.25, 75, 82.5]
    }
  },
  cycle: {
    fft: {
      minCycleLength: 3,
      maxCycleLength: 150,
      significanceThreshold: 0.005
    },
    seasonal: {
      periodsToAnalyze: 24,
      confidenceLevel: 0.99
    }
  },
  fractal: {
    hurst: {
      minLag: 2,
      maxLag: 30
    },
    boxCounting: {
      minBoxSize: 2,
      maxBoxSize: 64
    },
    dfa: {
      minScale: 4,
      maxScale: 100,
      scaleStep: 2
    }
  },
  wavelet: {
    discrete: {
      waveletType: 'db4', // 'haar', 'db4', or 'sym4'
      decompositionLevels: 4
    },
    denoising: {
      thresholdMethod: 'soft', // 'soft' or 'hard'
      thresholdMultiplier: 1.5
    }
  }
});
```

## Interpreting Results

### Overall Signal

- **STRONG_BUY**: Multiple strong bullish indicators across all engines
- **BUY**: Moderate bullish signals, consider long positions with caution
- **HOLD**: Mixed or neutral signals, maintain current positions
- **SELL**: Moderate bearish signals, consider reducing exposure
- **STRONG_SELL**: Multiple strong bearish indicators, exit or short

### Confidence Levels

- **0.8 - 1.0**: High confidence, strong agreement across engines
- **0.6 - 0.8**: Moderate confidence, some agreement
- **0.4 - 0.6**: Low confidence, mixed signals
- **< 0.4**: Very low confidence, avoid trading

### Risk Levels

- **LOW**: Low volatility (Fractal dimension < 1.4), stable conditions
- **MEDIUM**: Moderate volatility (1.4 - 1.7), normal market conditions
- **HIGH**: High volatility (> 1.7), use tight risk management

### Time Horizons

- **SHORT**: Dominant cycles < 10 periods (intraday to swing trading)
- **MEDIUM**: Dominant cycles 10-50 periods (position trading)
- **LONG**: Dominant cycles > 50 periods (long-term investing)

## Best Practices

### Data Requirements

- **Minimum**: 50 data points for basic analysis
- **Recommended**: 100-200 data points for reliable results
- **Optimal**: 500+ data points for advanced fractal and cycle analysis

### Combining with Other Indicators

```typescript
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';

// Combine with traditional indicators
const rsi = technicalIndicatorService.calculateRSI(prices, 14);
const macd = technicalIndicatorService.calculateMACD(prices);
const analysis = integratedTechnicalAnalyzer.performComprehensiveAnalysis(marketData);

// Make decision based on multiple factors
if (analysis.integrated.overallSignal === 'STRONG_BUY' && 
    rsi[rsi.length - 1] < 30 && 
    macd.histogram[macd.histogram.length - 1] > 0) {
  console.log('Strong buy signal confirmed by multiple indicators');
}
```

### Real-Time Updates

```typescript
// Update analysis as new data arrives
function updateAnalysis(newCandle: OHLCV) {
  marketData.push(newCandle);
  
  // Keep last N candles to maintain performance
  if (marketData.length > 500) {
    marketData.shift();
  }
  
  const analysis = integratedTechnicalAnalyzer.performComprehensiveAnalysis(marketData);
  return analysis;
}
```

## Performance Considerations

The analysis system is designed to be performant:

- **Pattern Recognition**: O(n) - Linear time complexity
- **Cycle Analysis (FFT)**: O(n log n) - Efficient frequency domain analysis
- **Fractal Analysis**: O(n) to O(n²) depending on parameters
- **Wavelet Analysis**: O(n log n) - Fast wavelet transform

**Typical Performance:**
- 100 data points: < 100ms
- 500 data points: < 500ms
- 1000 data points: < 1 second

## Troubleshooting

### Issue: Low confidence scores

**Solution:** Increase data length or check for data quality issues.

```typescript
if (analysis.integrated.confidence < 0.5) {
  console.log('Warning: Low confidence. Consider:');
  console.log('1. Adding more historical data');
  console.log('2. Checking data quality');
  console.log('3. Verifying symbol/market conditions');
}
```

### Issue: Inconsistent predictions

**Solution:** Check for sufficient data and verify market conditions.

```typescript
const prediction = await integratedTechnicalAnalyzer.integratePredictions(marketData, 5);

// Check prediction consistency
const predVariance = prediction.predictions.reduce((sum, p, i) => {
  if (i === 0) return 0;
  const diff = p.ensemblePrediction - prediction.predictions[i-1].ensemblePrediction;
  return sum + diff * diff;
}, 0);

if (predVariance > 0.01) {
  console.log('Warning: High prediction variance, market may be unstable');
}
```

## API Reference

For detailed API documentation, see:
- [Type Definitions](./types.ts)
- [Mathematical Utilities](./mathUtils.ts)
- [Test Examples](../__tests__/technicalAnalysis.test.ts)

## Examples

See the test file for comprehensive examples of all functionality:
`trading-platform/app/lib/__tests__/technicalAnalysis.test.ts`

## Support

For issues or questions:
1. Check the test files for usage examples
2. Review the inline documentation in source files
3. Open an issue in the repository

## License

Part of the ULT Trading Platform. See main repository for license information.
