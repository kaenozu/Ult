/**
 * SmartDataCache Tests
 */

import { SmartDataCache } from '../cache/SmartDataCache';

describe('SmartDataCache', () => {
  let cache: SmartDataCache<string>;

  beforeEach(() => {
    cache = new SmartDataCache<string>({
      maxSize: 5,
      defaultTTL: 1000,
      enablePrefetch: true,
      enableMetrics: true
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete entry', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('should return correct size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100);
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL if not specified', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should cleanup expired entries', async () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 1000);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const removed = cache.cleanup();
      expect(removed).toBe(1);
      expect(cache.size()).toBe(1);
      expect(cache.has('key2')).toBe(true);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when max size reached', async () => {
      cache.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10));
      cache.set('key2', 'value2');
      await new Promise(resolve => setTimeout(resolve, 10));
      cache.set('key3', 'value3');
      await new Promise(resolve => setTimeout(resolve, 10));
      cache.set('key4', 'value4');
      await new Promise(resolve => setTimeout(resolve, 10));
      cache.set('key5', 'value5');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Access key1 to make it recently used
      cache.get('key1');
      
      // Adding key6 should evict the least recently used (key2, since key1 was just accessed)
      cache.set('key6', 'value6');
      
      expect(cache.size()).toBe(5);
      // Key1 should still be in cache because we just accessed it
      expect(cache.has('key1')).toBe(true);
      // Key6 should be in cache because we just added it
      expect(cache.has('key6')).toBe(true);
      // Key2 should be evicted as it was the least recently used
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('Tags', () => {
    it('should support tags', () => {
      cache.set('key1', 'value1', undefined, ['tag1', 'tag2']);
      cache.set('key2', 'value2', undefined, ['tag1']);
      cache.set('key3', 'value3', undefined, ['tag3']);
      
      const cleared = cache.clearByTag('tag1');
      expect(cleared).toBe(2);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if available', async () => {
      cache.set('key1', 'cached');
      
      const fetcher = jest.fn().mockResolvedValue('fetched');
      const result = await cache.getOrFetch('key1', fetcher);
      
      expect(result).toBe('cached');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not available', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched');
      const result = await cache.getOrFetch('key1', fetcher);
      
      expect(result).toBe('fetched');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cache.get('key1')).toBe('fetched');
    });
  });

  describe('Metrics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');
      
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      cache.get('key1'); // hit
      cache.get('key3'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.5, 2);
    });

    it('should track evictions', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2');
      
      cache.resetStats();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Prefetch', () => {
    it('should add and use prefetch strategy', async () => {
      const fetcher = jest.fn().mockResolvedValue('prefetched');
      
      cache.addPrefetchStrategy({
        name: 'test-strategy',
        predicate: (key) => key.startsWith('test-'),
        fetcher: fetcher,
        priority: 1
      });
      
      await cache.prefetch('test-key1');
      
      expect(fetcher).toHaveBeenCalledWith('test-key1');
      expect(cache.get('test-key1')).toBe('prefetched');
    });

    it('should not prefetch if key already cached', async () => {
      const fetcher = jest.fn().mockResolvedValue('prefetched');
      
      cache.set('test-key1', 'existing');
      
      cache.addPrefetchStrategy({
        name: 'test-strategy',
        predicate: (key) => key.startsWith('test-'),
        fetcher: fetcher,
        priority: 1
      });
      
      await cache.prefetch('test-key1');
      
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should warm up cache with multiple keys', async () => {
      const fetcher = jest.fn()
        .mockImplementation((key) => Promise.resolve(`value-${key}`));
      
      cache.addPrefetchStrategy({
        name: 'test-strategy',
        predicate: (key) => key.startsWith('test-'),
        fetcher: fetcher,
        priority: 1
      });
      
      await cache.warmUp(['test-1', 'test-2', 'test-3']);
      
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(cache.get('test-1')).toBe('value-test-1');
      expect(cache.get('test-2')).toBe('value-test-2');
      expect(cache.get('test-3')).toBe('value-test-3');
    });

    it('should remove prefetch strategy', () => {
      cache.addPrefetchStrategy({
        name: 'test-strategy',
        predicate: () => true,
        fetcher: async () => 'value',
        priority: 1
      });
      
      cache.removePrefetchStrategy('test-strategy');
      
      // Verify strategy was removed (prefetch should not work)
      cache.prefetch('key1');
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('Export', () => {
    it('should export cache contents', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const exported = cache.export();
      
      expect(exported.length).toBe(2);
      expect(exported[0].key).toBeDefined();
      expect(exported[0].value).toBeDefined();
      expect(exported[0].age).toBeGreaterThanOrEqual(0);
      expect(exported[0].hits).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Auto Cleanup', () => {
    it('should start and stop auto cleanup', async () => {
      cache.set('key1', 'value1', 100);
      
      const stopCleanup = cache.startAutoCleanup(200);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(cache.size()).toBe(0);
      
      stopCleanup();
    }, 10000);
  });

  describe('Edge Cases', () => {
    it('should handle setting same key multiple times', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      
      expect(cache.get('key1')).toBe('value2');
      expect(cache.size()).toBe(1);
    });

    it('should handle undefined values', () => {
      cache.set('key1', undefined as any);
      expect(cache.has('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should handle empty cache operations', () => {
      expect(cache.size()).toBe(0);
      expect(cache.keys()).toEqual([]);
      expect(cache.cleanup()).toBe(0);
      cache.clear(); // should not throw
    });
  });
});
