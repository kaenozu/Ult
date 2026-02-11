import { generateAuthToken, verifyAuthToken, requireAuth, getAuthUser } from '../auth';
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

describe('Authentication Module', () => {
  const validUserId = 'test-user-123';
  const validUsername = 'testuser';
  
  // Set a test secret for consistent testing (32+ chars required for security)
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-security-checks-32chars';
    resetConfig(); // Reset config cache before all tests
  });

  beforeEach(() => {
    // Reset config cache before each test to pick up env changes
    resetConfig();
  });

  describe('generateAuthToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAuthToken(validUserId, validUsername);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate token with userId only', () => {
      const token = generateAuthToken(validUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include correct payload in token', () => {
      const token = generateAuthToken(validUserId, validUsername);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.userId).toBe(validUserId);
      expect(decoded.username).toBe(validUsername);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('verifyAuthToken', () => {
    // Import after mocks are set up
    let verifyAuthToken: any;

    beforeAll(() => {
      // Dynamic import to use after mocks
      verifyAuthToken = require('../auth').verifyAuthToken;
    });

    it('should verify a valid token', () => {
      const token = generateAuthToken(validUserId, validUsername);
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      const payload = verifyAuthToken(mockRequest);
      expect(payload).not.toBeNull();
      expect(payload.userId).toBe(validUserId);
      expect(payload.username).toBe(validUsername);
    });

    it('should return null for missing Authorization header', () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test');
      const payload = verifyAuthToken(mockRequest);
      expect(payload).toBeNull();
    });

    it('should return null for invalid Bearer format', () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': 'InvalidFormat token123',
        },
      });
      const payload = verifyAuthToken(mockRequest);
      expect(payload).toBeNull();
    });

    it('should return null for empty token', () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': 'Bearer ',
        },
      });
      const payload = verifyAuthToken(mockRequest);
      expect(payload).toBeNull();
    });

    it('should return null for invalid token', () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': 'Bearer invalid.token.here',
        },
      });
      const payload = verifyAuthToken(mockRequest);
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      // Generate token with different secret
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'different-secret';
      resetConfig(); // ensure new secret is picked up
      const token = generateAuthToken(validUserId);
      
      // Try to verify with original secret
      process.env.JWT_SECRET = originalSecret;
      resetConfig(); // ensure original secret is picked up
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });
      
      const payload = verifyAuthToken(mockRequest);
      expect(payload).toBeNull();
    });
  });

  describe('requireAuth', () => {
    let requireAuth: any;

    beforeAll(() => {
      requireAuth = require('../auth').requireAuth;
    });

    it('should return null for authenticated request', () => {
      const token = generateAuthToken(validUserId, validUsername);
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      const response = requireAuth(mockRequest);
      expect(response).toBeNull();
    });

    it('should return 401 response for unauthenticated request', () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test');
      const response = requireAuth(mockRequest);
      
      expect(response).not.toBeNull();
      expect(response.status).toBe(401);
    });

    it('should return proper error message for unauthenticated request', async () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test');
      const response = requireAuth(mockRequest);
      
      expect(response).not.toBeNull();
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
      expect(json.message).toContain('authentication token required');
    });
  });

  describe('getAuthUser', () => {
    let getAuthUser: any;

    beforeAll(() => {
      getAuthUser = require('../auth').getAuthUser;
    });

    it('should return user payload for authenticated request', () => {
      const token = generateAuthToken(validUserId, validUsername);
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      const user = getAuthUser(mockRequest);
      expect(user).not.toBeNull();
      expect(user.userId).toBe(validUserId);
      expect(user.username).toBe(validUsername);
    });

    it('should return null for unauthenticated request', () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test');
      const user = getAuthUser(mockRequest);
      expect(user).toBeNull();
    });
  });

  describe('Token expiration', () => {
    it('should include expiration claim in token', () => {
      const token = generateAuthToken(validUserId);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should include issued at claim in token', () => {
      const token = generateAuthToken(validUserId);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
      expect(decoded.iat).toBeLessThanOrEqual(Date.now() / 1000);
    });
  });
});
