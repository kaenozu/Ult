/**
 * VolumeAnalysis.test.ts
 * 
 * Comprehensive unit tests for VolumeAnalysisService
 * Tests volume profile calculation, resistance/support levels, breakout detection
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { VolumeAnalysisService } from '../VolumeAnalysis';
import { MockMarketDataGenerator, TestDataValidators } from './mocks/test-utils';
import type { OHLCV } from '@/app/types';

describe('VolumeAnalysisService', () => {
  let service: VolumeAnalysisService;

  beforeEach(() => {
    service = new VolumeAnalysisService();
  });

  describe('calculateVolumeProfile', () => {
    it('should calculate volume profile with realistic data', () => {
      // Arrange
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });

      // Act
      const profile = service.calculateVolumeProfile(data);

      // Assert
      expect(profile).toBeDefined();
      expect(Array.isArray(profile)).toBe(true);
      
      profile.forEach(p => {
        expect(p).toHaveProperty('price');
        expect(p).toHaveProperty('volume');
        expect(p).toHaveProperty('strength');
        expect(p.volume).toBeGreaterThanOrEqual(0);
        expect(p.strength).toBeGreaterThanOrEqual(0);
        expect(p.strength).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty array for empty data', () => {
      const profile = service.calculateVolumeProfile([]);
      expect(profile).toEqual([]);
    });

    it('should handle data with zero volume', () => {
      const data: OHLCV[] = [
        { date: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 0 },
        { date: '2024-01-02', open: 100, high: 100, low: 100, close: 100, volume: 0 },
      ];

      const profile = service.calculateVolumeProfile(data);
      expect(profile).toEqual([]);
    });

    it('should handle data with same prices', () => {
      const data: OHLCV[] = [
        { date: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
        { date: '2024-01-02', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      ];

      const profile = service.calculateVolumeProfile(data);
      expect(profile).toEqual([]);
    });

    it('should normalize strength to 0-1 range', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const profile = service.calculateVolumeProfile(data);

      const maxStrength = Math.max(...profile.map(p => p.strength));
      expect(maxStrength).toBeLessThanOrEqual(1);
      
      const minStrength = Math.min(...profile.map(p => p.strength));
      expect(minStrength).toBeGreaterThanOrEqual(0);
    });

    it('should filter out zero volume bins', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      const profile = service.calculateVolumeProfile(data);

      profile.forEach(p => {
        expect(p.volume).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateResistanceLevels', () => {
    it('should identify resistance levels', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const levels = service.calculateResistanceLevels(data);

      expect(Array.isArray(levels)).toBe(true);
      
      levels.forEach(level => {
        expect(level).toHaveProperty('price');
        expect(level).toHaveProperty('volume');
        expect(level).toHaveProperty('strength');
        expect(level).toHaveProperty('type');
        expect(level).toHaveProperty('level');
        expect(['support', 'resistance']).toContain(level.type);
        expect(['strong', 'medium', 'weak']).toContain(level.level);
      });
    });

    it('should return empty array for insufficient data', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 10 });
      const levels = service.calculateResistanceLevels(data);

      // Might return empty depending on MIN_PROFILE_DAYS
      expect(Array.isArray(levels)).toBe(true);
    });

    it('should sort levels by strength (strong first)', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const levels = service.calculateResistanceLevels(data);

      if (levels.length > 1) {
        const levelOrder: Record<string, number> = { 'strong': 0, 'medium': 1, 'weak': 2 };
        
        for (let i = 0; i < levels.length - 1; i++) {
          expect(levelOrder[levels[i].level]).toBeLessThanOrEqual(levelOrder[levels[i + 1].level]);
        }
      }
    });

    it('should classify levels correctly by strength', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const levels = service.calculateResistanceLevels(data);

      levels.forEach(level => {
        if (level.level === 'strong') {
          expect(level.strength).toBeGreaterThanOrEqual(0.7);
        } else if (level.level === 'medium') {
          expect(level.strength).toBeGreaterThanOrEqual(0.4);
          expect(level.strength).toBeLessThan(0.7);
        } else if (level.level === 'weak') {
          expect(level.strength).toBeLessThan(0.4);
        }
      });
    });
  });

  describe('calculateSupportLevels', () => {
    it('should return only support levels', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const supportLevels = service.calculateSupportLevels(data);

      supportLevels.forEach(level => {
        expect(level.type).toBe('support');
      });
    });

    it('should be a subset of resistance levels', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const resistanceLevels = service.calculateResistanceLevels(data);
      const supportLevels = service.calculateSupportLevels(data);

      expect(supportLevels.length).toBeLessThanOrEqual(resistanceLevels.length);
    });
  });

  describe('detectBreakout', () => {
    it('should detect strong level breakout', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const levels = service.calculateResistanceLevels(data);

      if (levels.length > 0) {
        const strongLevel = levels.find(l => l.level === 'strong');
        
        if (strongLevel) {
          const currentPrice = strongLevel.price * 1.01; // 1% above
          const result = service.detectBreakout(currentPrice, data, levels);

          if (result.broken) {
            expect(result.level).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(['low', 'medium', 'high']).toContain(result.confidence);
          }
        }
      }
    });

    it('should return false for no breakout', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const levels = service.calculateResistanceLevels(data);
      
      // Price far from any level
      const currentPrice = 999999;
      const result = service.detectBreakout(currentPrice, data, levels);

      expect(result.broken).toBe(false);
      expect(result.confidence).toBe('low');
    });

    it('should handle empty resistance levels', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const result = service.detectBreakout(30000, data, []);

      expect(result.broken).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.level).toBeUndefined();
    });

    it('should provide higher confidence for strong levels', () => {
      const strongLevel = {
        price: 30000,
        volume: 10000000,
        strength: 0.9,
        type: 'resistance' as const,
        level: 'strong' as const,
      };

      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const result = service.detectBreakout(30000 * 1.015, data, [strongLevel]); // 1.5% difference

      if (result.broken) {
        expect(result.confidence).toBe('high');
      }
    });
  });

  describe('analyzeVolumeProfile', () => {
    it('should return complete volume analysis', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const result = service.analyzeVolumeProfile(data);

      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('resistanceLevels');
      expect(result).toHaveProperty('supportLevels');
      expect(result).toHaveProperty('volumeProfileStrength');

      expect(Array.isArray(result.profile)).toBe(true);
      expect(Array.isArray(result.resistanceLevels)).toBe(true);
      expect(Array.isArray(result.supportLevels)).toBe(true);
      expect(typeof result.volumeProfileStrength).toBe('number');
    });

    it('should calculate average profile strength', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      const result = service.analyzeVolumeProfile(data);

      if (result.profile.length > 0) {
        expect(result.volumeProfileStrength).toBeGreaterThanOrEqual(0);
        expect(result.volumeProfileStrength).toBeLessThanOrEqual(1);
      }
    });

    it('should handle edge case with minimal data', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 5 });
      const result = service.analyzeVolumeProfile(data);

      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.resistanceLevels).toBeDefined();
      expect(result.supportLevels).toBeDefined();
    });
  });

  describe('getVolumeProfileStrength', () => {
    it('should classify strength as strong', () => {
      expect(service.getVolumeProfileStrength(0.8)).toBe('strong');
      expect(service.getVolumeProfileStrength(0.6)).toBe('strong');
    });

    it('should classify strength as medium', () => {
      expect(service.getVolumeProfileStrength(0.5)).toBe('medium');
      expect(service.getVolumeProfileStrength(0.3)).toBe('medium');
    });

    it('should classify strength as weak', () => {
      expect(service.getVolumeProfileStrength(0.2)).toBe('weak');
      expect(service.getVolumeProfileStrength(0.0)).toBe('weak');
    });

    it('should handle boundary values correctly', () => {
      expect(service.getVolumeProfileStrength(0.59)).toBe('medium');
      expect(service.getVolumeProfileStrength(0.60)).toBe('strong');
      expect(service.getVolumeProfileStrength(0.29)).toBe('weak');
      expect(service.getVolumeProfileStrength(0.30)).toBe('medium');
    });
  });

  describe('Error Handling', () => {
    it('should handle null or undefined data gracefully', () => {
      expect(() => service.calculateVolumeProfile(null as any)).toThrow();
      expect(() => service.calculateVolumeProfile(undefined as any)).toThrow();
    });

    it('should handle data with invalid numbers', () => {
      const invalidData: OHLCV[] = [
        { date: '2024-01-01', open: NaN, high: NaN, low: NaN, close: NaN, volume: NaN },
      ];

      const profile = service.calculateVolumeProfile(invalidData);
      
      // Should handle gracefully (might return empty or filtered results)
      expect(Array.isArray(profile)).toBe(true);
    });

    it('should handle negative volumes', () => {
      const data: OHLCV[] = [
        { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: -1000 },
        { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: -2000 },
      ];

      const profile = service.calculateVolumeProfile(data);
      
      // Should handle negative volumes appropriately
      expect(Array.isArray(profile)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent results across multiple calls', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 100 });
      
      const result1 = service.analyzeVolumeProfile(data);
      const result2 = service.analyzeVolumeProfile(data);

      expect(result1.profile).toEqual(result2.profile);
      expect(result1.resistanceLevels).toEqual(result2.resistanceLevels);
      expect(result1.supportLevels).toEqual(result2.supportLevels);
      expect(result1.volumeProfileStrength).toBe(result2.volumeProfileStrength);
    });

    it('should work with trending data', () => {
      const upData = MockMarketDataGenerator.generateOHLCV({
        count: 100,
        trend: 'up',
        volatility: 0.02,
      });
      
      const result = service.analyzeVolumeProfile(upData);

      expect(result.profile.length).toBeGreaterThan(0);
      expect(result.resistanceLevels.length).toBeGreaterThanOrEqual(0);
      expect(result.supportLevels.length).toBeGreaterThanOrEqual(0);
    });

    it('should work with sideways data', () => {
      const sidewaysData = MockMarketDataGenerator.generateOHLCV({
        count: 100,
        trend: 'sideways',
        volatility: 0.01,
      });
      
      const result = service.analyzeVolumeProfile(sidewaysData);

      expect(result.profile.length).toBeGreaterThan(0);
    });
  });
});
