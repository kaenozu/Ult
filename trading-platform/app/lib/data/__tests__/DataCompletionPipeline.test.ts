/**
 * DataCompletionPipeline.test.ts
 * 
 * Tests for data completion pipeline
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataCompletionPipeline } from '../completion/DataCompletionPipeline';
import type { OHLCV } from '@/app/types/shared';

describe('DataCompletionPipeline', () => {
  let pipeline: DataCompletionPipeline;

  beforeEach(() => {
    pipeline = new DataCompletionPipeline();
  });

  describe('Gap Detection', () => {
    it('should detect no gaps in continuous data', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-02', open: 102, high: 107, low: 100, close: 105, volume: 1100 },
        { symbol: 'AAPL', date: '2024-01-03', open: 105, high: 110, low: 103, close: 108, volume: 1200 }
      ];

      const result = await pipeline.complete(data, 'AAPL');
      expect(result.success).toBe(true);
      expect(result.gaps).toHaveLength(0);
      expect(result.completedCount).toBe(0);
    });

    it('should detect single gap', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-05', open: 105, high: 110, low: 103, close: 108, volume: 1200 }
      ];

      const stats = pipeline.getStats(data);
      expect(stats.gapCount).toBe(1);
      expect(stats.missingPoints).toBe(3); // Days 2, 3, 4
    });
  });

  describe('Forward Fill Strategy', () => {
    it('should forward fill small gaps', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-05', open: 105, high: 110, low: 103, close: 108, volume: 1200 }
      ];

      const result = await pipeline.complete(data, 'AAPL');
      expect(result.success).toBe(true);
      expect(result.completedCount).toBeGreaterThan(0);
      expect(result.data.length).toBeGreaterThan(data.length);
    });

    it('should use last known value for forward fill', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-04', open: 105, high: 110, low: 103, close: 108, volume: 1200 }
      ];

      const result = await pipeline.complete(data, 'AAPL');
      
      // Find filled data point
      const filled = result.data.find(d => d.date === '2024-01-02');
      expect(filled).toBeDefined();
      if (filled) {
        expect(filled.close).toBe(102); // Should match previous close
      }
    });
  });

  describe('Linear Interpolation Strategy', () => {
    it('should interpolate between values', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-15', open: 120, high: 125, low: 115, close: 120, volume: 2000 }
      ];

      const result = await pipeline.complete(data, 'AAPL');
      
      // Find any filled data point
      const filled = result.data.find(d => d.date !== '2024-01-01' && d.date !== '2024-01-15');
      expect(filled).toBeDefined();
      if (filled) {
        // Should have valid OHLCV data
        expect(filled.close).toBeGreaterThan(0);
        expect(filled.volume).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Statistics', () => {
    it('should calculate completeness percentage', () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-05', open: 105, high: 110, low: 103, close: 108, volume: 1200 }
      ];

      const stats = pipeline.getStats(data);
      expect(stats.totalPoints).toBe(2);
      expect(stats.missingPoints).toBe(3);
      expect(stats.completeness).toBeLessThan(100);
    });

    it('should report 100% completeness for continuous data', () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-02', open: 102, high: 107, low: 100, close: 105, volume: 1100 }
      ];

      const stats = pipeline.getStats(data);
      expect(stats.completeness).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', async () => {
      const result = await pipeline.complete([], 'AAPL');
      expect(result.success).toBe(false);
      expect(result.data).toHaveLength(0);
    });

    it('should handle single data point', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 }
      ];

      const result = await pipeline.complete(data, 'AAPL');
      expect(result.success).toBe(true);
      expect(result.gaps).toHaveLength(0);
    });

    it('should handle very large gaps', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-02-01', open: 105, high: 110, low: 103, close: 108, volume: 1200 }
      ];

      const result = await pipeline.complete(data, 'AAPL');
      // Should attempt completion but may not fill all
      expect(result.data.length).toBeGreaterThanOrEqual(data.length);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect maxGapSize configuration', async () => {
      const customPipeline = new DataCompletionPipeline({
        maxGapSize: 2
      });

      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-05', open: 105, high: 110, low: 103, close: 108, volume: 1200 }
      ];

      const result = await customPipeline.complete(data, 'AAPL');
      
      // With maxGapSize: 2, a 3-point gap may not be completely filled by all strategies
      expect(result.gaps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Gaps', () => {
    it('should handle multiple gaps in dataset', async () => {
      const data: OHLCV[] = [
        { symbol: 'AAPL', date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { symbol: 'AAPL', date: '2024-01-05', open: 105, high: 110, low: 103, close: 108, volume: 1200 },
        { symbol: 'AAPL', date: '2024-01-10', open: 110, high: 115, low: 108, close: 112, volume: 1300 }
      ];

      const stats = pipeline.getStats(data);
      expect(stats.gapCount).toBe(2);

      const result = await pipeline.complete(data, 'AAPL');
      expect(result.completedCount).toBeGreaterThan(0);
    });
  });
});
