/**
 * Tests for Feature Engineering Service
 */

import { describe, it, expect } from '@jest/globals';
import { FeatureEngineeringService } from '../FeatureEngineering';
import { OHLCV } from '@/app/types';

describe('FeatureEngineeringService', () => {
  const service = new FeatureEngineeringService();

  // Create mock OHLCV data
  const createMockData = (length: number): OHLCV[] => {
    const data: OHLCV[] = [];
    const basePrice = 100;
    
    for (let i = 0; i < length; i++) {
      const price = basePrice + Math.sin(i / 10) * 10 + Math.random() * 5;
      data.push({
        timestamp: new Date(Date.now() - (length - i) * 24 * 60 * 60 * 1000).toISOString(),
        open: price - 1 + Math.random() * 2,
        high: price + Math.random() * 3,
        low: price - Math.random() * 3,
        close: price,
        volume: 1000000 + Math.random() * 500000,
      });
    }
    
    return data;
  };

  describe('extractFeatures', () => {
    it('should extract features from OHLCV data', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(0);
      expect(features.length).toBe(data.length - 200);
    });

    it('should include all required feature fields', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);
      const feature = features[0];

      // Basic OHLC
      expect(feature.close).toBeDefined();
      expect(feature.open).toBeDefined();
      expect(feature.high).toBeDefined();
      expect(feature.low).toBeDefined();

      // Technical indicators
      expect(feature.rsi).toBeDefined();
      expect(feature.sma5).toBeDefined();
      expect(feature.sma20).toBeDefined();
      expect(feature.sma50).toBeDefined();
      expect(feature.macdSignal).toBeDefined();
      expect(feature.bollingerPosition).toBeDefined();

      // Momentum features
      expect(feature.priceMomentum).toBeDefined();
      expect(feature.momentum5).toBeDefined();
      expect(feature.momentum10).toBeDefined();

      // Volume features
      expect(feature.volumeRatio).toBeDefined();
      expect(feature.volumeSMA).toBeDefined();

      // Volatility features
      expect(feature.volatility).toBeDefined();
      expect(feature.historicalVolatility).toBeDefined();

      // Oscillators
      expect(feature.stochasticK).toBeDefined();
      expect(feature.williamsR).toBeDefined();
      expect(feature.adx).toBeDefined();
    });

    it('should throw error for insufficient data', () => {
      const data = createMockData(50);
      expect(() => service.extractFeatures(data, 200)).toThrow();
    });

    it('should calculate RSI correctly', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.rsi).toBeGreaterThanOrEqual(0);
        expect(feature.rsi).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate Bollinger position correctly', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.bollingerPosition).toBeGreaterThanOrEqual(0);
        expect(feature.bollingerPosition).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('normalizeFeatures', () => {
    it('should normalize features correctly', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);
      const { normalized, scalers } = service.normalizeFeatures(features);

      expect(normalized).toBeDefined();
      expect(normalized.length).toBe(features.length);
      expect(scalers).toBeDefined();
      expect(Object.keys(scalers).length).toBeGreaterThan(0);
    });

    it('should produce normalized values with mean ~0 and std ~1', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);
      const { normalized } = service.normalizeFeatures(features);

      // Check first feature column
      const firstColumn = normalized.map(row => row[0]);
      const mean = firstColumn.reduce((a, b) => a + b, 0) / firstColumn.length;
      const variance = firstColumn.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / firstColumn.length;
      const std = Math.sqrt(variance);

      expect(Math.abs(mean)).toBeLessThan(0.1);
      expect(Math.abs(std - 1)).toBeLessThan(0.1);
    });

    it('should handle edge cases', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);
      
      // Ensure no NaN or Infinity values
      const { normalized } = service.normalizeFeatures(features);
      normalized.forEach(row => {
        row.forEach(val => {
          expect(isNaN(val)).toBe(false);
          expect(isFinite(val)).toBe(true);
        });
      });
    });
  });

  describe('technical indicators', () => {
    it('should calculate ADX correctly', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.adx).toBeGreaterThanOrEqual(0);
        expect(feature.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate Williams R correctly', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.williamsR).toBeGreaterThanOrEqual(-100);
        expect(feature.williamsR).toBeLessThanOrEqual(0);
      });
    });

    it('should calculate Stochastic correctly', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.stochasticK).toBeGreaterThanOrEqual(0);
        expect(feature.stochasticK).toBeLessThanOrEqual(100);
        expect(feature.stochasticD).toBeGreaterThanOrEqual(0);
        expect(feature.stochasticD).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate volatility measures', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.volatility).toBeGreaterThanOrEqual(0);
        expect(feature.historicalVolatility).toBeGreaterThanOrEqual(0);
        expect(feature.parkinsonVolatility).toBeGreaterThanOrEqual(0);
        expect(feature.garmanKlassVolatility).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('volume profile', () => {
    it('should calculate volume profile', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.volumeProfile).toBeDefined();
        expect(Array.isArray(feature.volumeProfile)).toBe(true);
        expect(feature.volumeProfile.length).toBe(10);
        
        feature.volumeProfile.forEach(vol => {
          expect(vol).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('support and resistance', () => {
    it('should identify support and resistance levels', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.supportLevel).toBeDefined();
        expect(feature.resistanceLevel).toBeDefined();
        expect(typeof feature.supportLevel).toBe('number');
        expect(typeof feature.resistanceLevel).toBe('number');
      });
    });
  });

  describe('time features', () => {
    it('should extract time-based features', () => {
      const data = createMockData(250);
      const features = service.extractFeatures(data, 200);

      features.forEach(feature => {
        expect(feature.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(feature.dayOfWeek).toBeLessThan(7);
        expect(feature.weekOfMonth).toBeGreaterThanOrEqual(0);
        expect(feature.monthOfYear).toBeGreaterThanOrEqual(0);
        expect(feature.monthOfYear).toBeLessThan(12);
      });
    });
  });

  describe('performance', () => {
    it('should extract features efficiently', () => {
      const data = createMockData(500);
      
      const startTime = Date.now();
      service.extractFeatures(data, 200);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});
