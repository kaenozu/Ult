import type { OHLCV } from '@/app/types';

export interface MarketHistoryMetadata {
  source?: string;
  isJapaneseStock?: boolean;
  dataDelayMinutes?: number;
  interval?: string;
  requestedInterval?: string;
  fallbackApplied?: boolean;
  isRealtime?: boolean;
  quality?: string;
  limitations?: Record<string, unknown>;
}

export interface MarketHistoryResponse {
  data: OHLCV[];
  warnings: string[];
  metadata?: MarketHistoryMetadata;
}

export interface MarketHistoryOptions {
  market?: 'japan' | 'usa';
  startDate?: string;
  interval?: string;
}

export async function fetchMarketHistory(
  requestUrl: string,
  symbol: string,
  options: MarketHistoryOptions = {}
): Promise<MarketHistoryResponse> {
  const origin = new URL(requestUrl).origin;
  const params = new URLSearchParams({
    type: 'history',
    symbol,
  });

  if (options.market) {
    params.set('market', options.market);
  }
  if (options.startDate) {
    params.set('startDate', options.startDate);
  }
  if (options.interval) {
    params.set('interval', options.interval);
  }

  const response = await fetch(`${origin}/api/market?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = `Market data request failed: ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  const rawData = Array.isArray(payload?.data)
    ? (payload.data as Array<{ date?: string; open?: number; high?: number; low?: number; close?: number; volume?: number }>)
    : [];

  const data: OHLCV[] = rawData
    .map((item): OHLCV => ({
      symbol,
      date: String(item.date ?? ''),
      open: Number(item.open ?? 0),
      high: Number(item.high ?? 0),
      low: Number(item.low ?? 0),
      close: Number(item.close ?? 0),
      volume: Number(item.volume ?? 0),
    }))
    .filter((item): item is OHLCV =>
      Number.isFinite(item.open) && Number.isFinite(item.close) && item.date.length > 0
    );
  data.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  return {
    data,
    warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
    metadata: payload?.metadata,
  };
}
