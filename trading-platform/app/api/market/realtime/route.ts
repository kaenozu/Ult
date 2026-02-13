import { NextRequest, NextResponse } from 'next/server';
import { realTimeDataService } from '@/app/lib/services/RealTimeDataService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const market = searchParams.get('market');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // Only use scraper for Japanese stocks (numeric symbols)
  if (market && market !== 'japan') {
    return NextResponse.json({ error: 'Real-time data is currently only optimized for the Japanese market' }, { status: 400 });
  }

  try {
    const quote = await realTimeDataService.fetchQuote(symbol);
    
    if (!quote) {
      return NextResponse.json({ error: 'Data not available' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: quote,
      source: 'scraper'
    });
  } catch (error) {
    console.error(`[API] Real-time fetch error for ${symbol}:`, error);
    return NextResponse.json({ error: 'Failed to fetch real-time data' }, { status: 502 });
  }
}
