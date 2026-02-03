/**
 * Rate Limiter for Alpha Vantage API
 * 
 * Free Tier Limits:
 * - 5 requests per minute
 * - 25 requests per day
 * 
 * This class enforces rate limits and provides
 * information about remaining requests.
 */

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
}

export interface RemainingRequests {
  minute: number;
  day: number;
  nextResetTime: {
    minute: Date;
    day: Date;
  };
}

export class RateLimiter {
  private minuteRequests: number[] = [];
  private dayRequests: number[] = [];
  private config: RateLimitConfig;

  constructor(config?: RateLimitConfig) {
    this.config = config || {
      maxRequestsPerMinute: 5,
      maxRequestsPerDay: 25,
    };
  }

  /**
   * Acquire permission to make a request
   * @throws {Error} If rate limit is exceeded
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Clean old requests
    this.cleanOldRequests(now);

    // Check limits
    this.checkLimits();

    // Record this request
    this.minuteRequests.push(now);
    this.dayRequests.push(now);
  }

  /**
   * Check if a request can be made without waiting
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    this.cleanOldRequests(now);

    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;

    const recentMinuteRequests = this.minuteRequests.filter(t => t > minuteAgo);
    const recentDayRequests = this.dayRequests.filter(t => t > dayAgo);

    return (
      recentMinuteRequests.length < this.config.maxRequestsPerMinute &&
      recentDayRequests.length < this.config.maxRequestsPerDay
    );
  }

  /**
   * Get remaining requests
   */
  getRemaining(): RemainingRequests {
    const now = Date.now();
    this.cleanOldRequests(now);

    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;

    const recentMinuteRequests = this.minuteRequests.filter(t => t > minuteAgo);
    const recentDayRequests = this.dayRequests.filter(t => t > dayAgo);

    // Calculate next reset times
    const nextMinuteReset = new Date(this.getOldestRequest(this.minuteRequests, 60000));
    const nextDayReset = new Date(this.getOldestRequest(this.dayRequests, 86400000));

    return {
      minute: this.config.maxRequestsPerMinute - recentMinuteRequests.length,
      day: this.config.maxRequestsPerDay - recentDayRequests.length,
      nextResetTime: {
        minute: nextMinuteReset,
        day: nextDayReset,
      },
    };
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest(): number {
    if (this.canMakeRequest()) {
      return 0;
    }

    const remaining = this.getRemaining();
    const now = Date.now();

    if (remaining.minute <= 0) {
      return Math.max(0, remaining.nextResetTime.minute.getTime() - now);
    }

    if (remaining.day <= 0) {
      return Math.max(0, remaining.nextResetTime.day.getTime() - now);
    }

    return 0;
  }

  /**
   * Wait until next request is allowed
   */
  async waitForNextRequest(): Promise<void> {
    const waitTime = this.getTimeUntilNextRequest();

    if (waitTime > 0) {
      if (waitTime >= 60000) {
        const minutes = Math.ceil(waitTime / 60000);
        console.log(`Rate limit: Waiting ${minutes} minutes...`);
      } else {
        const seconds = Math.ceil(waitTime / 1000);
        console.log(`Rate limit: Waiting ${seconds} seconds...`);
      }

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.minuteRequests = [];
    this.dayRequests = [];
  }

  /**
   * Get statistics about request usage
   */
  getStats(): {
    minuteRequests: number;
    dayRequests: number;
    totalRequests: number;
  } {
    return {
      minuteRequests: this.minuteRequests.length,
      dayRequests: this.dayRequests.length,
      totalRequests: this.dayRequests.length,
    };
  }

  private cleanOldRequests(now: number): void {
    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;

    this.minuteRequests = this.minuteRequests.filter(t => t > minuteAgo);
    this.dayRequests = this.dayRequests.filter(t => t > dayAgo);
  }

  private checkLimits(): void {
    const now = Date.now();
    this.cleanOldRequests(now);

    if (this.minuteRequests.length >= this.config.maxRequestsPerMinute) {
      throw new Error(
        `Rate limit exceeded: Maximum ${this.config.maxRequestsPerMinute} requests per minute. ` +
        `Please wait ${Math.ceil(this.getTimeUntilNextRequest() / 60000)} minutes.`
      );
    }

    if (this.dayRequests.length >= this.config.maxRequestsPerDay) {
      throw new Error(
        `Rate limit exceeded: Maximum ${this.config.maxRequestsPerDay} requests per day. ` +
        `Daily limit reached. Please try again tomorrow.`
      );
    }
  }

  private getOldestRequest(requests: number[], windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    const validRequests = requests.filter(t => t > windowStart);

    if (validRequests.length === 0) {
      return now;
    }

    return Math.min(...validRequests) + windowMs;
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter({
      maxRequestsPerMinute: 5,
      maxRequestsPerDay: 25,
    });
  }

  return rateLimiterInstance;
}
