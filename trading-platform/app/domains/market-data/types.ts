/**
 * Market Data Types
 */

export interface MarketData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface MarketDataSubscription {
  symbol: string;
  callback: (data: MarketData) => void;
  unsubscribe: () => void;
}

export interface HistoricalDataRequest {
  symbol: string;
  startDate: Date;
  endDate: Date;
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M';
}

export interface RealtimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
}
