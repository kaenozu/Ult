
import type { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class IpRateLimiter {
  private counters = new Map<string, RateLimitRecord>();
  private interval: number; // in milliseconds
  private limit: number;
  private maxEntries: number; // Maximum entries to prevent memory bloat

  constructor(limit: number, intervalMs: number, maxEntries: number = 10000) {
    this.limit = limit;
    this.interval = intervalMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Check if the IP is within the rate limit.
   * Returns true if allowed, false if blocked.
   */
  check(ip: string): boolean {
    const now = Date.now();

    // Lazy cleanup: occasionally prune old entries to prevent memory leaks
    if (Math.random() < 0.05) {
        this.prune(now);
    }

    let record = this.counters.get(ip);

    if (!record || now > record.resetTime) {
      // New window or expired window
      record = { count: 0, resetTime: now + this.interval };
      this.counters.set(ip, record);
    }

    if (record.count >= this.limit) {
      return false;
    }

    record.count++;
    return true;
  }

  private prune(now: number) {
    const keysToDelete: string[] = [];

    // First, remove expired entries
    for (const [key, value] of this.counters.entries()) {
      if (now > value.resetTime) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.counters.delete(key);
    }

    // If still over limit, remove oldest entries (LRU eviction)
    if (this.counters.size > this.maxEntries) {
      const entries = Array.from(this.counters.entries());
      // Sort by resetTime (oldest first)
      entries.sort((a, b) => a[1].resetTime - b[1].resetTime);

      const toRemove = entries.slice(0, entries.length - this.maxEntries);
      for (const [key] of toRemove) {
        this.counters.delete(key);
      }
    }
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(): {
    totalEntries: number;
    maxEntries: number;
  } {
    return {
      totalEntries: this.counters.size,
      maxEntries: this.maxEntries,
    };
  }

  /**
   * Reset all counters - useful for testing
   */
  reset(): void {
    this.counters.clear();
  }
}

// Global instance handling to persist across hot reloads in dev
const globalForRateLimit = globalThis as unknown as { ipRateLimiter: IpRateLimiter };

// Default: 120 requests per minute (more lenient for development)
export const ipRateLimiter = globalForRateLimit.ipRateLimiter || new IpRateLimiter(120, 60 * 1000);

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.ipRateLimiter = ipRateLimiter;
}

export function getClientIp(request: Request | NextRequest): string {
    // Priority 0: Next.js parsed IP (most secure as it handles trust logic)
    // This property is available on NextRequest objects in the Edge/Node.js runtime
    // provided by Vercel or Next.js server when properly configured with trustHostHeader
    if ('ip' in request) {
        const ip = (request as NextRequest).ip;
        if (ip) {
            return ip;
        }
    }

    const trustProxy = process.env.TRUST_PROXY === 'true';

    // Priority 1: Cloudflare (CF-Connecting-IP)
    // This header is immutable on Cloudflare, so it's safe if we are behind Cloudflare.
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp) {
        return cfConnectingIp.trim();
    }

    if (trustProxy) {
        // Priority 2: X-Real-IP
        // Often set by the immediate reverse proxy (Nginx, etc.) to the connected peer's IP.
        // Harder to spoof than X-Forwarded-For if the proxy is correctly configured.
        const xRealIp = request.headers.get('x-real-ip');
        if (xRealIp) {
            return xRealIp.trim();
        }

        // Priority 3: X-Forwarded-For
        // Standard header, but susceptible to spoofing if the chain isn't trusted.
        // We take the first IP (the client), assuming the upstream proxy overwrites it or we trust the chain.
        const forwardedFor = request.headers.get('x-forwarded-for');
        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim();
        }
    }
    return 'unknown';
}
