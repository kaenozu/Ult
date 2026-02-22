import { describe, it, expect } from '@jest/globals';
import { EnsembleModel, MarketRegime } from '../EnsembleModel';
import { OPTIMIZED_ENSEMBLE_WEIGHTS } from '../../config/prediction-config';

describe('EnsembleModel - RSI Thresholds', () => {
  it('should give bullish signal when RSI is extremely oversold (< 15)', () => {
    const model = new EnsembleModel();
    const features = createMockFeatures();
    features.technical.rsi = 12;
    
    const prediction = model.predict(createTrendingData(), features);
    const rfPrediction = prediction.modelPredictions.find(p => p.modelType === 'RF');
    
    expect(rfPrediction).toBeDefined();
    expect(rfPrediction!.prediction).toBeGreaterThan(0);
    expect(rfPrediction!.confidence).toBeGreaterThan(50);
  });

  it('should give bearish signal when RSI is extremely overbought (> 85)', () => {
    const model = new EnsembleModel();
    const features = createMockFeatures();
    features.technical.rsi = 88;
    
    const prediction = model.predict(createTrendingData(), features);
    const rfPrediction = prediction.modelPredictions.find(p => p.modelType === 'RF');
    
    expect(rfPrediction).toBeDefined();
    expect(rfPrediction!.prediction).toBeLessThan(0);
    expect(rfPrediction!.confidence).toBeGreaterThan(50);
  });

  it('should give moderate bullish signal when RSI is moderately oversold (15-30)', () => {
    const model = new EnsembleModel();
    const features = createMockFeatures();
    features.technical.rsi = 25;
    
    const prediction = model.predict(createTrendingData(), features);
    const rfPrediction = prediction.modelPredictions.find(p => p.modelType === 'RF');
    
    expect(rfPrediction).toBeDefined();
    expect(rfPrediction!.prediction).toBeGreaterThan(0);
  });

  it('should give moderate bearish signal when RSI is moderately overbought (70-85)', () => {
    const model = new EnsembleModel();
    const features = createMockFeatures();
    features.technical.rsi = 75;
    
    const prediction = model.predict(createTrendingData(), features);
    const rfPrediction = prediction.modelPredictions.find(p => p.modelType === 'RF');
    
    expect(rfPrediction).toBeDefined();
    expect(rfPrediction!.prediction).toBeLessThan(0);
  });

  it('should give neutral signal when RSI is in normal range (30-70)', () => {
    const model = new EnsembleModel();
    const features = createMockFeatures();
    features.technical.rsi = 50;
    
    const prediction = model.predict(createTrendingData(), features);
    const rfPrediction = prediction.modelPredictions.find(p => p.modelType === 'RF');
    
    expect(rfPrediction).toBeDefined();
    expect(rfPrediction!.prediction).toBe(0);
  });

  it('should give stronger signal for extreme oversold vs moderate oversold', () => {
    const model = new EnsembleModel();
    
    const extremeFeatures = createMockFeatures();
    extremeFeatures.technical.rsi = 10;
    const extremePrediction = model.predict(createTrendingData(), extremeFeatures);
    const extremeRf = extremePrediction.modelPredictions.find(p => p.modelType === 'RF');
    
    const moderateFeatures = createMockFeatures();
    moderateFeatures.technical.rsi = 25;
    const moderatePrediction = model.predict(createTrendingData(), moderateFeatures);
    const moderateRf = moderatePrediction.modelPredictions.find(p => p.modelType === 'RF');
    
    expect(Math.abs(extremeRf!.prediction)).toBeGreaterThan(Math.abs(moderateRf!.prediction));
  });
});

describe('EnsembleModel - Optimized Weights Integration', () => {
  it('should have OPTIMIZED_ENSEMBLE_WEIGHTS defined for all regimes', () => {
    const regimes: Array<keyof typeof OPTIMIZED_ENSEMBLE_WEIGHTS> = ['TRENDING', 'RANGING', 'VOLATILE', 'QUIET'];
    
    for (const regime of regimes) {
      expect(OPTIMIZED_ENSEMBLE_WEIGHTS[regime]).toBeDefined();
      const weights = OPTIMIZED_ENSEMBLE_WEIGHTS[regime];
      const total = weights.RF + weights.XGB + weights.LSTM + weights.TECHNICAL + weights.PATTERN;
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
      expect(prediction.weights.PATTERN).toBeCloseTo(OPTIMIZED_ENSEMBLE_WEIGHTS.TRENDING.PATTERN, 2);
    }
  });

  it('should have normalized weights that sum to 1', () => {
    const model = new EnsembleModel();
    const data = createTrendingData();
    const prediction = model.predict(data, createMockFeatures());
    
    const total = prediction.weights.RF + prediction.weights.XGB + prediction.weights.LSTM + prediction.weights.TECHNICAL + prediction.weights.PATTERN;
    expect(total).toBeCloseTo(1.0, 2);
  });

  it('should have ENSEMBLE weight as 0', () => {
    const model = new EnsembleModel();
    const prediction = model.predict(createTrendingData(), createMockFeatures());
    
    expect(prediction.weights.ENSEMBLE).toBe(0);
  });
});

describe('EnsembleModel - PATTERN Model', () => {
  it('should include PATTERN model in predictions', () => {
    const model = new EnsembleModel();
    const data = createTrendingData();
    const features = createMockFeatures();
    
    const prediction = model.predict(data, features);
    expect(prediction.modelPredictions.find(p => p.modelType === 'PATTERN')).toBeDefined();
  });

  it('should have PATTERN weight in all market regimes', () => {
    const regimes: Array<keyof typeof OPTIMIZED_ENSEMBLE_WEIGHTS> = ['TRENDING', 'RANGING', 'VOLATILE', 'QUIET'];
    
    for (const regime of regimes) {
      expect(OPTIMIZED_ENSEMBLE_WEIGHTS[regime].PATTERN).toBeDefined();
      expect(OPTIMIZED_ENSEMBLE_WEIGHTS[regime].PATTERN).toBeGreaterThan(0);
    }
  });

  it('should have PATTERN prediction with valid confidence', () => {
    const model = new EnsembleModel();
    const data = createTrendingData();
    const features = createMockFeatures();
    
    const prediction = model.predict(data, features);
    const patternPrediction = prediction.modelPredictions.find(p => p.modelType === 'PATTERN');
    
    expect(patternPrediction).toBeDefined();
    expect(patternPrediction!.confidence).toBeGreaterThanOrEqual(50);
    expect(patternPrediction!.confidence).toBeLessThanOrEqual(95);
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
