/**
 * AccuracyService - TDD Test Suite
 * Tests the improved AI prediction accuracy calculation
 */

import { calculateAIHitRate, calculateRealTimeAccuracy } from '@/app/lib/AccuracyService';
import { MockMarketDataGenerator } from '@/app/lib/__tests__/test-utils';

// Generate mock data helper
const generateMockOHLCV = (basePrice: number, days: number) => {
  return MockMarketDataGenerator.generateOHLCV({
    count: days,
    startPrice: basePrice,
    volatility: 0.02,
    trend: 'sideways'
  });
};

// Mock constants
jest.mock('@/app/lib/constants/common', () => ({
  DATA_REQUIREMENTS: {
    MIN_DATA_POINTS: 20,
    MIN_DATA_PERIOD: 50,
    LOOKBACK_PERIOD_DAYS: 60, // Updated from 252 to 60
    ANNUAL_TRADING_DAYS: 252
  },
  RISK_MANAGEMENT: {
    BULL_TARGET_MULTIPLIER: 2.0,
    BEAR_TARGET_MULTIPLIER: 2.0
  },
  PREDICTION_ERROR_WEIGHTS: {
    ERROR_THRESHOLD: 0.10
  }
}));

// Mock analysis service
jest.mock('@/app/lib/AnalysisService', () => ({
  analysisService: {
    analyzeStock: jest.fn()
  }
}));

