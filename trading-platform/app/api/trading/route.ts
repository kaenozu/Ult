import { NextRequest, NextResponse } from 'next/server';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { requireAuth } from '@/app/lib/auth';
import { handleApiError } from '@/app/lib/error-handler';

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
// GET - Platform status
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

    return NextResponse.json({
      status,
      portfolio,
      signals,
      riskMetrics,
      alerts,
    });
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
        // Input validation
        if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid symbol: must be a non-empty string' },
            { status: 400 }
          );
        }
        if (!body.side || !['BUY', 'SELL'].includes(body.side)) {
          return NextResponse.json(
            { error: 'Invalid side: must be BUY or SELL' },
            { status: 400 }
          );
        }
        if (!body.quantity || typeof body.quantity !== 'number' || body.quantity <= 0 || !Number.isFinite(body.quantity)) {
          return NextResponse.json(
            { error: 'Invalid quantity: must be a positive finite number' },
            { status: 400 }
          );
        }
        
        await platform.placeOrder(
          body.symbol,
          body.side,
          body.quantity,
          body.options
        );
        return NextResponse.json({ success: true });
      
      case 'close_position':
        if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid symbol: must be a non-empty string' },
            { status: 400 }
          );
        }
        await platform.closePosition(body.symbol);
        return NextResponse.json({ success: true });
      
      case 'create_alert':
        if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid name: must be a non-empty string' },
            { status: 400 }
          );
        }
        if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid symbol: must be a non-empty string' },
            { status: 400 }
          );
        }
        if (!body.type || typeof body.type !== 'string') {
          return NextResponse.json(
            { error: 'Invalid type: must be a string' },
            { status: 400 }
          );
        }
        if (!body.operator || typeof body.operator !== 'string') {
          return NextResponse.json(
            { error: 'Invalid operator: must be a string' },
            { status: 400 }
          );
        }
        if (body.value === undefined || body.value === null || typeof body.value !== 'number' || !Number.isFinite(body.value)) {
          return NextResponse.json(
            { error: 'Invalid value: must be a finite number' },
            { status: 400 }
          );
        }
        
        platform.createAlert(
          body.name,
          body.symbol,
          body.type,
          body.operator,
          body.value
        );
        return NextResponse.json({ success: true });
      
      case 'update_config':
        platform.updateConfig(body.config);
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
