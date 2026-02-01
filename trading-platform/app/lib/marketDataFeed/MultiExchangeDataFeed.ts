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
// Constants
// ============================================================================

const DEFAULT_HEARTBEAT_INTERVAL = 30000;
const DEFAULT_RECONNECT_INTERVAL = 2000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_STALE_DATA_THRESHOLD = 5000;
const DEFAULT_PRICE_DEVIATION_THRESHOLD = 0.02;

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
    reconnectInterval: DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
    heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL,
  },
  {
    name: 'coinbase',
    wsUrl: 'wss://ws-feed.exchange.coinbase.com',
    restUrl: 'https://api.exchange.coinbase.com',
    symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'ADA-USD'],
    priority: 2,
    reconnectInterval: 3000,
    maxReconnectAttempts: 8,
    heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL,
  },
  {
    name: 'kraken',
    wsUrl: 'wss://ws.kraken.com',
    restUrl: 'https://api.kraken.com/0/public',
    symbols: ['XBT/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD'],
    priority: 3,
    reconnectInterval: 2500,
    maxReconnectAttempts: 8,
    heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL,
  },
  {
    name: 'bybit',
    wsUrl: 'wss://stream.bybit.com/v5/public/spot',
    restUrl: 'https://api.bybit.com/v5',
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'],
    priority: 4,
    reconnectInterval: DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
    heartbeatInterval: 20000,
  },
];

// ============================================================================
// Exchange Message Types
// ============================================================================

interface BinanceTickerMessage {
  e: string;
  s: string;
  c: string;
  b: string;
  a: string;
  v: string;
  o: string;
  h: string;
  l: string;
  w: string;
}

interface CoinbaseTickerMessage {
  type: string;
  product_id: string;
  price: string;
  best_bid: string;
  best_ask: string;
  volume_24h: string;
  open_24h: string;
  high_24h: string;
  low_24h: string;
}

interface KrakenTickerData {
  c: [string, string];
  v: [string, string];
  h: [string, string];
  l: [string, string];
  p: [string, string];
  b?: [string, string];
  a?: [string, string];
}

interface BybitTickerMessage {
  topic: string;
  data: {
    symbol: string;
    lastPrice: string;
    bid1Price: string;
    ask1Price: string;
    volume24h: string;
    prevPrice24h: string;
    highPrice24h: string;
    lowPrice24h: string;
    openInterest?: string;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

function isBinanceTicker(data: unknown): data is BinanceTickerMessage {
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>).e === '24hrTicker';
}

function isCoinbaseTicker(data: unknown): data is CoinbaseTickerMessage {
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>).type === 'ticker';
}

function isKrickerTickerData(data: unknown): data is KrakenTickerData {
  return typeof data === 'object' && data !== null && 'c' in data;
}

function isBybitTicker(data: unknown): data is BybitTickerMessage {
  if (typeof data !== 'object' || data === null) return false;
  const topic = (data as Record<string, unknown>).topic;
  return typeof topic === 'string' && topic.includes('tickers');
}

// ============================================================================
// Exchange-specific Message Builders
// ============================================================================

