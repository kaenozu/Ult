/**
 * Market Data Service
 * 
 * 蟶ょｴ繝・・繧ｿ縺ｮ蜿門ｾ励→邂｡逅・ｒ陦後≧繧ｵ繝ｼ繝薙せ
 */

import { OHLCV } from '@/app/types';
import { MarketData, HistoricalDataRequest, RealtimeQuote } from '../types';

export class MarketDataService {
  private cache = new Map<string, { data: OHLCV[]; timestamp: number }>();
  private subscribers = new Map<string, Set<(data: MarketData) => void>>();
  private cacheDuration = 5 * 60 * 1000; // 5蛻・
  async fetchHistoricalData(request: HistoricalDataRequest): Promise<OHLCV[]> {
    const cacheKey = `${request.symbol}-${request.interval}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    // 螳滄圀縺ｮAPI蜻ｼ縺ｳ蜃ｺ縺励・縺薙％縺ｧ陦後≧
    // 迴ｾ譎らせ縺ｧ縺ｯ繝｢繝・け繝・・繧ｿ繧定ｿ斐☆
    const data = this.generateMockData(request);
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  async fetchLatestPrice(symbol: string): Promise<number> {
    const data = await this.fetchHistoricalData({
      symbol,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(),
      interval: '1d',
    });

    return data[data.length - 1]?.close || 0;
  }

  subscribeToRealtime(symbol: string, callback: (data: MarketData) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }

    this.subscribers.get(symbol)!.add(callback);

    return () => {
      this.subscribers.get(symbol)?.delete(callback);
    };
  }

  private generateMockData(request: HistoricalDataRequest): OHLCV[] {
    const data: OHLCV[] = [];
    const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24));
    let price = 100;

    for (let i = 0; i < days; i++) {
      const date = new Date(request.startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // YYYY-MM-DD format
      const change = (Math.random() - 0.5) * 5;
      price += change;

      data.push({
        date,
        open: price - Math.random() * 2,
        high: price + Math.random() * 3,
        low: price - Math.random() * 3,
        close: price,
        volume: Math.floor(Math.random() * 1000000) + 500000,
      });
    }

    return data;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const marketDataService = new MarketDataService();

