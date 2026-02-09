/**
 * API Related Type Definitions
 * 
 * Includes external API responses (Alpha Vantage) and internal API wrappers.
 */

// ============================================================================
// Alpha Vantage API Types
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
 * Alpha Vantage technical indicators responses
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
  'Technical Analysis: RSI': Record<string, { RSI: string }>;
}

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
  'Technical Analysis: SMA': Record<string, { SMA: string }>;
}

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
  'Technical Analysis: EMA': Record<string, { EMA: string }>;
}

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
// Internal API Types
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

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Check if response is a valid Alpha Vantage Intraday response
 */
export function isIntradayResponse(data: unknown): data is AlphaVantageTimeSeriesIntraday {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as { 'Meta Data'?: unknown };
  return 'Meta Data' in d && typeof d['Meta Data'] === 'object' && d['Meta Data'] !== null;
}

/**
 * Type guard for Alpha Vantage Error Response
 */
export function isAlphaVantageError(data: unknown): data is AlphaVantageError {
  if (typeof data !== 'object' || data === null) return false;
  const errorData = data as AlphaVantageError;
  return !!(errorData['Error Message'] || errorData.Note || errorData.Information);
}

/**
 * Extract time series data from intraday response
 */
export function extractIntradayTimeSeries(
  data: AlphaVantageTimeSeriesIntraday,
  interval: string
): Record<string, { '1. open': string; '2. high': string; '3. low': string; '4. close': string; '5. volume': string }> | undefined {
  for (const [key, value] of Object.entries(data)) {
    if (key === `Time Series (${interval})`) {
      return value as any;
    }
  }
  return undefined;
}
