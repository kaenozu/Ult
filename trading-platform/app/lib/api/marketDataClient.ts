/**
 * Market Data Client with Smart Caching and Error Handling
 * Refactored to use APIClient for common functionality
 */

import { APIClient } from './APIClient';
import { idbClient } from './idb';
import { idbClient } from './idb';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketState: string;
}

export class MarketDataClient {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly cacheDuration: number = 5 * 60 * 1000; // 5 minutes
  private readonly maxRetries: number = 3;

  private getCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() - item.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private async fetchFromCacheOrAPI<T>(
    key: string,
    fetchFromAPI: () => Promise<T>
  ): Promise<T> {
    const cached = this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fetchFromAPI();
      this.setCache(key, data);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to fetch ${key}`);
    }
  }

  async fetchDailyBars(symbol: string): Promise<{ data: any[]; source: string }> {
    return this.fetchFromCacheOrAPI(`daily-${symbol}`, async () => {
      const client = APIClient.getInstance();
      return await client.getDailyBars(symbol);
    });
  }

  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    const key = `quotes-${symbols.join(',')}`;
    return this.fetchFromCacheOrAPI<QuoteData[]>(key, async () => {
      const client = APIClient.getInstance();
      const data = await client.getDailyBars(symbols[0]);
      
      if (!data || data.length === 0) {
        return [];
      }

      const quotes: QuoteData[] = [];
      
      for (const item of data.slice(-50).reverse()) {
        const latest = Array.isArray(item) ? item[item.length - 1] : item;
        const close = parseFloat(latest['4. close'] ?? latest.close);
        const open = parseFloat(latest['1. open'] ?? latest.open);
        const volume = parseInt(latest['5. volume'] ?? latest.volume ?? '0');

        quotes.push({
          symbol,
          price: close,
          change: close - open,
          changePercent: ((close - open) / open) * 100,
          volume,
          marketState: close >= open ? 'up' : close < parseFloat(latest['3. low'] ?? latest.low) ? 'down' : 'sideways',
        });
      }

      this.setCache(key, quotes);
      return quotes;
    });
  }

  async fetchRSI(symbol: string): Promise<any> {
    return this.fetchFromCacheOrAPI(`rsi-${symbol}`, async () => {
      const client = APIClient.getInstance();
      return await client.getRSI(symbol);
    });
  }

  async fetchSMA(symbol: string): Promise<any> {
    return this.fetchFromCacheOrAPI(`sma-${symbol}`, async () => {
      const client = APIClient.getInstance();
      return await client.getSMA(symbol);
    });
  }

  async fetchEMA(symbol: string): Promise<any> {
    return this.fetchFromCacheOrAPI(`ema-${symbol}`, async () => {
      const client = APIClient.getInstance();
      return await client.getEMA(symbol);
    });
  }

  async fetchMACD(symbol: string): Promise<any> {
    return this.fetchFromCacheOrAPI(`macd-${symbol}`, async () => {
      const client = APIClient.getInstance();
      return await client.getMACD(symbol);
    });
  }

  async fetchBollingerBands(symbol: string): Promise<any> {
    return this.fetchFromCacheOrAPI(`bb-${symbol}`, async () => {
      const client = APIClient.getInstance();
      return await client.getBollingerBands(symbol);
    });
  }

  async fetchQuote(symbol: string, market: 'japan' | 'usa' = 'japan'): Promise<QuoteData | null> {
    const key = `quote-${symbol}-${market}`;
    return this.fetchFromCacheOrAPI<QuoteData | null>(key, async () => {
      const client = APIClient.getInstance();
      const data = await client.getGlobalQuote(symbol);
      
      if (!data) {
        return null;
      }

      const quoteData: QuoteData = {
        symbol,
        price: parseFloat(data['05. price']),
        change: parseFloat(data['09. change']),
        changePercent: parseFloat(data['10. change_percent']),
        volume: parseInt(data['06. volume']),
        marketState: data['07. market_state'],
      };

      this.setCache(key, quoteData);
      return quoteData;
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const marketDataClient = new MarketDataClient();
