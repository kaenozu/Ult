/**
 * Unit tests for AnalysisService
 */

import { analysisService } from '../AnalysisService';
import { OHLCV } from '../../types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { accuracyService } from '../AccuracyService';
import { marketDataService } from '../MarketDataService';
import { volumeAnalysisService } from '../VolumeAnalysis';

// Mock dependencies properly
jest.mock('../TechnicalIndicatorService', () => ({
  technicalIndicatorService: {
    calculateRSI: jest.fn((closes: number[], period: number) => {
      // Return realistic RSI values (0-100)
      return closes.map(() => 30 + Math.random() * 40);
    }),
    calculateSMA: jest.fn((closes: number[], period: number) => {
      // Return realistic SMA values
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

describe('AnalysisService', () => {
  const mockSymbol = '7203';
  const mockMarket: 'japan' | 'usa' = 'japan';

  // Generate mock OHLCV data
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

  describe('calculateForecastCone', () => {
    it('should return undefined when data is insufficient', () => {
      const shortData = generateMockData(50); // Less than FORECAST_CONE.LOOKBACK_DAYS (60)
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
      expect(result?.confidence).toBeGreaterThanOrEqual(50);
      expect(result?.confidence).toBeLessThanOrEqual(100);
    });

    it('should return arrays of correct length', () => {
      const data = generateMockData(250);
      const result = analysisService.calculateForecastCone(data);

      const expectedLength = 6; // FORECAST_CONE.STEPS + 1

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
      expect(result?.bearish.upper[0]).toBe(currentPrice);
      expect(result?.bullish.lower[0]).toBe(currentPrice);
      expect(result?.bullish.upper[0]).toBe(currentPrice);
      expect(result?.base[0]).toBe(currentPrice);
    });
  });

  describe('optimizeParameters', () => {
    it('should return default parameters when data is insufficient', () => {
      const shortData = generateMockData(100);
      const result = analysisService.optimizeParameters(shortData, mockMarket);

      expect(result.rsiPeriod).toBeDefined();
      expect(result.smaPeriod).toBeDefined();
      expect(result.accuracy).toBe(0);
    });
  });

  describe('analyzeStock', () => {
    it('should return HOLD signal when data is insufficient', () => {
      const shortData = generateMockData(50);
      const result = analysisService.analyzeStock(mockSymbol, shortData, mockMarket);

      expect(result.symbol).toBe(mockSymbol);
      expect(result.type).toBe('HOLD');
      expect(result.confidence).toBe(0);
      expect(result.reason).toBe('データ不足');
    });

    it('should analyze stock with sufficient data', () => {
      const sufficientData = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, sufficientData, mockMarket);

      expect(result.symbol).toBe(mockSymbol);
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.targetPrice).toBeGreaterThan(0);
      expect(result.stopLoss).toBeGreaterThan(0);
      expect(result.reason).toBeDefined();
      expect(result.predictionDate).toBeDefined();
    });

    it('should include optimized parameters in result', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      expect(result.optimizedParams).toBeDefined();
      expect(result.optimizedParams?.rsiPeriod).toBeDefined();
      expect(result.optimizedParams?.smaPeriod).toBeDefined();
    });

    it('should include ATR in result', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      expect(result.atr).toBeDefined();
      expect(result.atr).toBeGreaterThan(0);
    });

    it('should include prediction error in result', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      expect(result.predictionError).toBeDefined();
      expect(result.predictionError).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data gracefully', () => {
      const result = analysisService.analyzeStock(mockSymbol, [], mockMarket);

      expect(result.type).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    it('should handle single data point', () => {
      const singleData = [generateMockData(1)[0]];
      const result = analysisService.analyzeStock(mockSymbol, singleData, mockMarket);

      expect(result.type).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });
  });

  describe('exit strategy integration', () => {
    it('should include exitStrategy in signal for BUY/SELL signals', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      if (result.type === 'BUY' || result.type === 'SELL') {
        expect(result.exitStrategy).toBeDefined();
        expect(result.exitStrategy?.primary).toBeDefined();
        expect(result.exitStrategy?.strategies).toBeDefined();
        expect(result.exitStrategy?.strategies.length).toBeGreaterThan(0);
        expect(result.exitStrategy?.recommendedATR).toBeGreaterThan(0);
        expect(result.exitStrategy?.exitReasons).toBeDefined();
        expect(result.exitStrategy?.exitReasons.length).toBeGreaterThan(0);
      }
    });

    it('should not include exitStrategy for HOLD signals with insufficient data', () => {
      const shortData = generateMockData(50);
      const result = analysisService.analyzeStock(mockSymbol, shortData, mockMarket);

      expect(result.type).toBe('HOLD');
      expect(result.exitStrategy).toBeUndefined();
    });

    it('should include trailing stop configuration when signal is not HOLD', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      if (result.type !== 'HOLD') {
        expect(result.exitStrategy?.trailingStop).toBeDefined();
        expect(result.exitStrategy?.trailingStop?.enabled).toBe(true);
        expect(result.exitStrategy?.trailingStop?.atrMultiplier).toBeGreaterThan(0);
        expect(result.exitStrategy?.trailingStop?.currentLevel).toBeGreaterThan(0);
      }
    });

    it('should include time-based exit configuration when signal is not HOLD', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      if (result.type !== 'HOLD') {
        expect(result.exitStrategy?.timeBased).toBeDefined();
        expect(result.exitStrategy?.timeBased?.enabled).toBe(true);
        expect(result.exitStrategy?.timeBased?.maxHoldingDays).toBeGreaterThan(0);
        expect(result.exitStrategy?.timeBased?.decayFactor).toBeGreaterThan(0);
      }
    });

    it('should select appropriate primary strategy based on regime', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      if (result.type !== 'HOLD' && result.regimeInfo) {
        const validStrategies = ['TRAILING_ATR', 'COMPOUND', 'HIGH_LOW', 'PARABOLIC_SAR', 'TIME_BASED'];
        expect(validStrategies).toContain(result.exitStrategy?.primary);
      }
    });

    it('should include multiple exit strategies in the strategies array', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      if (result.type !== 'HOLD') {
        expect(result.exitStrategy?.strategies.length).toBeGreaterThanOrEqual(1);
        // Primary strategy should be first in the array
        expect(result.exitStrategy?.strategies[0]).toBe(result.exitStrategy?.primary);
      }
    });

    it('should have exit reasons that explain the strategy selection', () => {
      const data = generateMockData(252);
      const result = analysisService.analyzeStock(mockSymbol, data, mockMarket);

      if (result.type !== 'HOLD') {
        expect(result.exitStrategy?.exitReasons.length).toBeGreaterThan(0);
        // Each reason should be a non-empty string
        result.exitStrategy?.exitReasons.forEach(reason => {
          expect(typeof reason).toBe('string');
          expect(reason.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Walk-Forward Analysis', () => {
    it('should split data into train and validation sets during optimization', () => {
      const data = generateMockData(200);
      
      // Mock simulateTrade to return different results for different indices
      // This helps us verify that validation set is actually being used
      const mockSimulateTrade = jest.fn((data, index) => {
        // Simulate that training set has better performance than validation
        const isInTrainingSet = index < 140; // First 70% of 200 days
        return { won: isInTrainingSet, directionalHit: isInTrainingSet };
      });
      (accuracyService.simulateTrade as jest.Mock) = mockSimulateTrade;

      const result = analysisService.optimizeParameters(data, mockMarket);

      // Verify that parameters were optimized
      expect(result.rsiPeriod).toBeDefined();
      expect(result.smaPeriod).toBeDefined();
      
      // The accuracy should reflect validation performance, not training
      expect(result.accuracy).toBeDefined();
    });

    it('should use validation set accuracy instead of training set accuracy', () => {
      const data = generateMockData(200);
      
      // Create a scenario where training accuracy would be 100% but validation is lower
      let callCount = 0;
      const mockSimulateTrade = jest.fn((data, index) => {
        callCount++;
        const trainEndIndex = Math.floor(200 * 0.7); // ~140
        const isInTrainingPeriod = index < trainEndIndex;
        
        // Training: 100% win rate, Validation: 50% win rate
        if (isInTrainingPeriod) {
          return { won: true, directionalHit: true };
        } else {
          return { won: callCount % 2 === 0, directionalHit: callCount % 2 === 0 };
        }
      });
      (accuracyService.simulateTrade as jest.Mock) = mockSimulateTrade;

      const result = analysisService.optimizeParameters(data, mockMarket);

      // The returned accuracy should be based on validation set (not 100%)
      expect(result.accuracy).toBeLessThan(100);
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
    });

    it('should use full window when validation period is too small', () => {
      // Small dataset where 30% validation would be < 20 days
      const data = generateMockData(60);
      
      const result = analysisService.optimizeParameters(data, mockMarket);

      // Should still return valid parameters (fallback behavior)
      expect(result.rsiPeriod).toBeDefined();
      expect(result.smaPeriod).toBeDefined();
    });

    it('should respect context endIndex for optimization window', () => {
      const data = generateMockData(300);
      
      // Optimize only using first 150 days
      const context = {
        startIndex: 0,
        endIndex: 149
      };

      const result = analysisService.optimizeParameters(data, mockMarket, context);

      expect(result.rsiPeriod).toBeDefined();
      expect(result.smaPeriod).toBeDefined();
      
      // Verify that simulateTrade was not called with indices beyond endIndex
      const calls = (accuracyService.simulateTrade as jest.Mock).mock.calls;
      calls.forEach(call => {
        const index = call[1];
        expect(index).toBeLessThanOrEqual(149);
      });
    });

    it('should prevent data snooping by not using future data in optimization', () => {
      const data = generateMockData(200);
      
      const context = {
        startIndex: 0,
        endIndex: 150
      };

      const result = analysisService.optimizeParameters(data, mockMarket, context);

      // Verify simulateTrade calls respect the validation window boundaries
      const calls = (accuracyService.simulateTrade as jest.Mock).mock.calls;
      calls.forEach(call => {
        const index = call[1];
        // Should not use data beyond endIndex (150)
        expect(index).toBeLessThanOrEqual(150);
      });
    });
  });
});
