import { logger } from '@/app/core/logger';
/**
 * SmartDataCache
 * 
 * Intelligent caching layer providing:
 * - In-memory cache with TTL
 * - Prefetch strategies for common queries
 * - Cache hit rate monitoring
 * - LRU eviction policy
 * - Automatic cache warming
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
}

export interface CacheConfig {
  maxSize?: number;
  defaultTTL?: number;
  enablePrefetch?: boolean;
  prefetchThreshold?: number;
  enableMetrics?: boolean;
}

export interface PrefetchStrategy {
  name: string;
  predicate: (key: string) => boolean;
  fetcher: (key: string) => Promise<unknown>;
  priority: number;
}

/**
 * Smart Data Cache
 * 
 * High-performance in-memory cache with intelligent features:
 * - TTL-based expiration
 * - LRU eviction when size limits are reached
 * - Automatic prefetching for hot data
 * - Comprehensive metrics and monitoring
 */
export class SmartDataCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private prefetchStrategies: PrefetchStrategy[] = [];
  private prefetchQueue: Set<string> = new Set();
  private isPrefetching = false;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 300000, // 5 minutes
      enablePrefetch: config.enablePrefetch !== false,
      prefetchThreshold: config.prefetchThreshold || 0.7,
      enableMetrics: config.enableMetrics !== false
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      maxSize: this.config.maxSize,
      evictions: 0
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableMetrics) {
        this.stats.misses++;
        this.updateHitRate();
      }
      this.checkPrefetch(key);
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.config.enableMetrics) {
        this.stats.misses++;
        this.stats.size--;
        this.updateHitRate();
      }
      return undefined;
    }

    // Update access metrics
    entry.hits++;
    entry.lastAccessed = Date.now();

    if (this.config.enableMetrics) {
      this.stats.hits++;
      this.updateHitRate();
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number, tags?: string[]): void {
    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
      lastAccessed: Date.now(),
      tags
    };

    const isNew = !this.cache.has(key);
    this.cache.set(key, entry);

    if (isNew && this.config.enableMetrics) {
      this.stats.size++;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.config.enableMetrics) {
        this.stats.size--;
      }
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result && this.config.enableMetrics) {
      this.stats.size--;
    }
    return result;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    if (this.config.enableMetrics) {
      this.stats.size = 0;
    }
  }

  /**
   * Clear entries by tag
   */
  clearByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (this.config.enableMetrics) {
      this.stats.size -= count;
    }
    
    return count;
  }

  /**
   * Get or fetch value
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl, tags);
    return value;
  }

  /**
   * Add prefetch strategy
   */
  addPrefetchStrategy(strategy: PrefetchStrategy): void {
    this.prefetchStrategies.push(strategy);
    this.prefetchStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove prefetch strategy
   */
  removePrefetchStrategy(name: string): void {
    this.prefetchStrategies = this.prefetchStrategies.filter(s => s.name !== name);
  }

  /**
   * Manually trigger prefetch for a key
   */
  async prefetch(key: string): Promise<void> {
    if (this.cache.has(key)) {
      return; // Already cached
    }

    const strategy = this.prefetchStrategies.find(s => s.predicate(key));
    if (!strategy) {
      return; // No strategy for this key
    }

    try {
      const value = await strategy.fetcher(key);
      this.set(key, value as T);
    } catch (error) {
      logger.error(`Prefetch failed for key "${key}":`, (error as Error) || new Error(String(error)));
    }
  }

  /**
   * Warm up cache with common queries
   */
  async warmUp(keys: string[]): Promise<void> {
    const promises = keys.map(key => this.prefetch(key));
    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      evictions: 0
    };
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (this.config.enableMetrics) {
      this.stats.size -= removed;
    }

    return removed;
  }

  /**
   * Start automatic cleanup interval
   * 
   * @param intervalMs - Cleanup interval in milliseconds (default: 60000 = 1 minute)
   * @returns Function to stop the cleanup interval
   * 
   * @example
   * ```typescript
   * // Start cleanup every minute
   * const stopCleanup = cache.startAutoCleanup();
   * 
   * // Start cleanup every 30 seconds
   * const stopCleanup = cache.startAutoCleanup(30000);
   * 
   * // Stop cleanup when done
   * stopCleanup();
   * ```
   */
  startAutoCleanup(intervalMs: number = 60000): () => void {
    const intervalId = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      if (this.config.enableMetrics) {
        this.stats.evictions++;
        this.stats.size--;
      }
    }
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Check if we should prefetch for a key
   */
  private checkPrefetch(key: string): void {
    if (!this.config.enablePrefetch) return;
    if (this.stats.hitRate < this.config.prefetchThreshold) return;
    if (this.prefetchQueue.has(key)) return;

    const strategy = this.prefetchStrategies.find(s => s.predicate(key));
    if (strategy) {
      this.prefetchQueue.add(key);
      this.processPrefetchQueue();
    }
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.isPrefetching || this.prefetchQueue.size === 0) {
      return;
    }

    this.isPrefetching = true;

    try {
      const keys = Array.from(this.prefetchQueue);
      this.prefetchQueue.clear();

      await Promise.allSettled(
        keys.map(key => this.prefetch(key))
      );
    } finally {
      this.isPrefetching = false;
    }
  }

  /**
   * Export cache for debugging
   */
  export(): Array<{ key: string; value: T; age: number; hits: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      age: now - entry.timestamp,
      hits: entry.hits
    }));
  }
}

/**
 * Singleton instance for market data caching
 */
export const marketDataCache = new SmartDataCache({
  maxSize: 1000,
  defaultTTL: 300000, // 5 minutes
  enablePrefetch: true,
  enableMetrics: true
});

/**
 * Singleton instance for technical indicator caching
 */
export const indicatorCache = new SmartDataCache({
  maxSize: 500,
  defaultTTL: 600000, // 10 minutes
  enablePrefetch: true,
  enableMetrics: true
});

/**
 * Singleton instance for API response caching
 */
export const apiCache = new SmartDataCache({
  maxSize: 200,
  defaultTTL: 180000, // 3 minutes
  enablePrefetch: false,
  enableMetrics: true
});
