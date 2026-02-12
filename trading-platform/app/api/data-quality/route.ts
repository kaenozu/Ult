import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { handleApiError } from '@/app/lib/error-handler';
import { fetchMarketHistory } from '@/app/lib/market-data-fetcher';
import { buildDataQualitySummary } from '@/app/lib/market-data-quality';
import { marketDataCache } from '@/app/lib/data/cache/SmartDataCache';

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

    // If no symbol provided, return global system health/cache stats
    if (!symbol) {
      const cacheStats = marketDataCache.getStats();
      const avgLatency = 150; // Mock latency for now or track real latency in cache
      // TODO: Implement anomaly detection service (anomalyCount)

      return NextResponse.json({
        type: 'global',
        overallScore: Math.round(cacheStats.hitRate * 100),
        cacheStats,
        dataSources: [
          {
            source: 'Yahoo Finance',
            status: 'healthy',
            latency: avgLatency,
            lastUpdate: Date.now(),
            qualityScore: 100 // TODO: Implement dynamic quality scoring based on data gaps/latency
          }
        ],
        anomalies: []
      });
    }

    const history = await fetchMarketHistory(request.url, symbol, {
      market,
      startDate,
      interval: '1d',
    });

    const dataQuality = buildDataQualitySummary(symbol, history.data);

    return NextResponse.json({
      type: 'symbol',
      symbol,
      dataQuality,
      warnings: history.warnings,
      metadata: history.metadata,
    });
  } catch (error) {
    return handleApiError(error, 'data-quality');
  }
}
