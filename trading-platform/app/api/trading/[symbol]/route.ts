import { NextRequest, NextResponse } from 'next/server';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { ipRateLimiter, getClientIp } from '@/app/lib/ip-rate-limit';
import { rateLimitError } from '@/app/lib/error-handler';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  // Rate limiting
  const clientIp = getClientIp(req);
  if (!ipRateLimiter.check(clientIp)) {
    return rateLimitError();
  }

  try {
    const platform = getGlobalTradingPlatform();
    const { symbol } = await context.params;
    const upperSymbol = symbol.toUpperCase();
    const signal = platform.getSignal(upperSymbol);
    const marketData = platform.getMarketData(upperSymbol);

    return NextResponse.json({ signal, marketData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
