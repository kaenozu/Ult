import { NextRequest, NextResponse } from 'next/server';
import { realTimeDataService } from '@/app/lib/services/RealTimeDataService';
import { checkRateLimit } from '@/app/lib/api-middleware';

export async function GET(req: NextRequest) {
  // 1. Rate Limit Check
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const market = searchParams.get('market');

  // 3. Strict Validation
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // Symbol must be 4-digit number for Japanese stocks
  if (!/^[0-9]{4}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format. Japanese stocks must have 4 digits.' }, { status: 400 });
  }

  // Only use scraper for Japanese stocks
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
