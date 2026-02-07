import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * CSRF Token Manager
 * Implements double-submit cookie pattern for CSRF protection
 */

export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate CSRF token from request
 * Compares cookie token with header token
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  return timingSafeCompare(cookieToken, headerToken);
}

/**
 * Middleware to set CSRF token cookie on safe HTTP methods
 * Should be used early in the middleware chain for GET/HEAD/OPTIONS
 */
export function csrfTokenMiddleware(request: NextRequest): NextResponse | null {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const token = generateCSRFToken();
    
    const response = NextResponse.next();
    
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,           // Allow JS access for Double-Submit Cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',      // Prevent CSRF via cross-site requests
      maxAge: 60 * 60 * 24,    // 24 hours
      path: '/',
    });
    
    return response;
  }

  return null; // Continue to next middleware
}

/**
 * Middleware to require and validate CSRF token on state-changing methods
 * Should be used after authentication middleware
 */
export function requireCSRF(request: NextRequest): NextResponse | null {
  // Skip for safe methods and DELETE (which uses other auth)
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  if (!validateCSRFToken(request)) {
    return NextResponse.json(
      { 
        error: 'CSRF validation failed',
        code: 'CSRF_ERROR'
      },
      { status: 403 }
    );
  }

  return null;
}
