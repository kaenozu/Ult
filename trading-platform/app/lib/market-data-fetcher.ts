import type { OHLCV } from '@/app/types';
import { MarketHistoryResponseSchema } from '@/app/lib/schemas/market';

import { logger } from '@/app/core/logger';
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

// Allowed origins for SSRF protection
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  process.env.NEXT_PUBLIC_API_BASE_URL,
].filter(Boolean) as string[];

export async function fetchMarketHistory(
  requestUrl: string,
  symbol: string,
  options: MarketHistoryOptions = {}
): Promise<MarketHistoryResponse> {
  const origin = new URL(requestUrl).origin;
  
  // SSRF Protection: Validate origin against allowlist
  if (!ALLOWED_ORIGINS.includes(origin)) {
    logger.error('[MarketDataFetcher] Blocked request to unauthorized origin:', origin);
    throw new Error('Unauthorized origin');
  }
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

  const rawPayload = await response.json();

  // Strict Schema Validation
  const parseResult = MarketHistoryResponseSchema.safeParse(rawPayload);

  if (!parseResult.success) {
    logger.error('[MarketDataFetcher] Invalid API Response Schema:', new Error(JSON.stringify(parseResult.error.format(), null, 2)));
    throw new Error('Received invalid market data format from API');
  }

  const payload = parseResult.data;

  // Since Zod already validated the structure, we can directly use payload.data
  // However, we might want to ensure date sorting just in case
  const data = payload.data.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  return {
    data,
    warnings: payload.warnings || [],
    metadata: payload.metadata as MarketHistoryMetadata | undefined, // Cast is safe because Zod validated structure matches
  };
}
