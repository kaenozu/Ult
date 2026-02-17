import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { handleApiError } from '@/app/lib/error-handler';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { requireCSRF } from '@/app/lib/csrf/csrf-protection';
import { TradeHistoryExport, ExportTradesRequest } from '@/app/types/order';

// --- Zod Schema ---
const ExportRequestSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  symbols: z.array(z.string()).optional(),
});

/**
 * @swagger
 * /api/export/trades:
 *   post:
 *     summary: Export trade history
 *     description: Export trading history in JSON, CSV, or XLSX format
 *     tags:
 *       - Export
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [json, csv, xlsx]
 *                 default: json
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               symbols:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Export successful
 *       400:
 *         description: Invalid parameters
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // CSRF protection
  const csrfResponse = requireCSRF(request);
  if (csrfResponse) return csrfResponse;

  try {
    const body = await request.json();
    
    // Validate parameters
    const result = ExportRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: result.error.format() },
        { status: 400 }
      );
    }

    const { format, startDate, endDate, symbols } = result.data;

    // Get portfolio data from store
    const portfolio = usePortfolioStore.getState().portfolio;
    
    if (!portfolio || !portfolio.orders || portfolio.orders.length === 0) {
      return NextResponse.json(
        { error: 'No trading data available' },
        { status: 404 }
      );
    }

    // Filter orders by date range and symbols
    let filteredOrders = portfolio.orders;

    if (startDate) {
      const start = new Date(startDate);
      filteredOrders = filteredOrders.filter(o => new Date(o.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredOrders = filteredOrders.filter(o => new Date(o.date) <= end);
    }

    if (symbols && symbols.length > 0) {
      const symbolSet = new Set(symbols.map(s => s.toUpperCase()));
      filteredOrders = filteredOrders.filter(o => symbolSet.has(o.symbol.toUpperCase()));
    }

    // Calculate summary statistics
    const trades = filteredOrders.map(order => {
      // Find corresponding position for PnL calculation
      const position = portfolio.positions.find(p => p.symbol === order.symbol);
      const pnl = position ? (position.currentPrice - (order.price || 0)) * order.quantity : undefined;
      const pnlPercent = order.price ? ((pnl || 0) / (order.price * order.quantity)) * 100 : undefined;

      return {
        orderId: order.id,
        symbol: order.symbol,
        name: position?.name || order.symbol,
        market: position?.market || 'usa',
        side: order.side === 'BUY' ? 'LONG' as const : 'SHORT' as const,
        quantity: order.quantity,
        price: order.price || 0,
        orderType: order.type,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        executedAt: order.date,
        pnl,
        pnlPercent,
      };
    });

    const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const profits = trades.filter(t => (t.pnl || 0) > 0).map(t => t.pnl || 0);
    const losses = trades.filter(t => (t.pnl || 0) < 0).map(t => Math.abs(t.pnl || 0));
    
    const avgProfit = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const profitFactor = avgLoss > 0 ? avgProfit / avgLoss : avgProfit > 0 ? Infinity : 0;

    const exportData: TradeHistoryExport = {
      exportId: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      trades,
      summary: {
        totalTrades: trades.length,
        winningTrades,
        losingTrades,
        totalPnL: totalPnL,
        winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
        avgProfit,
        avgLoss,
        profitFactor,
        startDate: startDate || trades[trades.length - 1]?.executedAt || new Date().toISOString(),
        endDate: endDate || trades[0]?.executedAt || new Date().toISOString(),
      },
    };

    // Format response based on requested format
    switch (format) {
      case 'csv': {
        const csvHeaders = ['OrderID', 'Symbol', 'Name', 'Market', 'Side', 'Quantity', 'Price', 'OrderType', 'ExecutedAt', 'PnL', 'PnLPercent'];
        const csvRows = exportData.trades.map(t => [
          t.orderId,
          t.symbol,
          t.name,
          t.market,
          t.side,
          t.quantity,
          t.price,
          t.orderType,
          t.executedAt,
          t.pnl?.toFixed(2) || '',
          t.pnlPercent?.toFixed(2) || '',
        ]);
        
        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="trades_${exportData.exportId}.csv"`,
          },
        });
      }

      case 'xlsx':
        // For XLSX, return JSON with metadata indicating Excel format
        // Client-side library would handle conversion
        return NextResponse.json({
          ...exportData,
          _format: 'xlsx',
          _note: 'Use client-side library like xlsx.js to convert JSON to Excel',
        });

      case 'json':
      default:
        return NextResponse.json(exportData);
    }
  } catch (error) {
    return handleApiError(error, 'export/trades', 500);
  }
}
