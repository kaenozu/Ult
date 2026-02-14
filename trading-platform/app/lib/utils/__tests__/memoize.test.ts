/**
 * Tests for memoization utilities
 */

import {
  memoize,
  memoizeWithStats,
  numericKeyGenerator,
  rsiKeyGenerator,
  momentumKeyGenerator,
  smaKeyGenerator,
  confidenceKeyGenerator
} from '../memoize';

describe('memoize', () => {
  describe('basic memoization', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const fn = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const memoized = memoize(fn);

      expect(memoized(1, 2)).toBe(3);
      expect(callCount).toBe(1);

      expect(memoized(1, 2)).toBe(3);
      expect(callCount).toBe(1); // Not called again
    });

    it('should handle different arguments', () => {
      let callCount = 0;
      const fn = (a: number, b: number) => {
        callCount++;
        return a * b;
      };

      const memoized = memoize(fn);

      expect(memoized(2, 3)).toBe(6);
      expect(callCount).toBe(1);

      expect(memoized(3, 4)).toBe(12);
      expect(callCount).toBe(2);

      expect(memoized(2, 3)).toBe(6);
      expect(callCount).toBe(2); // Cached
    });

    it('should work with single argument', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x * x;
      };

      const memoized = memoize(fn);

      expect(memoized(5)).toBe(25);
      expect(callCount).toBe(1);

      expect(memoized(5)).toBe(25);
      expect(callCount).toBe(1); // Cached
    });

    it('should work with no arguments', () => {
      let callCount = 0;
      const fn = () => {
        callCount++;
        return Math.random();
      };

      const memoized = memoize(fn);

      const result1 = memoized();
      expect(callCount).toBe(1);

      const result2 = memoized();
      expect(callCount).toBe(1); // Cached
      expect(result1).toBe(result2);
    });
  });

  describe('cache size management', () => {
    it('should respect maxSize option', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = memoize(fn, { maxSize: 2 });

      memoized(1); // cache: [1]
      memoized(2); // cache: [1, 2]
      memoized(3); // cache: [2, 3] (1 evicted)

      expect(callCount).toBe(3);

      memoized(2); // cache hit
      expect(callCount).toBe(3);

      memoized(1); // cache miss (was evicted)
      expect(callCount).toBe(4);
    });

    it('should handle maxSize of 1', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x;
      };

      const memoized = memoize(fn, { maxSize: 1 });

      memoized(1);
      memoized(2);
      memoized(1); // Should be cache miss

      expect(callCount).toBe(3);
    });
  });

  describe('TTL (time-to-live)', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire cache entries after TTL', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = memoize(fn, { ttl: 1000 });

      memoized(5);
      expect(callCount).toBe(1);

      memoized(5);
      expect(callCount).toBe(1); // Cached

      jest.advanceTimersByTime(1001);

      memoized(5);
      expect(callCount).toBe(2); // Expired and recalculated
    });

    it('should not expire entries before TTL', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = memoize(fn, { ttl: 1000 });

      memoized(5);
      jest.advanceTimersByTime(999);
      memoized(5);

      expect(callCount).toBe(1); // Still cached
    });
  });

  describe('custom key generators', () => {
    it('should use custom key generator', () => {
      let callCount = 0;
      const fn = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const customKey = (a: number, b: number) => `${a}_${b}`;
      const memoized = memoize(fn, {}, customKey);

      memoized(1, 2);
      memoized(1, 2);

      expect(callCount).toBe(1);
    });

    it('should work with numericKeyGenerator', () => {
      let callCount = 0;
      const fn = (...nums: number[]) => {
        callCount++;
        return nums.reduce((a, b) => a + b, 0);
      };

      const memoized = memoize(fn, {}, numericKeyGenerator);

      expect(memoized(1, 2, 3)).toBe(6);
      expect(memoized(1, 2, 3)).toBe(6);
      expect(callCount).toBe(1);
    });
  });

  describe('specialized key generators', () => {
    it('rsiKeyGenerator should round to 2 decimals', () => {
      expect(rsiKeyGenerator(45.123456)).toBe('45.12');
      expect(rsiKeyGenerator(45.126)).toBe('45.13');
    });

    it('momentumKeyGenerator should combine values', () => {
      expect(momentumKeyGenerator(2.5, 2.0)).toBe('2.50_2');
      expect(momentumKeyGenerator(-1.234, 1.5)).toBe('-1.23_1.5');
    });

    it('smaKeyGenerator should combine sma values', () => {
      expect(smaKeyGenerator(100.5, 95.3)).toBe('100.50_95.30');
    });

    it('confidenceKeyGenerator should combine all values', () => {
      expect(confidenceKeyGenerator(50, 2.5, 1.2)).toBe('50.00_2.50_1.20');
    });
  });

  describe('memoizeWithStats', () => {
    it('should track cache statistics', () => {
      const fn = (x: number) => x * 2;
      const { memoized, getStats } = memoizeWithStats(fn);

      memoized(1); // miss
      memoized(1); // hit
      memoized(2); // miss
      memoized(1); // hit

      const stats = getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      const fn = (x: number) => x;
      const { memoized, getStats } = memoizeWithStats(fn);

      for (let i = 0; i < 10; i++) {
        memoized(1); // First is miss, rest are hits
      }

      const stats = getStats();
      expect(stats.hits).toBe(9);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.9);
    });

    it('should clear cache and stats', () => {
      const fn = (x: number) => x * 2;
      const { memoized, getStats, clearCache } = memoizeWithStats(fn);

      memoized(1);
      memoized(1);
      memoized(2);

      clearCache();

      const stats = getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should handle initial state', () => {
      const fn = (x: number) => x;
      const { getStats } = memoizeWithStats(fn);

      const stats = getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should track TTL expiration as miss', () => {
      jest.useFakeTimers();

      const fn = (x: number) => x;
      const { memoized, getStats } = memoizeWithStats(fn, { ttl: 1000 });

      memoized(1); // miss
      memoized(1); // hit

      jest.advanceTimersByTime(1001);

      memoized(1); // miss (expired)

      const stats = getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);

      jest.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should demonstrate JSON.stringify limitation with undefined/null', () => {
      let callCount = 0;
      const fn = (x: any) => {
        callCount++;
        return x;
      };

      const memoized = memoize(fn);

      const result1 = memoized(undefined);
      expect(result1).toBe(undefined);
      expect(callCount).toBe(1);

      // Due to JSON.stringify limitation, [undefined] and [null] both become "[null]"
      // so they share the same cache key
      const result2 = memoized(null);
      expect(result2).toBe(null); // Cache returns null (same cache key as undefined)
      expect(callCount).toBe(1); // Cache hit

      // To avoid this, use a custom key generator for sensitive cases
    });

    it('should handle complex objects', () => {
      let callCount = 0;
      const fn = (obj: { a: number; b: number }) => {
        callCount++;
        return obj.a + obj.b;
      };

      const memoized = memoize(fn);

      memoized({ a: 1, b: 2 });
      memoized({ a: 1, b: 2 }); // Same object structure

      expect(callCount).toBe(1);
    });

    it('should differentiate similar but different objects', () => {
      let callCount = 0;
      const fn = (obj: { a: number; b?: number }) => {
        callCount++;
        return obj.a;
      };

      const memoized = memoize(fn);

      memoized({ a: 1 });
      memoized({ a: 1, b: 2 });

      expect(callCount).toBe(2);
    });

    it('should handle array arguments', () => {
      let callCount = 0;
      const fn = (arr: number[]) => {
        callCount++;
        return arr.reduce((a, b) => a + b, 0);
      };

      const memoized = memoize(fn);

      memoized([1, 2, 3]);
      memoized([1, 2, 3]);

      expect(callCount).toBe(1);
    });
  });
});
