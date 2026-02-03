/**
 * Market Data Source Types
 * 
 * Type definitions for managing multiple data sources and their capabilities
 */

/**
 * Supported data source providers
 */
export enum DataSourceProvider {
  YAHOO_FINANCE = 'yahoo_finance',
  IEX_CLOUD = 'iex_cloud',
  POLYGON = 'polygon',
  ALPACA = 'alpaca',
  ALPHA_VANTAGE = 'alpha_vantage',
}

/**
 * Data source capabilities
 */
export interface DataSourceCapabilities {
  realtime: boolean;
  intraday: boolean;
  delayMinutes: number;
  japaneseStocks: boolean;
  usStocks: boolean;
  tickData: boolean;
  bidAsk: boolean;
  historicalData: boolean;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  provider: DataSourceProvider;
  apiKey?: string;
  enabled: boolean;
  priority: number;
  capabilities: DataSourceCapabilities;
  baseUrl?: string;
}

/**
 * Data source health status
 */
export interface DataSourceHealth {
  provider: DataSourceProvider;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastCheck: number;
  latencyMs: number;
  errorRate: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

/**
 * Market data quality metadata
 */
export interface MarketDataMetadata {
  source: DataSourceProvider;
  timestamp: number;
  isRealtime: boolean;
  delayMinutes: number;
  isInterpolated: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
}

/**
 * Data source response
 */
export interface DataSourceResponse<T> {
  data: T;
  metadata: MarketDataMetadata;
  errors?: string[];
}

/**
 * Supported intervals
 */
export type DataInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1wk' | '1mo';

/**
 * Market types
 */
export type MarketType = 'japan' | 'usa' | 'global';

/**
 * Data source capabilities map
 */
export const DATA_SOURCE_CAPABILITIES: Record<DataSourceProvider, DataSourceCapabilities> = {
  [DataSourceProvider.YAHOO_FINANCE]: {
    realtime: false,
    intraday: false, // Not for Japanese stocks
    delayMinutes: 15,
    japaneseStocks: true,
    usStocks: true,
    tickData: false,
    bidAsk: false,
    historicalData: true,
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerDay: 2000,
    },
  },
  [DataSourceProvider.IEX_CLOUD]: {
    realtime: true,
    intraday: true,
    delayMinutes: 0,
    japaneseStocks: false,
    usStocks: true,
    tickData: true,
    bidAsk: true,
    historicalData: true,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 50000, // Paid plan
    },
  },
  [DataSourceProvider.POLYGON]: {
    realtime: true,
    intraday: true,
    delayMinutes: 0,
    japaneseStocks: false,
    usStocks: true,
    tickData: true,
    bidAsk: true,
    historicalData: true,
    rateLimit: {
      requestsPerMinute: 200,
      requestsPerDay: 100000, // Paid plan
    },
  },
  [DataSourceProvider.ALPACA]: {
    realtime: true,
    intraday: true,
    delayMinutes: 0,
    japaneseStocks: false,
    usStocks: true,
    tickData: true,
    bidAsk: true,
    historicalData: true,
    rateLimit: {
      requestsPerMinute: 200,
      requestsPerDay: 200000, // Free tier
    },
  },
  [DataSourceProvider.ALPHA_VANTAGE]: {
    realtime: false,
    intraday: true,
    delayMinutes: 15,
    japaneseStocks: true,
    usStocks: true,
    tickData: false,
    bidAsk: false,
    historicalData: true,
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerDay: 500, // Free tier
    },
  },
};

/**
 * Get best data source for market and interval
 */
export function getBestDataSource(
  market: MarketType,
  interval: DataInterval,
  availableSources: DataSourceConfig[]
): DataSourceConfig | null {
  const enabledSources = availableSources
    .filter(s => s.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const source of enabledSources) {
    const caps = source.capabilities;
    
    // Check market compatibility
    if (market === 'japan' && !caps.japaneseStocks) continue;
    if (market === 'usa' && !caps.usStocks) continue;
    
    // Check interval compatibility
    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    if (isIntraday && !caps.intraday) continue;
    
    return source;
  }
  
  return null;
}

/**
 * Detect market type from symbol
 */
export function detectMarketType(symbol: string): MarketType {
  // Japanese stocks end with .T or are 4-digit numbers
  if (symbol.endsWith('.T') || /^\d{4}$/.test(symbol)) {
    return 'japan';
  }
  
  // US indices start with ^
  if (symbol.startsWith('^')) {
    return 'global';
  }
  
  return 'usa';
}
