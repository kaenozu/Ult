// ============================================================================
// Alpha Vantage API Types
// ============================================================================

/**
 * Alpha Vantage Time Series Intraday Response
 * Used for intervals like 1min, 5min, 15min, 30min, 60min
 */
export interface AlphaVantageTimeSeriesIntraday {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  'Time Series (${string})': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

/**
 * Alpha Vantage Intraday data with dynamic key
 */
export type AlphaVantageIntradayResponse =
  | AlphaVantageTimeSeriesIntraday
  | AlphaVantageError;

/**
 * Check if response is a valid Alpha Vantage Intraday response
 */
export function isIntradayResponse(
  data: unknown
): data is AlphaVantageTimeSeriesIntraday {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as { 'Meta Data'?: unknown };
  return 'Meta Data' in d && typeof d['Meta Data'] === 'object' && d['Meta Data'] !== null;
}

/**
 * Extract time series data from intraday response
 * Uses a type-safe approach to access dynamic keys
 */
export function extractIntradayTimeSeries(
  data: AlphaVantageTimeSeriesIntraday,
  interval: string
): Record<string, { '1. open': string; '2. high': string; '3. low': string; '4. close': string; '5. volume': string }> | undefined {
  // Use Object.entries to find the matching key dynamically and type-safely
  for (const [key, value] of Object.entries(data)) {
    if (key === `Time Series (${interval})`) {
      if (typeof value === 'object' && value !== null) {
        return value as Record<string, { '1. open': string; '2. high': string; '3. low': string; '4. close': string; '5. volume': string }>;
      }
    }
  }
  return undefined;
}

// ============================================================================
// Domain Types
// ============================================================================

export interface Stock {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52w?: number;
  low52w?: number;
}

export interface OHLCV {
  symbol?: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  symbol: string;
  sma5: number[];
  sma20: number[];
  sma50: number[];
  sma200?: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

export interface Signal {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  accuracy?: number; // 過去の的中率 (%)
  atr?: number;      // 銘柄固有の変動幅
  targetPrice: number;
  stopLoss: number;
  reason: string;
  predictedChange: number;
  predictionDate: string;
  optimizedParams?: {
    rsiPeriod: number;
    smaPeriod: number;
  };
  marketContext?: {
    indexSymbol: string;
    correlation: number; // 指数との相関係数 (-1 to 1)
    indexTrend: 'UP' | 'DOWN' | 'NEUTRAL';
  };
  predictionError?: number; // 予測誤差係数 (1.0 = 標準)
  volumeResistance?: {
    price: number;
    strength: number; // 0 to 1
  }[];
}

export interface PaperTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: 'OPEN' | 'CLOSED';
  entryDate: string;
  exitDate?: string;
  profitPercent?: number;
  reflection?: string; // AIによる事後分析
}

export interface AIStatus {
  virtualBalance: number;
  totalProfit: number;
  trades: PaperTrade[];
}

export interface Position {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  change: number;
  entryDate: string;
}

export interface JournalEntry {
  id: string;
  symbol: string;
  date: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profit?: number;
  profitPercent?: number;
  notes: string;
  status: 'OPEN' | 'CLOSED';
}

export interface Order {
  id: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  date: string;
}

export interface Portfolio {
  positions: Position[];
  orders: Order[];
  totalValue: number;
  totalProfit: number;
  dailyPnL: number;
  cash: number;
}

export interface HeatmapSector {
  name: string;
  change: number;
  stocks: Stock[];
}

export interface ScreenerFilter {
  minPrice?: number;
  maxPrice?: number;
  minChange?: number;
  maxChange?: number;
  minVolume?: number;
  sectors?: string[];
  markets?: ('japan' | 'usa')[];
}

export type Theme = 'dark' | 'light';

// ============================================================================
// API Types
// ============================================================================

/**
 * Alpha Vantage API Error Response
 */
export interface AlphaVantageError {
  'Error Message'?: string;
  Note?: string;
  Information?: string;
}

/**
 * Alpha Vantage Global Quote Response
 */
export interface AlphaVantageGlobalQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

/**
 * Alpha Vantage Time Series Daily Response
 */
export interface AlphaVantageTimeSeriesDaily {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

/**
 * Alpha Vantage RSI Response
 */
export interface AlphaVantageRSI {
  'Meta Data': {
    '1. Indicator': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Time Period': number;
    '6. Series Type': string;
    '7. Time Zone': string;
  };
  'Technical Analysis: RSI': Record<string, {
    RSI: string;
  }>;
}

/**
 * Alpha Vantage SMA Response
 */
export interface AlphaVantageSMA {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': number;
    '6: Series Type': string;
    '7: Time Zone': string;
  };
  'Technical Analysis: SMA': Record<string, {
    SMA: string;
  }>;
}

/**
 * Alpha Vantage EMA Response
 */
export interface AlphaVantageEMA {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': number;
    '6: Series Type': string;
    '7: Time Zone': string;
  };
  'Technical Analysis: EMA': Record<string, {
    EMA: string;
  }>;
}

/**
 * Alpha Vantage MACD Response
 */
export interface AlphaVantageMACD {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': {
      'Fast Period': number;
      'Slow Period': number;
      'Signal Period': number;
    };
    '6: Series Type': string;
    '7: Time Zone': string;
  };
  'Technical Analysis: MACD': Record<string, {
    MACD: string;
    MACD_Signal: string;
    MACD_Hist: string;
  }>;
}

/**
 * Alpha Vantage Bollinger Bands Response
 */
export interface AlphaVantageBollingerBands {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': number;
    '6: Series Type': string;
    '7: NB Dev Up': number;
    '8: NB Dev Dn': number;
    '9: MA Type': number;
    '10: Time Zone': string;
  };
  'Technical Analysis: BBANDS': Record<string, {
    'Real Upper Band': string;
    'Real Middle Band': string;
    'Real Lower Band': string;
  }>;
}

/**
 * Alpha Vantage API Response (Union type for all endpoints)
 */
export type AlphaVantageResponse =
  | AlphaVantageGlobalQuote
  | AlphaVantageTimeSeriesDaily
  | AlphaVantageRSI
  | AlphaVantageSMA
  | AlphaVantageError;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error class for API-related errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown> | unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends APIError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends APIError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

/**
 * Rate limit error for API throttling
 */
export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Type guard for Alpha Vantage Error Response
 */
export function isAlphaVantageError(data: unknown): data is AlphaVantageError {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const errorData = data as {
    'Error Message'?: unknown;
    'Note'?: unknown;
    'Information'?: unknown;
  };
  return (
    typeof errorData['Error Message'] === 'string' ||
    typeof errorData['Note'] === 'string' ||
    typeof errorData['Information'] === 'string'
  );
}

// ============================================================================
// API Result Types
// ============================================================================

/**
 * Standard API result wrapper
 */
export interface APIResult<T> {
  success: true;
  data: T;
  source: 'cache' | 'api' | 'aggregated' | 'idb';
}

/**
 * API error wrapper
 */
export interface APIErrorResult {
  success: false;
  data: null;
  source: 'cache' | 'api' | 'aggregated' | 'idb' | 'error';
  error: string;
}

/**
 * Union type for API responses
 */
export type APIResponse<T> = APIResult<T> | APIErrorResult;
