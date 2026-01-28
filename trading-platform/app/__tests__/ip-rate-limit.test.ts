import { IpRateLimiter } from '../lib/ip-rate-limit';

describe('IpRateLimiter', () => {
  let limiter: IpRateLimiter;

  // Use fake timers to control Date.now()
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests within limit', () => {
    // 2 requests per minute
    limiter = new IpRateLimiter(2, 60000);

    expect(limiter.check('1.1.1.1')).toBe(true);
    expect(limiter.check('1.1.1.1')).toBe(true);
  });

  it('blocks requests exceeding limit', () => {
    limiter = new IpRateLimiter(2, 60000);

    limiter.check('1.1.1.1');
    limiter.check('1.1.1.1');
    expect(limiter.check('1.1.1.1')).toBe(false);
  });

  it('resets limit after interval', () => {
    limiter = new IpRateLimiter(1, 60000);

    expect(limiter.check('1.1.1.1')).toBe(true);
    expect(limiter.check('1.1.1.1')).toBe(false);

    // Advance time by 61 seconds
    jest.advanceTimersByTime(61000);

    expect(limiter.check('1.1.1.1')).toBe(true);
  });

  it('tracks IPs separately', () => {
    limiter = new IpRateLimiter(1, 60000);

    expect(limiter.check('1.1.1.1')).toBe(true);
    expect(limiter.check('1.1.1.1')).toBe(false);

    expect(limiter.check('2.2.2.2')).toBe(true);
  });
});
