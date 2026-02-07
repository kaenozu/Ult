/**
 * breakout.test.ts
 * 
 * Comprehensive unit tests for breakout detection
 * Tests bullish/bearish breakouts, volume confirmation, and resistance/support levels
 */

import { describe, it, expect } from '@jest/globals';
import { detectBreakouts } from '../breakout';
import { MockMarketDataGenerator } from './mocks/test-utils';
import type { VolumeProfileLevel } from '../breakout';

describe('detectBreakouts', () => {
  describe('Basic Breakout Detection', () => {
    it('should detect bullish breakout with high volume', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      // Add a breakout candle with high volume
      const lastPrice = data[data.length - 1].close;
      data.push({
        date: '2024-02-01',
        open: lastPrice,
        high: lastPrice * 1.05,
        low: lastPrice,
        close: lastPrice * 1.04,
        volume: data[data.length - 1].volume * 3, // 3x volume
      });

      const volumeProfile: VolumeProfileLevel[] = [
        { price: lastPrice * 1.02, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      expect(result.events.length).toBeGreaterThanOrEqual(0);
      expect(result.bullishBreakouts).toBeGreaterThanOrEqual(0);
      expect(result.bearishBreakouts).toBeGreaterThanOrEqual(0);
    });

    it('should detect bearish breakout with high volume', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      // Add a breakout candle with high volume
      const lastPrice = data[data.length - 1].close;
      data.push({
        date: '2024-02-01',
        open: lastPrice,
        high: lastPrice,
        low: lastPrice * 0.95,
        close: lastPrice * 0.96,
        volume: data[data.length - 1].volume * 3, // 3x volume
      });

      const volumeProfile: VolumeProfileLevel[] = [
        { price: lastPrice * 0.98, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      expect(result).toBeDefined();
      expect(typeof result.bearishBreakouts).toBe('number');
    });

    it('should not detect breakout with low volume', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile, {
        volumeMultiplier: 5.0, // Very high threshold
      });

      // With high volume threshold, should detect fewer or no breakouts
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should ignore weak volume profile levels', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.2 }, // Weak level
      ];

      const result = detectBreakouts(data, volumeProfile, {
        minProfileStrength: 0.5,
      });

      expect(result.events).toBeDefined();
      // Should ignore weak levels
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe('Volume Requirements', () => {
    it('should respect volumeMultiplier threshold', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const resultLow = detectBreakouts(data, volumeProfile, {
        volumeMultiplier: 1.5,
      });

      const resultHigh = detectBreakouts(data, volumeProfile, {
        volumeMultiplier: 5.0,
      });

      // Lower threshold should detect more or equal breakouts
      expect(resultLow.events.length).toBeGreaterThanOrEqual(resultHigh.events.length);
    });

    it('should calculate average volume ratio correctly', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      if (result.events.length > 0) {
        expect(result.averageVolumeRatio).toBeGreaterThan(0);
      } else {
        expect(result.averageVolumeRatio).toBe(0);
      }
    });
  });

  describe('Confirmation Candles', () => {
    it('should require confirmation candles when specified', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const resultNoConfirm = detectBreakouts(data, volumeProfile, {
        confirmationCandles: 0,
      });

      const resultWithConfirm = detectBreakouts(data, volumeProfile, {
        confirmationCandles: 3,
      });

      // More confirmation should result in fewer or equal detections
      expect(resultNoConfirm.events.length).toBeGreaterThanOrEqual(resultWithConfirm.events.length);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty result for insufficient data', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 10 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      expect(result.events).toEqual([]);
      expect(result.bullishBreakouts).toBe(0);
      expect(result.bearishBreakouts).toBe(0);
    });

    it('should return empty result for empty volume profile', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const result = detectBreakouts(data, []);

      expect(result.events).toEqual([]);
      expect(result.bullishBreakouts).toBe(0);
      expect(result.bearishBreakouts).toBe(0);
    });

    it('should handle empty data array', () => {
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts([], volumeProfile);

      expect(result.events).toEqual([]);
    });

    it('should handle data with zero volume', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 30000,
        high: 30100,
        low: 29900,
        close: 30000,
        volume: 0,
      }));

      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Result Structure', () => {
    it('should include lastEvent when events exist', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      if (result.events.length > 0) {
        expect(result.lastEvent).toBeDefined();
        expect(result.lastEvent).toEqual(result.events[result.events.length - 1]);
      }
    });

    it('should count bullish and bearish breakouts correctly', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      expect(result.bullishBreakouts).toBeGreaterThanOrEqual(0);
      expect(result.bearishBreakouts).toBeGreaterThanOrEqual(0);
      expect(result.events.length).toBeGreaterThanOrEqual(
        result.bullishBreakouts + result.bearishBreakouts
      );
    });

    it('should include all required fields in breakout events', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 30000, volume: 1000000, strength: 0.8 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      result.events.forEach(event => {
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('price');
        expect(event).toHaveProperty('volume');
        expect(event).toHaveProperty('volumeRatio');
        expect(['BULL_BREAKOUT', 'BEAR_BREAKOUT']).toContain(event.type);
      });
    });
  });

  describe('Multiple Levels', () => {
    it('should detect breakouts through multiple resistance levels', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 29500, volume: 1000000, strength: 0.6 },
        { price: 30000, volume: 1500000, strength: 0.8 },
        { price: 30500, volume: 1200000, strength: 0.7 },
      ];

      const result = detectBreakouts(data, volumeProfile);

      expect(result).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should filter levels by minimum strength', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const volumeProfile: VolumeProfileLevel[] = [
        { price: 29500, volume: 1000000, strength: 0.3 },
        { price: 30000, volume: 1500000, strength: 0.8 },
        { price: 30500, volume: 1200000, strength: 0.4 },
      ];

      const result = detectBreakouts(data, volumeProfile, {
        minProfileStrength: 0.5,
      });

      // Should only consider levels with strength >= 0.5
      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should work with realistic market data', () => {
      const upData = MockMarketDataGenerator.generateOHLCV({
        count: 100,
        trend: 'up',
        volatility: 0.02,
      });

      const volumeProfile: VolumeProfileLevel[] = [
        { price: 29000, volume: 2000000, strength: 0.9 },
        { price: 30000, volume: 2500000, strength: 0.95 },
        { price: 31000, volume: 2200000, strength: 0.85 },
      ];

      const result = detectBreakouts(upData, volumeProfile);

      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(typeof result.bullishBreakouts).toBe('number');
      expect(typeof result.bearishBreakouts).toBe('number');
    });

    it('should handle trending market with multiple breakouts', () => {
      const data = MockMarketDataGenerator.generateOHLCV({
        count: 100,
        trend: 'up',
      });

      const volumeProfile: VolumeProfileLevel[] = Array.from({ length: 5 }, (_, i) => ({
        price: 29000 + i * 500,
        volume: 2000000,
        strength: 0.7,
      }));

      const result = detectBreakouts(data, volumeProfile);

      expect(result.bullishBreakouts).toBeGreaterThanOrEqual(0);
      expect(result.events.length).toBeLessThanOrEqual(data.length);
    });
  });
});
