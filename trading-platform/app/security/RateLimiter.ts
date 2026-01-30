/**
 * Enhanced Rate Limiter
 * 
 * Advanced rate limiting with configurable windows, blocking, and metrics.
 * Replaces the basic rate limiter in api/rate-limiter.ts.
 * 
 * IMPROVEMENTS (2026-01-30):
 * - Added LRU cache with size limit to prevent memory leaks
 * - Added automatic cleanup of expired entries
 * - Added configurable max keys limit
 */

import { RateLimitConfig, RateLimitResult } from '../types/shared';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockedUntil?: number;
  lastAccessed: number;
}

interface AdvancedRateLimiterOptions {
  maxKeys?: number;
  cleanupIntervalMs?: number;
  defaultConfig?: Partial<RateLimitConfig>;
}

export class AdvancedRateLimiter {
  private limits = new Map<string, RateLimitRecord>();
  private readonly maxKeys: number;
  private readonly defaultConfig: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: AdvancedRateLimiterOptions = {}) {
    this.maxKeys = options.maxKeys ?? 1000;
    this.defaultConfig = {
      windowMs: options.defaultConfig?.windowMs ?? 60 * 1000,      // 1 minute
      maxRequests: options.defaultConfig?.maxRequests ?? 25,       // 25 requests per window
      blockDurationMs: options.defaultConfig?.blockDurationMs ?? 60 * 1000, // 1 minute block
    };

    // Start periodic cleanup
    const cleanupIntervalMs = options.cleanupIntervalMs ?? 60 * 1000; // 1 minute
    this.cleanupInterval = setInterval(() => this.cleanupExpiredEntries(), cleanupIntervalMs);
  }

  /**
   * Cleanup expired entries to prevent memory leaks
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, record] of this.limits.entries()) {
      // Delete if window expired and not blocked
      if (now > record.resetTime && (!record.blockedUntil || now > record.blockedUntil)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.limits.delete(key);
    }

    // If still over limit, remove oldest entries
    if (this.limits.size > this.maxKeys) {
      const entries = Array.from(this.limits.entries());
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      const toRemove = entries.slice(0, entries.length - this.maxKeys);
      for (const [key] of toRemove) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Check if a request is allowed
   */
  async checkLimit(
    key: string,
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    
    // LRU eviction: Remove oldest if at capacity and key doesn't exist
    if (this.limits.size >= this.maxKeys && !this.limits.has(key)) {
      this.evictLRU();
    }
    
    const record = this.limits.get(key) || { 
      count: 0, 
      resetTime: now + mergedConfig.windowMs,
      lastAccessed: now
    };

    // Update last accessed time
    record.lastAccessed = now;

    // Check if blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      this.limits.set(key, record);
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blockedUntil,
        blockedUntil: record.blockedUntil,
      };
    }

    // Reset window if expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + mergedConfig.windowMs;
      record.blockedUntil = undefined;
    }

    // Check request limit
    if (record.count >= mergedConfig.maxRequests) {
      record.blockedUntil = now + mergedConfig.blockDurationMs;
      this.limits.set(key, record);

      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blockedUntil,
        blockedUntil: record.blockedUntil,
      };
    }

    // Record the request
    record.count++;
    this.limits.set(key, record);

    return {
      allowed: true,
      remaining: mergedConfig.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, record] of this.limits.entries()) {
      if (record.lastAccessed < oldestTime) {
        oldestTime = record.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.limits.delete(oldestKey);
    }
  }

  /**
   * Get current status without incrementing
   */
  getStatus(key: string, config?: Partial<RateLimitConfig>): RateLimitResult {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    
    const record = this.limits.get(key);
    
    if (!record) {
      return {
        allowed: true,
        remaining: mergedConfig.maxRequests,
        resetTime: now + mergedConfig.windowMs,
      };
    }

    // Update last accessed
    record.lastAccessed = now;

    // Check if blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blockedUntil,
        blockedUntil: record.blockedUntil,
      };
    }

    // Reset window if expired
    if (now > record.resetTime) {
      return {
        allowed: true,
        remaining: mergedConfig.maxRequests,
        resetTime: now + mergedConfig.windowMs,
      };
    }

    return {
      allowed: record.count < mergedConfig.maxRequests,
      remaining: mergedConfig.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForLimit(key: string, config?: Partial<RateLimitConfig>): Promise<void> {
    const status = this.getStatus(key, config);
    
    if (status.allowed) return;

    const waitTime = status.resetTime - Date.now();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.limits.clear();
  }

  /**
   * Clean up resources (call on shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics(): {
    activeKeys: number;
    blockedKeys: number;
    maxKeys: number;
  } {
    let blockedKeys = 0;
    const now = Date.now();

    this.limits.forEach((record) => {
      if (record.blockedUntil && now < record.blockedUntil) {
        blockedKeys++;
      }
    });

    return {
      activeKeys: this.limits.size,
      blockedKeys,
      maxKeys: this.maxKeys,
    };
  }

  // Predefined configurations for common use cases
  readonly dashboardLimits: RateLimitConfig = {
    windowMs: 60 * 1000,           // 1 minute
    maxRequests: 60,                // 60 requests per minute
    blockDurationMs: 5 * 60 * 1000, // 5 minute block
  };

  readonly apiLimits: RateLimitConfig = {
    windowMs: 60 * 1000,           // 1 minute
    maxRequests: 25,                // 25 requests per minute (Alpha Vantage free tier)
    blockDurationMs: 60 * 1000,    // 1 minute block
  };

  readonly strictLimits: RateLimitConfig = {
    windowMs: 60 * 1000,           // 1 minute
    maxRequests: 5,                 // 5 requests per minute
    blockDurationMs: 5 * 60 * 1000, // 5 minute block
  };
}

// Singleton instance
let rateLimiterInstance: AdvancedRateLimiter | null = null;

export function getAdvancedRateLimiter(): AdvancedRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new AdvancedRateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAdvancedRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.destroy();
    rateLimiterInstance = null;
  }
}
