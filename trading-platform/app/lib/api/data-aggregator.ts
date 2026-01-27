import { Stock, Signal, OHLCV, APIResponse, APIResult, APIErrorResult, APIError, NetworkError, RateLimitError, TechnicalIndicator } from '@/app/types';
import { mlPredictionService } from '@/app/lib/mlPrediction';
import { idbClient } from './idb';

/**
 * Type alias for backward compatibility
 * Use APIResponse<T> for new code
 */
export type FetchResult<T> = APIResponse<T>;

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketState: string;
}

interface MarketResponse<T> {
  data?: T;
  error?: string;
  details?: string;
  debug?: string;
}

class MarketDataClient {
  private cache: Map<string, { data: OHLCV | OHLCV[] | Signal | TechnicalIndicator | QuoteData; timestamp: number }> = new Map();
  private cacheDuration: number = 5 * 60 * 1000;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries: number = 3,
    backoff: number = 500
  ): Promise<T> {
    try {
      const res = await fetch(url, options);

      if (res.status === 429) {
        // ... rate limit logic ...
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff * 4;
        console.warn(`Rate limit (429) hit. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      const json = await res.json() as MarketResponse<T>;

      if (!res.ok || json.error) {
        // Combine all error info
        const debugInfo = json.debug ? ` (Debug: ${json.debug})` : '';
        const details = json.details ? ` - ${json.details}` : '';
        throw new Error(`${json.error || res.statusText}${details}${debugInfo}`);
      }

      return json.data as T;
    } catch (err) {
      if (retries > 0) {
        // ... retry logic ...
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  }

  /**
   * Fetch Historical Data with Smart Persistence (IndexedDB + Delta fetching)
   */
  async fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', _currentPrice?: number, signal?: AbortSignal): Promise<FetchResult<OHLCV[]>> {
    const cacheKey = `ohlcv-${symbol}`;

    const cached = this.getFromCache<OHLCV[]>(cacheKey);
    if (cached) return { success: true, data: cached, source: 'cache' };

    // Request Deduplication
    if (this.pendingRequests.has(cacheKey)) {
      try {
        const data = await this.pendingRequests.get(cacheKey) as OHLCV[];
        return { success: true, data, source: 'aggregated' }; // 'aggregated' to indicate shared request
      } catch (err) {
        // Fallback to error handling below if shared promise fails
      }
    }

    let source: 'api' | 'idb' | 'cache' | 'error' = 'error';

    const fetchPromise = (async () => {
      try {
        // 1. Try to get data from local DB
        const localData = await idbClient.getData(symbol);
        let finalData: OHLCV[] = localData;
        source = 'idb';

        const now = new Date();
        // Use local noon to avoid timezone/market-close issues for "needs update" check
        const lastDataDate = localData.length > 0 ? new Date(localData[localData.length - 1].date) : null;

        // Update if no data, or if latest data is older than 24 hours
        const needsUpdate = !lastDataDate || (now.getTime() - lastDataDate.getTime()) > (24 * 60 * 60 * 1000);

        if (needsUpdate) {
          let fetchUrl = `/api/market?type=history&symbol=${symbol}&market=${market}`;
          if (lastDataDate) {
            const startDate = new Date(lastDataDate);
            startDate.setDate(startDate.getDate() + 1);
            fetchUrl += `&startDate=${startDate.toISOString().split('T')[0]}`;
          }

          const newData = await this.fetchWithRetry<OHLCV[]>(fetchUrl, { signal });

          if (newData && newData.length > 0) {
            finalData = await idbClient.mergeAndSave(symbol, newData);
            source = 'api';
          } else if (!lastDataDate) {
            throw new Error('No historical data available');
          }
        }

        const interpolatedData = this.interpolateOHLCV(finalData);
        this.setCache(cacheKey, interpolatedData);
        return interpolatedData;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const data = await fetchPromise;
      return { success: true, data, source: source as 'api' | 'idb' | 'cache' };
    } catch (err: unknown) {
      if (signal?.aborted) {
        return { success: false, data: null, source: 'error', error: 'Aborted' };
      }
      console.error(`Fetch OHLCV failed for ${symbol}:`, err);
      return createErrorResult(err, source, `fetchOHLCV(${symbol})`);
    }
  }

  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    if (symbols.length === 0) return [];

    const CHUNK_SIZE = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
      chunks.push(symbols.slice(i, i + CHUNK_SIZE));
    }

    try {
      const results = await Promise.all(chunks.map(async (chunk) => {
        const symbolStr = chunk.join(',');
        const res = await fetch(`/api/market?type=quote&symbol=${symbolStr}`);

        if (res.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.fetchQuotes(chunk); // Retry chunk
        }

        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        if (json.data && Array.isArray(json.data)) {
          return json.data as QuoteData[];
        } else if (json.symbol) {
          return [json as QuoteData];
        }
        return [];
      }));

      return results.flat();
    } catch (err) {
      console.error('Batch fetch failed:', err);
      return [];
    }
  }

  async fetchQuote(symbol: string, market: 'japan' | 'usa' = 'japan'): Promise<QuoteData | null> {
    const cacheKey = `quote-${symbol}`;
    const cached = this.getFromCache<QuoteData>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchWithRetry<QuoteData>(
        `/api/market?type=quote&symbol=${symbol}&market=${market}`
      );
      if (data) this.setCache(cacheKey, data);
      return data;
    } catch (err) {
      console.error(`Fetch Quote failed for ${symbol}:`, err);
      return null;
    }
  }

  async fetchMarketIndex(market: 'japan' | 'usa', signal?: AbortSignal): Promise<OHLCV[]> {
    const symbol = market === 'japan' ? '^N225' : '^IXIC';
    try {
      // 内部のfetchOHLCVが投げるエラーをここで完全にキャッチする
      const result = await this.fetchOHLCV(symbol, market, undefined, signal).catch(() => ({ success: false, data: [] }));
      console.log(`[Aggregator] Market index ${symbol} data status: ${result.success ? 'Success' : 'Failed'}`);
      return (result.success && result.data) ? result.data : [];
    } catch (err) {
      if (signal?.aborted) return [];
      console.warn(`[Aggregator] Silent failure fetching market index ${symbol}:`, err);
      return [];
    }
  }

  async fetchSignal(stock: Stock, signal?: AbortSignal): Promise<FetchResult<Signal>> {
    let result: FetchResult<OHLCV[]> | null = null;
    try {
      result = await this.fetchOHLCV(stock.symbol, stock.market, undefined, signal);

      if (!result.success || !result.data || result.data.length < 20) {
        if (signal?.aborted) throw new Error('Aborted');
        throw new Error('Insufficient data for ML analysis');
      }

      // マクロデータの取得（相関分析用）- 失敗しても全体を止めないフェイルセーフ設計
      let indexData: OHLCV[] = [];
      try {
        indexData = await this.fetchMarketIndex(stock.market, signal);
      } catch (err) {
        console.warn(`[Aggregator] Macro data fetch skipped for ${stock.symbol} due to error:`, err);
      }

      if (signal?.aborted) throw new Error('Aborted');

      const indicators = mlPredictionService.calculateIndicators(result.data);
      const prediction = mlPredictionService.predict(stock, result.data, indicators);
      const signalData = mlPredictionService.generateSignal(stock, result.data, prediction, indicators, indexData);

      return { success: true, data: signalData, source: result.source };
    } catch (err: unknown) {
      if (signal?.aborted) {
        return { success: false, data: null, source: result?.source ?? 'error', error: 'Aborted' };
      }
      console.error(`Fetch Signal failed for ${stock.symbol}:`, err);
      return createErrorResult(err, result?.source ?? 'error', `fetchSignal(${stock.symbol})`);
    }
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private setCache(key: string, data: OHLCV | OHLCV[] | Signal | TechnicalIndicator | QuoteData) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private interpolateOHLCV(data: OHLCV[]): OHLCV[] {
    if (data.length < 2) return data;

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const filledWithGaps: OHLCV[] = [];
    for (let i = 0; i < sorted.length; i++) {
      filledWithGaps.push(sorted[i]);

      if (i < sorted.length - 1) {
        const current = new Date(sorted[i].date);
        const next = new Date(sorted[i + 1].date);
        const diffDays = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          for (let d = 1; d < diffDays; d++) {
            const gapDate = new Date(current);
            gapDate.setDate(current.getDate() + d);
            const dayOfWeek = gapDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              filledWithGaps.push({
                date: gapDate.toISOString().split('T')[0],
                open: 0, high: 0, low: 0, close: 0, volume: 0
              });
            }
          }
        }
      }
    }

    const result = [...filledWithGaps];
    const fields: (keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>)[] = ['open', 'high', 'low', 'close'];

    for (const field of fields) {
      for (let i = 0; i < result.length; i++) {
        if (result[i][field] === 0) {
          let prevIdx = i - 1;
          while (prevIdx >= 0 && result[prevIdx][field] === 0) prevIdx--;
          let nextIdx = i + 1;
          while (nextIdx < result.length && result[nextIdx][field] === 0) nextIdx++;

          if (prevIdx >= 0 && nextIdx < result.length) {
            const prevVal = result[prevIdx][field] as number;
            const nextVal = result[nextIdx][field] as number;
            const gap = nextIdx - prevIdx;
            const diff = nextVal - prevVal;
            result[i][field] = Number((prevVal + (diff * (i - prevIdx)) / gap).toFixed(2));
          } else if (prevIdx >= 0) {
            result[i][field] = result[prevIdx][field];
          } else if (nextIdx < result.length) {
            result[i][field] = result[nextIdx][field];
          }
        }
      }
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i].volume === 0) {
        let prevIdx = i - 1;
        while (prevIdx >= 0 && result[prevIdx].volume === 0) prevIdx--;
        if (prevIdx >= 0) result[i].volume = result[prevIdx].volume;
      }
    }

    return result;
  }
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Convert unknown error to appropriate API error
 */
export function handleApiError(error: unknown, context: string): APIError {
  if (error instanceof APIError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError(error.message, error);
    }
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return new RateLimitError(error.message);
    }
    return new APIError(error.message, 'UNKNOWN_ERROR', undefined, error);
  }

  return new APIError(String(error), 'UNKNOWN_ERROR', undefined, error);
}

/**
 * Create error result from error
 */
export function createErrorResult(
  error: unknown,
  source: 'cache' | 'api' | 'aggregated' | 'idb' | 'error',
  context?: string
): APIErrorResult {
  const apiError = handleApiError(error, context || 'Unknown operation');
  return {
    success: false,
    data: null,
    source,
    error: apiError.message,
  };
}

export const marketClient = new MarketDataClient();