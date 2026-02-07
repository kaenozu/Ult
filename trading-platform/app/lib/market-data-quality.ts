import type { OHLCV } from '@/app/types';
import { dataCompletionPipeline, dataQualityValidator } from '@/app/lib/data';
import type { MarketData } from '@/app/types/data-quality';

export interface DataQualitySummary {
  totalPoints: number;
  validPoints: number;
  completeness: number;
  freshness: {
    lastUpdate: number;
    ageMs: number;
    staleness: 'fresh' | 'acceptable' | 'stale' | 'expired';
  };
  avgLatencyMs: number;
  warnings: string[];
  errors: string[];
}

const FRESH_DAYS = 1;
const ACCEPTABLE_DAYS = 3;
const STALE_DAYS = 7;

export function buildDataQualitySummary(
  symbol: string,
  data: OHLCV[],
  sampleSize: number = 200
): DataQualitySummary {
  if (!data.length) {
    return {
      totalPoints: 0,
      validPoints: 0,
      completeness: 0,
      freshness: {
        lastUpdate: 0,
        ageMs: Number.POSITIVE_INFINITY,
        staleness: 'expired',
      },
      avgLatencyMs: Number.POSITIVE_INFINITY,
      warnings: ['No market data available.'],
      errors: ['No market data available.'],
    };
  }

  const completionStats = dataCompletionPipeline.getStats(data);
  const recentSlice = data.slice(-Math.min(sampleSize, data.length));
  const reports = recentSlice.map((item, index) => {
    const previous = index > 0 ? recentSlice[index - 1] : undefined;
    const timestamp = Date.parse(item.date);
    const marketData: MarketData = {
      symbol,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      ohlcv: item,
      previousClose: previous?.close,
      previousVolume: previous?.volume,
      source: 'api',
    };
    const report = dataQualityValidator.validate(marketData);
    if (report.isValid) {
      dataQualityValidator.updateHistoricalData(symbol, item);
    }
    return report;
  });

  const validPoints = reports.filter((r) => r.isValid).length;
  const warningSet = new Set<string>();
  const errorSet = new Set<string>();

  for (const report of reports) {
    report.warnings.forEach((w) => warningSet.add(w));
    report.errors.forEach((e) => errorSet.add(e));
  }

  const lastDate = data[data.length - 1]?.date;
  const lastUpdate = Number.isFinite(Date.parse(lastDate)) ? Date.parse(lastDate) : Date.now();
  const ageMs = Date.now() - lastUpdate;
  const staleness = classifyStaleness(ageMs);

  return {
    totalPoints: data.length,
    validPoints,
    completeness: completionStats.completeness,
    freshness: {
      lastUpdate,
      ageMs,
      staleness,
    },
    avgLatencyMs: ageMs,
    warnings: Array.from(warningSet),
    errors: Array.from(errorSet),
  };
}

function classifyStaleness(ageMs: number): DataQualitySummary['freshness']['staleness'] {
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= FRESH_DAYS) return 'fresh';
  if (ageDays <= ACCEPTABLE_DAYS) return 'acceptable';
  if (ageDays <= STALE_DAYS) return 'stale';
  return 'expired';
}
