import { mlPredictionService } from './mlPrediction';
import { Stock, OHLCV } from '../types';

describe('MLPredictionService', () => {
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

  const generateMockData = (count: number, trend: 'up' | 'down' | 'flat'): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    for (let i = 0; i < count; i++) {
      if (trend === 'up') price *= 1.02; // 2% daily growth
      if (trend === 'down') price *= 0.98; // 2% daily drop
      data.push({
        date: `2024-01-${i + 1}`,
        open: price * 0.995,
        high: price * 1.01,
        low: price * 0.99,
        close: price,
        volume: 2000,
      });
    }
    return data;
  };

  it('calculates technical indicators correctly', () => {
    const data = generateMockData(70, 'up');
    const indicators = mlPredictionService.calculateIndicators(data);

    expect(indicators.rsi.length).toBeGreaterThan(data.length); 
    expect(indicators.sma50.length).toBe(data.length);
    expect(indicators.macd.macd.length).toBe(data.length);
  });

  it('extracts features for prediction', () => {
    const data = generateMockData(70, 'up');
    const indicators = mlPredictionService.calculateIndicators(data);
    const features = mlPredictionService.extractFeatures(mockStock, data, indicators);

    expect(features).toHaveProperty('rsi');
    expect(features).toHaveProperty('priceMomentum');
    expect(features.priceMomentum).toBeGreaterThan(0);
  });

  it('generates a signal for an uptrend', () => {
    const data = generateMockData(70, 'up');
    const indicators = mlPredictionService.calculateIndicators(data);
    const prediction = mlPredictionService.predict(mockStock, data, indicators);
    const signal = mlPredictionService.generateSignal(mockStock, data, prediction, indicators);

    expect(signal.symbol).toBe(mockStock.symbol);
    expect(prediction.ensemblePrediction).toBeGreaterThan(0);
    
    if (signal.type === 'BUY') {
      expect(signal.targetPrice).toBeGreaterThan(data[data.length - 1].close);
    }
  });

  it('calculates ensemble prediction using weights', () => {
    const data = generateMockData(70, 'flat');
    const indicators = mlPredictionService.calculateIndicators(data);
    const prediction = mlPredictionService.predict(mockStock, data, indicators);

    const expected = 
      prediction.rfPrediction * 0.35 + 
      prediction.xgbPrediction * 0.35 + 
      prediction.lstmPrediction * 0.30;
    
    expect(prediction.ensemblePrediction).toBeCloseTo(expected, 5);
  });
});