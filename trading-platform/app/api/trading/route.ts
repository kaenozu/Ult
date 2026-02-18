import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { requireAuth } from '@/app/lib/auth';
import { handleApiError } from '@/app/lib/error-handler';
import { requireCSRF, generateCSRFToken } from '@/app/lib/csrf/csrf-protection';
import { AlertType } from '@/app/lib/alerts/AlertSystem';
import { sanitizeSymbol, sanitizeText } from '@/app/lib/security/InputSanitizer';

// --- Zod Schemas ---

const ConfigUpdateSchema = z.object({
  mode: z.enum(['live', 'paper', 'backtest']).optional(),
  initialCapital: z.number().positive().optional(),
  riskLimits: z.object({
    maxPositionSize: z.number().positive().optional(),
    maxDailyLoss: z.number().positive().optional(),
    maxDrawdown: z.number().positive().max(100).optional(),
  }).optional(),
  aiEnabled: z.boolean().optional(),
  sentimentEnabled: z.boolean().optional(),
  autoTrading: z.boolean().optional(),
  exchanges: z.array(z.string()).optional(),
  symbols: z.array(z.string()).optional(),
});

const TradingActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('stop') }),
  z.object({ action: z.literal('reset') }),
  z.object({
    action: z.literal('place_order'),
    symbol: z.string().min(1),
    side: z.enum(['BUY', 'SELL', 'LONG', 'SHORT']),
    quantity: z.number().positive(),
    options: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    action: z.literal('close_position'),
    symbol: z.string().min(1),
  }),
  z.object({
    action: z.literal('create_alert'),
    name: z.string().min(1),
    symbol: z.string().min(1),
    type: z.string().min(1),
    operator: z.string().min(1),
    value: z.number().finite(),
  }),
  z.object({
    action: z.literal('update_config'),
    config: ConfigUpdateSchema,
  }),
]);

/**
 * 比較演算子をアラートオペレーターにマッピング
 */
function mapToAlertOperator(op: string): 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between' {
  switch (op) {
    case '>': return 'above';
    case '<': return 'below';
    case '>=': return 'above';
    case '<=': return 'below';
    case '==': return 'equals';
    default:
      if (['above', 'below', 'crosses_above', 'crosses_below', 'equals', 'between'].includes(op)) {
        return op as 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between';
      }
      return 'equals';
  }
}

/**
 * @swagger
 * /api/trading:
 *   get:
 *     summary: Get trading platform status
 *     description: Retrieve the current status of the trading platform including portfolio, signals, risk metrics, and recent alerts
 *     tags:
 *       - Trading
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response with platform status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   $ref: '#/components/schemas/TradingStatus'
 *                 portfolio:
 *                   $ref: '#/components/schemas/Portfolio'
 *                 signals:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Signal'
 *                 riskMetrics:
 *                   $ref: '#/components/schemas/RiskMetrics'
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET - Platform status (set CSRF cookie)
export async function GET(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  // Authentication check
  const authResponse = requireAuth(req);
  if (authResponse) return authResponse;

  try {
    const platform = getGlobalTradingPlatform();
    const status = platform.getStatus();
    const portfolio = platform.getPortfolio();
    const signals = platform.getSignals();
    const riskMetrics = platform.getRiskMetrics();
    const alerts = platform.getAlertHistory(10);

    const response = NextResponse.json({
      status,
      portfolio,
      signals,
      riskMetrics,
      alerts,
    });

    // Set CSRF token cookie for client-side use
    const csrfToken = generateCSRFToken();
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false, // Must be false for Double-Submit Cookie pattern
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error, 'trading/api');
  }
}

/**
 * @swagger
 * /api/trading:
 *   post:
 *     summary: Execute trading actions
 *     description: Control the trading platform or execute trading operations
 *     tags:
 *       - Trading
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [start]
 *                     description: Start the trading platform
 *                 required: [action]
 *               - type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [stop]
 *                     description: Stop the trading platform
 *                 required: [action]
 *               - type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [reset]
 *                     description: Reset the trading platform
 *                 required: [action]
 *               - type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [place_order]
 *                   symbol:
 *                     type: string
 *                     description: Stock symbol
 *                     example: "7203"
 *                   side:
 *                     type: string
 *                     enum: [BUY, SELL]
 *                     description: Order side
 *                   quantity:
 *                     type: number
 *                     description: Order quantity (must be positive)
 *                     example: 100
 *                   options:
 *                     type: object
 *                     description: Additional order options
 *                 required: [action, symbol, side, quantity]
 *               - type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [close_position]
 *                   symbol:
 *                     type: string
 *                     description: Stock symbol
 *                     example: "7203"
 *                 required: [action, symbol]
 *               - type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [create_alert]
 *                   name:
 *                     type: string
 *                     description: Alert name
 *                     example: "Price above 2500"
 *                   symbol:
 *                     type: string
 *                     description: Stock symbol
 *                     example: "7203"
 *                   type:
 *                     type: string
 *                     description: Alert type
 *                   operator:
 *                     type: string
 *                     enum: [">", "<", ">=", "<=", "=="]
 *                     description: Comparison operator
 *                   value:
 *                     type: number
 *                     description: Threshold value
 *                     example: 2500
 *                 required: [action, name, symbol, type, operator, value]
 *               - type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [update_config]
 *                   config:
 *                     type: object
 *                     description: Configuration object
 *                 required: [action, config]
 *     responses:
 *       200:
 *         description: Action executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - Invalid action or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST - Control actions
export async function POST(req: NextRequest) {
  // Rate limiting for trading actions
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  // Authentication check
  const authResponse = requireAuth(req);
  if (authResponse) return authResponse;

  // CSRF Protection
  const csrfError = requireCSRF(req);
  if (csrfError) return csrfError;

  try {
    const rawBody = await req.json();

    // Validate request body using Zod
    const result = TradingActionSchema.safeParse(rawBody);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    const data = result.data;
    const platform = getGlobalTradingPlatform();

    switch (data.action) {
      case 'start':
        await platform.start();
        return NextResponse.json({ success: true });

      case 'stop':
        await platform.stop();
        return NextResponse.json({ success: true });

      case 'reset':
        platform.reset();
        return NextResponse.json({ success: true });

      case 'place_order':
        // Map side to what the platform expects (if needed)
        const platformSide: 'BUY' | 'SELL' = (data.side === 'BUY' || data.side === 'LONG') ? 'BUY' : 'SELL';
        // Sanitize symbol to prevent injection/XSS
        const safeOrderSymbol = sanitizeSymbol(data.symbol).sanitized;
        await platform.placeOrder(safeOrderSymbol, platformSide, data.quantity, data.options);
        return NextResponse.json({ success: true });

      case 'close_position':
        // Sanitize symbol
        const safeCloseSymbol = sanitizeSymbol(data.symbol).sanitized;
        await platform.closePosition(safeCloseSymbol);
        return NextResponse.json({ success: true });

      case 'create_alert':
        const operator = mapToAlertOperator(data.operator);
        // Sanitize inputs for alerts
        const safeAlertSymbol = sanitizeSymbol(data.symbol).sanitized;
        const safeAlertName = sanitizeText(data.name).sanitized;
        platform.createAlert(safeAlertName, safeAlertSymbol, data.type as AlertType, operator, data.value);
        return NextResponse.json({ success: true });

      case 'update_config':
        platform.updateConfig(data.config);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error, 'trading/api');
  }
}
