import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { handleApiError } from '@/app/lib/error-handler';
import { fetchMarketHistory } from '@/app/lib/market-data-fetcher';
import { buildDataQualitySummary } from '@/app/lib/market-data-quality';
import { marketDataCache } from '@/app/lib/data/cache/SmartDataCache';
import { OHLCV } from '@/app/types';

/**
 * Detect anomalies in market data
 * - Price gaps (jumps > 20%)
 * - Volume anomalies (volume > 5x average)
 * - Missing data gaps
 */
function detectAnomalies(data: OHLCV[]): Array<{
  type: 'price_gap' | 'volume_spike' | 'data_gap';
  date: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}> {
  const anomalies = [];
  
  if (data.length < 2) return anomalies;
  
  // Calculate average volume
  const avgVolume = data.reduce((sum, d) => sum + (d.volume || 0), 0) / data.length;
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    // Check for price gaps
    if (previous.close > 0) {
      const priceChange = Math.abs(current.close - previous.close) / previous.close;
      if (priceChange > 0.2) {
        anomalies.push({
          type: 'price_gap',
          date: current.date,
          severity: priceChange > 0.5 ? 'high' : 'medium',
          description: `Price gap of ${(priceChange * 100).toFixed(1)}% detected`
        });
      }
    }
    
    // Check for volume spikes
    if (avgVolume > 0 && current.volume > avgVolume * 5) {
      anomalies.push({
        type: 'volume_spike',
        date: current.date,
        severity: current.volume > avgVolume * 10 ? 'high' : 'medium',
        description: `Volume spike: ${(current.volume / avgVolume).toFixed(1)}x average`
      });
    }
    
    // Check for data gaps (more than 3 days)
    const prevDate = new Date(previous.date);
    const currDate = new Date(current.date);
    const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 3) {
      anomalies.push({
        type: 'data_gap',
        date: current.date,
        severity: daysDiff > 7 ? 'high' : 'medium',
        description: `Data gap: ${Math.round(daysDiff)} days missing`
      });
    }
  }
  
  return anomalies;
}

/**
 * Calculate dynamic quality score based on data characteristics
 */
function calculateQualityScore(
  data: OHLCV[],
  latency: number,
  anomalies: Array<{ severity: string }>
): number {
  let score = 100;
  
  // Deduct for latency (> 500ms is concerning)
  if (latency > 500) {
    score -= Math.min(20, (latency - 500) / 50);
  }
  
  // Deduct for anomalies
  const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
  const mediumSeverityCount = anomalies.filter(a => a.severity === 'medium').length;
  
  score -= highSeverityCount * 10;
  score -= mediumSeverityCount * 5;
  
  // Deduct for data gaps in recent data
  if (data.length > 0) {
    const latestData = new Date(data[data.length - 1].date);
    const today = new Date();
    const daysSinceUpdate = (today.getTime() - latestData.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 1) {
      score -= Math.min(30, daysSinceUpdate * 5);
    }
  }
  
  // Deduct for insufficient data
  if (data.length < 30) {
    score -= (30 - data.length) * 2;
  }
  
  return Math.max(0, Math.round(score));
}

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
      
      // Get sample data for anomaly detection (use cached data if available)
      const sampleData: OHLCV[] = [];
      const anomalies = detectAnomalies(sampleData);

      return NextResponse.json({
        type: 'global',
        overallScore: Math.round(cacheStats.hitRate * 100),
        cacheStats,
        dataSources: [
          {
            source: 'Yahoo Finance',
            status: anomalies.length > 0 ? 'degraded' : 'healthy',
            latency: avgLatency,
            lastUpdate: Date.now(),
            qualityScore: calculateQualityScore(sampleData, avgLatency, anomalies),
            anomalyCount: anomalies.length
          }
        ],
        anomalies
      });
    }

    const history = await fetchMarketHistory(request.url, symbol, {
      market,
      startDate,
      interval: '1d',
    });

    const dataQuality = buildDataQualitySummary(symbol, history.data);
    
    // Detect anomalies in the fetched data
    const anomalies = detectAnomalies(history.data);
    
    // Calculate dynamic quality score
    const qualityScore = calculateQualityScore(history.data, 150, anomalies);

    return NextResponse.json({
      type: 'symbol',
      symbol,
      dataQuality: {
        ...dataQuality,
        qualityScore,
        anomalyCount: anomalies.length,
        anomalies: anomalies.slice(0, 10) // Limit to 10 most recent
      },
      warnings: history.warnings,
      metadata: history.metadata,
    });
  } catch (error) {
    return handleApiError(error, 'data-quality');
  }
}
