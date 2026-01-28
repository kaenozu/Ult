import { RateLimiter, getRateLimiter } from '../lib/api/rate-limiter';

describe('RateLimiter', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('initializes with default config', () => {
        const limiter = new RateLimiter();
        const remaining = limiter.getRemaining();
        expect(remaining.minute).toBe(5);
        expect(remaining.day).toBe(25);
    });

    it('initializes with custom config', () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 10, maxRequestsPerDay: 100 });
        const remaining = limiter.getRemaining();
        expect(remaining.minute).toBe(10);
        expect(remaining.day).toBe(100);
    });

    it('allows requests within limits', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 2, maxRequestsPerDay: 5 });
        await limiter.acquire();
        await limiter.acquire();
        expect(limiter.canMakeRequest()).toBe(false);
    });

    it('throws error when minute limit is exceeded', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 1, maxRequestsPerDay: 5 });
        await limiter.acquire();
        await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded: Maximum 1 requests per minute');
    });

    it('throws error when day limit is exceeded', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 10, maxRequestsPerDay: 1 });
        await limiter.acquire();
        await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded: Maximum 1 requests per day');
    });

    it('calculates remaining requests correctly', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 5, maxRequestsPerDay: 25 });
        await limiter.acquire();
        await limiter.acquire();
        const remaining = limiter.getRemaining();
        expect(remaining.minute).toBe(3);
        expect(remaining.day).toBe(23);
    });

    it('calculates wait time correctly', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 1, maxRequestsPerDay: 10 });
        await limiter.acquire();

        const waitTime = limiter.getTimeUntilNextRequest();
        expect(waitTime).toBe(60000); // 1 minute window

        jest.advanceTimersByTime(30000);
        expect(limiter.getTimeUntilNextRequest()).toBe(30000);

        jest.advanceTimersByTime(31000);
        expect(limiter.getTimeUntilNextRequest()).toBe(0);
    });

    it('waits for next request', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 1, maxRequestsPerDay: 10 });
        await limiter.acquire();

        const waitPromise = limiter.waitForNextRequest();
        jest.advanceTimersByTime(61000);
        await waitPromise;
        expect(limiter.canMakeRequest()).toBe(true);
    });

    it('resets correctly', async () => {
        const limiter = new RateLimiter();
        await limiter.acquire();
        limiter.reset();
        expect(limiter.getRemaining().minute).toBe(5);
    });

    it('provides stats', async () => {
        const limiter = new RateLimiter();
        await limiter.acquire();
        await limiter.acquire();
        const stats = limiter.getStats();
        expect(stats.minuteRequests).toBe(2);
        expect(stats.totalRequests).toBe(2);
    });

    it('getRateLimiter returns the same instance', () => {
        const l1 = getRateLimiter();
        const l2 = getRateLimiter();
        expect(l1).toBe(l2);
    });

    it('cleans old requests upon getRemaining', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 5, maxRequestsPerDay: 25 });
        await limiter.acquire();
        jest.advanceTimersByTime(61000);
        const remaining = limiter.getRemaining();
        expect(remaining.minute).toBe(5);
    });

    it('handles daily limit wait time', async () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 100, maxRequestsPerDay: 1 });
        await limiter.acquire();

        // Next request after 1 day
        const waitTime = limiter.getTimeUntilNextRequest();
        expect(waitTime).toBe(86400000);
    });

    it('logs minutes in waitForNextRequest', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const limiter = new RateLimiter({ maxRequestsPerMinute: 1, maxRequestsPerDay: 10 });
        await limiter.acquire();

        const waitPromise = limiter.waitForNextRequest();
        jest.advanceTimersByTime(61000);
        await waitPromise;

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Waiting 1 minutes'));
        consoleSpy.mockRestore();
    });

    it('logs seconds in waitForNextRequest', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const limiter = new RateLimiter({ maxRequestsPerMinute: 1, maxRequestsPerDay: 10 });
        await limiter.acquire();

        jest.advanceTimersByTime(30000); // 30s passed, 30s remaining

        const waitPromise = limiter.waitForNextRequest();
        jest.advanceTimersByTime(31000);
        await waitPromise;

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Waiting 30 seconds'));
        consoleSpy.mockRestore();
    });
});
