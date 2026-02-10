/**
 * DataAggregator - API Batch Processing and Caching
 * 
 * Key features:
 * - Request deduplication to prevent duplicate API calls
 * - LRU cache with TTL expiration
 * - Batch request support for multiple symbols
 * - Priority-based request queue
 */

import type { OHLCV, Stock, Signal, TechnicalIndicator } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

interface BatchRequest<T> {
  keys: string[];
  priority: number;
  fetcher: (keys: string[]) => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

interface BatchOptions {
  /** Maximum batch size */
  maxBatchSize: number;
  /** Maximum wait time before flushing batch (ms) */
  maxWaitTime: number;
  /** Minimum requests before triggering batch */
  minBatchSize: number;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_BATCH_OPTIONS: BatchOptions = {
  maxBatchSize: 50,
  maxWaitTime: 100, // 100ms
  minBatchSize: 3,
};
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 75, // Alpha Vantage free tier: 5 requests/min = 75 for safety
  requestsPerHour: 450,
};

// ============================================================================
// DataAggregator Class
// ============================================================================

export class DataAggregator {
  /** @internal */
  public cache: Map<string, CacheEntry<any>> = new Map();
  private readonly cacheTTL: number;

  // Request deduplication
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Batch processing
  private batchQueue: BatchRequest<any>[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private batchOptions: BatchOptions;

  // Rate limiting
  private rateLimitConfig: RateLimitConfig;
  private requestHistory: number[] = [];

  // Statistics
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    batchRequests: 0,
    deduplicatedRequests: 0,
    totalRequests: 0,
  };

  // ==========================================================================
  // Constructor
  // ==========================================================================

