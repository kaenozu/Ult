
import { NextRequest } from 'next/server';
import { csrfProtection } from '../csrf-protection';

describe('CSRF Protection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = 'test-secret-key-must-be-at-least-32-chars-long';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should generate a valid CSRF token', async () => {
    const token = await csrfProtection.generateToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should verify a valid CSRF token', async () => {
    const token = await csrfProtection.generateToken();
    const isValid = await csrfProtection.verifyToken(token);
    expect(isValid).toBe(true);
  });

  it('should reject an invalid CSRF token', async () => {
    const isValid = await csrfProtection.verifyToken('invalid-token');
    expect(isValid).toBe(false);
  });

  it('should validate request with valid CSRF header', async () => {
    const token = await csrfProtection.generateToken();
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': token,
        'origin': 'http://localhost'
      }
    });

    const isValid = await csrfProtection.validateRequest(req);
    expect(isValid).toBe(true);
  });

  it('should reject request with missing CSRF header', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'origin': 'http://localhost'
      }
    });

    const isValid = await csrfProtection.validateRequest(req);
    expect(isValid).toBe(false);
  });

  it('should reject request with invalid CSRF header', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'invalid-token',
        'origin': 'http://localhost'
      }
    });

    const isValid = await csrfProtection.validateRequest(req);
    expect(isValid).toBe(false);
  });

  it('should skip validation for safe methods (GET)', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'GET'
    });

    const isValid = await csrfProtection.validateRequest(req);
    expect(isValid).toBe(true);
  });
});