const ExchangeMessageBuilders = {
  binance: {
    buildWsUrl: (config: ExchangeConfig): string => {
      const streams = config.symbols.map((s) => `${s.toLowerCase()}@ticker`).join('/');
      return `${config.wsUrl}/${streams}`;
    },
    createSubscribe: (symbol: string): unknown => ({
      method: 'SUBSCRIBE',
      params: [`${symbol.toLowerCase()}@ticker`],
      id: Date.now(),
    }),
    createUnsubscribe: (symbol: string): unknown => ({
      method: 'UNSUBSCRIBE',
      params: [`${symbol.toLowerCase()}@ticker`],
      id: Date.now(),
    }),
    createPing: (): null => null,
  },
  coinbase: {
    buildWsUrl: (config: ExchangeConfig): string => config.wsUrl,
    createSubscribe: (symbol: string): unknown => ({
      type: 'subscribe',
      product_ids: [symbol],
      channels: ['ticker'],
    }),
    createUnsubscribe: (symbol: string): unknown => ({
      type: 'unsubscribe',
      product_ids: [symbol],
      channels: ['ticker'],
    }),
    createPing: (): unknown => ({ type: 'heartbeat', on: true }),
  },
  kraken: {
    buildWsUrl: (config: ExchangeConfig): string => config.wsUrl,
    createSubscribe: (symbol: string): unknown => ({
      event: 'subscribe',
      pair: [symbol],
      subscription: { name: 'ticker' },
    }),
    createUnsubscribe: (symbol: string): unknown => ({
      event: 'unsubscribe',
      pair: [symbol],
      subscription: { name: 'ticker' },
    }),
    createPing: (): unknown => ({ event: 'ping' }),
  },
  bybit: {
    buildWsUrl: (config: ExchangeConfig): string => config.wsUrl,
    createSubscribe: (symbol: string): unknown => ({
      op: 'subscribe',
      args: [`tickers.${symbol}`],
    }),
    createUnsubscribe: (symbol: string): unknown => ({
      op: 'unsubscribe',
      args: [`tickers.${symbol}`],
    }),
    createPing: (): unknown => ({ op: 'ping' }),
  },
};

// ============================================================================
// Exchange-specific Parsers
// ============================================================================

const ExchangeParsers = {
  binance: (data: unknown, timestamp: number): MarketData | null => {
    if (!isBinanceTicker(data)) return null;

    const symbol = String(data.s);
    const price = parseFloat(data.c);
    const open = parseFloat(data.o);

    return {
      symbol: normalizeSymbol(symbol),
      exchange: 'binance',
      price,
      bid: parseFloat(data.b),
      ask: parseFloat(data.a),
      volume: parseFloat(data.v),
      timestamp,
      change: price - open,
      changePercent: ((price - open) / open) * 100,
      high24h: parseFloat(data.h),
      low24h: parseFloat(data.l),
      vwap: parseFloat(data.w),
    };
  },
  coinbase: (data: unknown, timestamp: number): MarketData | null => {
    if (!isCoinbaseTicker(data)) return null;

    const price = parseFloat(data.price);
    const open24h = parseFloat(data.open_24h);

    return {
      symbol: normalizeSymbol(data.product_id),
      exchange: 'coinbase',
      price,
      bid: parseFloat(data.best_bid),
      ask: parseFloat(data.best_ask),
      volume: parseFloat(data.volume_24h),
      timestamp,
      change: price - open24h,
      changePercent: ((price - open24h) / open24h) * 100,
      high24h: parseFloat(data.high_24h),
      low24h: parseFloat(data.low_24h),
    };
  },
  kraken: (data: unknown, timestamp: number): MarketData | null => {
    if (!Array.isArray(data) || data.length < 4) return null;
    
    const tickerData = data[1] as KrakenTickerData;
    const symbol = String(data[3]);

    if (!isKrickerTickerData(tickerData)) return null;

    const c = tickerData.c;
    const v = tickerData.v;
    const h = tickerData.h;
    const l = tickerData.l;
    const p = tickerData.p;
    const b = tickerData.b;
    const a = tickerData.a;

    const price = parseFloat(c[0]);
    const openPrice = parseFloat(p[0]);

    return {
      symbol: normalizeSymbol(symbol),
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
  },
  bybit: (data: unknown, timestamp: number): MarketData | null => {
    if (!isBybitTicker(data)) return null;

    const ticker = data.data;
    const price = parseFloat(ticker.lastPrice);
    const open = parseFloat(ticker.prevPrice24h);

    return {
      symbol: normalizeSymbol(ticker.symbol),
      exchange: 'bybit',
      price,
      bid: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price),
      volume: parseFloat(ticker.volume24h),
      timestamp,
      change: price - open,
      changePercent: ((price - open) / open) * 100,
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
      openInterest: parseFloat(ticker.openInterest || '0'),
    };
  },
};

// ============================================================================
// Utilities
// ============================================================================

