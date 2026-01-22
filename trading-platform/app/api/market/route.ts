import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// Define explicit types for Yahoo Finance responses
// (Partial definitions based on what we use)
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
  [key: string]: unknown;
}

const yf = new YahooFinance();

function formatSymbol(symbol: string, market?: string): string {
  if (market === 'japan' || (symbol.match(/^\d{4}$/) && !symbol.endsWith('.T'))) {
    return `${symbol}.T`;
  }
  return symbol;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const symbol = searchParams.get('symbol');
  const market = searchParams.get('market');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const yahooSymbol = formatSymbol(symbol, market || undefined);

  try {
    if (type === 'history') {
      // Calculate start date for 200 days ago
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 300); // 300 days for good chart context
      
      const result = await yf.chart(yahooSymbol, {
        period1: startDate.toISOString().split('T')[0],
        interval: '1d',
      }) as YahooChartResult;

      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new Error('No data returned');
      }

      const ohlcv = result.quotes
        .filter(q => q.open !== null && q.close !== null) // Filter invalid candles
        .map(q => ({
          date: q.date.toISOString().split('T')[0],
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume || 0,
        }));

      return NextResponse.json({ data: ohlcv });
    } 
    
    if (type === 'quote') {
      const symbols = symbol.split(',').map(s => formatSymbol(s.trim(), market || undefined));
      
      if (symbols.length === 1) {
        const result = await yf.quote(symbols[0]) as unknown as YahooQuoteResult;
        return NextResponse.json({ 
          symbol: symbol,
          price: result.regularMarketPrice,
          change: result.regularMarketChange,
          changePercent: result.regularMarketChangePercent,
          volume: result.regularMarketVolume,
          marketState: result.marketState
        });
      } else {
        const results = await yf.quote(symbols) as unknown as YahooQuoteResult[];
        const data = results.map(r => ({
          symbol: r.symbol.replace('.T', ''), // Strip .T for frontend consistency
          price: r.regularMarketPrice,
          change: r.regularMarketChange,
          changePercent: r.regularMarketChangePercent,
          volume: r.regularMarketVolume,
          marketState: r.marketState
        }));
        return NextResponse.json({ data });
      }
    }

    return NextResponse.json({ error: 'Invalid type parameter. Use "history" or "quote".' }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Yahoo Finance API Error (${yahooSymbol}):`, errorMessage);
    return NextResponse.json({ 
      error: 'Failed to fetch market data',
      details: 'An internal error occurred while fetching data.'
    }, { status: 500 });
  }
}
