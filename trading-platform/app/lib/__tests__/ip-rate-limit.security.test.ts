
import { getClientIp } from '../ip-rate-limit';

describe('getClientIp Security Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Helper to create a request-like object
  function createMockRequest(headers: Record<string, string>, ip?: string) {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] || null
      },
      ip // NextRequest has this property
    } as unknown as Request;
  }

  it('should prioritize NextRequest.ip over X-Forwarded-For headers (Prevent Spoofing)', () => {
    // When TRUST_PROXY is true, we might be vulnerable to spoofing if we only check headers.
    // However, if the platform (Next.js) provides a validated IP, we must use it.
    process.env.TRUST_PROXY = 'true';

    // Attacker sends this header: "spoofed-ip, real-ip"
    const req = createMockRequest({
        'x-forwarded-for': '6.6.6.6, 1.2.3.4'
    }, '9.9.9.9'); // 9.9.9.9 is the real IP trusted by Next.js/Vercel

    // It should return the trusted IP, ignoring the spoofed header
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('should fall back to X-Forwarded-For if NextRequest.ip is missing and TRUST_PROXY is true', () => {
    // Legacy behavior for environments where .ip might not be populated
    process.env.TRUST_PROXY = 'true';

    const req = createMockRequest({
        'x-forwarded-for': '1.2.3.4'
    });

    // In this case, we have to trust the header (assuming the user configured TRUST_PROXY correctly for their environment)
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('should return "unknown" if TRUST_PROXY is false and no CF header', () => {
    process.env.TRUST_PROXY = 'false';

    const req = createMockRequest({
        'x-forwarded-for': '1.2.3.4'
    });

    expect(getClientIp(req)).toBe('unknown');
  });

  it('should trust CF-Connecting-IP regardless of TRUST_PROXY', () => {
    process.env.TRUST_PROXY = 'false';

    const req = createMockRequest({
        'cf-connecting-ip': '5.5.5.5',
        'x-forwarded-for': '1.2.3.4'
    });

    expect(getClientIp(req)).toBe('5.5.5.5');
  });
});
