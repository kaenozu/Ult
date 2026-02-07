/**
 * Unit tests for AnalysisService
 */

import { analysisService } from '../AnalysisService';
import { OHLCV } from '../../types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { accuracyService } from '../AccuracyService';
import { marketDataService } from '../MarketDataService';
import { volumeAnalysisService } from '../VolumeAnalysis';
import { FORECAST_CONE } from '../constants';

// Mock dependencies properly
jest.mock('../TechnicalIndicatorService', () => ({
  technicalIndicatorService: {
    calculateRSI: jest.fn((closes: number[], period: number) => {
      return closes.map(() => 30 + Math.random() * 40);
    }),
    calculateSMA: jest.fn((closes: number[], period: number) => {
      const result: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) result.push(NaN);
        else result.push(closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
      }
      return result;
    }),
  },
}));

jest.mock('../AccuracyService', () => ({
  accuracyService: {
    calculateSimpleATR: jest.fn(() => 20),
    calculateBatchSimpleATR: jest.fn((data) => new Array(data.length).fill(20)),
    simulateTrade: jest.fn(() => ({ won: true, directionalHit: true })),
    calculatePredictionError: jest.fn(() => 1.0),
  },
}));

jest.mock('../MarketDataService', () => ({
  marketDataService: {
    getCachedMarketData: jest.fn(() => null),
    calculateCorrelation: jest.fn(() => 0.3),
    calculateTrend: jest.fn(() => 'UP' as const),
  },
}));

jest.mock('../VolumeAnalysis', () => ({
  volumeAnalysisService: {
    calculateVolumeProfile: jest.fn(() => []),
  },
}));

describe('AnalysisService', () => {
  const mockSymbol = '7203';
  const mockMarket: 'japan' | 'usa' = 'japan';

  const generateMockData = (days: number, basePrice: number = 1000): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = basePrice;
    const now = Date.now();
    for (let i = 0; i < days; i++) {
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * 2 * volatility * price;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility * price;
      const low = Math.min(open, close) - Math.random() * volatility * price;
      data.push({
        date: new Date(now - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: 100000,
      });
      price = close;
    }
    return data;
  };

  describe('calculateForecastCone', () => {
    it('should return undefined when data is insufficient', () => {
      const shortData = generateMockData(50); // < 60
      const result = analysisService.calculateForecastCone(shortData);
      expect(result).toBeUndefined();
    });

    it('should calculate forecast cone with sufficient data', () => {
      const sufficientData = generateMockData(250);
      const result = analysisService.calculateForecastCone(sufficientData);
      expect(result).toBeDefined();
      expect(result?.bearish).toBeDefined();
      expect(result?.bullish).toBeDefined();
      expect(result?.base).toBeDefined();
    });

    it('should return arrays of correct length', () => {
      const data = generateMockData(250);
      const result = analysisService.calculateForecastCone(data);
      const expectedLength = FORECAST_CONE.STEPS + 1;
      expect(result?.bearish.lower).toHaveLength(expectedLength);
      expect(result?.bearish.upper).toHaveLength(expectedLength);
      expect(result?.bullish.lower).toHaveLength(expectedLength);
      expect(result?.bullish.upper).toHaveLength(expectedLength);
      expect(result?.base).toHaveLength(expectedLength);
    });

    it('should start with current price', () => {
      const data = generateMockData(250);
      const currentPrice = data[data.length - 1].close;
      const result = analysisService.calculateForecastCone(data);
      expect(result?.bearish.lower[0]).toBe(currentPrice);
      expect(result?.bullish.lower[0]).toBe(currentPrice);
      expect(result?.base[0]).toBe(currentPrice);
    });
  });

  describe('analyzeStock', () => {
    it('should return HOLD signal when data is insufficient', () => {
      const result = analysisService.analyzeStock(mockSymbol, generateMockData(50), mockMarket);
      expect(result.type).toBe('HOLD');
    });

    it('should analyze stock with sufficient data', () => {
      const result = analysisService.analyzeStock(mockSymbol, generateMockData(252), mockMarket);
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Walk-Forward Analysis', () => {
    it('should perform parameter optimization', () => {
      const data = generateMockData(200);
      const result = analysisService.optimizeParameters(data, mockMarket);
      expect(result.rsiPeriod).toBeDefined();
      expect(result.smaPeriod).toBeDefined();
    });
  });
});