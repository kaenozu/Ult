/**
 * Performance and correctness test for Bollinger Bands optimization (PR #995)
 * 
 * This test verifies:
 * 1. The O(N) implementation produces the same results as a naive O(N*P) implementation
 * 2. The optimized implementation is significantly faster (target: ~3x speedup)
 */

import { technicalIndicatorService } from '../TechnicalIndicatorService';

/**
 * Naive O(N*P) implementation for comparison
 */
function naiveBollingerBands(
  prices: number[],
  period: number,
  standardDeviations: number
): { upper: number[]; middle: number[]; lower: number[] } {
  const length = prices.length;
  const upper: number[] = new Array(length);
  const middle: number[] = new Array(length);
  const lower: number[] = new Array(length);

  for (let i = 0; i < length; i++) {
    if (i < period - 1) {
      middle[i] = NaN;
      upper[i] = NaN;
      lower[i] = NaN;
      continue;
    }

    // Calculate mean by iterating over window (O(P) per iteration)
    let sum = 0;
    let count = 0;
    for (let j = 0; j < period; j++) {
      const val = prices[i - j];
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    }

    if (count !== period) {
      middle[i] = NaN;
      upper[i] = NaN;
      lower[i] = NaN;
      continue;
    }

    const mean = sum / period;

    // Calculate standard deviation by iterating over window again (O(P))
    let variance = 0;
    for (let j = 0; j < period; j++) {
      const val = prices[i - j];
      const diff = val - mean;
      variance += diff * diff;
    }
    variance = variance / period;
    const stdDev = Math.sqrt(variance);

    middle[i] = mean;
    upper[i] = mean + standardDeviations * stdDev;
    lower[i] = mean - standardDeviations * stdDev;
  }

  return { upper, middle, lower };
}

