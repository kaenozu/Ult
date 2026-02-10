import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import YahooFinance from 'yahoo-finance2';
import {
  handleApiError,
} from '@/app/lib/error-handler';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { isIntradayInterval } from '@/app/lib/constants/intervals';
import { DataSourceProvider } from '@/app/domains/market-data/types/data-source';
import {
  YahooChartResultSchema,
  YahooSingleQuoteSchema
} from '@/app/lib/schemas/market';

export const yf = new YahooFinance();

// --- Zod Schemas for Request ---

const MarketRequestSchema = z.object({
  type: z.enum(['history', 'quote']).default('quote'),
  symbol: z.string().min(1).max(1000).regex(/^[A-Z0-9^.,]+$/i, 'Invalid symbol format').transform(s => s.toUpperCase()),
  market: z.enum(['japan', 'usa']).optional(),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1d', '1wk', '1mo']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function formatSymbol(symbol: string, market?: string): string {
  // Never add suffix to indices (starting with ^)
  if (symbol.startsWith('^')) {
    return symbol;
  }

  if (market === 'japan' || (symbol.match(/^\d{4}$/) && !symbol.endsWith('.T'))) {
    return symbol.endsWith('.T') ? symbol : `${symbol}.T`;
  }
  return symbol;
}

/**
 * @swagger
 * /api/market:
 *   get:
 *     summary: Get market data
 *     description: Fetch historical price data or real-time quotes for stocks and indices
 *     tags:
 *       - Market Data
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [history, quote]
 *         description: Type of data to retrieve (history for historical data, quote for current price)
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol (e.g., ^N225 for Nikkei 225, AAPL for Apple, 7203 for Toyota)
 *         example: ^N225
 *       - in: query
 *         name: market
 *         schema:
 *           type: string
 *           enum: [japan, usa]
 *         description: Market type for symbol formatting
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1m, 5m, 15m, 1h, 4h, 1d, 1wk, 1mo]
 *         description: Data interval (only for history type). Note - Intraday intervals (1m, 5m, 15m, 1h, 4h) not available for Japanese stocks
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for historical data in YYYY-MM-DD format (only for history type)
 *         example: 2021-01-01
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/OHLCV'
 *                     warning:
 *                       type: string
 *                       description: Warning message if applicable
 *                   description: Historical data response
 *                 - $ref: '#/components/schemas/Quote'
 *                   description: Quote data response
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Quote'
 *                   description: Batch quotes response
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Symbol not found
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
 *       502:
 *         description: Bad gateway - External API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    // Validate parameters with Zod
    const result = MarketRequestSchema.safeParse(rawParams);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: result.error.format() },
        { status: 400 }
      );
    }

    const { type, symbol, market, interval, startDate: startDateParam } = result.data;
    const yahooSymbol = formatSymbol(symbol, market);

    if (type === 'history') {
      let period1: string;
      if (startDateParam) {
        period1 = startDateParam;
      } else {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        period1 = startDate.toISOString().split('T')[0];
      }

      try {
        const isJapaneseStock = yahooSymbol.endsWith('.T');
        const isIntraday = interval && isIntradayInterval(interval);

        type YahooInterval = "1m" | "5m" | "15m" | "1h" | "1d" | "1wk" | "1mo" | "2m" | "30m" | "60m" | "90m" | "5d" | "3mo" | undefined;
        let finalInterval: YahooInterval = undefined;
        if (isJapaneseStock && isIntraday) {
          finalInterval = '1d';
        } else if (interval) {
          finalInterval = (interval === '4h' ? '1h' : interval) as YahooInterval;
        }

        const rawResult = await yf.chart(yahooSymbol, { period1, interval: finalInterval ?? '1d' });
        const parseResult = YahooChartResultSchema.safeParse(rawResult);

        if (!parseResult.success) {
          console.error('[MarketAPI] Schema parse error:', parseResult.error);
          return handleApiError(new Error('Upstream API data schema mismatch'), 'market/history', 502);
        }

        const data = parseResult.data;
        if (!data || !data.quotes || data.quotes.length === 0) {
          console.warn(`[MarketAPI] No data for ${yahooSymbol}:`, { hasData: !!data, hasQuotes: !!data?.quotes, quotesLength: data?.quotes?.length });
          return NextResponse.json({ data: [], warning: 'No historical data found' });
        }
        
        console.log(`[MarketAPI] Successfully fetched ${data.quotes.length} records for ${yahooSymbol}`);

        const warnings: string[] = [];
        if (isJapaneseStock && isIntraday) {
          warnings.push('イントラデイデータは日本株では利用できません。日次データを表示しています。');
        }
        warnings.push('⚠️ Yahoo Finance使用中: 15分遅延データです。');

        const isFinalIntervalIntraday = finalInterval && isIntradayInterval(finalInterval);
        let lastValidClose: number | null = null;

        const ohlcv = data.quotes.map((q) => {
          let dateStr: string;
          if (q.date instanceof Date) {
            if (isFinalIntervalIntraday) {
              dateStr = q.date.toISOString().replace('T', ' ').substring(0, 16);
            } else {
              dateStr = q.date.toISOString().split('T')[0];
            }
          } else {
            dateStr = String(q.date);
          }

          const hasValidClose = q.close !== null && q.close !== undefined && q.close > 0;
          if (hasValidClose) lastValidClose = q.close ?? null;
          const interpolatedClose = hasValidClose ? q.close : (lastValidClose ?? 0);
          
          return {
            date: dateStr,
            open: Number(q.open ?? interpolatedClose),
            high: Number(q.high ?? interpolatedClose),
            low: Number(q.low ?? interpolatedClose),
            close: Number(interpolatedClose),
            volume: Number(q.volume ?? 0),
            isInterpolated: !hasValidClose,
          };
        });

        return NextResponse.json({ 
          data: ohlcv, 
          warnings,
          metadata: {
            source: DataSourceProvider.YAHOO_FINANCE,
            isJapaneseStock,
            interval: finalInterval || '1d',
            fallbackApplied: isJapaneseStock && isIntraday,
          }
        });
      } catch (err) {
        return handleApiError(err, 'market/history', 502);
      }
    }

    if (type === 'quote') {
      const symbols = symbol.split(',').map(s => formatSymbol(s.trim(), market));

      if (symbols.length === 1) {
        try {
          const rawResult = await yf.quote(symbols[0]);
          const parseResult = YahooSingleQuoteSchema.safeParse(rawResult);
          if (!parseResult.success) throw new Error('Symbol not found');

          const quote = parseResult.data;
          return NextResponse.json({
            symbol: symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            marketState: quote.marketState
          });
        } catch (err) {
          return handleApiError(err, 'market/quote', 404);
        }
      } else {
        try {
          const results = await yf.quote(symbols);
          const data = results
            .map(r => {
              const p = YahooSingleQuoteSchema.safeParse(r);
              return p.success ? p.data : null;
            })
            .filter(r => !!r)
            .map(r => ({
              symbol: r!.symbol.replace('.T', ''),
              price: r!.regularMarketPrice || 0,
              change: r!.regularMarketChange || 0,
              changePercent: r!.regularMarketChangePercent || 0,
              volume: r!.regularMarketVolume || 0,
              marketState: r!.marketState || 'UNKNOWN'
            }));
          return NextResponse.json({ data });
        } catch (err) {
          return handleApiError(err, 'market/batch-quote', 502);
        }
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return handleApiError(error, 'market/api', 500);
  }
}