  constructor(options?: {
    cacheTTL?: number;
    batchOptions?: Partial<BatchOptions>;
    rateLimitConfig?: Partial<RateLimitConfig>;
  }) {
    this.cacheTTL = options?.cacheTTL || DEFAULT_CACHE_TTL;
    this.batchOptions = { ...DEFAULT_BATCH_OPTIONS, ...options?.batchOptions };
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...options?.rateLimitConfig };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Fetch data with cache and deduplication
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    this.stats.totalRequests++;

    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached !== null) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(key)) {
      this.stats.deduplicatedRequests++;
      return this.pendingRequests.get(key)! as Promise<T>;
    }

    // Create and track request
    const promise = this.executeWithRateLimit(() =>
      fetcher()
        .then(data => {
          this.setCache(key, data, ttl);
          return data;
        })
        .finally(() => {
          this.pendingRequests.delete(key);
        })
    );

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Batch fetch for multiple keys
   * Only fetches uncached keys and batches them efficiently
   */
  async fetchBatch<T>(
    keys: string[],
    fetcher: (uncachedKeys: string[]) => Promise<Map<string, T>>,
    ttl?: number
  ): Promise<Map<string, T>> {
    if (keys.length === 0) return new Map();

    // Filter to only uncached keys
    const uncachedKeys = keys.filter(key => this.getFromCache<T>(key) === null);
    const cachedData = new Map<string, T>();

    // Collect cached data
    for (const key of keys) {
      const cached = this.getFromCache<T>(key);
      if (cached !== null) {
        cachedData.set(key, cached);
        this.stats.cacheHits++;
      }
    }

    // If all cached, return cached data
    if (uncachedKeys.length === 0) {
      return cachedData;
    }

    this.stats.cacheMisses += uncachedKeys.length;

    // Fetch uncached data
    const fetchedData = await this.executeBatchFetch(uncachedKeys, fetcher);

    // Cache and combine results
    for (const [key, data] of fetchedData) {
      this.setCache(key, data, ttl);
    }

    return new Map([...cachedData, ...fetchedData]);
  }

  /**
   * Priority-based batch fetch
   * Useful for loading visible data first, then background data
   */
  async fetchWithPriority<T>(
    keys: string[],
    priority: 'high' | 'medium' | 'low',
    fetcher: (keys: string[]) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest<T> = {
        keys,
        priority: priority === 'high' ? 0 : priority === 'medium' ? 1 : 2,
        fetcher,
        resolve,
        reject,
      };

      this.addToBatchQueue(batchRequest);
    });
  }

  /**
   * Prefetch data for better UX
   */
  async prefetch<T>(
    keys: string[],
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    for (const key of keys) {
      if (this.getFromCache<T>(key) === null) {
        this.fetchWithCache(key, fetcher, ttl).catch(() => {
          // Silently fail prefetch requests
        });
      }
    }
  }

  /**
   * Set cache entry (Public wrapper)
   */
  public setCached<T>(key: string, data: T, ttl?: number): void {
    this.setCache(key, data, ttl);
  }

  /**
   * Get cache entry (Public wrapper)
   */
  public getCached<T>(key: string): T | null {
    return this.getFromCache<T>(key);
  }

  /**
   * Invalidate cache entries
   */
  invalidate(keys: string[]): void {
    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  /**
   * Fetch data (Legacy Alias for fetchWithCache)
   */
  async fetchData<T>(
    key: string,
    options?: { priority?: number; ttl?: number }
  ): Promise<T> {
    return this.fetchWithCache(
      key,
      async () => {
        const params = new URLSearchParams({ symbol: key });
        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) {
          throw new Error(response.statusText || 'API Error');
        }
        const json = await response.json();
        return (json.data || json) as T;
      },
      options?.ttl
    );
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): typeof this.stats & { cacheSize: number; memoryUsage: number } {
    let memoryUsage = 0;
    for (const [_, entry] of this.cache) {
      memoryUsage += JSON.stringify(entry.data).length * 2; // Approximate
    }

    return {
      ...this.stats,
      cacheSize: this.cache.size,
      memoryUsage,
    };
  }

  // ==========================================================================
  // Private Methods - Cache
  // ==========================================================================

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    // LRU eviction if cache is large
    if (this.cache.size >= 1000) {
      this.evictLRU();
    }

    const duration = ttl !== undefined ? ttl : this.cacheTTL;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
      key,
    });
  }

  private evictLRU(): void {
    // Remove oldest 10% of entries
    const entriesToRemove = Math.floor(this.cache.size * 0.1);
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove);

    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }

  // ==========================================================================
  // Private Methods - Rate Limiting
  // ==========================================================================

  private async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    // Clean old requests from history
    const now = Date.now();
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;

    this.requestHistory = this.requestHistory.filter(t => t > hourAgo);

    // Check rate limits
    const recentRequests = this.requestHistory.filter(t => t > minuteAgo).length;
    if (recentRequests >= this.rateLimitConfig.requestsPerMinute) {
      // Wait for oldest request to expire
      const oldestRequest = Math.min(...this.requestHistory);
      const waitTime = minuteAgo - oldestRequest;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Execute request
    this.requestHistory.push(now);
    return fn();
  }

  // ==========================================================================
  // Private Methods - Batch Processing
  // ==========================================================================

  private async executeBatchFetch<T>(
    keys: string[],
    fetcher: (uncachedKeys: string[]) => Promise<Map<string, T>>
  ): Promise<Map<string, T>> {
    this.stats.batchRequests++;

    // If batch size is small, fetch directly
    if (keys.length <= this.batchOptions.minBatchSize) {
      return fetcher(keys);
    }

    // Otherwise use batch queue
    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest<Map<string, T>> = {
        keys,
        priority: 1,
        fetcher: (batchKeys: string[]) => fetcher(batchKeys),
        resolve: (data) => resolve(data as Map<string, T>),
        reject: (error) => reject(error),
      };

      this.addToBatchQueue(batchRequest);
    });
  }

  private addToBatchQueue<T>(request: BatchRequest<T>): void {
    // Insert based on priority
    const insertIndex = this.batchQueue.findIndex(
      r => r.priority > request.priority
    );
    if (insertIndex === -1) {
      this.batchQueue.push(request);
    } else {
      this.batchQueue.splice(insertIndex, 0, request);
    }

    // Start batch timer if not running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(
        () => this.processBatch(),
        this.batchOptions.maxWaitTime
      );
    }

    // Process if batch size reached
    if (this.batchQueue.length >= this.batchOptions.maxBatchSize) {
      this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) return;

    // Get batch of requests
    const batch = this.batchQueue.splice(0, this.batchOptions.maxBatchSize);
    this.stats.batchRequests++;

    // Extract all keys and create combined fetcher
    const allKeys = new Set<string>();
    for (const request of batch) {
      for (const key of request.keys) {
        allKeys.add(key);
      }
    }

    try {
      const results = await this.executeWithRateLimit(() =>
        this.batchFetcher(Array.from(allKeys), batch)
      );

      // Resolve individual requests
      for (const request of batch) {
        const requestResults = new Map<string, any>();
        for (const key of request.keys) {
          if (results.has(key)) {
            requestResults.set(key, results.get(key));
          }
        }
        request.resolve(requestResults);
      }
    } catch (error) {
      for (const request of batch) {
        request.reject(error as Error);
      }
    }
  }

  private async batchFetcher(
    keys: string[],
    batch: BatchRequest<any>[]
  ): Promise<Map<string, any>> {
    // This is a simplified batch fetcher
    // In production, you would implement actual batching logic
    const results = new Map<string, any>();

    // For now, execute each request sequentially
    for (const request of batch) {
      try {
        const result = await request.fetcher(request.keys);
        if (result instanceof Map) {
          for (const [key, value] of result) {
            results.set(key, value);
          }
        } else if (Array.isArray(result)) {
          for (let i = 0; i < request.keys.length && i < result.length; i++) {
            results.set(request.keys[i], result[i]);
          }
        }
      } catch (error) {
        // Continue with other requests
        console.error('Batch request failed:', error);
      }
    }

    return results;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const dataAggregator = new DataAggregator();

// ============================================================================
// Export Types
// ============================================================================

export type { BatchOptions, RateLimitConfig };
