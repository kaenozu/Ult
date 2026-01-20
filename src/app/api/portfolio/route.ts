import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Enhanced input validation schema
const TradeRequestSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker symbol is required')
    .max(10, 'Ticker symbol too long')
    .regex(/^[A-Z0-9.\-\^=]+$/i, 'Invalid ticker format'),
  action: z.enum(['BUY', 'SELL']),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive')
    .max(1000000, 'Quantity exceeds maximum limit'),
  price: z
    .number()
    .positive('Price must be positive')
    .max(10000000, 'Price exceeds maximum limit')
    .refine(val => Number.isFinite(val), 'Invalid price format'),
  reason: z
    .string()
    .max(500, 'Reason too long')
    .optional()
    .refine(val => !val || val.trim().length > 0, 'Reason cannot be empty'),
});

// Rate limiting (simple in-memory for demo)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const userLimit = rateLimit.get(ip);
  if (!userLimit || userLimit.resetTime < windowStart) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function GET() {
  try {
    // Mock portfolio data - in real app, fetch from backend
    const portfolio = {
      total_equity: 1000000,
      cash: 500000,
      invested_amount: 500000,
      positions: [
        {
          ticker: '7203.T',
          quantity: 100,
          avg_price: 1500,
          current_price: 1550,
          pnl: 5000,
        },
      ],
    };

    return NextResponse.json(portfolio);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = TradeRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const tradeData = validationResult.data;

    // Sanitize inputs (additional security)
    const sanitizedReason = tradeData.reason?.replace(/[<>]/g, '') || '';

    // Mock trade execution - in real app, call backend API
    const tradeResult = {
      success: true,
      trade_id: `trade_${Date.now()}`,
      message: `Trade executed: ${tradeData.action} ${tradeData.quantity} shares of ${tradeData.ticker}`,
      details: {
        ...tradeData,
        reason: sanitizedReason,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(tradeResult);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
