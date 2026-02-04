import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { handleApiError, validationError } from '@/app/lib/error-handler';
import { fetchMarketHistory } from '@/app/lib/market-data-fetcher';
import { buildDataQualitySummary } from '@/app/lib/market-data-quality';

function validateSymbol(symbol: string | null): string | null {
  if (!symbol) return null;
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9.,^]+$/.test(normalized)) return null;
  if (normalized.length > 20) return null;
  return normalized;
}

export async function GET(request: Request) {
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const symbol = validateSymbol(searchParams.get('symbol'));
    const marketParam = searchParams.get('market');
    const market = marketParam === 'japan' || marketParam === 'usa' ? marketParam : undefined;
    const startDate = searchParams.get('startDate') || undefined;

    if (!symbol) {
      return validationError('Symbol is required', 'symbol');
    }

    const history = await fetchMarketHistory(request.url, symbol, {
      market,
      startDate,
      interval: '1d',
    });

    const dataQuality = buildDataQualitySummary(symbol, history.data);

    return NextResponse.json({
      symbol,
      dataQuality,
      warnings: history.warnings,
      metadata: history.metadata,
    });
  } catch (error) {
    return handleApiError(error, 'data-quality');
  }
}
