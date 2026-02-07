/**
 * CacheManager - Unified caching utility for API responses
 * 
 * This module provides a centralized caching solution with TTL support,
 * reducing duplication across MarketDataService, DataAggregator, and API routes.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  lastAccessed: number; // Track last access time for true LRU
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
}

export class CacheManager<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl ?? 300000; // 5 minutes default
    this.maxSize = options.maxSize ?? 1000;
  }

  /**
   * Get cached value if it exists and hasn't expired
   * Updates last accessed time for LRU tracking
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return undefined;
    }

    // Update last accessed time for LRU tracking
    // Delete first to update Map iteration order
    const now = Date.now();
    this.cache.delete(key);
    this.cache.set(key, {
      ...entry,
      lastAccessed: now,
    });
    
    return entry.data;
  }

  /**
   * Set cache value with optional custom TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    
    // Enforce max size by removing least recently accessed entry (true LRU)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Find least recently accessed entry
      let lruKey: string | undefined;
      let oldestAccess = Infinity;
      
      for (const [k, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestAccess) {
          oldestAccess = entry.lastAccessed;
          lruKey = k;
        }
      }
      
      if (lruKey) this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttl ?? this.defaultTTL,
      lastAccessed: now,
    });
  }

  /**
   * Check if key exists and hasn't expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Clear specific key or all cache
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

/**
 * Create a cache manager with specific configuration
 */
export function createCacheManager<T = unknown>(options?: CacheOptions): CacheManager<T> {
  return new CacheManager<T>(options);
}
