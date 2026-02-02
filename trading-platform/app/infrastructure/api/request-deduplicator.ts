/**
 * Request Deduplicator
 * 
 * Prevents duplicate API requests and implements intelligent caching
 * to reduce network traffic and improve performance.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  private cache = new Map<string, CacheEntry<any>>();
  private CACHE_TTL: number;
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_PENDING_REQUESTS = 50;

  constructor(ttlMs: number = 5000) {
    this.CACHE_TTL = ttlMs;
  }

  /**
   * Fetch with deduplication and caching
   * 
   * @param key - Unique identifier for request
   * @param fetcher - Function that returns a Promise with data
   * @param ttl - Optional custom TTL for this specific request
   * @returns Promise with fetched data
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached !== null) {
      console.debug(`[RequestDeduplicator] Cache hit: ${key}`);
      return cached;
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.debug(`[RequestDeduplicator] Request already pending: ${key}`);
      return pending;
    }

    // Limit number of pending requests
    if (this.pendingRequests.size >= this.MAX_PENDING_REQUESTS) {
      console.warn(
        `[RequestDeduplicator] Too many pending requests, ` +
        `dropping oldest: ${this.pendingRequests.keys().next().value}`
      );
      const oldestKey = this.pendingRequests.keys().next().value;
      if (oldestKey) {
        this.pendingRequests.delete(oldestKey);
      }
    }

    // Make new request
    const promise = fetcher()
      .then(data => {
        // Cache result
        this.setCache(key, data, ttl);
        
        // Clean up pending request
        this.pendingRequests.delete(key);
        
        return data;
      })
      .catch(error => {
        // Clean up pending request on error
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Get value from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with timestamp
   */
  private setCache<T>(key: string, data: T, ttl?: number): void {
    // Limit cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries (FIFO)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // If custom TTL is provided, set up auto-expiry
    if (ttl && ttl !== this.CACHE_TTL) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  /**
   * Clear all cached values
   */
  clearCache(): void {
    this.cache.clear();
    console.debug('[RequestDeduplicator] Cache cleared');
  }

  /**
   * Clear cache for a specific key
   */
  clearCacheKey(key: string): void {
    this.cache.delete(key);
    console.debug(`[RequestDeduplicator] Cache cleared for: ${key}`);
  }

  /**
   * Clear cache for keys matching a pattern
   */
  clearCachePattern(pattern: string | RegExp): void {
    const keys = Array.from(this.cache.keys());
    
    for (const key of keys) {
      let shouldDelete = false;
      
      if (typeof pattern === 'string') {
        shouldDelete = key.includes(pattern);
      } else if (pattern instanceof RegExp) {
        shouldDelete = pattern.test(key);
      }
      
      if (shouldDelete) {
        this.cache.delete(key);
      }
    }
    
    console.debug(`[RequestDeduplicator] Cache cleared for pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      maxCacheSize: this.MAX_CACHE_SIZE,
      maxPendingRequests: this.MAX_PENDING_REQUESTS,
      cacheTTL: this.CACHE_TTL,
    };
  }

  /**
   * Prefetch data for a given key
   * 
   * Useful for loading data before it's needed
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    // Only prefetch if not already cached or pending
    if (this.getFromCache<T>(key) !== null || this.pendingRequests.has(key)) {
      return;
    }

    try {
      await this.fetch(key, fetcher, ttl);
      console.debug(`[RequestDeduplicator] Prefetched: ${key}`);
    } catch (error) {
      console.warn(`[RequestDeduplicator] Prefetch failed: ${key}`, error);
      // Don't throw - prefetch failures shouldn't block app
    }
  }

  /**
   * Invalidate cache entries
   * 
   * @param keys - Array of keys to invalidate
   */
  invalidate(keys: string[]): void {
    for (const key of keys) {
      this.cache.delete(key);
    }
    console.debug(`[RequestDeduplicator] Invalidated ${keys.length} cache entries`);
  }

  /**
   * Get all cache keys
   */
  getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all pending request keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }
}

// Global instance with default 5-second TTL
export const requestDeduplicator = new RequestDeduplicator(5000);

// Create instances with different TTLs for different use cases
export const shortTermCache = new RequestDeduplicator(1000); // 1 second
export const mediumTermCache = new RequestDeduplicator(5000); // 5 seconds
export const longTermCache = new RequestDeduplicator(30000); // 30 seconds
