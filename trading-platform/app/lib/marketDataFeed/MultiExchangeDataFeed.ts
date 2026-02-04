/**
 * MultiExchangeDataFeed.ts
 *
 * HTTPベースの簡易データフィード。
 * WebSocketを廃止したため、リアルタイム接続は行わず、
 * 必要に応じて外部からスナップショットを投入する設計にしています。
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface MarketData {
  symbol: string;
  exchange: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  vwap?: number;
  openInterest?: number;
}

export interface ExchangeConfig {
  name: string;
  restUrl?: string;
  symbols: string[];
  priority: number;
}

export interface DataFeedConfig {
  exchanges: ExchangeConfig[];
  staleDataThreshold: number;
}

export type ConnectionStatus = 'connected' | 'disconnected';

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: DataFeedConfig = {
  exchanges: [],
  staleDataThreshold: 60000,
};

// ============================================================================
// MultiExchangeDataFeed Class (HTTP-only)
// ============================================================================

export class MultiExchangeDataFeed extends EventEmitter {
  private config: DataFeedConfig;
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private latestData: Map<string, MarketData> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private isConnected = false;

  constructor(config: Partial<DataFeedConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    this.connectionStatus.set('http', 'connected');
  }

  disconnect(): void {
    this.isConnected = false;
    this.connectionStatus.set('http', 'disconnected');
  }

  subscribe(symbols: string[]): void {
    symbols.forEach((symbol) => this.subscribedSymbols.add(symbol));
  }

  /**
   * 外部からスナップショットを投入するためのユーティリティ。
   * 必要な場合のみ使用してください。
   */
  ingestSnapshot(data: MarketData): void {
    if (!this.subscribedSymbols.has(data.symbol)) return;
    this.latestData.set(data.symbol, data);
    this.emit('aggregated_data', data.symbol, data);
  }

  getAggregatedData(symbol: string): MarketData | null {
    return this.latestData.get(symbol) ?? null;
  }

  getConnectionStatus(): Map<string, ConnectionStatus> {
    return new Map(this.connectionStatus);
  }

  isRealtimeEnabled(): boolean {
    return this.isConnected;
  }
}

export const createMultiExchangeDataFeed = (
  config?: Partial<DataFeedConfig>
) => new MultiExchangeDataFeed(config);

export default MultiExchangeDataFeed;
