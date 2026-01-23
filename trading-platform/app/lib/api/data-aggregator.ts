import { Stock, Signal, OHLCV } from '@/app/types';
import { mlPredictionService } from '@/app/lib/mlPrediction';

export interface FetchResult<T> {
  success: boolean;
  data: T | null;
  source: 'api' | 'cache' | 'mock';
  error?: string;
}

// Helper interfaces for API responses
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
}

class MarketDataClient {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  // 5 minutes cache for real data to respect Yahoo's bandwidth and local performance
  private cacheDuration: number = 5 * 60 * 1000; 

  /**
   * Helper for fetch with exponential backoff
   */
  private async fetchWithRetry<T>(
    url: string, 
    options: RequestInit = {}, 
    retries: number = 3, 
    backoff: number = 500
  ): Promise<T> {
    try {
      const res = await fetch(url, options);
      
      if (res.status === 429) {
        // Rate limited - wait longer
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff * 4;
        console.warn(`Rate limit (429) hit. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      const json = await res.json() as MarketResponse<T>;
      
      if (!res.ok || json.error) {
        throw new Error(json.error || res.statusText);
      }
      
      return json.data as T;
    } catch (err) {
      if (retries > 0) {
        // Wait for exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  }

  /**
   * Fetch Historical Data (Chart)
   */
  async fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', currentPrice?: number): Promise<FetchResult<OHLCV[]>> {
    const cacheKey = `ohlcv-${symbol}`;
    const cached = this.getFromCache<OHLCV[]>(cacheKey);
    if (cached) return { success: true, data: cached, source: 'cache' };

    try {
      const data = await this.fetchWithRetry<OHLCV[]>(
        `/api/market?type=history&symbol=${symbol}&market=${market}`
      );
      
      if (!data || data.length === 0) throw new Error('No data received');
      
      const interpolatedData = this.interpolateOHLCV(data);
      this.setCache(cacheKey, interpolatedData);
      return { success: true, data: interpolatedData, source: 'api' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Fetch OHLCV failed for ${symbol} after retries:`, err);
      return { success: false, data: null, source: 'api', error: errorMessage };
    }
  }

  /**
   * Fetch Quotes for multiple symbols
   */
  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    try {
      const symbolStr = symbols.join(',');
      const res = await fetch(`/api/market?type=quote&symbol=${symbolStr}`);
      
      if (res.status === 429) {
        // Simple wait for batch fetch (less critical than OHLCV)
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchQuotes(symbols);
      }

      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      // Handle array or single object response structure from backend
      if (json.data && Array.isArray(json.data)) {
        return json.data as QuoteData[];
      } else if (json.symbol) {
        // Single quote response structure
        return [json as QuoteData];
      }

      return [];
    } catch (err) {
      console.error('Batch fetch failed:', err);
      return [];
    }
  }

  /**
   * Fetch Current Quote (Price)
   */
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
      console.error(`Fetch Quote failed for ${symbol} after retries:`, err);
      return null;
    }
  }

  /**
   * Generate Signal based on Ensemble ML Model
   */
  async fetchSignal(stock: Stock): Promise<FetchResult<Signal>> {
    try {
      // We need history to analyze trend and provide features for ML
      const result = await this.fetchOHLCV(stock.symbol, stock.market);
      
      if (!result.success || !result.data || result.data.length < 20) {
        throw new Error('No sufficient data available for ML analysis');
      }

      const indicators = mlPredictionService.calculateIndicators(result.data);
      const prediction = mlPredictionService.predict(stock, result.data, indicators);
      const signal = mlPredictionService.generateSignal(stock, result.data, prediction, indicators);
      
      return { success: true, data: signal, source: 'api' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Fetch Signal failed for ${stock.symbol}:`, err);
      return { success: false, data: null, source: 'api', error: errorMessage };
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

  private setCache(key: string, data: unknown) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Comprehensive interpolation for missing data and date gaps
   */
  private interpolateOHLCV(data: OHLCV[]): OHLCV[] {
    if (data.length < 2) return data;

    // Sort by date just in case
    let sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Step 1: Fill date gaps (weekdays only)
    const filledWithGaps: OHLCV[] = [];
    for (let i = 0; i < sorted.length; i++) {
      filledWithGaps.push(sorted[i]);
      
      if (i < sorted.length - 1) {
        const current = new Date(sorted[i].date);
        const next = new Date(sorted[i + 1].date);
        const diffDays = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          // Fill missing weekdays
          for (let d = 1; d < diffDays; d++) {
            const gapDate = new Date(current);
            gapDate.setDate(current.getDate() + d);
            const dayOfWeek = gapDate.getDay();
            
            // 0 is Sunday, 6 is Saturday
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              filledWithGaps.push({
                date: gapDate.toISOString().split('T')[0],
                open: 0, // Mark for linear interpolation in next step
                high: 0,
                low: 0,
                close: 0,
                volume: 0
              });
            }
          }
        }
      }
    }

    // Step 2: Linear interpolation for missing values (zeros)
    const result = [...filledWithGaps];
    const fields: (keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>)[] = ['open', 'high', 'low', 'close'];

    for (const field of fields) {
      for (let i = 0; i < result.length; i++) {
        if (result[i][field] === 0) {
          // Find previous valid value
          let prevIdx = i - 1;
          while (prevIdx >= 0 && result[prevIdx][field] === 0) prevIdx--;

          // Find next valid value
          let nextIdx = i + 1;
          while (nextIdx < result.length && result[nextIdx][field] === 0) nextIdx++;

          if (prevIdx >= 0 && nextIdx < result.length) {
            // Linear interpolation
            const prevVal = result[prevIdx][field] as number;
            const nextVal = result[nextIdx][field] as number;
            const gap = nextIdx - prevIdx;
            const diff = nextVal - prevVal;
            result[i][field] = Number((prevVal + (diff * (i - prevIdx)) / gap).toFixed(2));
          } else if (prevIdx >= 0) {
            // Fill with previous value if no next value
            result[i][field] = result[prevIdx][field];
          } else if (nextIdx < result.length) {
            // Fill with next value if no previous value
            result[i][field] = result[nextIdx][field];
          }
        }
      }
    }
    
    // Volume interpolation (simple fill with 0 or average)
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

export const marketClient = new MarketDataClient();