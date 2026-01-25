/**
 * Alpha Vantage API Client
 *
 * Provides access to stock market data including:
 * - Daily OHLCV data
 * - Intraday data (1min, 5min, 15min)
 * - Technical indicators (RSI, SMA, MACD, Bollinger Bands)
 * - Symbol search
 *
 * Rate Limit (Free Tier):
 * - 5 requests per minute
 * - 25 requests per day
 *
 * Documentation: https://www.alphavantage.co/documentation/
 */

import type {
  AlphaVantageTimeSeriesDaily,
  AlphaVantageTimeSeriesIntraday,
  AlphaVantageGlobalQuote,
  AlphaVantageRSI,
  AlphaVantageSMA,
  AlphaVantageEMA,
  AlphaVantageMACD,
  AlphaVantageBollingerBands,
  AlphaVantageError,
} from '@/app/types';
import {
  APIError,
  NetworkError,
  RateLimitError,
  isAlphaVantageError,
} from '@/app/types';

export interface AlphaVantageConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeSeriesData {
  symbol: string;
  interval: string;
  data: OHLCV[];
}

export interface TechnicalIndicator {
  name: string;
  data: Record<string, number | string>[];
  meta: {
    symbol: string;
    indicator: string;
    interval: string;
    timePeriod?: number | string;
    [key: string]: string | number | undefined;
  };
}

