import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  handleApiError,
  rateLimitError,
} from '@/app/lib/error-handler';
import { ipRateLimiter, getClientIp } from '@/app/lib/ip-rate-limit';

const yf = new YahooFinance();

/**
 * Market Snapshot API
 * 
 * Provides a snapshot of current market data for use in WebSocket fallback mode.
 * Returns quotes for major market indices and popular stocks.
 */

const DEFAULT_SYMBOLS = ['^GSPC', '^DJI', '^IXIC', 'AAPL', 'GOOGL', 'MSFT', 'TSLA'];

interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketState?: string;
  longName?: string;
  shortName?: string;
  [key: string]: unknown;
}

export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  if (!ipRateLimiter.check(clientIp)) {
    return rateLimitError();
  }

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');
  
  // Use provided symbols or default ones
  const symbols = symbolsParam 
    ? symbolsParam.split(',').map(s => s.trim().toUpperCase())
    : DEFAULT_SYMBOLS;

  // Limit to 20 symbols to prevent abuse
  if (symbols.length > 20) {
    return NextResponse.json(
      { error: 'Too many symbols. Maximum 20 allowed.' },
      { status: 400 }
    );
  }

  try {
    const results = await yf.quote(symbols) as YahooQuoteResult[];
    
    const data = results
      .filter((r): r is YahooQuoteResult => !!r)
      .map(r => ({
        symbol: r.symbol || 'UNKNOWN',
        name: r.shortName || r.longName || r.symbol || 'Unknown',
        price: r.regularMarketPrice || 0,
        change: r.regularMarketChange || 0,
        changePercent: r.regularMarketChangePercent || 0,
        volume: r.regularMarketVolume || 0,
        marketState: r.marketState || 'UNKNOWN',
      }));

    return NextResponse.json({
      timestamp: Date.now(),
      data,
      count: data.length,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'market/snapshot', 500);
  }
}
