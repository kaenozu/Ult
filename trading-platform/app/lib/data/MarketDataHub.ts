import { OHLCV } from '../../types';
import { IMarketDataHub } from '../interfaces/IMarketDataHub';
import { fetchOHLCV } from '@/app/data/stocks';

/**
 * MarketDataHub
 * アプリケーション全体のデータストリームを最適化する中心ハブ
 */
export class MarketDataHub implements IMarketDataHub {
  private dataCache = new Map<string, OHLCV[]>();
  private pendingRequests = new Map<string, Promise<OHLCV[]>>();
  private cacheExpiry = 60 * 1000; // 1 minute default
  private lastFetchTime = new Map<string, number>();

  async getData(symbol: string, market: 'japan' | 'usa'): Promise<OHLCV[]> {
    const cacheKey = `${market}:${symbol}`;
    const now = Date.now();

    // 1. Check if there is a pending request for this symbol
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // 2. Check if cache is still valid
    const cachedData = this.dataCache.get(cacheKey);
    const lastFetch = this.lastFetchTime.get(cacheKey) || 0;
    if (cachedData && (now - lastFetch < this.cacheExpiry)) {
      return cachedData;
    }

    // 3. Initiate new fetch and track it
    const fetchPromise = (async () => {
      try {
        const data = await fetchOHLCV(symbol, market);
        this.dataCache.set(cacheKey, data);
        this.lastFetchTime.set(cacheKey, Date.now());
        return data;
      } finally {
        // Clear pending request once finished
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  updateLatestPrice(symbol: string, price: number, _timestamp: string): void {
    // Both japan and usa markets could have the same symbol in rare cases, 
    // but usually symbol is unique enough. We check both.
    for (const [key, data] of this.dataCache.entries()) {
      if (key.endsWith(`:${symbol}`) && data.length > 0) {
        const lastIndex = data.length - 1;
        const last = data[lastIndex];
        
        data[lastIndex] = {
          ...last,
          close: price,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
        };
      }
    }
  }

  clearCache(symbol?: string): void {
    if (symbol) {
      this.dataCache.delete(`japan:${symbol}`);
      this.dataCache.delete(`usa:${symbol}`);
    } else {
      this.dataCache.clear();
      this.lastFetchTime.clear();
    }
  }
}

// Export singleton for non-DI usage if necessary
export const marketDataHub = new MarketDataHub();
