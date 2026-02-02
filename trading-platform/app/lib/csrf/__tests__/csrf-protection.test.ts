import { generateCSRFToken, validateCSRFToken, csrfTokenMiddleware, requireCSRF } from '../csrf-protection';
import { NextRequest, NextResponse } from 'next/server';

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('should generate a token of correct length', () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateCSRFToken', () => {
    it('should return true when tokens match', () => {
      const token = generateCSRFToken();
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-csrf-token': token,
        },
        cookies: {
          'csrf-token': token,
        },
      });

      expect(validateCSRFToken(request)).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-csrf-token': 'wrong-token',
        },
        cookies: {
          'csrf-token': 'correct-token',
        },
      });

      expect(validateCSRFToken(request)).toBe(false);
    });

    it('should return false when cookie is missing', () => {
      const token = generateCSRFToken();
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-csrf-token': token,
        },
      });

      expect(validateCSRFToken(request)).toBe(false);
    });
  });

  describe('csrfTokenMiddleware', () => {
    it('should set CSRF cookie on GET request', () => {
      const request = new NextRequest('http://localhost:3000', {
        method: 'GET',
      });

      const response = csrfTokenMiddleware(request);
      expect(response).not.toBeNull();
      
      const cookies = response?.cookies;
      expect(cookies).toBeDefined();
      const csrfCookie = cookies?.get('csrf-token');
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie?.value).toHaveLength(64);
    });

    it('should not set cookie on POST request', () => {
      const request = new NextRequest('http://localhost:3000', {
        method: 'POST',
      });

      const response = csrfTokenMiddleware(request);
      expect(response).toBeNull();
    });
  });

  describe('requireCSRF', () => {
    it('should return null for GET requests', () => {
      const request = new NextRequest('http://localhost:3000', {
        method: 'GET',
      });

      expect(requireCSRF(request)).toBeNull();
    });

    it('should reject POST without CSRF token', () => {
      const request = new NextRequest('http://localhost:3000', {
        method: 'POST',
      });

      const response = requireCSRF(request);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
    });

    it('should allow POST with valid CSRF token', () => {
      const token = generateCSRFToken();
      const request = new NextRequest('http://localhost:3000', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
        },
        cookies: {
          'csrf-token': token,
        },
      });

      expect(requireCSRF(request)).toBeNull();
    });
  });
});