describe('Bollinger Bands Optimization (PR #995)', () => {
  describe('Correctness Verification', () => {
    it('should produce identical results to naive implementation for small dataset', () => {
      const prices = [100, 102, 101, 105, 103, 107, 106, 110, 108, 112, 111, 115, 113, 117, 116, 120, 118, 122, 121, 125];
      const period = 10;
      const stdDev = 2;

      const optimized = technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
      const naive = naiveBollingerBands(prices, period, stdDev);

      expect(optimized.upper.length).toBe(naive.upper.length);
      expect(optimized.middle.length).toBe(naive.middle.length);
      expect(optimized.lower.length).toBe(naive.lower.length);

      for (let i = 0; i < prices.length; i++) {
        if (isNaN(naive.middle[i])) {
          expect(optimized.middle[i]).toBeNaN();
          expect(optimized.upper[i]).toBeNaN();
          expect(optimized.lower[i]).toBeNaN();
        } else {
          expect(optimized.middle[i]).toBeCloseTo(naive.middle[i], 10);
          expect(optimized.upper[i]).toBeCloseTo(naive.upper[i], 10);
          expect(optimized.lower[i]).toBeCloseTo(naive.lower[i], 10);
        }
      }
    });

    it('should handle volatile prices correctly', () => {
      const prices = [100, 150, 80, 130, 90, 140, 85, 145, 95, 135, 100, 150, 80, 130, 90, 140, 85, 145, 95, 135];
      const period = 5;
      const stdDev = 2;

      const optimized = technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
      const naive = naiveBollingerBands(prices, period, stdDev);

      for (let i = period - 1; i < prices.length; i++) {
        expect(optimized.middle[i]).toBeCloseTo(naive.middle[i], 10);
        expect(optimized.upper[i]).toBeCloseTo(naive.upper[i], 10);
        expect(optimized.lower[i]).toBeCloseTo(naive.lower[i], 10);
      }
    });

    it('should handle edge case with minimal data', () => {
      const prices = [100, 101, 102, 103, 104];
      const period = 5;
      const stdDev = 2;

      const optimized = technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
      const naive = naiveBollingerBands(prices, period, stdDev);

      // First 4 should be NaN, last one should have valid values
      for (let i = 0; i < 4; i++) {
        expect(optimized.middle[i]).toBeNaN();
        expect(optimized.upper[i]).toBeNaN();
        expect(optimized.lower[i]).toBeNaN();
      }

      expect(optimized.middle[4]).toBeCloseTo(naive.middle[4], 10);
      expect(optimized.upper[4]).toBeCloseTo(naive.upper[4], 10);
      expect(optimized.lower[4]).toBeCloseTo(naive.lower[4], 10);
    });
  });

  describe('Performance Verification', () => {
    it('should demonstrate significant speedup on large dataset', () => {
      // Generate a large dataset (1000 data points)
      const size = 1000;
      const prices: number[] = [];
      for (let i = 0; i < size; i++) {
        prices.push(100 + Math.sin(i / 10) * 20 + Math.random() * 5);
      }

      const period = 20;
      const stdDev = 2;

      // Warm-up runs
      technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
      naiveBollingerBands(prices, period, stdDev);

      // Measure optimized implementation
      const optimizedStart = performance.now();
      for (let i = 0; i < 100; i++) {
        technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
      }
      const optimizedEnd = performance.now();
      const optimizedTime = optimizedEnd - optimizedStart;

      // Measure naive implementation
      const naiveStart = performance.now();
      for (let i = 0; i < 100; i++) {
        naiveBollingerBands(prices, period, stdDev);
      }
      const naiveEnd = performance.now();
      const naiveTime = naiveEnd - naiveStart;

      const speedup = naiveTime / optimizedTime;

      console.log(`Bollinger Bands Performance (${size} points, ${period} period):`);
      console.log(`  Optimized: ${optimizedTime.toFixed(2)}ms (100 iterations)`);
      console.log(`  Naive:     ${naiveTime.toFixed(2)}ms (100 iterations)`);
      console.log(`  Speedup:   ${speedup.toFixed(2)}x`);

      // Verify that optimized is faster (should be at least 1.5x faster, target is 3x)
      expect(speedup).toBeGreaterThan(1.5);
    });

    it('should maintain good performance with large period', () => {
      const size = 500;
      const prices: number[] = [];
      for (let i = 0; i < size; i++) {
        prices.push(100 + Math.sin(i / 10) * 20 + Math.random() * 5);
      }

      const period = 50; // Large period
      const stdDev = 2;

      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
      }
      const end = performance.now();
      const time = end - start;

      console.log(`Large period performance (${size} points, ${period} period): ${time.toFixed(2)}ms (50 iterations)`);

      // Should complete 50 iterations in reasonable time (< 1 second)
      expect(time).toBeLessThan(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const result = technicalIndicatorService.calculateBollingerBands([], 20, 2);
      expect(result.upper).toEqual([]);
      expect(result.middle).toEqual([]);
      expect(result.lower).toEqual([]);
    });

    it('should handle array shorter than period', () => {
      const prices = [100, 101, 102];
      const result = technicalIndicatorService.calculateBollingerBands(prices, 5, 2);
      
      expect(result.upper.length).toBe(3);
      expect(result.middle.length).toBe(3);
      expect(result.lower.length).toBe(3);
      
      result.upper.forEach(val => expect(val).toBeNaN());
      result.middle.forEach(val => expect(val).toBeNaN());
      result.lower.forEach(val => expect(val).toBeNaN());
    });

    it('should handle NaN values in data', () => {
      const prices = [100, 101, NaN, 103, 104, 105, 106, 107, 108, 109, 110];
      const result = technicalIndicatorService.calculateBollingerBands(prices, 5, 2);
      
      // Due to NaN at index 2, calculations around that point should be affected
      expect(result.middle.length).toBe(11);
      
      // First 4 should be NaN (period - 1)
      for (let i = 0; i < 4; i++) {
        expect(result.middle[i]).toBeNaN();
      }
    });

    it('should return proper band relationships', () => {
      const prices = [100, 102, 101, 105, 103, 107, 106, 110, 108, 112];
      const result = technicalIndicatorService.calculateBollingerBands(prices, 5, 2);
      
      // For all valid points, upper >= middle >= lower
      for (let i = 4; i < prices.length; i++) {
        if (!isNaN(result.middle[i])) {
          expect(result.upper[i]).toBeGreaterThanOrEqual(result.middle[i]);
          expect(result.middle[i]).toBeGreaterThanOrEqual(result.lower[i]);
        }
      }
    });

    it('should handle constant prices (zero volatility)', () => {
      const prices = new Array(20).fill(100);
      const result = technicalIndicatorService.calculateBollingerBands(prices, 10, 2);
      
      // For constant prices, all bands should converge to the same value
      for (let i = 9; i < prices.length; i++) {
        expect(result.middle[i]).toBe(100);
        expect(result.upper[i]).toBe(100); // stdDev is 0
        expect(result.lower[i]).toBe(100);
      }
    });
  });
});
