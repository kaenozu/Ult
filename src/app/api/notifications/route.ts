import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Enhanced input validation schema for notifications
const NotificationRequestSchema = z.object({
  type: z.enum([
    'trade',
    'price_alert',
    'portfolio',
    'system',
    'info',
    'warning',
    'error',
  ]),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title too long')
    .refine(val => val.trim().length > 0, 'Title cannot be empty')
    .refine(
      val => !/<script|javascript:|data:/i.test(val),
      'Invalid characters in title'
    ),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message too long')
    .refine(val => val.trim().length > 0, 'Message cannot be empty')
    .refine(
      val => !/<script|javascript:|data:/i.test(val),
      'Invalid characters in message'
    ),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  metadata: z.record(z.any()).optional(),
});

// Rate limiting for notifications
const notificationRateLimit = new Map<
  string,
  { count: number; resetTime: number }
>();

function checkNotificationRateLimit(
  ip: string,
  limit = 50,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const userLimit = notificationRateLimit.get(ip);
  if (!userLimit || userLimit.resetTime < windowStart) {
    notificationRateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Enhanced notification processor with validation
function processNotification(
  type: string,
  title: string,
  message: string,
  severity: string,
  metadata?: any
): boolean {
  // Additional validation at processing stage
  if (!title || !message) {
    return false;
  }

  // Log to secure logging system in production
  // For demo, we'll just process it

  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Rate limiting check
    if (!checkNotificationRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retry_after: 60,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = NotificationRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { type, title, message, severity, metadata } = validationResult.data;

    // Process the notification
    const success = processNotification(
      type,
      title,
      message,
      severity,
      metadata
    );

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process notification',
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Notification processed successfully',
      data: {
        type,
        title,
        severity,
        timestamp: new Date().toISOString(),
        notification_id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    });
  } catch (error) {
    // Error handling with proper logging in production
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON format',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
