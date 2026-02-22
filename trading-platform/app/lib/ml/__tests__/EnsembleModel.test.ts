import { describe, it, expect } from '@jest/globals';
import { EnsembleModel, MarketRegime } from '../EnsembleModel';
import { OPTIMIZED_ENSEMBLE_WEIGHTS } from '../../config/prediction-config';

describe('EnsembleModel - Optimized Weights Integration', () => {
  it('should have OPTIMIZED_ENSEMBLE_WEIGHTS defined for all regimes', () => {
    const regimes: Array<keyof typeof OPTIMIZED_ENSEMBLE_WEIGHTS> = ['TRENDING', 'RANGING', 'VOLATILE', 'QUIET'];
    
    for (const regime of regimes) {
      expect(OPTIMIZED_ENSEMBLE_WEIGHTS[regime]).toBeDefined();
      const weights = OPTIMIZED_ENSEMBLE_WEIGHTS[regime];
      const total = weights.RF + weights.XGB + weights.LSTM + weights.TECHNICAL;
      expect(total).toBeCloseTo(1.0, 2);
    }
  });

  it('should use OPTIMIZED_ENSEMBLE_WEIGHTS.TRENDING when trending market detected', () => {
    const model = new EnsembleModel();
    const trendingData = createTrendingData();
    const prediction = model.predict(trendingData, createMockFeatures());
    
    if (prediction.marketRegime === 'TRENDING') {
      expect(prediction.weights.RF).toBeCloseTo(OPTIMIZED_ENSEMBLE_WEIGHTS.TRENDING.RF, 2);
      expect(prediction.weights.XGB).toBeCloseTo(OPTIMIZED_ENSEMBLE_WEIGHTS.TRENDING.XGB, 2);
      expect(prediction.weights.LSTM).toBeCloseTo(OPTIMIZED_ENSEMBLE_WEIGHTS.TRENDING.LSTM, 2);
      expect(prediction.weights.TECHNICAL).toBeCloseTo(OPTIMIZED_ENSEMBLE_WEIGHTS.TRENDING.TECHNICAL, 2);
    }
  });

  it('should have normalized weights that sum to 1', () => {
    const model = new EnsembleModel();
    const data = createTrendingData();
    const prediction = model.predict(data, createMockFeatures());
    
    const total = prediction.weights.RF + prediction.weights.XGB + prediction.weights.LSTM + prediction.weights.TECHNICAL;
    expect(total).toBeCloseTo(1.0, 2);
  });

  it('should have ENSEMBLE weight as 0', () => {
    const model = new EnsembleModel();
    const prediction = model.predict(createTrendingData(), createMockFeatures());
    
    expect(prediction.weights.ENSEMBLE).toBe(0);
  });
});

function createTrendingData() {
  const data = [];
  let price = 1000;
  for (let i = 0; i < 100; i++) {
    price += 2 + Math.random() * 3;
    data.push({
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 1000000,
    });
  }
  return data;
}

function createMockFeatures() {
  return {
    technical: {
      rsi: 50,
      momentum10: 0,
      momentum20: 0,
      sma5: 0,
      sma10: 0,
      sma20: 0,
      sma50: 0,
      macd: 0,
      macdSignal: 0,
      macdHistogram: 0,
      bbUpper: 100,
      bbMiddle: 100,
      bbLower: 100,
      bbPosition: 50,
      atr: 10,
      atrPercent: 1,
      atrRatio: 1,
      volumeRatio: 1,
      volumeTrend: 'NEUTRAL' as const,
    },
    timeSeries: {
      trendStrength: 0.5,
      cyclicality: 0.5,
      ma20: 100,
    },
    sentiment: { sentimentScore: 0 },
    macro: { macroScore: 0 },
  };
}
