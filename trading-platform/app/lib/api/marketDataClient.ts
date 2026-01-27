/**
 * Market Data Client with Smart Caching and Error Handling
 * Refactored to use APIClient for common functionality
 */

import { getAPIClient } from './APIClient';
import {
  OHLCV,
  AlphaVantageRSI,
  AlphaVantageSMA,
  AlphaVantageEMA,
  AlphaVantageMACD,
  AlphaVantageBollingerBands
} from '@/app/types';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketState: string;
}

export class MarketDataClient {
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private readonly cacheDuration: number = 5 * 60 * 1000; // 5 minutes
  private readonly maxRetries: number = 3;

  private getCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() - item.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
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

  async fetchDailyBars(symbol: string): Promise<{ data: OHLCV[]; source: string }> {
    return this.fetchFromCacheOrAPI(`daily-${symbol}`, async () => {
      const client = getAPIClient();
      const rawData = await client.getDailyBars(symbol);

      if (!rawData || !rawData['Time Series (Daily)']) {
        return { data: [], source: 'api' };
      }

      const parsedData = client.parseOHLCVFromTimeSeries(rawData['Time Series (Daily)'] as Record<string, Record<string, string>>);
      return { data: parsedData, source: 'api' };
    });
  }

  async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    const key = `quotes-${symbols.join(',')}`;
    return this.fetchFromCacheOrAPI<QuoteData[]>(key, async () => {
      // Logic uses getDailyBars for now, simplified for this context
      const client = getAPIClient();
      const data = await client.getDailyBars(symbols[0]);

      if (!data || !data['Time Series (Daily)']) {
        return [];
      }

      const timeSeries = data['Time Series (Daily)'];
      const quotes: QuoteData[] = [];

      const dates = Object.keys(timeSeries).sort();
      const recentDates = dates.slice(-50);

      for (const date of recentDates) {
        const latest = timeSeries[date] as Record<string, string>;
        const open = parseFloat(latest['1. open']);
        const close = parseFloat(latest['4. close']);
        const low = parseFloat(latest['3. low']);
        const volume = parseInt(latest['5. volume']);

        quotes.push({
          symbol: symbols[0],
          price: close,
          change: close - open,
          changePercent: ((close - open) / open) * 100,
          volume: volume,
          marketState: close >= open ? 'up' : close < low ? 'down' : 'sideways',
        });
      }

      this.setCache(key, quotes);
      return quotes;
    });
  }

  async fetchRSI(symbol: string): Promise<AlphaVantageRSI> {
    return this.fetchFromCacheOrAPI(`rsi-${symbol}`, async () => {
      const client = getAPIClient();
      return await client.getRSI(symbol);
    });
  }

  async fetchSMA(symbol: string): Promise<AlphaVantageSMA> {
    return this.fetchFromCacheOrAPI(`sma-${symbol}`, async () => {
      const client = getAPIClient();
      return await client.getSMA(symbol);
    });
  }

  async fetchEMA(symbol: string): Promise<AlphaVantageEMA> {
    return this.fetchFromCacheOrAPI(`ema-${symbol}`, async () => {
      const client = getAPIClient();
      return await client.getEMA(symbol);
    });
  }

  async fetchMACD(symbol: string): Promise<AlphaVantageMACD> {
    return this.fetchFromCacheOrAPI(`macd-${symbol}`, async () => {
      const client = getAPIClient();
      return await client.getMACD(symbol);
    });
  }

  async fetchBollingerBands(symbol: string): Promise<AlphaVantageBollingerBands> {
    return this.fetchFromCacheOrAPI(`bb-${symbol}`, async () => {
      const client = getAPIClient();
      return await client.getBollingerBands(symbol);
    });
  }

  async fetchQuote(symbol: string, market: 'japan' | 'usa' = 'japan'): Promise<QuoteData | null> {
    const key = `quote-${symbol}-${market}`;
    return this.fetchFromCacheOrAPI<QuoteData | null>(key, async () => {
      const client = getAPIClient();
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
