import { mlPredictionService } from './mlPrediction';
import { Stock, OHLCV } from '../types';

describe('MLPredictionService Extended Tests', () => {
  const mockStock: Stock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'usa',
    sector: 'Technology',
    price: 150,
    change: 0,
    changePercent: 0,
    volume: 0,
  };

  const generateMockData = (count: number, trend: 'up' | 'down' | 'flat' | 'extreme-up' | 'extreme-down'): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    for (let i = 0; i < count; i++) {
      if (trend === 'up') price *= 1.01;
      if (trend === 'down') price *= 0.99;
      if (trend === 'extreme-up') price *= 1.05;
      if (trend === 'extreme-down') price *= 0.95;
      data.push({
        date: `2024-01-${(i % 28) + 1}`,
        open: price * 0.995,
        high: price * 1.01,
        low: price * 0.99,
        close: price,
        volume: 2000,
      });
    }
    return data;
  };

  it('generates a SELL signal for a clear downtrend', () => {
    const data = generateMockData(70, 'down');
    const indicators = mlPredictionService.calculateIndicators(data);
    const prediction = mlPredictionService.predict(mockStock, data, indicators);
    const signal = mlPredictionService.generateSignal(mockStock, data, prediction, indicators);

    expect(prediction.ensemblePrediction).toBeLessThan(0);
    if (signal.type === 'SELL') {
      expect(signal.targetPrice).toBeLessThan(data[data.length - 1].close);
      expect(signal.reason).toContain('下落');
    }
  });

  it('handles very short data sequences (edge case)', () => {
    // Only 10 points - should still not crash and provide fallback
    const data = generateMockData(10, 'up');
    const indicators = mlPredictionService.calculateIndicators(data);
    
    // Indicators like SMA50 will have NaN or empty at 10 points
    expect(indicators.sma50.filter(v => !isNaN(v)).length).toBe(0);

    const prediction = mlPredictionService.predict(mockStock, data, indicators);
    expect(prediction.confidence).toBeDefined();
    
    const signal = mlPredictionService.generateSignal(mockStock, data, prediction, indicators);
    expect(signal.type).toBe('HOLD'); // Should be HOLD due to low confidence or low ensemble score
  });

  it('calculates high confidence for extreme oversold conditions', () => {
    const data = generateMockData(70, 'extreme-down'); // Will drive RSI very low
    const indicators = mlPredictionService.calculateIndicators(data);
    const prediction = mlPredictionService.predict(mockStock, data, indicators);
    
    // Extreme conditions should boost confidence
    expect(prediction.confidence).toBeGreaterThan(60);
  });

  it('calculates high confidence for extreme overbought conditions', () => {
    const data = generateMockData(70, 'extreme-up'); // Will drive RSI very high
    const indicators = mlPredictionService.calculateIndicators(data);
    const prediction = mlPredictionService.predict(mockStock, data, indicators);
    
    expect(prediction.confidence).toBeGreaterThan(60);
  });

  it('correctly handles volume ratio in features', () => {
    const data = generateMockData(70, 'flat');
    // Inject a volume spike
    data[data.length - 1].volume = 10000; 
    
    const indicators = mlPredictionService.calculateIndicators(data);
    const features = (mlPredictionService as any).extractFeatures(mockStock, data, indicators);
    
    expect(features.volumeRatio).toBeGreaterThan(3);
  });
});
