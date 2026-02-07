/**
 * External API Types
 * 外部APIとの連携の型定義
 */

/**
 * 外部APIプロバイダー
 */
export enum ExternalApiProvider {
  ALPHA_VANTAGE = 'alpha_vantage',
  YAHOO_FINANCE = 'yahoo_finance',
  POLYGON_IO = 'polygon_io',
  IEX_CLOUD = 'iex_cloud',
  FINNHUB = 'finnhub',
  QUANDL = 'quandl',
  BINANCE = 'binance',
  COINBASE = 'coinbase',
  KRAKEN = 'kraken',
}

/**
 * Alpha Vantage APIレスポンス
 */
export interface AlphaVantageResponse {
  'Meta Data'?: {
    '1. Information'?: string;
    '2. Symbol'?: string;
    '3. Last Refreshed'?: string;
    '4. Interval'?: string;
    '5. Output Size'?: string;
    '6. Time Zone'?: string;
  };
  'Time Series (1min)'?: Record<string, AlphaVantageOHLCV>;
  'Time Series (5min)'?: Record<string, AlphaVantageOHLCV>;
  'Time Series (15min)'?: Record<string, AlphaVantageOHLCV>;
  'Time Series (30min)'?: Record<string, AlphaVantageOHLCV>;
  'Time Series (60min)'?: Record<string, AlphaVantageOHLCV>;
  'Time Series (Daily)'?: Record<string, AlphaVantageOHLCV>;
  'Time Series (Weekly)'?: Record<string, AlphaVantageOHLCV>;
  'Time Series (Monthly)'?: Record<string, AlphaVantageOHLCV>;
}

/**
 * Alpha Vantage OHLCVデータ
 */
export interface AlphaVantageOHLCV {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

/**
 * Yahoo Finance APIレスポンス
 */
export interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: YahooFinanceMeta;
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
        adjclose?: Array<{
          adjclose: number[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

/**
 * Yahoo Financeメタデータ
 */
export interface YahooFinanceMeta {
  currency: string;
  symbol: string;
  exchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  priceHint: number;
  currentTradingPeriod: {
    pre: {
      timezone: string;
      start: number;
      end: number;
      gmtoffset: number;
    };
    regular: {
      timezone: string;
      start: number;
      end: number;
      gmtoffset: number;
    };
    post: {
      timezone: string;
      start: number;
      end: number;
      gmtoffset: number;
    };
  };
  dataGranularity: string;
  range: string;
  validRanges: string[];
}

/**
 * Polygon.io APIレスポンス
 */
export interface PolygonIOResponse {
  status: string;
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted?: boolean;
  results?: Array<{
    v: number;
    vw: number;
    o: number;
    c: number;
    h: number;
    l: number;
    t: number;
    n: number;
  }>;
  next_url?: string;
}

/**
 * IEX Cloud APIレスポンス
 */
export interface IEXCloudResponse {
  symbol: string;
  companyName: string;
  primaryExchange: string;
  sector: string;
  industry: string;
  marketCap: number;
  latestPrice: number;
  changePercent: number;
  week52High: number;
  week52Low: number;
  ytdChange: number;
}

/**
 * Finnhub APIレスポンス
 */
export interface FinnhubResponse {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps
  v: number[]; // Volumes
  s: string; // Status
}

/**
 * Binance APIレスポンス
 */
export interface BinanceResponse {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

/**
 * 外部API設定
 */
export interface ExternalApiConfig {
  provider: ExternalApiProvider;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * 外部APIリクエスト
 */
export interface ExternalApiRequest {
  provider: ExternalApiProvider;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * 外部APIエラー
 */
export interface ExternalApiError {
  provider: ExternalApiProvider;
  code: string;
  message: string;
  statusCode?: number;
  timestamp: string;
}

/**
 * APIレート制限情報
 */
export interface RateLimitInfo {
  provider: ExternalApiProvider;
  requestsRemaining: number;
  requestsLimit: number;
  resetTime: string;
}

/**
 * 外部APIレスポンスの共通インターフェース
 */
export interface ExternalApiResponse<T = unknown> {
  provider: ExternalApiProvider;
  success: boolean;
  data?: T;
  error?: ExternalApiError;
  rateLimit?: RateLimitInfo;
  cached: boolean;
  timestamp: string;
}

/**
 * 株価情報（複数プロバイダー共通）
 */
export interface StockQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  timestamp: string;
}

/**
 * ニュース記事
 */
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevance?: number;
}

/**
 * 経済指標
 */
export interface EconomicIndicator {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  unit?: string;
  timestamp: string;
  country?: string;
}

/**
 * 企業財務データ
 */
export interface CompanyFinancials {
  symbol: string;
  revenue?: number;
  netIncome?: number;
  earningsPerShare?: number;
  priceToEarnings?: number;
  priceToBook?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  dividendYield?: number;
  marketCap?: number;
  timestamp: string;
}

/**
 * 外部APIキャッシュエントリ
 */
export interface ExternalApiCacheEntry<T = unknown> {
  provider: ExternalApiProvider;
  key: string;
  data: T;
  expiresAt: string;
  createdAt: string;
}
