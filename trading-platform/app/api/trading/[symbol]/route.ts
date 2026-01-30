import { NextRequest, NextResponse } from 'next/server';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const platform = getGlobalTradingPlatform();
    const symbol = params.symbol.toUpperCase();
    const signal = platform.getSignal(symbol);
    const marketData = platform.getMarketData(symbol);

    return NextResponse.json({ signal, marketData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
