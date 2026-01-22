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
   * Fetch Historical Data (Chart)
   */
  async fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan', currentPrice?: number): Promise<FetchResult<OHLCV[]>> {
    const cacheKey = `ohlcv-${symbol}`;
    const cached = this.getFromCache<OHLCV[]>(cacheKey);
    if (cached) return { success: true, data: cached, source: 'cache' };

    try {
      const res = await fetch(`/api/market?type=history&symbol=${symbol}&market=${market}`);
      const json = await res.json() as MarketResponse<OHLCV[]>;
      
      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error || res.statusText);
      }
      
      this.setCache(cacheKey, json.data);
      return { success: true, data: json.data, source: 'api' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Fetch OHLCV failed for ${symbol}:`, err);
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
      const res = await fetch(`/api/market?type=quote&symbol=${symbol}&market=${market}`);
      const json = await res.json();
      
      if (!res.ok || json.error) {
        throw new Error(json.error || res.statusText);
      }
      
      this.setCache(cacheKey, json);
      return json as QuoteData;
    } catch (err) {
      console.error(`Fetch Quote failed for ${symbol}:`, err);
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
      
      if (!result.success || !result.data || result.data.length < 50) {
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
}

export const marketClient = new MarketDataClient();