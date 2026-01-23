import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

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
      const startDateParam = searchParams.get('startDate');
      let period1: string;

      if (startDateParam) {
        period1 = startDateParam;
      } else {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        period1 = startDate.toISOString().split('T')[0];
      }

      try {
        const result = await yf.chart(yahooSymbol, {
          period1: period1,
          interval: '1d',
        }) as unknown as YahooChartResult;

        if (!result || !result.quotes || result.quotes.length === 0) {
          console.warn(`No data returned from chart for ${yahooSymbol}`);
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
        const errorMsg = innerError instanceof Error ? innerError.message : 'Unknown historical error';
        console.error(`yf.chart failed for ${yahooSymbol}:`, errorMsg);
        return NextResponse.json({ 
          error: 'Failed to fetch historical data', 
          details: 'The market data provider is temporarily unavailable.' 
        }, { status: 502 });
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
          const errorMsg = quoteError instanceof Error ? quoteError.message : 'Quote error';
          console.error(`yf.quote failed for ${symbols[0]}:`, errorMsg);
          return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
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
          const errorMsg = batchError instanceof Error ? batchError.message : 'Batch error';
          console.error('Batch quote failed:', errorMsg);
          return NextResponse.json({ data: [], error: 'Batch fetch failed' }); 
        }
      }
    }

    return NextResponse.json({ error: 'Invalid type parameter. Use "history" or "quote".' }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Market API Root Error (${yahooSymbol}):`, errorMessage);
    return NextResponse.json({ 
      error: 'Failed to fetch market data',
      details: 'An internal error occurred while processing your request.'
    }, { status: 500 });
  }
}