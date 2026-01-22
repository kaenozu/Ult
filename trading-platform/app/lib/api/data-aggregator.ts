import { Stock, Signal, OHLCV } from '@/app/types';
import { analyzeStock } from '@/app/lib/analysis';

export interface FetchResult<T> {
  success: boolean;
  data: T | null;
  source: 'api' | 'cache' | 'mock';
  error?: string;
}

class MarketDataClient {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  // 5 minutes cache for real data to respect Yahoo's bandwidth and local performance
  private cacheDuration: number = 5 * 60 * 1000; 

  /**
   * Fetch Historical Data (Chart)
   */
  async fetchOHLCV(symbol: string, market: 'japan' | 'usa' = 'japan'): Promise<FetchResult<OHLCV[]>> {
    const cacheKey = `ohlcv-${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { success: true, data: cached, source: 'cache' };

    try {
      const res = await fetch(`/api/market?type=history&symbol=${symbol}&market=${market}`);
      const json = await res.json();
      
      if (!res.ok || json.error) {
        throw new Error(json.error || res.statusText);
      }
      
      this.setCache(cacheKey, json.data);
      return { success: true, data: json.data, source: 'api' };
    } catch (err: any) {
      console.error(`Fetch OHLCV failed for ${symbol}:`, err);
      return { success: false, data: null, source: 'api', error: err.message };
    }
  }

  /**
   * Fetch Quotes for multiple symbols
   */
  async fetchQuotes(symbols: string[]): Promise<any[]> {
    try {
      // Yahoo Finance API endpoint handles batching
      // We might need to split into chunks if too many, but 50 is fine
      const symbolStr = symbols.join(',');
      // We assume mixed markets might be an issue, but let's try.
      // Actually our formatSymbol in API handles it if we pass "market" param?
      // No, mixed markets in one call is tricky if we rely on "market" param.
      // But formatSymbol uses .T for Japan. Yahoo distinguishes by suffix.
      // So we can ignore "market" param for batch calls if we handle suffix in frontend or backend.
      // Let's rely on backend formatSymbol which is naive.
      // We should probably just pass raw symbols and let backend handle?
      // Backend expects "market" param to apply logic.
      // Strategy: Fetch Japan and USA separately.
      
      const res = await fetch(`/api/market?type=quote&symbol=${symbolStr}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data || [json]; // Handle single or array
    } catch (err) {
      console.error('Batch fetch failed:', err);
      return [];
    }
  }

  /**
   * Fetch Current Quote (Price)
   */
  async fetchQuote(symbol: string, market: 'japan' | 'usa' = 'japan'): Promise<any> {
    const cacheKey = `quote-${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`/api/market?type=quote&symbol=${symbol}&market=${market}`);
      const json = await res.json();
      
      if (!res.ok || json.error) {
        throw new Error(json.error || res.statusText);
      }
      
      this.setCache(cacheKey, json);
      return json;
    } catch (err) {
      console.error(`Fetch Quote failed for ${symbol}:`, err);
      return null;
    }
  }

  /**
   * Generate Signal based on Real Data
   */
  async fetchSignal(stock: Stock): Promise<FetchResult<Signal>> {
    try {
      // We need history to analyze trend
      const result = await this.fetchOHLCV(stock.symbol, stock.market);
      
      if (!result.success || !result.data || result.data.length === 0) {
        throw new Error('No data available for analysis');
      }

      const signal = analyzeStock(stock.symbol, result.data, stock.market);
      return { success: true, data: signal, source: 'api' };
    } catch (err: any) {
      return { success: false, data: null, source: 'api', error: err.message };
    }
  }

  private getFromCache(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const marketClient = new MarketDataClient();
