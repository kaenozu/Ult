import { NextRequest, NextResponse } from 'next/server';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { requireAuth } from '@/app/lib/auth';
import { handleApiError } from '@/app/lib/error-handler';

/**
 * @swagger
 * /api/trading/{symbol}:
 *   get:
 *     summary: Get symbol-specific trading data
 *     description: Retrieve trading signal and market data for a specific symbol
 *     tags:
 *       - Trading
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol (e.g., 7203, AAPL)
 *         example: 7203
 *     responses:
 *       200:
 *         description: Successful response with symbol data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signal:
 *                   $ref: '#/components/schemas/Signal'
 *                 marketData:
 *                   type: object
 *                   description: Current market data for the symbol
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  // Require authentication
  const authError = requireAuth(req);
  if (authError) return authError;

  // Rate limiting
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const platform = getGlobalTradingPlatform();
    const { symbol } = await context.params;
    const upperSymbol = symbol.toUpperCase();
    const signal = platform.getSignal(upperSymbol);
    const marketData = platform.getMarketData(upperSymbol);

    return NextResponse.json({ signal, marketData });
  } catch (error) {
    return handleApiError(error, 'trading/[symbol]');
  }
}
