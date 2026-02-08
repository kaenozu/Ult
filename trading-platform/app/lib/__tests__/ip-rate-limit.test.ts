import { IpRateLimiter, getClientIp } from '../ip-rate-limit';

describe('IpRateLimiter', () => {
  let limiter: IpRateLimiter;

  beforeEach(() => {
    limiter = new IpRateLimiter(2, 1000); // 2 requests per 1000ms
  });

  test('allows requests within limit', () => {
    expect(limiter.check('1.1.1.1')).toBe(true);
    expect(limiter.check('1.1.1.1')).toBe(true);
  });

  test('blocks requests over limit', () => {
    limiter.check('2.2.2.2');
    limiter.check('2.2.2.2');
    expect(limiter.check('2.2.2.2')).toBe(false);
  });

  test('resets after interval', async () => {
    limiter.check('3.3.3.3');
    limiter.check('3.3.3.3');
    expect(limiter.check('3.3.3.3')).toBe(false);

    // Wait for reset
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(limiter.check('3.3.3.3')).toBe(true);
  });
});

describe('getClientIp', () => {
  const originalEnv = process.env.TRUST_PROXY;

  beforeEach(() => {
    process.env.TRUST_PROXY = 'true';
  });

  afterEach(() => {
    process.env.TRUST_PROXY = originalEnv;
  });

  function createRequest(headers: Record<string, string>) {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] || null
      }
    } as unknown as Request;
  }

  test('returns unknown when no headers', () => {
    const req = createRequest({});
    expect(getClientIp(req)).toBe('unknown');
  });

  test('returns X-Forwarded-For first IP', () => {
    const req = createRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  test('handles whitespace in X-Forwarded-For', () => {
    const req = createRequest({ 'x-forwarded-for': '  10.0.0.1  , 192.168.1.1 ' });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  test('prioritizes CF-Connecting-IP over X-Forwarded-For', () => {
    const req = createRequest({
      'cf-connecting-ip': '1.1.1.1',
      'x-forwarded-for': '2.2.2.2'
    });
    expect(getClientIp(req)).toBe('1.1.1.1');
  });

  test('prioritizes X-Real-IP over X-Forwarded-For', () => {
    const req = createRequest({
      'x-real-ip': '3.3.3.3',
      'x-forwarded-for': '4.4.4.4'
    });
    expect(getClientIp(req)).toBe('3.3.3.3');
  });

  test('prioritizes CF-Connecting-IP over X-Real-IP', () => {
     // Cloudflare is usually the outermost proxy if present
    const req = createRequest({
      'cf-connecting-ip': '5.5.5.5',
      'x-real-ip': '6.6.6.6'
    });
    expect(getClientIp(req)).toBe('5.5.5.5');
  });
});
