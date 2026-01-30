/**
 * Enhanced Rate Limiter
 * 
 * Advanced rate limiting with configurable windows, blocking, and metrics.
 * Replaces the basic rate limiter in api/rate-limiter.ts.
 */

import { RateLimitConfig, RateLimitResult } from '../types/shared';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

export class AdvancedRateLimiter {
  private limits = new Map<string, RateLimitRecord>();
  private readonly defaultConfig: RateLimitConfig;

  constructor(defaultConfig?: Partial<RateLimitConfig>) {
    this.defaultConfig = {
      windowMs: defaultConfig?.windowMs ?? 60 * 1000,      // 1 minute
      maxRequests: defaultConfig?.maxRequests ?? 25,       // 25 requests per window
      blockDurationMs: defaultConfig?.blockDurationMs ?? 60 * 1000, // 1 minute block
    };
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
    
    const record = this.limits.get(key) || { 
      count: 0, 
      resetTime: now + mergedConfig.windowMs 
    };

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
      record.count = 0;
      record.resetTime = now + mergedConfig.windowMs;
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
   * Get metrics for monitoring
   */
  getMetrics(): {
    activeKeys: number;
    blockedKeys: number;
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
