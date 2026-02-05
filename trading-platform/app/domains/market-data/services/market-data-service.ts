/**
 * Market Data Service
 * 
 * 市場データの取得と管理を行うサービス
 */

import { MarketData, HistoricalDataRequest, RealtimeQuote, OHLCV } from '@/app/types';

export class MarketDataService {
  private cache = new Map<string, { data: OHLCV[]; timestamp: number }>();
  private subscribers = new Map<string, Set<(data: MarketData) => void>>();
  private cacheDuration = 5 * 60 * 1000; // 5分

  async fetchHistoricalData(request: HistoricalDataRequest): Promise<OHLCV[]> {
    const cacheKey = `${request.symbol}-${request.interval}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    // 実際のAPI呼び出しはここで行う
    // 現時点ではモックデータを返す
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
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
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
    const endTime = request.endDate ? new Date(request.endDate).getTime() : Date.now();
    const startTime = request.startDate ? new Date(request.startDate).getTime() : endTime - 30 * 24 * 60 * 60 * 1000;
    const days = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
    let price = 100;

    for (let i = 0; i < days; i++) {
      const date = new Date(startTime + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // YYYY-MM-DD format
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
