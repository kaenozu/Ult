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
      const httpResponse = await fetch(url, options);

      if (httpResponse.status === 429) {
        // ... rate limit logic ...
        const retryAfter = httpResponse.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff * 4;
        console.warn(`Rate limit (429) hit. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      const parsedResponse = await httpResponse.json() as MarketResponse<T>;

      if (!httpResponse.ok || parsedResponse.error) {
        // Combine all error info
        const debugInfo = parsedResponse.debug ? ` (Debug: ${parsedResponse.debug})` : '';
        const details = parsedResponse.details ? ` - ${parsedResponse.details}` : '';
        throw new Error(`${parsedResponse.error || httpResponse.statusText}${details}${debugInfo}`);
      }

      return parsedResponse.data as T;
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
   * @param interval - Time interval for data (1m, 5m, 15m, 1h, 4h, 1d, etc.)
   */
  async fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', _currentPrice?: number, signal?: AbortSignal, interval?: string): Promise<FetchResult<OHLCV[]>> {
    // Include interval in cache key to differentiate cached data by interval
    const cacheKey = `ohlcv-${symbol}-${interval || '1d'}`;

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
        // Check if this is intraday data (1m, 5m, 15m, 1h)
        // Intraday data should always be fetched fresh from API, not from IndexedDB
        const isIntraday = interval && ['1m', '5m', '15m', '1h'].includes(interval);

        let finalData: OHLCV[] = [];

        if (isIntraday) {
          // For intraday data, always fetch from API with current date
          // Get last 30 days of intraday data
          const now = new Date();
          const startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);

          const fetchUrl = `/api/market?type=history&symbol=${symbol}&market=${market}&interval=${interval}&startDate=${startDate.toISOString().split('T')[0]}`;

          const newData = await this.fetchWithRetry<OHLCV[]>(fetchUrl, { signal });

          if (newData && newData.length > 0) {
            finalData = newData;
            source = 'api';
          } else {
            throw new Error('No intraday data available');
          }
        } else {
          // For daily/weekly/monthly data, use IndexedDB for persistence
          const localData = await idbClient.getData(symbol);
          finalData = localData;
          source = 'idb';

          const now = new Date();
          // Use local noon to avoid timezone/market-close issues for "needs update" check
          const lastDataDate = localData.length > 0 ? new Date(localData[localData.length - 1].date) : null;

          // Update if no data, or if latest data is older than 24 hours
          const needsUpdate = !lastDataDate || (now.getTime() - lastDataDate.getTime()) > (24 * 60 * 60 * 1000);

          if (needsUpdate) {
            let fetchUrl = `/api/market?type=history&symbol=${symbol}&market=${market}`;
            // Add interval parameter if specified (defaults to daily on API side)
            if (interval) {
              fetchUrl += `&interval=${interval}`;
            }
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
        }

        const interpolatedData = this.interpolateOHLCV(finalData);
        // Don't cache intraday data as it becomes stale quickly
        if (!isIntraday) {
          this.setCache(cacheKey, interpolatedData);
        }
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
        const httpResponse = await fetch(`/api/market?type=quote&symbol=${symbolStr}`);

        if (httpResponse.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.fetchQuotes(chunk); // Retry chunk
        }

        const parsedJson = await httpResponse.json();
        if (!httpResponse.ok) throw new Error(parsedJson.error);

        if (parsedJson.data && Array.isArray(parsedJson.data)) {
          return parsedJson.data as QuoteData[];
        } else if (parsedJson.symbol) {
          return [parsedJson as QuoteData];
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

  async fetchMarketIndex(market: 'japan' | 'usa', signal?: AbortSignal, interval?: string): Promise<{
    data: OHLCV[];
    error?: string;
  }> {
    const symbol = market === 'japan' ? '^N225' : '^IXIC';
    try {
      const result = await this.fetchOHLCV(symbol, market, undefined, signal, interval);
      if (!result.success || !result.data) {
        return {
          data: [],
          error: result.error || `Failed to fetch market index ${symbol}`
        };
      }
      return { data: result.data };
    } catch (err) {
      if (signal?.aborted) {
        return { data: [], error: 'Request aborted' };
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[Aggregator] Error fetching market index ${symbol}:`, errorMessage);
      return {
        data: [],
        error: `Market index fetch failed: ${errorMessage}`
      };
    }
  }

  async fetchSignal(stock: Stock, signal?: AbortSignal, interval?: string): Promise<FetchResult<Signal>> {
    let result: FetchResult<OHLCV[]> | null = null;
    try {
      result = await this.fetchOHLCV(stock.symbol, stock.market, undefined, signal, interval);

      if (!result.success || !result.data || result.data.length < 20) {
        if (signal?.aborted) throw new Error('Aborted');
        throw new Error('Insufficient data for ML analysis');
      }

      // マクロデータの取得（相関分析用）- 失敗しても全体を止めないフェイルセーフ設計
      let indexData: OHLCV[] = [];
      try {
        const indexResult = await this.fetchMarketIndex(stock.market, signal);
        indexData = indexResult.data;
        if (indexResult.error) {
          console.warn(`[Aggregator] Macro data fetch warning for ${stock.symbol}:`, indexResult.error);
        }
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
    const filledWithGaps = this.fillGaps(sorted);
    
    return this.interpolateValues(filledWithGaps);
  }

  private fillGaps(sorted: OHLCV[]): OHLCV[] {
    const filled: OHLCV[] = [];
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const WEEKEND_DAYS = [0, 6]; // Sunday, Saturday

    for (let i = 0; i < sorted.length; i++) {
      filled.push(sorted[i]);

      if (i >= sorted.length - 1) continue;

      const current = new Date(sorted[i].date);
      const next = new Date(sorted[i + 1].date);
      const diffDays = Math.floor((next.getTime() - current.getTime()) / MS_PER_DAY);

      if (diffDays <= 1) continue;

      for (let d = 1; d < diffDays; d++) {
        const gapDate = new Date(current);
        gapDate.setDate(current.getDate() + d);
        
        if (!WEEKEND_DAYS.includes(gapDate.getDay())) {
          filled.push(this.createGapOHLCV(gapDate));
        }
      }
    }

    return filled;
  }

  private createGapOHLCV(date: Date): OHLCV {
    return {
      date: date.toISOString().split('T')[0],
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0
    };
  }

  private interpolateValues(data: OHLCV[]): OHLCV[] {
    const result = [...data];
    const priceFields: (keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>)[] = ['open', 'high', 'low', 'close'];

    for (const field of priceFields) {
      this.interpolateField(result, field);
    }
    
    this.interpolateVolume(result);
    return result;
  }

  private interpolateField(result: OHLCV[], field: keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>): void {
    for (let i = 0; i < result.length; i++) {
      if (result[i][field] !== 0) continue;

      const prevIdx = this.findNearestValidIndex(result, i, field, -1);
      const nextIdx = this.findNearestValidIndex(result, i, field, 1);

      result[i][field] = this.calculateInterpolatedValue(result, i, prevIdx, nextIdx, field);
    }
  }

  private findNearestValidIndex(
    result: OHLCV[],
    startIdx: number,
    field: keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>,
    direction: -1 | 1
  ): number {
    let idx = startIdx + direction;
    while (idx >= 0 && idx < result.length && result[idx][field] === 0) {
      idx += direction;
    }
    return idx;
  }

  private calculateInterpolatedValue(
    result: OHLCV[],
    currentIdx: number,
    prevIdx: number,
    nextIdx: number,
    field: keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>
  ): number {
    if (prevIdx >= 0 && nextIdx < result.length) {
      const prevVal = result[prevIdx][field] as number;
      const nextVal = result[nextIdx][field] as number;
      const gap = nextIdx - prevIdx;
      const diff = nextVal - prevVal;
      return Number((prevVal + (diff * (currentIdx - prevIdx)) / gap).toFixed(2));
    }
    
    if (prevIdx >= 0) return result[prevIdx][field] as number;
    if (nextIdx < result.length) return result[nextIdx][field] as number;
    
    return 0;
  }

  private interpolateVolume(result: OHLCV[]): void {
    for (let i = 0; i < result.length; i++) {
      if (result[i].volume !== 0) continue;

      const prevIdx = this.findNearestValidVolumeIndex(result, i);
      if (prevIdx >= 0) {
        result[i].volume = result[prevIdx].volume;
      }
    }
  }

  private findNearestValidVolumeIndex(result: OHLCV[], startIdx: number): number {
    let idx = startIdx - 1;
    while (idx >= 0 && result[idx].volume === 0) {
      idx--;
    }
    return idx;
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