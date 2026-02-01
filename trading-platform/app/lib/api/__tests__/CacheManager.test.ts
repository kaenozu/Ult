/**
 * CacheManager tests
 */

import { CacheManager } from '../CacheManager';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>({ ttl: 1000 }); // 1 second TTL for tests
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should handle multiple keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should support custom TTL per entry', async () => {
      cache.set('key1', 'value1', 500); // 500ms TTL
      cache.set('key2', 'value2', 2000); // 2s TTL

      await new Promise(resolve => setTimeout(resolve, 600));

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', async () => {
      cache.set('key1', 'value1', 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear('key1');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should clear all keys when no key specified', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return correct cache size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
  });

  describe('clearExpired', () => {
    it('should clear only expired entries', async () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 2000);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cleared = cache.clearExpired();
      expect(cleared).toBe(1);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('maxSize', () => {
    it('should enforce max size by removing oldest entry', () => {
      const smallCache = new CacheManager<string>({ maxSize: 2 });
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3'); // Should remove key1

      expect(smallCache.get('key1')).toBeUndefined();
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');
    });
  });

  describe('getOrFetch', () => {
    it('should fetch and cache if not present', async () => {
      const fetcher = jest.fn(async () => 'fetched-value');
      
      const result = await cache.getOrFetch('key1', fetcher);
      
      expect(result).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cache.get('key1')).toBe('fetched-value');
    });

    it('should return cached value without fetching', async () => {
      const fetcher = jest.fn(async () => 'fetched-value');
      
      cache.set('key1', 'cached-value');
      const result = await cache.getOrFetch('key1', fetcher);
      
      expect(result).toBe('cached-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch again after expiration', async () => {
      const fetcher = jest.fn(async () => 'fetched-value');
      
      await cache.getOrFetch('key1', fetcher, 100);
      expect(fetcher).toHaveBeenCalledTimes(1);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await cache.getOrFetch('key1', fetcher, 100);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