function normalizeSymbol(symbol: string): string {
  return symbol
    .replace(/-/g, '')
    .replace(/\//g, '')
    .replace('USDT', 'USD')
    .replace('XBT', 'BTC');
}

function calculateWeightedPrice(prices: MarketData[]): number {
  const totalVolume = prices.reduce((sum, p) => sum + p.volume, 0);
  return prices.reduce((sum, p) => sum + p.price * p.volume, 0) / totalVolume;
}

function calculateVolumeWeightedMetrics(prices: MarketData[]): { vwap: number; totalVolume: number } {
  const totalVolume = prices.reduce((sum, p) => sum + p.volume, 0);
  const vwap = prices.reduce((sum, p) => sum + p.price * p.volume, 0) / totalVolume;
  return { vwap, totalVolume };
}

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
      staleDataThreshold: DEFAULT_STALE_DATA_THRESHOLD,
      priceDeviationThreshold: DEFAULT_PRICE_DEVIATION_THRESHOLD,
      ...config,
    };
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  async connect(): Promise<void> {
    console.log('[MultiExchangeDataFeed] Starting connections to all exchanges...');
    
    const connectPromises = this.config.exchanges.map((exchangeConfig) =>
      this.connectToExchange(exchangeConfig)
    );

    await Promise.allSettled(connectPromises);
    this.emit('ready');
  }

  disconnect(): void {
    console.log('[MultiExchangeDataFeed] Disconnecting from all exchanges...');
    
    this.clearAllTimers();
    this.closeAllConnections();
    
    this.connections.clear();
    this.emit('disconnected');
  }

  getAggregatedData(symbol: string): MarketData | undefined {
    return this.aggregatedData.get(symbol);
  }

  getAllAggregatedData(): Map<string, MarketData> {
    return new Map(this.aggregatedData);
  }

  getRawData(exchange: string, symbol: string): MarketData | undefined {
    return this.rawData.get(exchange)?.get(symbol);
  }

  getConnectionStatus(): Map<string, string> {
    const status = new Map<string, string>();
    this.connections.forEach((conn, name) => {
      status.set(name, conn.status);
    });
    return status;
  }

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
  // Private Methods - Connection Management
  // ============================================================================

  private clearAllTimers(): void {
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.heartbeatIntervals.clear();
    this.reconnectTimeouts.clear();
  }

  private closeAllConnections(): void {
    this.connections.forEach((conn) => {
      if (conn.ws) {
        conn.ws.close(1000, 'Manual disconnect');
      }
    });
  }

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

      this.setupWebSocketHandlers(conn, config);
    } catch (error) {
      this.handleConnectionError(conn, config, error);
    }
  }

  private setupWebSocketHandlers(conn: ExchangeConnection, config: ExchangeConfig): void {
    if (!conn.ws) return;

    conn.ws.onopen = () => {
      console.log(`[${config.name}] WebSocket connected`);
      conn.status = 'connected';
      conn.reconnectAttempts = 0;
      this.emit('exchange_connected', config.name);

      config.symbols.forEach((symbol) => {
        this.subscribeToSymbol(conn, symbol, config);
      });

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
  }

  private handleConnectionError(conn: ExchangeConnection, config: ExchangeConfig, error: unknown): void {
    console.error(`[${config.name}] Failed to connect:`, error);
    conn.status = 'error';
    this.scheduleReconnect(config);
  }

  private buildWebSocketUrl(config: ExchangeConfig): string {
    const builder = ExchangeMessageBuilders[config.name as keyof typeof ExchangeMessageBuilders];
    return builder ? builder.buildWsUrl(config) : config.wsUrl;
  }

  private subscribeToSymbol(conn: ExchangeConnection, symbol: string, config: ExchangeConfig): void {
    if (!conn.ws || conn.ws.readyState !== WebSocket.OPEN) return;

    const builder = ExchangeMessageBuilders[config.name as keyof typeof ExchangeMessageBuilders];
    if (builder) {
      conn.ws.send(JSON.stringify(builder.createSubscribe(symbol)));
      conn.symbols.add(symbol);
    }
  }

  private createUnsubscribeMessage(exchange: string, symbol: string): unknown {
    const builder = ExchangeMessageBuilders[exchange as keyof typeof ExchangeMessageBuilders];
    return builder ? builder.createUnsubscribe(symbol) : {};
  }

  // ============================================================================
  // Private Methods - Message Handling
  // ============================================================================

  private handleMessage(exchange: string, data: string): void {
    try {
      const parsed = JSON.parse(data);
      const marketData = this.parseExchangeMessage(exchange, parsed);

      if (marketData) {
        this.storeRawData(exchange, marketData);
        this.emit('raw_data', exchange, marketData);
        this.aggregateData(marketData.symbol);
      }
    } catch (error) {
      console.error(`[${exchange}] Failed to parse message:`, error);
    }
  }

  private storeRawData(exchange: string, marketData: MarketData): void {
    if (!this.rawData.has(exchange)) {
      this.rawData.set(exchange, new Map());
    }
    this.rawData.get(exchange)!.set(marketData.symbol, marketData);
  }

  private parseExchangeMessage(exchange: string, data: unknown): MarketData | null {
    const parser = ExchangeParsers[exchange as keyof typeof ExchangeParsers];
    return parser ? parser(data, Date.now()) : null;
  }

  // ============================================================================
  // Private Methods - Data Aggregation
  // ============================================================================

  private aggregateData(symbol: string): void {
    const prices = this.collectValidPrices(symbol);
    if (prices.length === 0) return;

    const aggregated = this.createAggregatedData(prices);

    if (this.isValidAggregation(aggregated, prices)) {
      this.aggregatedData.set(symbol, aggregated);
      this.emit('aggregated_data', symbol, aggregated);
    }
  }

  private collectValidPrices(symbol: string): MarketData[] {
    const prices: MarketData[] = [];
    const now = Date.now();

    this.rawData.forEach((exchangeData) => {
      const data = exchangeData.get(symbol);
      if (data && now - data.timestamp < this.config.staleDataThreshold) {
        prices.push(data);
      }
    });

    return prices;
  }

  private createAggregatedData(prices: MarketData[]): MarketData {
    switch (this.config.aggregationMethod) {
      case 'best_price':
        return this.aggregateByBestPrice(prices);
      case 'vwap':
        return this.aggregateByVWAP(prices);
      case 'primary':
      default:
        return prices[0];
    }
  }

  private aggregateByBestPrice(prices: MarketData[]): MarketData {
    const bestBid = Math.max(...prices.map((p) => p.bid));
    const bestAsk = Math.min(...prices.map((p) => p.ask));
    const { vwap: weightedPrice, totalVolume } = calculateVolumeWeightedMetrics(prices);

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
    const { vwap, totalVolume } = calculateVolumeWeightedMetrics(prices);

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
    const avgPrice = sources.reduce((sum, p) => sum + p.price, 0) / sources.length;
    const deviation = Math.abs(aggregated.price - avgPrice) / avgPrice;

    return deviation <= this.config.priceDeviationThreshold;
  }

  // ============================================================================
  // Private Methods - Heartbeat & Reconnection
  // ============================================================================

  private startHeartbeat(conn: ExchangeConnection, config: ExchangeConfig): void {
    const interval = setInterval(() => {
      if (conn.ws?.readyState === WebSocket.OPEN) {
        this.sendPing(conn, config);
        this.checkStaleData(conn, config);
      }
    }, config.heartbeatInterval);

    this.heartbeatIntervals.set(config.name, interval);
  }

  private sendPing(conn: ExchangeConnection, config: ExchangeConfig): void {
    const builder = ExchangeMessageBuilders[config.name as keyof typeof ExchangeMessageBuilders];
    const pingMsg = builder ? builder.createPing() : null;
    if (pingMsg) {
      conn.ws?.send(JSON.stringify(pingMsg));
    }
  }

  private checkStaleData(conn: ExchangeConnection, config: ExchangeConfig): void {
    if (Date.now() - conn.lastMessage > config.heartbeatInterval * 2) {
      console.warn(`[${config.name}] Stale data detected, reconnecting...`);
      conn.ws?.close();
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
