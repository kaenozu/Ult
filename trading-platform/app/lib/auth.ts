import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// JWT expiration time (default: 24 hours)
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

export interface JWTPayload {
  userId: string;
  username?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token from request headers
 * @param req NextRequest object
 * @returns Decoded JWT payload or null if invalid
 */
export function verifyAuthToken(req: NextRequest): JWTPayload | null {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return null;
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Generate JWT token for a user
 * @param userId User ID
 * @param username Optional username
 * @returns JWT token string
 */
export function generateAuthToken(userId: string, username?: string): string {
  const payload: JWTPayload = {
    userId,
    username,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

/**
 * Middleware to require authentication on API routes
 * Returns 401 Unauthorized if no valid token is present
 */
export function requireAuth(req: NextRequest): NextResponse | null {
  const payload = verifyAuthToken(req);
  
  if (!payload) {
    return NextResponse.json(
      { 
        error: 'Unauthorized', 
        message: 'Valid authentication token required. Please provide a JWT token in the Authorization header.' 
      },
      { status: 401 }
    );
  }
  
  return null; // Authentication successful
}

/**
 * Attach user information to request for downstream use
 */
export function getAuthUser(req: NextRequest): JWTPayload | null {
  return verifyAuthToken(req);
}
