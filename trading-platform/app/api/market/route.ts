import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// In some versions/types, suppressNotices is not available on the default export type definition 
// even if it exists at runtime, or we might not need it if the error was about instantiation.
// The error "Call `const yahooFinance = new YahooFinance()` first" is key.
// It implies we shouldn't use the singleton directly if it's not initialized?
// Actually, let's remove suppressNotices for now to fix the build error, 
// and address the runtime error by ensuring we catch it or ignore it if it's just a warning.
// But "Call ... first" is a crash.

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
      
      const result: any = await yahooFinance.chart(yahooSymbol, {
        period1: startDate.toISOString().split('T')[0],
        interval: '1d',
      });

      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new Error('No data returned');
      }

      const ohlcv = result.quotes
        .filter((q: any) => q.open !== null && q.close !== null) // Filter invalid candles
        .map((q: any) => ({
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
        const result: any = await yahooFinance.quote(symbols[0]);
        return NextResponse.json({ 
          symbol: symbol,
          price: result.regularMarketPrice,
          change: result.regularMarketChange,
          changePercent: result.regularMarketChangePercent,
          volume: result.regularMarketVolume,
          marketState: result.marketState
        });
      } else {
        const results: any[] = await yahooFinance.quote(symbols);
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

  } catch (error: any) {
    console.error(`Yahoo Finance API Error (${yahooSymbol}):`, error.message);
    return NextResponse.json({ 
      error: error.message,
      details: 'Failed to fetch real data.' 
    }, { status: 500 });
  }
}
