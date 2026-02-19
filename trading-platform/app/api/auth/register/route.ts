import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/app/lib/error-handler';
import { checkRateLimit } from '@/app/lib/api-middleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authStore, User } from '@/app/lib/auth-store';

const envSecret = process.env.JWT_SECRET;
if (!envSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  // In development/test, log a warning but allow operation
  console.warn('⚠️  JWT_SECRET not set. Using insecure fallback for development only.');
}
const ACTIVE_SECRET = envSecret || 'demo-secret-dev-only';

// --- Zod Schemas ---
const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     description: Create a new user account
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid parameters
 *       409:
 *         description: User already exists
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    
    // Validate parameters
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: result.error.format() },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;

    // Check if user already exists
    if (authStore.getUser(email)) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with cryptographically secure ID
    const user: User = {
      id: `user_${crypto.randomUUID()}`,
      email: email.toLowerCase(),
      passwordHash,
      name,
      createdAt: new Date().toISOString(),
      role: 'user',
    };

    authStore.addUser(user);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      ACTIVE_SECRET,
      { expiresIn: '7d' }
    );

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      // Token is NOT included in response body for security
    }, { status: 201 });

    // Set secure httpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error, 'auth/register', 500);
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, ACTIVE_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | undefined {
  return authStore.getUserById(userId);
}

/**
 * Middleware to require authentication
 * Checks for token in httpOnly cookie first, then Authorization header (for backward compatibility)
 */
export function requireAuth(request: NextRequest): { user: User } | NextResponse {
  // Try to get token from httpOnly cookie first (preferred method)
  let token = request.cookies.get('auth-token')?.value;
  
  // Fallback to Authorization header for backward compatibility
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  const user = getUserById(payload.userId);
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 401 }
    );
  }

  return { user };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(request: NextRequest): { user: User } | NextResponse {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return authResult;
}
