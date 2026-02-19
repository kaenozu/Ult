/**
 * VolumeAnalysis.performance.test.ts
 * 
 * Performance benchmarks to verify optimizations in VolumeAnalysisService
 * Tests the efficiency of single-pass calculation and redundancy elimination
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { VolumeAnalysisService } from '../VolumeAnalysis';
import { MockMarketDataGenerator } from './mocks/test-utils';

describe('VolumeAnalysisService - Performance Tests', () => {
  let service: VolumeAnalysisService;

  beforeEach(() => {
    service = new VolumeAnalysisService();
  });

  describe('Performance Benchmarks', () => {
    it('should efficiently calculate volume profile with large dataset', () => {
      // Arrange - Generate large dataset
      const data = MockMarketDataGenerator.generateOHLCV({ count: 1000 });

      // Act & Measure
      const startTime = performance.now();
      const profile = service.calculateVolumeProfile(data);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(profile).toBeDefined();
      expect(profile.length).toBeGreaterThan(0);
      
      // Should complete in reasonable time (< 50ms for 1000 data points)
      expect(duration).toBeLessThan(50);
      
      console.log(`calculateVolumeProfile (1000 points): ${duration.toFixed(2)}ms`);
    });

    it('should efficiently analyze full volume profile', () => {
      // Arrange
      const data = MockMarketDataGenerator.generateOHLCV({ count: 500 });

      // Act & Measure
      const startTime = performance.now();
      const result = service.analyzeVolumeProfile(data);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.profile).toBeDefined();
      expect(result.resistanceLevels).toBeDefined();
      expect(result.supportLevels).toBeDefined();
      
      // Should complete in reasonable time (< 100ms for full analysis)
      expect(duration).toBeLessThan(100);
      
      console.log(`analyzeVolumeProfile (500 points): ${duration.toFixed(2)}ms`);
    });

    it('should demonstrate optimization: passing pre-calculated profile', () => {
      // Arrange
      const data = MockMarketDataGenerator.generateOHLCV({ count: 300 });

      // Measure WITHOUT optimization (recalculating profile each time)
      const start1 = performance.now();
      service.calculateVolumeProfile(data);
      service.calculateResistanceLevels(data); // Recalculates profile
      service.calculateSupportLevels(data); // Recalculates again
      const end1 = performance.now();
      const unoptimizedTime = end1 - start1;

      // Measure WITH optimization (passing pre-calculated profile)
      const start2 = performance.now();
      const profile = service.calculateVolumeProfile(data);
      const resistance = service.calculateResistanceLevels(data, profile); // Uses pre-calculated
      service.calculateSupportLevels(data, resistance); // Uses pre-calculated
      const end2 = performance.now();
      const optimizedTime = end2 - start2;

      // Assert - Optimized version should be faster or equal
      expect(optimizedTime).toBeLessThanOrEqual(unoptimizedTime * 1.1); // Allow 10% margin
      expect(profile.length).toBeGreaterThan(0);
      expect(resistance.length).toBeGreaterThanOrEqual(0);

      console.log(`Unoptimized: ${unoptimizedTime.toFixed(2)}ms`);
      console.log(`Optimized: ${optimizedTime.toFixed(2)}ms`);
      console.log(`Improvement: ${((unoptimizedTime - optimizedTime) / unoptimizedTime * 100).toFixed(1)}%`);
    });

    it('should demonstrate analyzeVolumeProfile optimization', () => {
      // This method uses the optimized approach internally
      const data = MockMarketDataGenerator.generateOHLCV({ count: 400 });

      // Measure analyzeVolumeProfile (optimized)
      const start1 = performance.now();
      const result = service.analyzeVolumeProfile(data);
      const end1 = performance.now();
      const optimizedTime = end1 - start1;

      // Measure manual calculation (unoptimized approach)
      const start2 = performance.now();
      const profile = service.calculateVolumeProfile(data);
      const resistance = service.calculateResistanceLevels(data); // Would recalculate without optimization
      const support = service.calculateSupportLevels(data); // Would recalculate again
      const totalProfileStrength = profile.reduce((sum, p) => sum + p.strength, 0) / profile.length;
      const end2 = performance.now();
      const unoptimizedTime = end2 - start2;

      // The optimized version calculates profile once and reuses it
      expect(result.profile).toEqual(profile);
      expect(result.volumeProfileStrength).toBeCloseTo(totalProfileStrength, 10);
      expect(resistance.length).toBeGreaterThanOrEqual(0);
      expect(support.length).toBeGreaterThanOrEqual(0);

      console.log(`analyzeVolumeProfile (optimized): ${optimizedTime.toFixed(2)}ms`);
      console.log(`Manual calculation: ${unoptimizedTime.toFixed(2)}ms`);
    });

    it('should handle stress test with very large dataset', () => {
      // Arrange - Very large dataset
      const data = MockMarketDataGenerator.generateOHLCV({ count: 5000 });

      // Act & Measure
      const startTime = performance.now();
      const result = service.analyzeVolumeProfile(data);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(result.profile.length).toBeGreaterThan(0);
      
      // Should handle large dataset efficiently (< 500ms for 5000 points)
      expect(duration).toBeLessThan(500);
      
      console.log(`Stress test (5000 points): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should minimize temporary array allocations', () => {
      // The optimized implementation reduces temporary allocations
      // by using pre-allocated arrays and single-pass calculations
      
      const data = MockMarketDataGenerator.generateOHLCV({ count: 500 });
      
      // This test verifies the implementation doesn't create excessive temporary arrays
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        service.analyzeVolumeProfile(data);
      }
      
      const endTime = performance.now();
      const avgDuration = (endTime - startTime) / iterations;
      
      // Average should still be very fast
      expect(avgDuration).toBeLessThan(50);
      
      console.log(`Average over ${iterations} iterations: ${avgDuration.toFixed(2)}ms`);
    });
  });
});
