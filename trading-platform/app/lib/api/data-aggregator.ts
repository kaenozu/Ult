/**
 * Data Aggregator
 * 
 * Consolidates data from multiple sources:
 * 1. Primary: Alpha Vantage API (real-time data)
 * 2. Fallback: Mock data (for errors/development)
 * 
 * Handles rate limiting, caching, and error recovery.
 */

import { AlphaVantageClient, getAlphaVantageClient, TimeSeriesData } from './alpha-vantage';
import { generateMockOHLCV, generateMockSignal } from '@/app/data/stocks';
import { getRateLimiter } from './rate-limiter';
import { Stock, Signal, OHLCV } from '@/app/types';

export interface DataSourceConfig {
  enableAPI: boolean;
  enableCache: boolean;
  cacheDuration: number; // in milliseconds
}

export interface FetchResult<T> {
  success: boolean;
  data: T | null;
  source: 'api' | 'cache' | 'mock';
  error?: string;
}

export interface DataAggregator {
  fetchOHLCV: (symbol: string, days?: number) => Promise<FetchResult<OHLCV[]>>;
  fetchSignal: (stock: Stock) => Promise<FetchResult<Signal>>;
  prefetchData: (symbols: string[]) => Promise<void>;
  clearCache: () => void;
  getStatus: () => { cacheSize: number; lastFetch?: string };
}

/**
 * Simple in-memory cache
 */
class SimpleCache {
  private cache: Map<string, { data: any; timestamp: number }>;
  private duration: number;

  constructor(duration: number = 24 * 60 * 1000) { // 24 hours default
    this.cache = new Map();
    this.duration = duration;
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > this.duration) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Data Aggregator Implementation
 */
class DataAggregatorImpl implements DataAggregator {
  private config: DataSourceConfig;
  private cache: SimpleCache;
  private alphaClient: AlphaVantageClient;
  private rateLimiter: ReturnType<typeof getRateLimiter>;

  constructor(config?: Partial<DataSourceConfig>) {
    this.config = {
      enableAPI: true,
      enableCache: true,
      cacheDuration: 24 * 60 * 1000, // 24 hours
      ...config,
    };

    this.cache = new SimpleCache(this.config.cacheDuration);
    this.alphaClient = getAlphaVantageClient();
    this.rateLimiter = getRateLimiter();
  }

  /**
   * Fetch OHLCV data with fallback
   */
  async fetchOHLCV(symbol: string, days: number = 100): Promise<FetchResult<OHLCV[]>> {
    const cacheKey = `ohlcv-${symbol}-${days}`;

    // Try cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: 'cache',
        };
      }
    }

    // Try API
    if (this.config.enableAPI) {
      try {
        // Fail fast if rate limit exceeded instead of waiting
        // await this.rateLimiter.waitForNextRequest(); 
        await this.rateLimiter.acquire();
        
        const apiData = await this.alphaClient.getDailyBars(symbol);
        
        // Cache the result
        const mappedData: OHLCV[] = apiData.data.map(d => ({
          date: d.timestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));

        if (this.config.enableCache) {
          this.cache.set(cacheKey, mappedData);
        }

        return {
          success: true,
          data: mappedData,
          source: 'api',
        };
      } catch (apiError: any) {
        console.warn(`Alpha Vantage API error for ${symbol}:`, apiError.message);
        
        // Fallback to mock data
        try {
          const stock = this.getStockBySymbol(symbol);
          if (stock) {
            const mockData = generateMockOHLCV(stock.price, days, stock.symbol);
            
            return {
              success: true,
              data: mockData,
              source: 'mock',
              error: apiError.message,
            };
          }
        } catch (mockError: any) {
          return {
            success: false,
            data: null,
            source: 'mock',
            error: apiError.message,
          };
        }
      }
    }

    // If API is disabled, use mock data directly
    const stock = this.getStockBySymbol(symbol);
    if (stock) {
      const mockData = generateMockOHLCV(stock.price, days, stock.symbol);
      
      return {
        success: true,
        data: mockData,
        source: 'mock',
      };
    }

    return {
      success: false,
      data: null,
      source: 'mock',
      error: 'Stock not found',
    };
  }

  /**
   * Fetch signal with fallback
   */
  async fetchSignal(stock: Stock): Promise<FetchResult<Signal>> {
    const cacheKey = `signal-${stock.symbol}`;

    // Try cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: 'cache',
        };
      }
    }

    // Try API (for now, we use mock signal logic)
    // In the future, we can integrate with ML prediction service
    const mockSignal = generateMockSignal(stock);
    
    // Cache the result
    if (this.config.enableCache) {
      this.cache.set(cacheKey, mockSignal);
    }

    return {
      success: true,
      data: mockSignal,
      source: 'mock',
    };
  }

  /**
   * Prefetch data for multiple symbols
   */
  async prefetchData(symbols: string[]): Promise<void> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.fetchOHLCV(symbol, 50))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`Prefetch failed for ${failed.length} symbols`);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get status
   */
  getStatus(): { cacheSize: number; lastFetch?: string } {
    return {
      cacheSize: this.cache.size(),
      lastFetch: undefined, // Can be enhanced to track last fetch time
    };
  }

  /**
   * Get stock by symbol (helper)
   */
  private getStockBySymbol(symbol: string): Stock | undefined {
    // This would typically come from the store
    // For now, we return undefined and rely on mock data generation
    return undefined;
  }

  /**
   * Configure the aggregator
   */
  configure(config: Partial<DataSourceConfig>): void {
    if (config.enableAPI !== undefined) {
      this.config.enableAPI = config.enableAPI;
    }
    if (config.enableCache !== undefined) {
      this.config.enableCache = config.enableCache;
    }
    if (config.cacheDuration !== undefined) {
      this.config.cacheDuration = config.cacheDuration;
      this.cache = new SimpleCache(config.cacheDuration);
    }
  }
}

// Singleton instance
let aggregatorInstance: DataAggregatorImpl | null = null;

export function getDataAggregator(config?: Partial<DataSourceConfig>): DataAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new DataAggregatorImpl(config);
  }

  if (config) {
    aggregatorInstance.configure(config);
  }

  return aggregatorInstance;
}
