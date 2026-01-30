/**
 * Integration tests for MarketRegimeDetector and AnalysisService
 * 
 * Tests the integration between market regime detection and signal generation.
 * Following TDD principles: tests written before implementation.
 */

import { analysisService } from '../AnalysisService';
import { marketRegimeDetector, MarketRegime, VolatilityRegime } from '../MarketRegimeDetector';
import { OHLCV } from '../../types';

// Mock dependencies
jest.mock('../TechnicalIndicatorService', () => ({
  technicalIndicatorService: {
    calculateRSI: jest.fn((closes: number[], period: number) => {
      return closes.map(() => 30 + Math.random() * 40);
    }),
    calculateSMA: jest.fn((closes: number[], period: number) => {
      const result: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
          result.push(NaN);
        } else {
          const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
          result.push(sum / period);
        }
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

describe('Integration: MarketRegimeDetector + AnalysisService', () => {
  const mockSymbol = '7203';
  const mockMarket: 'japan' | 'usa' = 'japan';

  // Helper to generate OHLCV data with specific characteristics
  const generateOHLCVData = (
    days: number,
    trend: 'uptrend' | 'downtrend' | 'sideways' | 'volatile' = 'sideways',
    basePrice: number = 1000
  ): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      let change: number;
      let volatility: number;

      switch (trend) {
        case 'uptrend':
          change = price * 0.015;
          volatility = price * 0.01;
          break;
        case 'downtrend':
          change = -price * 0.015;
          volatility = price * 0.01;
          break;
        case 'volatile':
          change = (Math.random() - 0.5) * price * 0.05;
          volatility = price * 0.04;
          break;
        case 'sideways':
        default:
          change = (Math.random() - 0.5) * price * 0.005;
          volatility = price * 0.008;
          break;
      }

      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      data.push({
        date: new Date(now - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });

      price = close;
    }

    return data;
  };

  beforeEach(() => {
    marketRegimeDetector.reset();
    jest.clearAllMocks();
  });

  describe('regime detection integration', () => {
    it('should detect market regime before generating signals', () => {
      const data = generateOHLCVData(50, 'uptrend');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      // Signal should include regime information
      expect(result.regimeInfo).toBeDefined();
      expect(result.regimeInfo?.regime).toBeDefined();
      expect(['TRENDING', 'RANGING', 'UNKNOWN']).toContain(result.regimeInfo?.regime);
    });

    it('should provide regime details in signal output', () => {
      const data = generateOHLCVData(50, 'uptrend');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.regimeInfo).toBeDefined();
      expect(result.regimeInfo?.adx).toBeGreaterThan(0);
      expect(result.regimeInfo?.atr).toBeGreaterThan(0);
      expect(result.regimeInfo?.trendDirection).toBeDefined();
      expect(['UP', 'DOWN', 'NEUTRAL']).toContain(result.regimeInfo?.trendDirection);
    });

    it('should include volatility information in regime data', () => {
      const data = generateOHLCVData(50, 'volatile');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.regimeInfo?.volatility).toBeDefined();
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.regimeInfo?.volatility);
    });
  });

  describe('strategy weight adjustments', () => {
    it('should adjust strategy weights for trending markets', () => {
      const data = generateOHLCVData(50, 'uptrend');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.strategyWeight).toBeDefined();
      expect(result.strategyWeight).toBeGreaterThan(0);
      expect(result.strategyWeight).toBeLessThanOrEqual(1);
    });

    it('should provide different weights for ranging markets', () => {
      const data = generateOHLCVData(50, 'sideways');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.strategyWeight).toBeDefined();
      expect(result.strategyWeight).toBeGreaterThan(0);
    });

    it('should include position size adjustment based on regime', () => {
      const data = generateOHLCVData(50, 'volatile');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.positionSizeAdjustment).toBeDefined();
      expect(result.positionSizeAdjustment).toBeGreaterThanOrEqual(0);
      expect(result.positionSizeAdjustment).toBeLessThanOrEqual(1);
    });
  });

  describe('signal generation with regime context', () => {
    it('should include recommended strategy in signal', () => {
      const data = generateOHLCVData(50, 'uptrend');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.recommendedStrategy).toBeDefined();
      expect(typeof result.recommendedStrategy).toBe('string');
      expect(result.recommendedStrategy?.length).toBeGreaterThan(0);
    });

    it('should provide regime description in signal', () => {
      const data = generateOHLCVData(50, 'uptrend');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.regimeDescription).toBeDefined();
      expect(typeof result.regimeDescription).toBe('string');
    });

    it('should handle insufficient data for regime detection', () => {
      const data = generateOHLCVData(15, 'uptrend');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      // Should still provide a signal even if regime is UNKNOWN
      expect(result.type).toBeDefined();
      expect(result.regimeInfo?.regime).toBe('UNKNOWN');
    });
  });

  describe('regime-based signal adjustments', () => {
    it('should adjust confidence based on regime confirmation', () => {
      const data = generateOHLCVData(50, 'uptrend');
      
      // First call - initial detection
      const result1 = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      // Second call with same data - should have confirmed regime
      const result2 = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result1.regimeInfo?.confidence).toBeDefined();
      expect(result2.regimeInfo?.confidence).toBeDefined();
    });

    it('should reduce confidence in high volatility regime', () => {
      const data = generateOHLCVData(50, 'volatile');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.confidence).toBeDefined();
      if (result.regimeInfo?.volatility === 'HIGH') {
        // High volatility should typically reduce confidence
        expect(result.confidence).toBeLessThan(90);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty data gracefully', () => {
      const result = analysisService.analyzeStock(mockSymbol, [], mockMarket);
      
      expect(result.type).toBe('HOLD');
      expect(result.regimeInfo?.regime).toBe('UNKNOWN');
    });

    it('should handle minimal data for regime detection', () => {
      const data = generateOHLCVData(20, 'uptrend');
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      expect(result.type).toBeDefined();
      expect(result.regimeInfo).toBeDefined();
    });

    it('should work with forced parameters', () => {
      const data = generateOHLCVData(50, 'uptrend');
      const context = {
        forcedParams: {
          rsiPeriod: 14,
          smaPeriod: 20,
          accuracy: 65,
        },
      };
      
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket, undefined, context);
      
      expect(result.regimeInfo).toBeDefined();
      expect(result.strategyWeight).toBeDefined();
    });
  });

  describe('signal consistency', () => {
    it('should maintain consistent regime info across multiple calls', () => {
      const data = generateOHLCVData(50, 'uptrend');
      
      const result1 = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      const result2 = analysisService.analyzeStock(mockSymbol, data, mockMarket);
      
      // Both should have regime info
      expect(result1.regimeInfo).toBeDefined();
      expect(result2.regimeInfo).toBeDefined();
      
      // Regime should be consistent
      expect(result1.regimeInfo?.regime).toBe(result2.regimeInfo?.regime);
    });
  });
});