interface AlphaVantageTimeSeriesValue {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

interface AlphaVantageIndicatorValue {
  [key: string]: string;
}

interface AlphaVantageSymbolMatch {
  '1. symbol': string;
  '2. name': string;
  '3. type': string;
  '4. region': string;
  '5. marketOpen': string;
  '6. marketClose': string;
  '7. timezone': string;
  '8. currency': string;
  '9. matchScore': string;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: string;
}

export class AlphaVantageClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AlphaVantageConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://www.alphavantage.co/query';
  }

  /**
   * Get daily OHLCV data for a symbol
   * @param symbol Stock symbol (e.g., "AAPL", "IBM", "NVDA")
   * @param outputsize Compact or full output (default: "compact")
   */
  async getDailyBars(symbol: string, outputsize: 'compact' | 'full' = 'compact'): Promise<TimeSeriesData> {
    const params = new URLSearchParams({
      function: 'TIME_SERIES_DAILY',
      symbol,
      apikey: this.apiKey,
      outputsize,
    });

    const url = `${this.baseUrl}?${params}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new NetworkError(
          `Alpha Vantage API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json() as AlphaVantageTimeSeriesDaily | AlphaVantageError;

      validateAlphaVantageResponse(data);

      // Type guard: ensure data is not an error response
      const validData = isAlphaVantageError(data) ? undefined : data;
      const timeSeries = validData?.['Time Series (Daily)'] as Record<string, AlphaVantageTimeSeriesValue> | undefined;
      if (!timeSeries) {
        throw new Error('No time series data returned');
      }

      const parsed: OHLCV[] = Object.entries(timeSeries)
        .map(([timestamp, values]) => ({
          timestamp,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume']),
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      return {
        symbol,
        interval: 'daily',
        data: parsed,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get intraday data for a symbol
   */
  async getIntraday(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min',
    outputsize: 'compact' | 'full' = 'compact',
    month?: string
  ): Promise<TimeSeriesData> {
    const params = new URLSearchParams({
      function: 'TIME_SERIES_INTRADAY',
      symbol,
      interval,
      apikey: this.apiKey,
      outputsize,
    });

    if (month) {
      params.append('month', month);
    }

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new NetworkError(
        `Alpha Vantage API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as AlphaVantageTimeSeriesIntraday | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type-safe data extraction
    const key = `Time Series (${interval})`;
    const timeSeries = extractTimeSeriesData(data as Record<string, unknown>, key);
    if (!timeSeries) {
      throw new Error('No time series data returned');
    }

    const parsed: OHLCV[] = Object.entries(timeSeries)
      .map(([timestamp, values]) => ({
        timestamp,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume']),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      symbol,
      interval,
      data: parsed,
    };
  }

  /**
   * Get RSI indicator
   */
  async getRSI(
    symbol: string,
    timePeriod: number = 14,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ): Promise<TechnicalIndicator> {
    const params = new URLSearchParams({
      function: 'RSI',
      symbol,
      interval: 'daily',
      time_period: timePeriod.toString(),
      series_type: series,
      apikey: this.apiKey,
    });

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new NetworkError(
        `Alpha Vantage API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as AlphaVantageRSI | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type-safe data extraction
    const rsiData = extractTechnicalIndicatorData(data, 'Technical Analysis: RSI');
    if (!rsiData) {
      throw new Error('No RSI data returned');
    }

    const parsed = Object.entries(rsiData)
      .map(([timestamp, values]) => ({
        timestamp,
        rsi: parseFloat(values['RSI']),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      name: 'RSI',
      data: parsed,
      meta: {
        symbol,
        indicator: 'RSI',
        interval: 'daily',
        timePeriod,
      },
    };
  }

  /**
   * Get SMA indicator
   */
  async getSMA(
    symbol: string,
    timePeriod: number = 20,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ): Promise<TechnicalIndicator> {
    const params = new URLSearchParams({
      function: 'SMA',
      symbol,
      interval: 'daily',
      time_period: timePeriod.toString(),
      series_type: series,
      apikey: this.apiKey,
    });

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new NetworkError(
        `Alpha Vantage API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as AlphaVantageSMA | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type-safe data extraction
    const smaData = extractTechnicalIndicatorData(data, 'Technical Analysis: SMA');
    if (!smaData) {
      throw new Error('No SMA data returned');
    }

    const parsed = Object.entries(smaData)
      .map(([timestamp, values]) => ({
        timestamp,
        sma: parseFloat(values['SMA']),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      name: 'SMA',
      data: parsed,
      meta: {
        symbol,
        indicator: 'SMA',
        interval: 'daily',
        timePeriod,
      },
    };
  }

  /**
   * Get EMA indicator
   */
  async getEMA(
    symbol: string,
    timePeriod: number = 20,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ): Promise<TechnicalIndicator> {
    const params = new URLSearchParams({
      function: 'EMA',
      symbol,
      interval: 'daily',
      time_period: timePeriod.toString(),
      series_type: series,
      apikey: this.apiKey,
    });

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new NetworkError(
        `Alpha Vantage API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as AlphaVantageEMA | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type-safe data extraction
    const emaData = extractTechnicalIndicatorData(data, 'Technical Analysis: EMA');
    if (!emaData) {
      throw new Error('No EMA data returned');
    }

    const parsed = Object.entries(emaData)
      .map(([timestamp, values]) => ({
        timestamp,
        ema: parseFloat(values['EMA']),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      name: 'EMA',
      data: parsed,
      meta: {
        symbol,
        indicator: 'EMA',
        interval: 'daily',
        timePeriod,
      },
    };
  }

  /**
   * Get MACD indicator
   */
  async getMACD(
    symbol: string,
    fastperiod: number = 12,
    slowperiod: number = 26,
    signalperiod: number = 9
  ): Promise<TechnicalIndicator> {
    const params = new URLSearchParams({
      function: 'MACD',
      symbol,
      interval: 'daily',
      fastperiod: fastperiod.toString(),
      slowperiod: slowperiod.toString(),
      signalperiod: signalperiod.toString(),
      apikey: this.apiKey,
    });

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new NetworkError(
        `Alpha Vantage API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as AlphaVantageMACD | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type-safe data extraction
    const macdData = extractTechnicalIndicatorData(data, 'Technical Analysis: MACD');
    if (!macdData) {
      throw new Error('No MACD data returned');
    }

    const parsed = Object.entries(macdData)
      .map(([timestamp, values]) => ({
        timestamp,
        macd: parseFloat(values['MACD']),
        macd_Signal: parseFloat(values['MACD_Signal']),
        macd_Hist: parseFloat(values['MACD_Hist']),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      name: 'MACD',
      data: parsed,
      meta: {
        symbol,
        indicator: 'MACD',
        interval: 'daily',
        timePeriod: `${fastperiod}-${slowperiod}-${signalperiod}`,
      },
    };
  }

  /**
   * Get Bollinger Bands indicator
   */
  async getBollingerBands(
    symbol: string,
    timePeriod: number = 20,
    series: 'open' | 'high' | 'low' | 'close' = 'close',
    nbdevup: number = 2
  ): Promise<TechnicalIndicator> {
    const params = new URLSearchParams({
      function: 'BBANDS',
      symbol,
      interval: 'daily',
      time_period: timePeriod.toString(),
      series_type: series,
      nbdevup: nbdevup.toString(),
      apikey: this.apiKey,
    });

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new NetworkError(
        `Alpha Vantage API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as AlphaVantageBollingerBands | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type-safe data extraction
    const bbData = extractTechnicalIndicatorData(data, 'Technical Analysis: BBANDS');
    if (!bbData) {
      throw new Error('No Bollinger Bands data returned');
    }

    const parsed = Object.entries(bbData)
      .map(([timestamp, values]) => ({
        timestamp,
        realMiddleBand: parseFloat(values['Real Middle Band']),
        upperBand: parseFloat(values['Real Upper Band']),
        lowerBand: parseFloat(values['Real Lower Band']),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      name: 'Bollinger Bands',
      data: parsed,
      meta: {
        symbol,
        indicator: 'Bollinger Bands',
        interval: 'daily',
        timePeriod,
        nbdevup,
      },
    };
  }

  /**
   * Search for symbols
   */
  async searchSymbols(
    keywords: string,
    datatype: 'equity' | 'csv' | 'crypto' | 'forex' = 'equity'
  ): Promise<SymbolSearchResult[]> {
    const params = new URLSearchParams({
      function: 'SYMBOL_SEARCH',
      keywords,
      datatype,
      apikey: this.apiKey,
    });

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { bestMatches?: AlphaVantageSymbolMatch[] } | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type guard: ensure data is not an error response
    const validData = isAlphaVantageError(data) ? undefined : data;
    if (!validData?.bestMatches) {
      return [];
    }

    return validData.bestMatches.map((match) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      marketOpen: match['5. marketOpen'],
      marketClose: match['6. marketClose'],
      timezone: match['7. timezone'],
      currency: match['8. currency'],
      matchScore: match['9. matchScore'],
    }));
  }

  /**
   * Get global quote for a symbol
   */
  async getGlobalQuote(symbol: string): Promise<Record<string, string>> {
    const params = new URLSearchParams({
      function: 'GLOBAL_QUOTE',
      symbol,
      apikey: this.apiKey,
    });

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { 'Global Quote'?: Record<string, string> } | AlphaVantageError;

    validateAlphaVantageResponse(data);

    // Type guard: ensure data is not an error response
    const validData = isAlphaVantageError(data) ? undefined : data;
    const quote = validData?.['Global Quote'];
    if (!quote) {
      throw new Error('No quote data returned');
    }

    return quote;
  }
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Validate and throw error for Alpha Vantage API response
 * @param data - API response data
 * @throws {APIError} - If API returns an error
 * @throws {RateLimitError} - If rate limit is exceeded
 */
export function validateAlphaVantageResponse(data: AlphaVantageError | unknown): void {
  if (!isAlphaVantageError(data)) {
    return;
  }

  if (data['Error Message']) {
    throw new APIError(data['Error Message'], 'API_ERROR');
  }

  if (data['Note']) {
    throw new RateLimitError(data['Note']);
  }

  if (data['Information']) {
    throw new APIError(data['Information'], 'API_INFO');
  }
}

/**
 * Handle fetch response and validate
 * @param response - Fetch response object
 * @returns Parsed JSON data
 * @throws {NetworkError} - If request failed
 * @throws {APIError} - If API returned error
 */
export async function handleAlphaVantageFetch<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new NetworkError(
      `Alpha Vantage API Error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  validateAlphaVantageResponse(data);
  return data as T;
}

/**
 * Type-safe technical indicator data extractor
 * Handles the common pattern for RSI, SMA, EMA, MACD, BBANDS responses
 */
export function extractTechnicalIndicatorData<T extends AlphaVantageSMA | AlphaVantageRSI | AlphaVantageEMA | AlphaVantageMACD | AlphaVantageBollingerBands>(
  data: T | AlphaVantageError,
  keyName: string
): Record<string, AlphaVantageIndicatorValue> | undefined {
  // Type guard: ensure data is not an error
  if (isAlphaVantageError(data)) {
    return undefined;
  }

  const value = (data as Record<string, unknown>)[keyName];
  return (value && typeof value === 'object') ? value as Record<string, AlphaVantageIndicatorValue> : undefined;
}

/**
 * Type-safe time series data extractor for intraday/daily responses
 */
export function extractTimeSeriesData<T extends { [key: string]: { '1. open': string; '2. high': string; '3. low': string; '4. close': string; '5. volume': string } }>(
  data: Record<string, unknown>,
  keyName: string
): Record<string, AlphaVantageTimeSeriesValue> | undefined {
  const value = data[keyName];
  return (value && typeof value === 'object') ? value as Record<string, AlphaVantageTimeSeriesValue> : undefined;
}

// Singleton instance
let clientInstance: AlphaVantageClient | null = null;

export function getAlphaVantageClient(): AlphaVantageClient {
  // SECURITY: Ensure this is only run on server to protect API keys
  if (typeof window !== 'undefined') {
    throw new Error('AlphaVantageClient must be used on server side only');
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not defined in environment variables');
  }

  // Validate API key format and security
  if (typeof apiKey !== 'string' || apiKey.length < 10) {
    throw new Error('Invalid API key format');
  }

  // SECURITY: Prevent usage of example/placeholder keys
  const insecurePatterns = ['your_api_key_here', 'example', 'placeholder', 'xxx', 'test_key'];
  if (insecurePatterns.some(pattern => apiKey.toLowerCase().includes(pattern))) {
    throw new APIError(
      'Insecure API key detected. Please set a real API key in environment variables.',
      'INSECURE_API_KEY'
    );
  }

  if (!clientInstance) {
    clientInstance = new AlphaVantageClient({ apiKey });
  }

  return clientInstance;
}
