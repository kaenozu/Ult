import { Stock, Signal, OHLCV, APIResponse, APIResult, APIErrorResult, TechnicalIndicator } from '@/app/types';
import { ApiError as APIError, NetworkError, RateLimitError } from '@/app/lib/errors';
import { mlPredictionService } from '@/app/lib/mlPrediction';
import { idbClient } from './idb-migrations';
import { isIntradayInterval } from '@/app/lib/constants/intervals';

/**
 * Type alias for backward compatibility
 * Use APIResponse<T> for new code
 */
import { logger } from '@/app/core/logger';
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
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries: number = 3,
    backoff: number = 500
  ): Promise<T> {
    try {
      // Convert relative URL to absolute URL for server-side fetch
      let finalUrl = url;
      if (url.startsWith('/')) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        finalUrl = `${baseUrl}${url}`;
        console.log(`[DataAggregator] Converting relative URL to absolute: ${url} -> ${finalUrl}`);
      }
      
      const httpResponse = await fetch(finalUrl, options);

      if (httpResponse && httpResponse.status === 429) {
        // ... rate limit logic ...
        const retryAfter = httpResponse.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff * 4;
        logger.warn(`Rate limit (429) hit. Waiting ${waitTime}ms before retry...`);
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
      // Don't retry if request was aborted
      const signal = options.signal as AbortSignal | undefined;
      if (signal?.aborted) {
        throw err;
      }
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
   * @param startDate - Optional start date (YYYY-MM-DD) to ensure sufficient history
   * @param forceRefresh - If true, skip cache/IDB and fetch fresh data from API
   */
  async fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', _currentPrice?: number, signal?: AbortSignal, interval?: string, startDate?: string, forceRefresh: boolean = false): Promise<APIResponse<OHLCV[]>> {
    const cacheKey = `ohlcv-${symbol}-${interval || '1d'}`;

    if (!forceRefresh) {
      const cached = this.getFromCache<OHLCV[]>(cacheKey);
      let cacheValid = !!cached;
      
      // If we have cached data but need specific start date, check if cache covers it
      if (cached && startDate && cached.length > 0) {
        if (new Date(cached[0].date) > new Date(startDate)) {
          cacheValid = false;
        }
      }

      if (cacheValid && cached) return { success: true, data: cached, source: 'cache' };

      // Check IDB for non-intraday data
      const isIntraday = interval && isIntradayInterval(interval);
      if (!isIntraday) {
        try {
          const idbData = await idbClient.getData(symbol);
          
          let idbValid = false;
          if (idbData && idbData.length > 0) {
            idbValid = true;
            // Check if IDB covers start date
            if (startDate && new Date(idbData[0].date) > new Date(startDate)) {
              idbValid = false;
            }
          }

          if (idbValid && idbData.length > 0) {
            // Early return only for tests or specific cases if needed
            // But we want to proceed to delta fetching for normal flow
          }
        } catch (err) {
          logger.warn(`[Aggregator] Failed to read from IDB for ${symbol}:`, err);
        }
      }
    }

    if (this.pendingRequests.has(cacheKey)) {
      try {
        const data = await this.pendingRequests.get(cacheKey) as OHLCV[];
        return { success: true, data, source: 'aggregated' };
      } catch (err) {
        // Fallback
      }
    }

    let source: 'api' | 'idb' | 'cache' | 'error' = 'error';

    const fetchPromise = (async () => {
      try {
        // Check if this is intraday data (1m, 5m, 15m, 1h)
        // Intraday data should always be fetched fresh from API, not from IndexedDB
        const isIntraday = interval && isIntradayInterval(interval);

        let finalData: OHLCV[] = [];

        if (isIntraday) {
          // For intraday data, always fetch from API with current date
          // Get last 30 days of intraday data
          const now = new Date();
          const start = new Date(now);
          start.setDate(start.getDate() - 30);
          
          const fetchUrl = `/api/market?type=history&symbol=${symbol}&market=${market}&interval=${interval}&startDate=${start.toISOString().split('T')[0]}`;
          const newData = await this.fetchWithRetry<OHLCV[]>(fetchUrl, { signal });
          if (newData && newData.length > 0) {
            finalData = newData;
            source = 'api';
          } else {
            throw new Error('No intraday data available');
          }
        } else {
          // Check IDB first (if not forced refresh)
          let localData: OHLCV[] = [];
          if (!forceRefresh) {
             localData = await idbClient.getData(symbol);
          }
          console.log(`[DataAggregator] Symbol: ${symbol}, IDB data length: ${localData.length}, forceRefresh: ${forceRefresh}, startDate: ${startDate}`);

          let missingHistory = false;
          if (startDate && localData.length > 0) {
            if (new Date(localData[0].date) > new Date(startDate)) {
              missingHistory = true;
              if (process.env.NODE_ENV !== 'test') logger.info(`[Aggregator] Local data starts ${localData[0].date}, need ${startDate}. Fetching missing history.`);
            }
          } else if (startDate && localData.length === 0) {
            missingHistory = true;
          }

          finalData = localData;
          source = 'idb';

          const now = new Date();
          const lastDataDate = localData.length > 0 ? new Date(localData[localData.length - 1].date) : null;
          const timeDiff = lastDataDate ? now.getTime() - lastDataDate.getTime() : null;
          const needsUpdate = forceRefresh || !lastDataDate || (timeDiff !== null && timeDiff > (24 * 60 * 60 * 1000)) || missingHistory;

          console.log(`[DataAggregator] ${symbol}: needsUpdate=${needsUpdate}, lastDataDate=${lastDataDate?.toISOString().split('T')[0]}, missingHistory=${missingHistory}`);

          if (needsUpdate) {
            let fetchUrl = `/api/market?type=history&symbol=${symbol}&market=${market}`;
            if (interval) fetchUrl += `&interval=${interval}`;

            if (missingHistory && startDate) {
              fetchUrl += `&startDate=${startDate}`;
            } else if (lastDataDate && !forceRefresh) { // If appending
              const nextDay = new Date(lastDataDate);
              nextDay.setDate(nextDay.getDate() + 1);
              fetchUrl += `&startDate=${nextDay.toISOString().split('T')[0]}`;
            } else if (startDate) {
              fetchUrl += `&startDate=${startDate}`;
            } else {
               // Default 1 year if no startDate provided
               const defaultStart = new Date();
               defaultStart.setFullYear(defaultStart.getFullYear() - 1);
               fetchUrl += `&startDate=${defaultStart.toISOString().split('T')[0]}`;
            }

            console.log(`[DataAggregator] Fetching from API: ${fetchUrl}`);
            try {
              const newData = await this.fetchWithRetry<OHLCV[]>(fetchUrl, { signal });
              console.log(`[DataAggregator] API response for ${symbol}: ${newData?.length || 0} records`);

              if (newData && newData.length > 0) {
                if (forceRefresh) {
                   finalData = await idbClient.mergeAndSave(symbol, newData);
                } else {
                   finalData = await idbClient.mergeAndSave(symbol, newData);
                }
                source = 'api';
                console.log(`[DataAggregator] Saved to IDB: ${symbol}, total records: ${finalData.length}`);
              }
            } catch (err) {
              if (signal?.aborted) throw new Error('Aborted');
              console.error(`[DataAggregator] API fetch error for ${symbol}:`, err);
              if (finalData.length > 0) {
                logger.warn(`[Aggregator] Failed to update data for ${symbol}, using stale data. Error: ${err instanceof Error ? err.message : String(err)}`);
                // Continue with stale data (source remains 'idb')
              } else {
                throw err;
              }
            }
          }
        }

        const interpolatedData = this.interpolateOHLCV(finalData);
        
        if (interpolatedData.length === 0) {
          throw new Error('No data available');
        }

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
      logger.error(`Fetch OHLCV failed for ${symbol}:`, (err as Error) || new Error(String(err)));
      return createErrorResult(err, source, `fetchOHLCV(${symbol})`);
    }
  }

  async fetchQuotes(symbols: string[], signal?: AbortSignal): Promise<QuoteData[]> {
    if (symbols.length === 0) return [];

    const CHUNK_SIZE = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
      chunks.push(symbols.slice(i, i + CHUNK_SIZE));
    }

    try {
      const results = await Promise.all(chunks.map(async (chunk) => {
        const symbolStr = chunk.join(',');
        const httpResponse = await fetch(`/api/market?type=quote&symbol=${symbolStr}`, { signal });

        if (httpResponse.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.fetchQuotes(chunk, signal); // Retry chunk with signal
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
      // AbortError is expected when component unmounts - not a real error
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
      const errorName = err instanceof Error ? err.name : '';
      const constructorName = (err as { constructor?: { name?: string } })?.constructor?.name ?? '';

      const isAbortError = signal?.aborted ||
        errorName === 'AbortError' ||
        constructorName === 'AbortError' ||
        constructorName === 'DOMException' ||
        errorMessage.includes('abort') ||
        errorMessage.includes('signal is aborted');

      if (isAbortError) {
        logger.debug('[Aggregator] fetchQuotes aborted - component unmounted');
        return [];
      }
      logger.error('Batch fetch failed:', (err as Error) || new Error(String(err)));
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
      logger.error(`Fetch Quote failed for ${symbol}:`, (err as Error) || new Error(String(err)));
      return null;
    }
  }

  async fetchMarketIndex(market: 'japan' | 'usa', signal?: AbortSignal, interval?: string): Promise<{
    data: OHLCV[];
    error?: string;
  }> {
    const symbol = market === 'japan' ? '^N225' : '^IXIC';
    try {
      const result = await this.fetchOHLCV(symbol, market, undefined, signal, interval ?? '1d');
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
      logger.warn(`[Aggregator] Error fetching market index ${symbol}:`, errorMessage);
      return {
        data: [],
        error: `Market index fetch failed: ${errorMessage}`
      };
    }
  }

  async fetchSignal(stock: Stock, signal?: AbortSignal, interval?: string): Promise<FetchResult<Signal>> {
    let result: FetchResult<OHLCV[]> | null = null;
    try {
      logger.info('[data-aggregator] fetchSignal start', { symbol: stock.symbol, market: stock.market, interval });
      result = await this.fetchOHLCV(stock.symbol, stock.market, undefined, signal, interval);
      logger.info('[data-aggregator] fetchOHLCV done', { symbol: stock.symbol, dataLength: result.data?.length, success: result.success, source: result.source });

      if (!result.success || !result.data || result.data.length < 20) {
        logger.warn('[data-aggregator] Insufficient data or failed', { symbol: stock.symbol, length: result.data?.length, success: result.success });
        return {
          success: false,
          data: null,
          source: result?.source || 'error',
          error: 'Insufficient data for ML analysis'
        };
      }

      // マクロデータの取得（相関分析用）- 失敗しても全体を止めないフェイルセーフ設計
      let indexData: OHLCV[] = [];
      try {
        const indexResult = await this.fetchMarketIndex(stock.market, signal);
        indexData = indexResult.data;
        if (indexResult.error) {
          logger.warn(`[Aggregator] Macro data fetch warning for ${stock.symbol}:`, indexResult.error);
        }
      } catch (err) {
        logger.warn(`[Aggregator] Macro data fetch skipped for ${stock.symbol} due to error:`, err);
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
      logger.error(`Fetch Signal failed for ${stock.symbol}:`, (err as Error) || new Error(String(err)));
      return createErrorResult(err, result?.source ?? 'error', `fetchSignal(${stock.symbol})`);
    }
  }

  /**
   * Clear all cached data (useful for testing)
   */
  public clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
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
    // ApiError constructor: (message, endpoint?, statusCode?, response?)
    return new APIError(error.message, context, undefined, error);
  }

  return new APIError(String(error), context, undefined, error);
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