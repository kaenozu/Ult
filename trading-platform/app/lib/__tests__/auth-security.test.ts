
import { verifyAuthToken } from '../auth';
import jwt from 'jsonwebtoken';
import { resetConfig } from '../config/env-validator';

// Simple mock for NextRequest since we only need headers
class MockNextRequest {
  headers: Map<string, string>;
  url: string;

  constructor(url: string, options?: { headers?: Record<string, string> }) {
    this.url = url;
    this.headers = new Map(Object.entries(options?.headers || {}));
  }

  get(name: string): string | null {
    return this.headers.get(name) || null;
  }
}

describe('Authentication Security', () => {
  const validUserId = 'test-user-123';
  const validUsername = 'testuser';
  const secureSecret = 'a-very-long-and-secure-secret-key-that-is-over-32-chars';

  beforeAll(() => {
    process.env.JWT_SECRET = secureSecret;
    resetConfig();
  });

  beforeEach(() => {
    process.env.JWT_SECRET = secureSecret;
    resetConfig();
  });

  it('should throw an error if JWT_SECRET is less than 32 characters', () => {
    process.env.JWT_SECRET = 'too-short';
    resetConfig();
    
    // verifyAuthToken calls getConfig() internally
    expect(() => {
      verifyAuthToken(new MockNextRequest('http://localhost:3000/api/test') as any);
    }).toThrow('JWT_SECRET must be at least 32 characters');
  });

  it('should reject tokens signed with a different algorithm (HS384)', () => {
    // Manually sign a token with HS384
    const payload = {
      userId: validUserId,
      username: validUsername,
    };

    // We use the same secret, but different algorithm
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      algorithm: 'HS384',
      expiresIn: '1h',
    });

    const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'authorization': `Bearer ${token}`,
      },
    });

    // Currently, this might pass if algorithms are not restricted
    const result = verifyAuthToken(mockRequest);

    // We want this to be null (rejected)
    // If it is NOT null, it means the vulnerability exists (or rather, the looseness exists)
    expect(result).toBeNull();
  });

  it('should reject tokens with algorithm set to none', () => {
     // NOTE: 'none' algorithm usually requires the secret to be ignored/empty in verify,
     // but jsonwebtoken might reject it by default in newer versions.
     // We can't easily sign 'none' with jwt.sign if a secret is provided, it throws.
     // We have to construct it manually.

     const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
     const payload = Buffer.from(JSON.stringify({ userId: validUserId })).toString('base64url');
     const token = `${header}.${payload}.`; // Empty signature

     const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      const result = verifyAuthToken(mockRequest);
      expect(result).toBeNull();
  });
});
