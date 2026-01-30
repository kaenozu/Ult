/**
 * MultiExchangeDataFeed.ts
 * 
 * 複数のグローバル取引所からリアルタイム市場データを収集・統合する高度なデータフィードシステム。
 * WebSocket接続の管理、フォールバックメカニズム、データ正規化を提供します。
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
  wsUrl: string;
  restUrl: string;
  symbols: string[];
  priority: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface DataFeedConfig {
  exchanges: ExchangeConfig[];
  aggregationMethod: 'best_price' | 'vwap' | 'primary';
  staleDataThreshold: number;
  priceDeviationThreshold: number;
}

export interface ExchangeConnection {
  name: string;
  ws: WebSocket | null;
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastMessage: number;
  reconnectAttempts: number;
  symbols: Set<string>;
}

// ============================================================================
// Exchange Configurations
// ============================================================================

export const DEFAULT_EXCHANGE_CONFIGS: ExchangeConfig[] = [
  {
    name: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws',
    restUrl: 'https://api.binance.com/api/v3',
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'],
    priority: 1,
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  },
  {
    name: 'coinbase',
    wsUrl: 'wss://ws-feed.exchange.coinbase.com',
    restUrl: 'https://api.exchange.coinbase.com',
    symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'ADA-USD'],
    priority: 2,
    reconnectInterval: 3000,
    maxReconnectAttempts: 8,
    heartbeatInterval: 30000,
  },
  {
    name: 'kraken',
    wsUrl: 'wss://ws.kraken.com',
    restUrl: 'https://api.kraken.com/0/public',
    symbols: ['XBT/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD'],
    priority: 3,
    reconnectInterval: 2500,
    maxReconnectAttempts: 8,
    heartbeatInterval: 30000,
  },
  {
    name: 'bybit',
    wsUrl: 'wss://stream.bybit.com/v5/public/spot',
    restUrl: 'https://api.bybit.com/v5',
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'],
    priority: 4,
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 20000,
  },
];

// ============================================================================
// MultiExchangeDataFeed Class
// ============================================================================

export class MultiExchangeDataFeed extends EventEmitter {
  private connections: Map<string, ExchangeConnection> = new Map();
  private config: DataFeedConfig;
  private aggregatedData: Map<string, MarketData> = new Map();
  private rawData: Map<string, Map<string, MarketData>> = new Map();
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private reconnectTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config: Partial<DataFeedConfig> = {}) {
    super();
    this.config = {
      exchanges: DEFAULT_EXCHANGE_CONFIGS,
      aggregationMethod: 'best_price',
      staleDataThreshold: 5000,
      priceDeviationThreshold: 0.02,
      ...config,
    };
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * 全取引所への接続を開始
   */
  async connect(): Promise<void> {
    console.log('[MultiExchangeDataFeed] Starting connections to all exchanges...');
    
    const connectPromises = this.config.exchanges.map(async (exchangeConfig) => {
      await this.connectToExchange(exchangeConfig);
    });

    await Promise.allSettled(connectPromises);
    this.emit('ready');
  }

  /**
   * 全接続を切断
   */
  disconnect(): void {
    console.log('[MultiExchangeDataFeed] Disconnecting from all exchanges...');
    
    // Clear all intervals and timeouts
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.heartbeatIntervals.clear();
    this.reconnectTimeouts.clear();

    // Close all WebSocket connections
    this.connections.forEach((conn) => {
      if (conn.ws) {
        conn.ws.close(1000, 'Manual disconnect');
      }
    });

    this.connections.clear();
    this.emit('disconnected');
  }

  /**
   * 統合された市場データを取得
   */
  getAggregatedData(symbol: string): MarketData | undefined {
    return this.aggregatedData.get(symbol);
  }

  /**
   * 全統合データを取得
   */
  getAllAggregatedData(): Map<string, MarketData> {
    return new Map(this.aggregatedData);
  }

  /**
   * 特定の取引所からの生データを取得
   */
  getRawData(exchange: string, symbol: string): MarketData | undefined {
    return this.rawData.get(exchange)?.get(symbol);
  }

  /**
   * 接続状態を取得
   */
  getConnectionStatus(): Map<string, string> {
    const status = new Map<string, string>();
    this.connections.forEach((conn, name) => {
      status.set(name, conn.status);
    });
    return status;
  }

  /**
   * サブスクリプションを追加
   */
  subscribe(symbols: string[]): void {
    symbols.forEach((symbol) => {
      this.connections.forEach((conn, exchangeName) => {
        const config = this.config.exchanges.find((e) => e.name === exchangeName);
        if (config) {
          this.subscribeToSymbol(conn, symbol, config);
        }
      });
    });
  }

  /**
   * サブスクリプションを解除
   */
  unsubscribe(symbols: string[]): void {
    symbols.forEach((symbol) => {
      this.connections.forEach((conn) => {
        if (conn.ws?.readyState === WebSocket.OPEN) {
          const unsubscribeMsg = this.createUnsubscribeMessage(conn.name, symbol);
          conn.ws.send(JSON.stringify(unsubscribeMsg));
        }
        conn.symbols.delete(symbol);
      });
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async connectToExchange(config: ExchangeConfig): Promise<void> {
    const conn: ExchangeConnection = {
      name: config.name,
      ws: null,
      status: 'disconnected',
      lastMessage: 0,
      reconnectAttempts: 0,
      symbols: new Set(config.symbols),
    };

    this.connections.set(config.name, conn);

    try {
      const wsUrl = this.buildWebSocketUrl(config);
      conn.ws = new WebSocket(wsUrl);

      conn.ws.onopen = () => {
        console.log(`[${config.name}] WebSocket connected`);
        conn.status = 'connected';
        conn.reconnectAttempts = 0;
        this.emit('exchange_connected', config.name);

        // Subscribe to symbols
        config.symbols.forEach((symbol) => {
          this.subscribeToSymbol(conn, symbol, config);
        });

        // Start heartbeat
        this.startHeartbeat(conn, config);
      };

      conn.ws.onmessage = (event) => {
        conn.lastMessage = Date.now();
        this.handleMessage(config.name, event.data);
      };

      conn.ws.onerror = (error) => {
        console.error(`[${config.name}] WebSocket error:`, error);
        conn.status = 'error';
        this.emit('exchange_error', config.name, error);
      };

      conn.ws.onclose = () => {
        console.log(`[${config.name}] WebSocket closed`);
        conn.status = 'disconnected';
        this.emit('exchange_disconnected', config.name);
        this.scheduleReconnect(config);
      };
    } catch (error) {
      console.error(`[${config.name}] Failed to connect:`, error);
      conn.status = 'error';
      this.scheduleReconnect(config);
    }
  }

  private buildWebSocketUrl(config: ExchangeConfig): string {
    switch (config.name) {
      case 'binance':
        const streams = config.symbols.map((s) => `${s.toLowerCase()}@ticker`).join('/');
        return `${config.wsUrl}/${streams}`;
      case 'coinbase':
        return config.wsUrl;
      case 'kraken':
        return config.wsUrl;
      case 'bybit':
        return config.wsUrl;
      default:
        return config.wsUrl;
    }
  }

  private subscribeToSymbol(conn: ExchangeConnection, symbol: string, config: ExchangeConfig): void {
    if (!conn.ws || conn.ws.readyState !== WebSocket.OPEN) return;

    const subscribeMsg = this.createSubscribeMessage(config.name, symbol);
    conn.ws.send(JSON.stringify(subscribeMsg));
    conn.symbols.add(symbol);
  }

  private createSubscribeMessage(exchange: string, symbol: string): unknown {
    switch (exchange) {
      case 'binance':
        return {
          method: 'SUBSCRIBE',
          params: [`${symbol.toLowerCase()}@ticker`],
          id: Date.now(),
        };
      case 'coinbase':
        return {
          type: 'subscribe',
          product_ids: [symbol],
          channels: ['ticker'],
        };
      case 'kraken':
        return {
          event: 'subscribe',
          pair: [symbol],
          subscription: { name: 'ticker' },
        };
      case 'bybit':
        return {
          op: 'subscribe',
          args: [`tickers.${symbol}`],
        };
      default:
        return {};
    }
  }

  private createUnsubscribeMessage(exchange: string, symbol: string): unknown {
    switch (exchange) {
      case 'binance':
        return {
          method: 'UNSUBSCRIBE',
          params: [`${symbol.toLowerCase()}@ticker`],
          id: Date.now(),
        };
      case 'coinbase':
        return {
          type: 'unsubscribe',
          product_ids: [symbol],
          channels: ['ticker'],
        };
      case 'kraken':
        return {
          event: 'unsubscribe',
          pair: [symbol],
          subscription: { name: 'ticker' },
        };
      case 'bybit':
        return {
          op: 'unsubscribe',
          args: [`tickers.${symbol}`],
        };
      default:
        return {};
    }
  }

  private handleMessage(exchange: string, data: string): void {
    try {
      const parsed = JSON.parse(data);
      const marketData = this.parseExchangeMessage(exchange, parsed);

      if (marketData) {
        // Store raw data
        if (!this.rawData.has(exchange)) {
          this.rawData.set(exchange, new Map());
        }
        this.rawData.get(exchange)!.set(marketData.symbol, marketData);

        // Emit raw data event
        this.emit('raw_data', exchange, marketData);

        // Aggregate data
        this.aggregateData(marketData.symbol);
      }
    } catch (error) {
      console.error(`[${exchange}] Failed to parse message:`, error);
    }
  }

  private parseExchangeMessage(exchange: string, data: unknown): MarketData | null {
    const timestamp = Date.now();

    switch (exchange) {
      case 'binance':
        return this.parseBinanceMessage(data, timestamp);
      case 'coinbase':
        return this.parseCoinbaseMessage(data, timestamp);
      case 'kraken':
        return this.parseKrakenMessage(data, timestamp);
      case 'bybit':
        return this.parseBybitMessage(data, timestamp);
      default:
        return null;
    }
  }

  private parseBinanceMessage(data: unknown, timestamp: number): MarketData | null {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    
    if (d.e !== '24hrTicker') return null;

    const symbol = String(d.s);
    const price = parseFloat(String(d.c));
    const open = parseFloat(String(d.o));

    return {
      symbol: this.normalizeSymbol(symbol),
      exchange: 'binance',
      price,
      bid: parseFloat(String(d.b)),
      ask: parseFloat(String(d.a)),
      volume: parseFloat(String(d.v)),
      timestamp,
      change: price - open,
      changePercent: ((price - open) / open) * 100,
      high24h: parseFloat(String(d.h)),
      low24h: parseFloat(String(d.l)),
      vwap: parseFloat(String(d.w)),
    };
  }

  private parseCoinbaseMessage(data: unknown, timestamp: number): MarketData | null {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    
    if (d.type !== 'ticker') return null;

    const price = parseFloat(String(d.price));
    const open24h = parseFloat(String(d.open_24h));

    return {
      symbol: this.normalizeSymbol(String(d.product_id)),
      exchange: 'coinbase',
      price,
      bid: parseFloat(String(d.best_bid)),
      ask: parseFloat(String(d.best_ask)),
      volume: parseFloat(String(d.volume_24h)),
      timestamp,
      change: price - open24h,
      changePercent: ((price - open24h) / open24h) * 100,
      high24h: parseFloat(String(d.high_24h)),
      low24h: parseFloat(String(d.low_24h)),
    };
  }

  private parseKrakenMessage(data: unknown, timestamp: number): MarketData | null {
    if (!Array.isArray(data) || data.length < 4) return null;
    
    const tickerData = data[1] as Record<string, unknown>;
    const symbol = String(data[3]);

    const c = tickerData.c as [string, string];
    const v = tickerData.v as [string, string];
    const h = tickerData.h as [string, string];
    const l = tickerData.l as [string, string];
    const p = tickerData.p as [string, string];
    const b = tickerData.b as [string, string] | undefined;
    const a = tickerData.a as [string, string] | undefined;

    const price = parseFloat(c[0]);
    const openPrice = parseFloat(p[0]);

    return {
      symbol: this.normalizeSymbol(symbol),
      exchange: 'kraken',
      price,
      bid: parseFloat(b?.[0] || '0'),
      ask: parseFloat(a?.[0] || '0'),
      volume: parseFloat(v[1]),
      timestamp,
      change: price - openPrice,
      changePercent: ((price - openPrice) / openPrice) * 100,
      high24h: parseFloat(h[1]),
      low24h: parseFloat(l[1]),
    };
  }

  private parseBybitMessage(data: unknown, timestamp: number): MarketData | null {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    
    if (d.topic?.toString().indexOf('tickers') === -1) return null;

    const ticker = d.data as Record<string, unknown>;
    const price = parseFloat(String(ticker.lastPrice));
    const open = parseFloat(String(ticker.prevPrice24h));

    return {
      symbol: this.normalizeSymbol(String(ticker.symbol)),
      exchange: 'bybit',
      price,
      bid: parseFloat(String(ticker.bid1Price)),
      ask: parseFloat(String(ticker.ask1Price)),
      volume: parseFloat(String(ticker.volume24h)),
      timestamp,
      change: price - open,
      changePercent: ((price - open) / open) * 100,
      high24h: parseFloat(String(ticker.highPrice24h)),
      low24h: parseFloat(String(ticker.lowPrice24h)),
      openInterest: parseFloat(String(ticker.openInterest) || '0'),
    };
  }

  private normalizeSymbol(symbol: string): string {
    // Normalize symbol format across exchanges
    return symbol
      .replace(/-/g, '')
      .replace(/\//g, '')
      .replace('USDT', 'USD')
      .replace('XBT', 'BTC');
  }

  private aggregateData(symbol: string): void {
    const prices: MarketData[] = [];

    // Collect data from all exchanges
    this.rawData.forEach((exchangeData) => {
      const data = exchangeData.get(symbol);
      if (data && Date.now() - data.timestamp < this.config.staleDataThreshold) {
        prices.push(data);
      }
    });

    if (prices.length === 0) return;

    let aggregated: MarketData;

    switch (this.config.aggregationMethod) {
      case 'best_price':
        aggregated = this.aggregateByBestPrice(prices);
        break;
      case 'vwap':
        aggregated = this.aggregateByVWAP(prices);
        break;
      case 'primary':
        aggregated = prices[0];
        break;
      default:
        aggregated = this.aggregateByBestPrice(prices);
    }

    // Detect and filter outlier prices
    if (this.isValidAggregation(aggregated, prices)) {
      this.aggregatedData.set(symbol, aggregated);
      this.emit('aggregated_data', symbol, aggregated);
    }
  }

  private aggregateByBestPrice(prices: MarketData[]): MarketData {
    const bestBid = Math.max(...prices.map((p) => p.bid));
    const bestAsk = Math.min(...prices.map((p) => p.ask));
    const midPrice = (bestBid + bestAsk) / 2;

    // Weight by volume
    const totalVolume = prices.reduce((sum, p) => sum + p.volume, 0);
    const weightedPrice = prices.reduce((sum, p) => sum + p.price * p.volume, 0) / totalVolume;

    return {
      symbol: prices[0].symbol,
      exchange: 'aggregated',
      price: weightedPrice,
      bid: bestBid,
      ask: bestAsk,
      volume: totalVolume,
      timestamp: Date.now(),
      change: prices[0].change,
      changePercent: prices[0].changePercent,
      high24h: Math.max(...prices.map((p) => p.high24h)),
      low24h: Math.min(...prices.map((p) => p.low24h)),
    };
  }

  private aggregateByVWAP(prices: MarketData[]): MarketData {
    const totalVolume = prices.reduce((sum, p) => sum + p.volume, 0);
    const vwap = prices.reduce((sum, p) => sum + p.price * p.volume, 0) / totalVolume;

    return {
      symbol: prices[0].symbol,
      exchange: 'aggregated',
      price: vwap,
      bid: Math.max(...prices.map((p) => p.bid)),
      ask: Math.min(...prices.map((p) => p.ask)),
      volume: totalVolume,
      timestamp: Date.now(),
      change: prices[0].change,
      changePercent: prices[0].changePercent,
      high24h: Math.max(...prices.map((p) => p.high24h)),
      low24h: Math.min(...prices.map((p) => p.low24h)),
    };
  }

  private isValidAggregation(aggregated: MarketData, sources: MarketData[]): boolean {
    // Check for significant price deviations
    const avgPrice = sources.reduce((sum, p) => sum + p.price, 0) / sources.length;
    const deviation = Math.abs(aggregated.price - avgPrice) / avgPrice;

    return deviation <= this.config.priceDeviationThreshold;
  }

  private startHeartbeat(conn: ExchangeConnection, config: ExchangeConfig): void {
    const interval = setInterval(() => {
      if (conn.ws?.readyState === WebSocket.OPEN) {
        // Send ping based on exchange protocol
        const pingMsg = this.createPingMessage(config.name);
        if (pingMsg) {
          conn.ws.send(JSON.stringify(pingMsg));
        }

        // Check for stale data
        if (Date.now() - conn.lastMessage > config.heartbeatInterval * 2) {
          console.warn(`[${config.name}] Stale data detected, reconnecting...`);
          conn.ws.close();
        }
      }
    }, config.heartbeatInterval);

    this.heartbeatIntervals.set(config.name, interval);
  }

  private createPingMessage(exchange: string): unknown | null {
    switch (exchange) {
      case 'binance':
        return null; // Binance handles ping automatically
      case 'coinbase':
        return { type: 'heartbeat', on: true };
      case 'kraken':
        return { event: 'ping' };
      case 'bybit':
        return { op: 'ping' };
      default:
        return null;
    }
  }

  private scheduleReconnect(config: ExchangeConfig): void {
    const conn = this.connections.get(config.name);
    if (!conn) return;

    if (conn.reconnectAttempts >= config.maxReconnectAttempts) {
      console.error(`[${config.name}] Max reconnect attempts reached`);
      this.emit('exchange_failed', config.name);
      return;
    }

    conn.reconnectAttempts++;
    conn.status = 'reconnecting';

    const timeout = setTimeout(() => {
      console.log(`[${config.name}] Attempting reconnect ${conn.reconnectAttempts}/${config.maxReconnectAttempts}`);
      this.connectToExchange(config);
    }, config.reconnectInterval * conn.reconnectAttempts);

    this.reconnectTimeouts.set(config.name, timeout);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalDataFeed: MultiExchangeDataFeed | null = null;

export function getGlobalDataFeed(config?: Partial<DataFeedConfig>): MultiExchangeDataFeed {
  if (!globalDataFeed) {
    globalDataFeed = new MultiExchangeDataFeed(config);
  }
  return globalDataFeed;
}

export function resetGlobalDataFeed(): void {
  if (globalDataFeed) {
    globalDataFeed.disconnect();
    globalDataFeed = null;
  }
}

export default MultiExchangeDataFeed;
