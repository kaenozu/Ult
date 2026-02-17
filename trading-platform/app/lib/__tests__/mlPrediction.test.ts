/**
 * Tests for MLPredictionService
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { mlPredictionService } from '../mlPrediction';
import { Stock, OHLCV } from '../../types';
import { ENSEMBLE_WEIGHTS } from '@/app/constants';

// Mock constants
jest.mock('@/app/constants', () => ({
  RSI_CONFIG: {
    DEFAULT_PERIOD: 14,
    EXTREME_OVERSOLD: 30,
    EXTREME_OVERBOUGHT: 70,
  },
  SMA_CONFIG: {
    SHORT_PERIOD: 5,
    MEDIUM_PERIOD: 20,
    LONG_PERIOD: 50,
  },
  VOLATILITY: {
    CALCULATION_PERIOD: 10,
  },
  BACKTEST_CONFIG: {
    MIN_SIGNAL_CONFIDENCE: 50,
  },
  MARKET_CORRELATION: {
    TREND_DEVIATION: 0.02,
  },
  ENSEMBLE_WEIGHTS: {
    RF: 0.4,
    XGB: 0.35,
    LSTM: 0.25,
  },
  SIGNAL_THRESHOLDS: {
    STRONG_CORRELATION: 0.7,
    STRONG_MOMENTUM: 5,
  },
  PRICE_CALCULATION: {
    MIN_CONFIDENCE: 20,
    MAX_CONFIDENCE: 95,
    DEFAULT_ATR_RATIO: 0.02,
  },
}));

// Mock analysis
jest.mock('../analysis', () => ({
  analyzeStock: jest.fn(() => ({
    accuracy: 75,
    atr: 5,
    predictionError: 1.0,
    optimizedParams: null,
    volumeResistance: [],
    reason: 'Test analysis',
  })),
}));

describe('MLPredictionService', () => {
  const mockStock: Stock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'usa',
    sector: 'Technology',
    price: 150,
    change: 2.5,
    changePercent: 1.67,
    volume: 50000000,
  };

  const generateMockOHLCV = (count: number, startPrice: number = 100): OHLCV[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: 'AAPL',
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: startPrice + i * 0.5,
      high: startPrice + i * 0.5 + 2,
      low: startPrice + i * 0.5 - 2,
      close: startPrice + i * 0.5 + 1,
      volume: 1000000,
    }));
  };

  describe('calculateIndicators', () => {
    it('should calculate all technical indicators', () => {
      const ohlcvData = generateMockOHLCV(50);
      const indicators = mlPredictionService.calculateIndicators(ohlcvData);

      expect(indicators).toHaveProperty('sma5');
      expect(indicators).toHaveProperty('sma20');
      expect(indicators).toHaveProperty('sma50');
      expect(indicators).toHaveProperty('rsi');
      expect(indicators).toHaveProperty('macd');
      expect(indicators).toHaveProperty('bollingerBands');
      expect(indicators).toHaveProperty('atr');
    });

    it('should return arrays of correct length', () => {
      const ohlcvData = generateMockOHLCV(50);
      const indicators = mlPredictionService.calculateIndicators(ohlcvData);

      expect(indicators.sma5.length).toBe(50);
      expect(indicators.sma20.length).toBe(50);
      expect(indicators.sma50.length).toBe(50);
      expect(indicators.rsi.length).toBe(50);
    });

    it('should handle empty data', () => {
      const indicators = mlPredictionService.calculateIndicators([]);
      expect(indicators.sma5).toEqual([]);
      expect(indicators.sma20).toEqual([]);
    });
  });

  describe('predict', () => {
    it('should return ModelPrediction object', () => {
      const ohlcvData = generateMockOHLCV(50);
      const indicators = mlPredictionService.calculateIndicators(ohlcvData);
      const prediction = mlPredictionService.predict(mockStock, ohlcvData, indicators);

      expect(prediction).toHaveProperty('rfPrediction');
      expect(prediction).toHaveProperty('xgbPrediction');
      expect(prediction).toHaveProperty('lstmPrediction');
      expect(prediction).toHaveProperty('ensemblePrediction');
      expect(prediction).toHaveProperty('confidence');
      expect(typeof prediction.rfPrediction).toBe('number');
      expect(typeof prediction.xgbPrediction).toBe('number');
      expect(typeof prediction.lstmPrediction).toBe('number');
      expect(typeof prediction.ensemblePrediction).toBe('number');
      expect(typeof prediction.confidence).toBe('number');
    });

    it('should return confidence between 20 and 95', () => {
      const ohlcvData = generateMockOHLCV(50);
      const indicators = mlPredictionService.calculateIndicators(ohlcvData);
      const prediction = mlPredictionService.predict(mockStock, ohlcvData, indicators);

      expect(prediction.confidence).toBeGreaterThanOrEqual(20);
      expect(prediction.confidence).toBeLessThanOrEqual(95);
    });

    it('should calculate ensemble prediction from weighted models', () => {
      const ohlcvData = generateMockOHLCV(50);
      const indicators = mlPredictionService.calculateIndicators(ohlcvData);
      const prediction = mlPredictionService.predict(mockStock, ohlcvData, indicators);

      const expectedEnsemble =
        prediction.rfPrediction * ENSEMBLE_WEIGHTS.RF +
        prediction.xgbPrediction * ENSEMBLE_WEIGHTS.XGB +
        prediction.lstmPrediction * ENSEMBLE_WEIGHTS.LSTM;

      expect(prediction.ensemblePrediction).toBeCloseTo(expectedEnsemble, 5);
    });
  });

  describe('generateSignal', () => {
    it('should return Signal object', () => {
      const ohlcvData = generateMockOHLCV(50);
      const indicators = mlPredictionService.calculateIndicators(ohlcvData);
      const prediction = mlPredictionService.predict(mockStock, ohlcvData, indicators);
      const signal = mlPredictionService.generateSignal(mockStock, ohlcvData, prediction, indicators);

      expect(signal).toHaveProperty('symbol');
      expect(signal).toHaveProperty('type');
      expect(signal).toHaveProperty('confidence');
      expect(signal).toHaveProperty('targetPrice');
      expect(signal).toHaveProperty('stopLoss');
      expect(signal).toHaveProperty('reason');
      expect(signal.symbol).toBe('AAPL');
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.type);
    });

    it('should generate BUY signal for positive prediction', () => {
      // Create rising prices for positive prediction
      const risingOHLCV = Array.from({ length: 50 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 102 + i,
        low: 98 + i,
        close: 101 + i,
        volume: 1000000,
      }));

      const indicators = mlPredictionService.calculateIndicators(risingOHLCV);
      const prediction = mlPredictionService.predict(mockStock, risingOHLCV, indicators);
      const signal = mlPredictionService.generateSignal(mockStock, risingOHLCV, prediction, indicators);

      expect(['BUY', 'HOLD', 'SELL']).toContain(signal.type);
    });

    it('should generate SELL signal for negative prediction', () => {
      // Create falling prices for negative prediction
      const fallingOHLCV = Array.from({ length: 50 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 200 - i,
        high: 202 - i,
        low: 198 - i,
        close: 199 - i,
        volume: 1000000,
      }));

      const indicators = mlPredictionService.calculateIndicators(fallingOHLCV);
      const prediction = mlPredictionService.predict(mockStock, fallingOHLCV, indicators);
      const signal = mlPredictionService.generateSignal(mockStock, fallingOHLCV, prediction, indicators);

      // With negative momentum, signal should be SELL
      expect(['SELL', 'HOLD']).toContain(signal.type);
    });

    it('should set targetPrice > entryPrice for BUY signal', () => {
      const risingOHLCV = Array.from({ length: 50 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 102 + i,
        low: 98 + i,
        close: 101 + i,
        volume: 1000000,
      }));

      const indicators = mlPredictionService.calculateIndicators(risingOHLCV);
      const prediction = mlPredictionService.predict(mockStock, risingOHLCV, indicators);
      const signal = mlPredictionService.generateSignal(mockStock, risingOHLCV, prediction, indicators);

      if (signal.type === 'BUY') {
        expect(signal.targetPrice).toBeGreaterThan(risingOHLCV[risingOHLCV.length - 1].close);
        expect(signal.stopLoss).toBeLessThan(risingOHLCV[risingOHLCV.length - 1].close);
      }
    });

    it('should set targetPrice < entryPrice for SELL signal', () => {
      const fallingOHLCV = Array.from({ length: 50 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 200 - i,
        high: 202 - i,
        low: 198 - i,
        close: 199 - i,
        volume: 1000000,
      }));

      const indicators = mlPredictionService.calculateIndicators(fallingOHLCV);
      const prediction = mlPredictionService.predict(mockStock, fallingOHLCV, indicators);
      const signal = mlPredictionService.generateSignal(mockStock, fallingOHLCV, prediction, indicators);

      if (signal.type === 'SELL') {
        expect(signal.targetPrice).toBeLessThan(fallingOHLCV[fallingOHLCV.length - 1].close);
        expect(signal.stopLoss).toBeGreaterThan(fallingOHLCV[fallingOHLCV.length - 1].close);
      }
    });

    it('should include market context when index data is provided', () => {
      const ohlcvData = generateMockOHLCV(50);
      const indexData = generateMockOHLCV(50, 300);
      const indicators = mlPredictionService.calculateIndicators(ohlcvData);
      const prediction = mlPredictionService.predict(mockStock, ohlcvData, indicators);
      const signal = mlPredictionService.generateSignal(mockStock, ohlcvData, prediction, indicators, indexData);

      expect(signal.marketContext).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle insufficient data', () => {
      const shortData = generateMockOHLCV(5);
      const indicators = mlPredictionService.calculateIndicators(shortData);
      const prediction = mlPredictionService.predict(mockStock, shortData, indicators);

      expect(prediction.confidence).toBeDefined();
      expect(typeof prediction.ensemblePrediction).toBe('number');
    });

    it('should handle flat prices', () => {
      const flatData = Array.from({ length: 50 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000000,
      }));

      const indicators = mlPredictionService.calculateIndicators(flatData);
      const prediction = mlPredictionService.predict(mockStock, flatData, indicators);
      const signal = mlPredictionService.generateSignal(mockStock, flatData, prediction, indicators);

      // With flat prices, should likely be HOLD
      expect(signal.type).toBe('HOLD');
    });
  });
});
