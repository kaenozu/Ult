import { Stock, Signal, OHLCV, APIResponse, APIErrorResult, TechnicalIndicator } from '@/app/types';
import { ApiError as APIError, NetworkError, RateLimitError } from '@/app/lib/errors';
import { mlPredictionService } from '@/app/lib/mlPrediction';
import { idbClient } from '@/app/lib/api/idb-migrations';
import { isIntradayInterval } from '@/app/lib/constants/intervals';
import { logger } from '@/app/core/logger';

/**
 * Type alias for backward compatibility
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
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries: number = 3,
    backoff: number = 500
  ): Promise<T> {
    try {
      const httpResponse = await fetch(url, options);

      if (httpResponse && httpResponse.status === 429) {
        const retryAfter = httpResponse.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff * 4;
        logger.warn(`Rate limit (429) hit. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      const parsedResponse = await httpResponse.json() as MarketResponse<T>;

      if (!httpResponse.ok || parsedResponse.error) {
        const debugInfo = parsedResponse.debug ? ` (Debug: ${parsedResponse.debug})` : '';
        const details = parsedResponse.details ? ` - ${parsedResponse.details}` : '';
        throw new Error(`${parsedResponse.error || httpResponse.statusText}${details}${debugInfo}`);
      }

      return parsedResponse.data as T;
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  }

  /**
   * Fetch Historical Data with Smart Persistence
   */
  async fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', _currentPrice?: number, signal?: AbortSignal, interval?: string, startDate?: string, forceRefresh: boolean = false): Promise<FetchResult<OHLCV[]>> {
    const cacheKey = `ohlcv-${symbol}-${interval || '1d'}`;

    if (!forceRefresh) {
      const cached = this.getFromCache<OHLCV[]>(cacheKey);
      let cacheValid = !!cached;
      
      if (cached && startDate && cached.length > 0) {
        if (new Date(cached[0].date) > new Date(startDate)) {
          cacheValid = false;
        }
      }

      if (cacheValid && cached) return { success: true, data: cached, source: 'cache' };

      const isIntraday = interval && isIntradayInterval(interval);
      if (!isIntraday) {
        try {
          const idbData = await idbClient.getData(symbol);
          if (idbData && idbData.length > 0) {
            // Check if IDB covers start date if needed
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
        const isIntraday = interval && isIntradayInterval(interval);
        let finalData: OHLCV[] = [];

        if (isIntraday) {
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
          let localData: OHLCV[] = [];
          if (!forceRefresh) {
             localData = await idbClient.getData(symbol);
          }

          let missingHistory = false;
          if (startDate && localData.length > 0) {
            if (new Date(localData[0].date) > new Date(startDate)) {
              missingHistory = true;
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

          if (needsUpdate) {
            let fetchUrl = `/api/market?type=history&symbol=${symbol}&market=${market}`;
            if (interval) fetchUrl += `&interval=${interval}`;

            if (missingHistory && startDate) {
              fetchUrl += `&startDate=${startDate}`;
            } else if (lastDataDate && !forceRefresh) {
              const nextDay = new Date(lastDataDate);
              nextDay.setDate(nextDay.getDate() + 1);
              fetchUrl += `&startDate=${nextDay.toISOString().split('T')[0]}`;
            } else if (startDate) {
              fetchUrl += `&startDate=${startDate}`;
            } else {
               const defaultStart = new Date();
               defaultStart.setFullYear(defaultStart.getFullYear() - 1);
               fetchUrl += `&startDate=${defaultStart.toISOString().split('T')[0]}`;
            }

            try {
              const newData = await this.fetchWithRetry<OHLCV[]>(fetchUrl, { signal });
              if (newData && newData.length > 0) {
                finalData = await idbClient.mergeAndSave(symbol, newData);
                source = 'api';
              }
            } catch (err) {
              if (finalData.length > 0) {
                logger.warn(`[Aggregator] Failed to update data for ${symbol}, using stale data.`);
              } else {
                throw err;
              }
            }
          }
        }

        const interpolatedData = this.interpolateOHLCV(finalData);
        if (interpolatedData.length === 0) throw new Error('No data available');

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
      if (signal?.aborted) return { success: false, data: null, source: 'error', error: 'Aborted' };
      return createErrorResult(err, source, `fetchOHLCV(${symbol})`);
    }
  }

  async fetchQuotes(symbols: string[], signal?: AbortSignal): Promise<QuoteData[]> {
    if (symbols.length === 0) return [];
    const CHUNK_SIZE = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) chunks.push(symbols.slice(i, i + CHUNK_SIZE));

    try {
      const results = await Promise.all(chunks.map(async (chunk) => {
        const symbolStr = chunk.join(',');
        const httpResponse = await fetch(`/api/market?type=quote&symbol=${symbolStr}`, { signal });
        if (httpResponse.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.fetchQuotes(chunk, signal);
        }
        const parsedJson = await httpResponse.json();
        if (!httpResponse.ok) throw new Error(parsedJson.error);
        return Array.isArray(parsedJson.data) ? parsedJson.data : (parsedJson.symbol ? [parsedJson] : []);
      }));
      return results.flat() as QuoteData[];
    } catch (err) {
      logger.error('Batch fetch failed:', err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }

  async fetchQuote(symbol: string, market: 'japan' | 'usa' = 'japan'): Promise<QuoteData | null> {
    const cacheKey = `quote-${symbol}`;
    const cached = this.getFromCache<QuoteData>(cacheKey);
    if (cached) return cached;
    try {
      const data = await this.fetchWithRetry<QuoteData>(`/api/market?type=quote&symbol=${symbol}&market=${market}`);
      if (data) this.setCache(cacheKey, data);
      return data;
    } catch (err) {
      logger.error(`Fetch Quote failed for ${symbol}:`, err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }

  async fetchMarketIndex(market: 'japan' | 'usa', signal?: AbortSignal, interval?: string): Promise<{ data: OHLCV[]; error?: string }> {
    const symbol = market === 'japan' ? '^N225' : '^IXIC';
    try {
      const result = await this.fetchOHLCV(symbol, market, undefined, signal, interval ?? '1d');
      if (!result.success || !result.data) return { data: [], error: result.error || `Failed to fetch index ${symbol}` };
      return { data: result.data };
    } catch (err) {
      if (signal?.aborted) return { data: [], error: 'Request aborted' };
      return { data: [], error: `Index fetch failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  async fetchSignal(stock: Stock, signal?: AbortSignal, interval?: string): Promise<FetchResult<Signal>> {
    let result: FetchResult<OHLCV[]> | null = null;
    try {
      result = await this.fetchOHLCV(stock.symbol, stock.market, undefined, signal, interval);
      if (!result.success || !result.data || result.data.length < 20) throw new Error('Insufficient data for ML');

      let indexData: OHLCV[] = [];
      try {
        const indexResult = await this.fetchMarketIndex(stock.market, signal);
        indexData = indexResult.data;
      } catch (err) {
        logger.warn(`[Aggregator] Macro data fetch skipped for ${stock.symbol}`);
      }

      const indicators = mlPredictionService.calculateIndicators(result.data);
      const prediction = mlPredictionService.predict(stock, result.data, indicators);
      const signalData = mlPredictionService.generateSignal(stock, result.data, prediction, indicators, indexData);

      return { success: true, data: signalData, source: result.source };
    } catch (err: unknown) {
      if (signal?.aborted) return { success: false, data: null, source: result?.source ?? 'error', error: 'Aborted' };
      return createErrorResult(err, result?.source ?? 'error', `fetchSignal(${stock.symbol})`);
    }
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() - item.timestamp > this.cacheDuration) return null;
    return item.data as T;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private interpolateOHLCV(data: OHLCV[]): OHLCV[] {
    if (data.length < 2) return data;
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return this.interpolateValues(this.fillGaps(sorted));
  }

  private fillGaps(sorted: OHLCV[]): OHLCV[] {
    const filled: OHLCV[] = [];
    const MS_PER_DAY = 86400000;
    for (let i = 0; i < sorted.length; i++) {
      filled.push(sorted[i]);
      if (i >= sorted.length - 1) continue;
      const diffDays = Math.floor((new Date(sorted[i + 1].date).getTime() - new Date(sorted[i].date).getTime()) / MS_PER_DAY);
      if (diffDays <= 1) continue;
      for (let d = 1; d < diffDays; d++) {
        const gapDate = new Date(new Date(sorted[i].date).getTime() + d * MS_PER_DAY);
        if (gapDate.getDay() !== 0 && gapDate.getDay() !== 6) {
          filled.push({ date: gapDate.toISOString().split('T')[0], open: 0, high: 0, low: 0, close: 0, volume: 0 });
        }
      }
    }
    return filled;
  }

  private interpolateValues(data: OHLCV[]): OHLCV[] {
    const result = [...data];
    const fields: (keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>)[] = ['open', 'high', 'low', 'close'];
    for (const field of fields) {
      for (let i = 0; i < result.length; i++) {
        if (result[i][field] !== 0) continue;
        const prev = this.findNearest(result, i, field, -1);
        const next = this.findNearest(result, i, field, 1);
        if (prev >= 0 && next < result.length) {
          const gap = next - prev;
          result[i][field] = Number((result[prev][field]! + (result[next][field]! - result[prev][field]!) * (i - prev) / gap).toFixed(2));
        } else if (prev >= 0) result[i][field] = result[prev][field]!;
        else if (next < result.length) result[i][field] = result[next][field]!;
      }
    }
    return result;
  }

  private findNearest(data: OHLCV[], idx: number, field: keyof OHLCV, dir: -1 | 1): number {
    let curr = idx + dir;
    while (curr >= 0 && curr < data.length && data[curr][field] === 0) curr += dir;
    return curr;
  }
}

export function handleApiError(error: unknown, context: string): APIError {
  if (error instanceof APIError) return error;
  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network')) return new NetworkError(error.message, { cause: error });
    if (error.message.includes('429') || error.message.includes('rate limit')) return new RateLimitError(error.message);
    return new APIError(error.message, { endpoint: context, context: { originalError: error.message } });
  }
  return new APIError(String(error), { endpoint: context });
}

export function createErrorResult(error: unknown, source: any, context?: string): APIErrorResult {
  const apiError = handleApiError(error, context || 'Unknown operation');
  return { success: false, data: null, source, error: apiError.message };
}

export const marketClient = new MarketDataClient();
