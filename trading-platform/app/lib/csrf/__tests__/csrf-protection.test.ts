import { generateCSRFToken, validateCSRFToken, csrfTokenMiddleware, requireCSRF } from '../csrf-protection';
import { NextRequest, NextResponse } from 'next/server';

// Mock NextResponse
const mockedNextResponseNext = jest.fn();

jest.mock('next/server', () => {
  return {
    NextResponse: {
      next: (...args: any[]) => mockedNextResponseNext(...args),
      json: jest.fn((body, init) => ({
        body,
        init,
        status: init?.status || 200,
      })),
    },
    NextRequest: jest.fn(),
  };
});

describe('CSRF Protection', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup basic mock request
    mockRequest = {
      headers: new Headers(),
      cookies: {
        get: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
      },
      nextUrl: new URL('http://localhost:3000'),
      method: 'GET',
      url: 'http://localhost:3000',
    } as unknown as NextRequest;
  });

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
      mockRequest = {
        ...mockRequest,
        headers: new Headers({
          'x-csrf-token': token,
        }),
        cookies: {
          get: jest.fn((name) => name === 'csrf-token' ? { value: token } : undefined),
          getAll: jest.fn().mockReturnValue([]),
        } as any,
      } as unknown as NextRequest;

      expect(validateCSRFToken(mockRequest)).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      const mockGet = jest.fn((name) => name === 'csrf-token' ? { value: 'correct-token' } : undefined);
      const mockGetAll = jest.fn().mockReturnValue([]);

      const request = {
        headers: new Headers({
          'x-csrf-token': 'wrong-token',
        }),
        cookies: {
          get: mockGet,
          getAll: mockGetAll,
        },
        nextUrl: new URL('http://localhost:3000'),
        method: 'GET',
        url: 'http://localhost:3000',
      } as unknown as NextRequest;

      expect(validateCSRFToken(request)).toBe(false);
    });

    it('should return false when cookie is missing', () => {
      const token = generateCSRFToken();
      const mockGet = jest.fn((name) => undefined);
      const mockGetAll = jest.fn().mockReturnValue([]);

      const request = {
        headers: new Headers({
          'x-csrf-token': token,
        }),
        cookies: {
          get: mockGet,
          getAll: mockGetAll,
        },
        nextUrl: new URL('http://localhost:3000'),
        method: 'GET',
        url: 'http://localhost:3000',
      } as unknown as NextRequest;

      expect(validateCSRFToken(request)).toBe(false);
    });

    it('should return false when tokens have different lengths', () => {
      const token = generateCSRFToken();
      const mockGet = jest.fn((name) => name === 'csrf-token' ? { value: token } : undefined);
      const mockGetAll = jest.fn().mockReturnValue([]);

      const request = {
        headers: new Headers({
          'x-csrf-token': token.substring(0, 32), // Half length
        }),
        cookies: {
          get: mockGet,
          getAll: mockGetAll,
        },
        nextUrl: new URL('http://localhost:3000'),
        method: 'GET',
        url: 'http://localhost:3000',
      } as unknown as NextRequest;

      expect(validateCSRFToken(request)).toBe(false);
    });
  });

  describe('csrfTokenMiddleware', () => {
    it('should set CSRF cookie on GET request', () => {
      // Mock NextResponse.next() behavior for this specific test
      const mockResponse = {
        cookies: {
          set: jest.fn(),
        },
      };
      mockedNextResponseNext.mockReturnValue(mockResponse);

      csrfTokenMiddleware(mockRequest);
      
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'csrf-token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict',
          secure: false, // Default is false in test env
        })
      );
    });

    it('should not set cookie on POST request', () => {
        // Override the method for this test
        mockRequest = {
            ...mockRequest,
            method: 'POST'
        } as unknown as NextRequest;

      const response = csrfTokenMiddleware(mockRequest);
      expect(response).toBeNull();
    });
  });

  describe('requireCSRF', () => {
    it('should return null for GET requests', () => {
      const request = {
        method: 'GET',
        headers: new Headers(),
        cookies: {
          get: jest.fn(),
          getAll: jest.fn().mockReturnValue([]),
        },
        nextUrl: new URL('http://localhost:3000'),
        url: 'http://localhost:3000',
      } as unknown as NextRequest;

      expect(requireCSRF(request)).toBeNull();
    });

    it('should reject POST without CSRF token', () => {
      const request = {
        method: 'POST',
        headers: new Headers(),
        cookies: {
          get: jest.fn(),
          getAll: jest.fn().mockReturnValue([]),
        },
        nextUrl: new URL('http://localhost:3000'),
        url: 'http://localhost:3000',
      } as unknown as NextRequest;

      const response = requireCSRF(request);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
    });

    it('should allow POST with valid CSRF token', () => {
      const token = generateCSRFToken();
      const mockGet = jest.fn((name) => name === 'csrf-token' ? { value: token } : undefined);

      const request = {
        method: 'POST',
        headers: new Headers({
          'x-csrf-token': token,
        }),
        cookies: {
          get: mockGet,
          getAll: jest.fn().mockReturnValue([]),
        },
        nextUrl: new URL('http://localhost:3000'),
        url: 'http://localhost:3000',
      } as unknown as NextRequest;

      expect(requireCSRF(request)).toBeNull();
    });
  });
});