describe('AccuracyService - Improved Calculations', () => {
  describe('calculateRealTimeAccuracy', () => {
    test('should calculate accuracy with realistic data requirements', () => {
      // Generate 120 days of data (more than the 60-day requirement)
      const mockData = generateMockOHLCV(1000, 120);

      // Mock the analysis service to return a simple signal
      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateRealTimeAccuracy('TEST', mockData, 'japan');

      expect(result).not.toBeNull();
      expect(result!.hitRate).toBeGreaterThanOrEqual(0);
      expect(result!.directionalAccuracy).toBeGreaterThanOrEqual(0);
      expect(result!.totalTrades).toBeGreaterThan(5); // Should have enough trades with 60-day lookback
    });

    test('should return null for insufficient data', () => {
      // Generate only 30 days of data (less than 60-day requirement)
      const mockData = generateMockOHLCV(1000, 30);

      const result = calculateRealTimeAccuracy('TEST', mockData, 'japan');

      expect(result).toBeNull();
    });

    test('should handle edge case with exactly 60 days', () => {
      // Generate exactly 60 days of data (minimum requirement)
      const mockData = generateMockOHLCV(1000, 60);

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateRealTimeAccuracy('TEST', mockData, 'japan');

      expect(result).not.toBeNull();
      expect(result!.totalTrades).toBeGreaterThan(0);
    });

    test('should use improved loop conditions', () => {
      // Generate 100 days of data
      const mockData = generateMockOHLCV(1000, 100);

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateRealTimeAccuracy('TEST', mockData, 'japan');

      expect(result).not.toBeNull();
      // With the improved loop conditions (startIndex = Math.max(60, 20), step = 3)
      // and 100 days of data, we should have more trading opportunities
      expect(result!.totalTrades).toBeGreaterThan(10);
    });

    test('should handle different market types', () => {
      const mockData = generateMockOHLCV(1000, 120);

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      // Test Japanese market
      const resultJP = calculateRealTimeAccuracy('TEST', mockData, 'japan');
      expect(resultJP).not.toBeNull();

      // Test US market
      const resultUS = calculateRealTimeAccuracy('TEST', mockData, 'usa');
      expect(resultUS).not.toBeNull();

      // Results should be similar (same data, different market)
      expect(resultJP!.totalTrades).toBe(resultUS!.totalTrades);
    });
  });

  describe('calculateAIHitRate', () => {
    test('should calculate hit rate with realistic data requirements', () => {
      // Generate 120 days of data
      const mockData = generateMockOHLCV(1000, 120);

      // Mock the analysis service to return a simple signal
      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateAIHitRate('TEST', mockData, 'japan');

      expect(result.hitRate).toBeGreaterThanOrEqual(0);
      expect(result.directionalAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.totalTrades).toBeGreaterThan(5);
    });

    test('should return zero values for insufficient data', () => {
      // Generate only 30 days of data (less than 60-day requirement)
      const mockData = generateMockOHLCV(1000, 30);

      const result = calculateAIHitRate('TEST', mockData, 'japan');

      expect(result.hitRate).toBe(0);
      expect(result.directionalAccuracy).toBe(0);
      expect(result.totalTrades).toBe(0);
    });

    test('should use improved loop conditions', () => {
      // Generate 100 days of data
      const mockData = generateMockOHLCV(1000, 100);

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateAIHitRate('TEST', mockData, 'japan');

      // With the improved loop conditions (startIndex = Math.max(60, 10), step = 3)
      // and 100 days of data, we should have more trading opportunities
      expect(result.totalTrades).toBeGreaterThan(10);
    });

    test('should handle HOLD signals correctly', () => {
      const mockData = generateMockOHLCV(1000, 120);

      // Mock HOLD signals (should be skipped)
      const mockSignal = {
        type: 'HOLD',
        direction: 'FLAT',
        strength: 0.5,
        confidence: 0.5,
        targetPrice: 1000,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateAIHitRate('TEST', mockData, 'japan');

      // HOLD signals should be skipped, resulting in fewer trades
      expect(result.totalTrades).toBeLessThan(5);
    });

    test('should calculate directional accuracy correctly', () => {
      const mockData = generateMockOHLCV(1000, 120);

      // Create a scenario where directional accuracy should be high
      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateAIHitRate('TEST', mockData, 'japan');

      // Directional accuracy should be calculated correctly
      expect(result.directionalAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.directionalAccuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Improvements', () => {
    test('should complete calculations quickly with realistic data', () => {
      const mockData = generateMockOHLCV(1000, 120);

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const startTime = performance.now();

      const result = calculateRealTimeAccuracy('TEST', mockData, 'japan');

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).not.toBeNull();
      // Should complete quickly with improved algorithm
      expect(duration).toBeLessThan(50);
    });

    test('should handle large datasets efficiently', () => {
      // Generate 500 days of data
      const mockData = generateMockOHLCV(1000, 500);

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.8,
        confidence: 0.85,
        targetPrice: 1050,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const startTime = performance.now();

      const result = calculateRealTimeAccuracy('TEST', mockData, 'japan');

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).not.toBeNull();
      // Should still be fast even with large datasets
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle Panasonic (7203) data correctly', () => {
      // Simulate Panasonic stock data
      const mockData = generateMockOHLCV(3742, 120);

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.7,
        confidence: 0.6,
        targetPrice: 3900,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateRealTimeAccuracy('7203', mockData, 'japan');

      expect(result).not.toBeNull();
      expect(result!.totalTrades).toBeGreaterThan(5);
      expect(result!.hitRate).toBeGreaterThanOrEqual(0);
      expect(result!.directionalAccuracy).toBeGreaterThanOrEqual(0);
    });

    test('should handle Hino Motors (7205) data correctly', () => {
      // Simulate Hino Motors stock data
      const mockData = generateMockOHLCV(500, 120);

      const mockSignal = {
        type: 'SELL',
        direction: 'SHORT',
        strength: 0.6,
        confidence: 0.5,
        targetPrice: 480,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateRealTimeAccuracy('7205', mockData, 'japan');

      expect(result).not.toBeNull();
      expect(result!.totalTrades).toBeGreaterThan(5);
      expect(result!.hitRate).toBeGreaterThanOrEqual(0);
      expect(result!.directionalAccuracy).toBeGreaterThanOrEqual(0);
    });

    test('should handle volatile stocks correctly', () => {
      // Generate more volatile data
      const mockData = generateMockOHLCV(1000, 120);

      // Add more volatility
      mockData.forEach((point, index) => {
        if (index % 5 === 0) {
          // Add occasional large price movements
          const volatility = (Math.random() - 0.5) * 20;
          point.high += Math.abs(volatility);
          point.low -= Math.abs(volatility);
          point.close += volatility;
        }
      });

      const mockSignal = {
        type: 'BUY',
        direction: 'LONG',
        strength: 0.9,
        confidence: 0.7,
        targetPrice: 1100,
        timeframe: '1D'
      };

      jest.mocked(require('@/app/lib/AnalysisService').analysisService.analyzeStock)
        .mockReturnValue(mockSignal);

      const result = calculateRealTimeAccuracy('VOLATILE', mockData, 'japan');

      expect(result).not.toBeNull();
      // Even with volatile data, should have some trading opportunities
      expect(result!.totalTrades).toBeGreaterThan(5);
    });
  });
});