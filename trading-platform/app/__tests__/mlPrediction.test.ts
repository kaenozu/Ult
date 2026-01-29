import { mlPredictionService } from '../lib/mlPrediction';
import { Stock, OHLCV } from '../types';

describe('MLPredictionService Tests', () => {
  const mockStock: Stock = {
    symbol: '7974',
    name: '任天堂',
    market: 'japan',
    sector: 'ゲーム',
    price: 100, // スケールをテストデータ(100前後)に合わせる
    change: 0,
    changePercent: 0,
    volume: 1000
  };

  const generateMockOHLCV = (count: number, trend: 'up' | 'down'): OHLCV[] => {
    return Array.from({ length: count }, (_, i) => ({
      date: `2026-01-${i + 1}`,
      open: 100,
      high: 110,
      low: 90,
      close: trend === 'up' ? 100 + i : 100 - i,
      volume: 1000
    }));
  };

  it('should generate BUY signal when ensemble prediction is positive', () => {
    const data = generateMockOHLCV(100, 'up');
    const ind = mlPredictionService.calculateIndicators(data);
    
    // Mock model predictions
    const mockPred = {
      rfPrediction: 2.0,
      xgbPrediction: 2.0,
      lstmPrediction: 2.0,
      ensemblePrediction: 2.0,
      confidence: 85
    };

    const signal = mlPredictionService.generateSignal(mockStock, data, mockPred, ind);

    expect(signal.type).toBe('BUY');
    expect(signal.targetPrice).toBeGreaterThan(mockStock.price);
    expect(signal.predictedChange).toBeGreaterThan(0);
  });

  it('should generate SELL signal when ensemble prediction is negative', () => {
    const data = generateMockOHLCV(100, 'down');
    const ind = mlPredictionService.calculateIndicators(data);
    
    const mockPred = {
      rfPrediction: -3.0,
      xgbPrediction: -3.0,
      lstmPrediction: -3.0,
      ensemblePrediction: -3.0,
      confidence: 85
    };

    const signal = mlPredictionService.generateSignal(mockStock, data, mockPred, ind);

    expect(signal.type).toBe('SELL');
    expect(signal.targetPrice).toBeLessThan(mockStock.price);
    expect(signal.predictedChange).toBeLessThan(0);
  });

  it('should adjust confidence based on market correlation', () => {
    const data = generateMockOHLCV(100, 'up');
    const indexData = generateMockOHLCV(100, 'up'); // Aligned trend
    const ind = mlPredictionService.calculateIndicators(data);
    
    const mockPred = {
      rfPrediction: 2.0,
      xgbPrediction: 2.0,
      lstmPrediction: 2.0,
      ensemblePrediction: 2.0,
      confidence: 70
    };

    const signal = mlPredictionService.generateSignal(mockStock, data, mockPred, ind, indexData);

    // Confidence should be increased because stock and market are both up
    expect(signal.confidence).toBeGreaterThan(70);
    expect(signal.reason).toContain('強い連動');
  });

  it('should force HOLD signal when confidence is low', () => {
    const data = generateMockOHLCV(100, 'up');
    const ind = mlPredictionService.calculateIndicators(data);
    
    const mockPred = {
      rfPrediction: 2.0,
      xgbPrediction: 2.0,
      lstmPrediction: 2.0,
      ensemblePrediction: 2.0,
      confidence: 40 // Too low
    };

    const signal = mlPredictionService.generateSignal(mockStock, data, mockPred, ind);

    expect(signal.type).toBe('HOLD');
    expect(signal.predictedChange).toBe(0);
  });
});
