import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  handleApiError,
  validationError,
} from '@/app/lib/error-handler';

// Define explicit types for Yahoo Finance responses
interface YahooChartResult {
  meta: {
    currency: string;
    symbol: string;
    regularMarketPrice: number;
  };
  quotes: {
    date: Date;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number;
  }[];
}

interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketState: string;
  // Use a more specific type for additional properties
  [key: string]: string | number | boolean | null | undefined;
}

const yf = new YahooFinance();

function formatSymbol(symbol: string, market?: string): string {
  // Never add suffix to indices (starting with ^)
  if (symbol.startsWith('^')) {
    return symbol;
  }

  if (market === 'japan' || (symbol.match(/^\d{4}$/) && !symbol.endsWith('.T'))) {
    return `${symbol}.T`;
  }
  return symbol;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const symbol = searchParams.get('symbol')?.trim().toUpperCase();
  const market = searchParams.get('market');

  // Input validation and sanitization
  if (!symbol) {
    return validationError('Symbol is required', 'symbol');
  }

  // Validate symbol format (alphanumeric, dots, commas, and caret for indices)
  if (!/^[A-Z0-9.,^]+$/.test(symbol)) {
    return validationError('Invalid symbol format', 'symbol');
  }

  // Validate symbol length to prevent DoS
  // Single symbol: max 20 chars
  // Batch symbols (comma separated): max 1000 chars
  const isBatch = symbol.includes(',');
  if (symbol.length > (isBatch ? 1000 : 20)) {
    return NextResponse.json({ error: 'Symbol too long' }, { status: 400 });
  }

  // Validate type parameter
  if (type && !['history', 'quote'].includes(type)) {
    return validationError('Invalid type parameter', 'type');
  }

  // Validate market parameter
  if (market && !['japan', 'usa'].includes(market)) {
    return validationError('Invalid market parameter', 'market');
  }

  const yahooSymbol = formatSymbol(symbol, market || undefined);

  try {
    if (type === 'history') {
      const startDateParam = searchParams.get('startDate');
      let period1: string;

      if (startDateParam) {
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateParam) || isNaN(Date.parse(startDateParam))) {
          return validationError('Invalid startDate format. Use YYYY-MM-DD.', 'startDate');
        }
        period1 = startDateParam;
      } else {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        period1 = startDate.toISOString().split('T')[0];
      }

      try {
        // Use simplified options to avoid compatibility issues
        const result = await yf.chart(yahooSymbol, {
          period1: period1,
        }) as unknown as YahooChartResult;

        if (!result || !result.quotes || result.quotes.length === 0) {
          return NextResponse.json({ data: [], warning: 'No historical data found' });
        }

        const ohlcv = result.quotes.map(q => ({
          date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
          open: q.open || 0,
          high: q.high || 0,
          low: q.low || 0,
          close: q.close || 0,
          volume: q.volume || 0,
        }));

        return NextResponse.json({ data: ohlcv });
      } catch (innerError: unknown) {
        return handleApiError(new Error('Failed to fetch historical data'), 'market/history', 502);
      }
    }

    if (type === 'quote') {
      const symbols = symbol.split(',').map(s => formatSymbol(s.trim(), market || undefined));

      if (symbols.length === 1) {
        try {
          const result = await yf.quote(symbols[0]) as unknown as YahooQuoteResult;
          if (!result) throw new Error('Symbol not found');

          return NextResponse.json({
            symbol: symbol,
            price: result.regularMarketPrice,
            change: result.regularMarketChange,
            changePercent: result.regularMarketChangePercent,
            volume: result.regularMarketVolume,
            marketState: result.marketState
          });
        } catch (quoteError: unknown) {
          return handleApiError(quoteError, 'market/quote', 404);
        }
      } else {
        try {
          const results = await yf.quote(symbols) as unknown as (YahooQuoteResult | undefined)[];
          const data = results
            .filter((r): r is YahooQuoteResult => r !== undefined)
            .map(r => ({
              symbol: r.symbol ? r.symbol.replace('.T', '') : 'UNKNOWN',
              price: r.regularMarketPrice || 0,
              change: r.regularMarketChange || 0,
              changePercent: r.regularMarketChangePercent || 0,
              volume: r.regularMarketVolume || 0,
              marketState: r.marketState || 'UNKNOWN'
            }));
          return NextResponse.json({ data });
        } catch (batchError: unknown) {
          return handleApiError(batchError, 'market/batch-quote', 502);
        }
      }
    }

    return validationError('Invalid type parameter. Use "history" or "quote".', 'type');

  } catch (error: unknown) {
    return handleApiError(error, 'market/api', 500);
  }
}