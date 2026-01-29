
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class IpRateLimiter {
  private counters = new Map<string, RateLimitRecord>();
  private interval: number; // in milliseconds
  private limit: number;

  constructor(limit: number, intervalMs: number) {
    this.limit = limit;
    this.interval = intervalMs;
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
     // Only prune if we have a significant number of entries to avoid overhead on small maps
     if (this.counters.size > 5000) {
         for (const [key, value] of this.counters.entries()) {
             if (now > value.resetTime) {
                 this.counters.delete(key);
             }
         }
     }
  }
}

// Global instance handling to persist across hot reloads in dev
const globalForRateLimit = globalThis as unknown as { ipRateLimiter: IpRateLimiter };

// Default: 60 requests per minute
export const ipRateLimiter = globalForRateLimit.ipRateLimiter || new IpRateLimiter(60, 60 * 1000);

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.ipRateLimiter = ipRateLimiter;
}

export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return 'unknown';
}
