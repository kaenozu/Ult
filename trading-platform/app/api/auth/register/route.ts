import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/app/lib/error-handler';
import { checkRateLimit } from '@/app/lib/api-middleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simple in-memory user store (in production, use database)
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  role: 'user' | 'admin';
}

// Demo users (in production, use proper database)
const users: Map<string, User> = new Map();

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-change-in-production';

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
    if (users.has(email.toLowerCase())) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: email.toLowerCase(),
      passwordHash,
      name,
      createdAt: new Date().toISOString(),
      role: 'user',
    };

    users.set(email.toLowerCase(), user);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'auth/register', 500);
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | undefined {
  for (const user of users.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return undefined;
}

/**
 * Middleware to require authentication
 */
export function requireAuth(request: NextRequest): { user: User } | NextResponse {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
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
