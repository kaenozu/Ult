import { NextRequest, NextResponse } from 'next/server';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { requireAuth } from '@/app/lib/auth';
import { handleApiError } from '@/app/lib/error-handler';
import { csrfTokenMiddleware, requireCSRF, generateCSRFToken } from '@/app/lib/csrf/csrf-protection';
import { AlertType } from '@/app/lib/alerts/AlertSystem';
import {
  validateSymbol,
  validateOrderSide,
  validateOrderType,
  validateTradingAction,
  validateNumber,
  validateRequiredString,
  validateOperator,
  buildCleanConfig
} from '@/app/lib/validation';

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
      // 既にアラートオペレーターの場合はそのまま返す
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
  // Require authentication
  const authError = requireAuth(req);
  if (authError) return authError;

  // Rate limiting
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

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
      httpOnly: true,
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
  // Require authentication
  const authError = requireAuth(req);
  if (authError) return authError;

  // Rate limiting for trading actions
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  // CSRF Protection
  const csrfError = requireCSRF(req);
  if (csrfError) return csrfError;
  
  try {
    const body = await req.json();
    const platform = getGlobalTradingPlatform();

    switch (body.action) {
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
        const symbol = validateSymbol(body.symbol);
        const side = validateOrderSide(body.side);
        const quantity = validateNumber(body.quantity, 'quantity', { positive: true });
        
        await platform.placeOrder(symbol, side, quantity, body.options);
        return NextResponse.json({ success: true });
      
      case 'close_position':
        const closeSymbol = validateSymbol(body.symbol);
        await platform.closePosition(closeSymbol);
        return NextResponse.json({ success: true });
      
      case 'create_alert':
        const name = validateRequiredString(body.name, 'name');
        const alertSymbol = validateSymbol(body.symbol);
        const type = validateRequiredString(body.type, 'type');
        const operator = mapToAlertOperator(validateOperator(body.operator));
        const value = validateNumber(body.value, 'value', { finite: true });
        
        platform.createAlert(name, alertSymbol, type as AlertType, operator, value);
        return NextResponse.json({ success: true });
      
      case 'update_config':
        const config = buildCleanConfig(body.config);
        platform.updateConfig(config);
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
