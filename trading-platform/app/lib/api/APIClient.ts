/**
 * Common API Client for Alpha Vantage API
 * Provides a unified interface for all API operations with centralized error handling
 */

import {
  AlphaVantageTimeSeriesDaily,
  AlphaVantageTimeSeriesIntraday,
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
} from '@/app/lib/api/errors';

export interface APIConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
}

export class APIClient {
  protected config: APIConfig;

  constructor(config: APIConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://www.alphavantage.co/query',
      timeout: config.timeout || 10000,
    };
  }

  /**
   * Perform a fetch with timeout and error handling
   */
  private async fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
    const timeout = options.timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw new NetworkError(`Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle response and check for errors
   */
  private async handleResponse<T>(response: Response, context: string): Promise<T> {
    if (!response.ok) {
      throw new NetworkError(
        `API Error (${context}): ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (this.isAlphaVantageError(data)) {
      throw new APIError(
        data['Error Message'] || data['Note'] || 'Unknown API error',
        'API_ERROR'
      );
    }

    if (data['Note']) {
      throw new RateLimitError(data['Note']);
    }

    return data;
  }

  private isAlphaVantageError(data: unknown): data is AlphaVantageError {
    const err = data as AlphaVantageError;
    return (
      err &&
      typeof err === 'object' &&
      ('Error Message' in err || 'Note' in err)
    );
  }

  /**
   * Extract time series data with type safety
   */
  private extractTimeSeriesData(
    data: Record<string, unknown>,
    keyName: string
  ): Record<string, Record<string, string>> | undefined {
    const timeSeries = data[keyName];
    if (!timeSeries) {
      return undefined;
    }

    const entries: [string, Record<string, string>][] = Object.entries(timeSeries)
      .filter(([_, values]) => {
        if (!values || typeof values !== 'object') return false;
        return '1. open' in values && '4. close' in values;
      })
      .map(([timestamp, values]) => [timestamp, values as Record<string, string>]);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries);
  }

  /**
   * Extract technical indicator data with type safety
   */
  private extractIndicatorData(
    data: Record<string, unknown>,
    keyName: string
  ): Record<string, Record<string, string>> | undefined {
    const indicatorData = data[keyName];
    if (!indicatorData || typeof indicatorData !== 'object') {
      return undefined;
    }

    const entries: [string, Record<string, string>][] = Object.entries(indicatorData)
      .filter(([_, values]) => {
        if (!values || typeof values !== 'object') return false;
        return true;
      })
      .map(([timestamp, values]) => [timestamp, values as Record<string, string>]);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries);
  }

  /**
   * Generic fetch method for Alpha Vantage
   */
  async fetch<T>(
    functionName: string,
    params: Record<string, string | number>
  ): Promise<T> {
    const url = new URLSearchParams(params as any).toString();
    const fullUrl = `${this.config.baseUrl}?${url}`;

    try {
      const response = await this.fetchWithTimeout(fullUrl, { timeout: 10000 });
      return await this.handleResponse<T>(response, functionName);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkError(`Failed to fetch ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get daily OHLCV data
   * Returns any to allow subclasses to transform the data
   */
  async getDailyBars(symbol: string, outputsize: 'compact' | 'full' = 'compact'): Promise<any> {
    return this.fetch<AlphaVantageTimeSeriesDaily>(
      'getDailyBars',
      {
        function: 'TIME_SERIES_DAILY',
        symbol,
        apikey: this.config.apiKey,
        outputsize,
      }
    );
  }

  /**
   * Get intraday data
   * Returns any to allow subclasses to transform the data
   */
  async getIntraday(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min',
    month?: string
  ): Promise<any> {
    const params: Record<string, string | number> = {
      function: 'TIME_SERIES_INTRADAY',
      symbol,
      interval,
      apikey: this.config.apiKey,
      outputsize: 'compact',
    };

    if (month) {
      params.month = month;
    }

    return this.fetch<AlphaVantageTimeSeriesIntraday>(
      'getIntraday',
      params
    );
  }

  async getGlobalQuote(symbol: string) {
    return this.fetch<any>(
      'getGlobalQuote',
      {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: this.config.apiKey,
      }
    );
  }

  /**
   * Get RSI indicator
   * Returns any to allow subclasses to transform the data
   */
  async getRSI(
    symbol: string,
    timePeriod: number = 14,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ): Promise<any> {
    return this.fetch<AlphaVantageRSI>(
      'getRSI',
      {
        function: 'RSI',
        symbol,
        interval: 'daily',
        time_period: timePeriod.toString(),
        series_type: series,
        apikey: this.config.apiKey,
      }
    );
  }

  /**
   * Get SMA indicator
   * Returns any to allow subclasses to transform the data
   */
  async getSMA(
    symbol: string,
    timePeriod: number = 20,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ): Promise<any> {
    return this.fetch<AlphaVantageSMA>(
      'getSMA',
      {
        function: 'SMA',
        symbol,
        interval: 'daily',
        time_period: timePeriod.toString(),
        series_type: series,
        apikey: this.config.apiKey,
      }
    );
  }

  /**
   * Get EMA indicator
   * Returns any to allow subclasses to transform the data
   */
  async getEMA(
    symbol: string,
    timePeriod: number = 20,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ): Promise<any> {
    return this.fetch<AlphaVantageEMA>(
      'getEMA',
      {
        function: 'EMA',
        symbol,
        interval: 'daily',
        time_period: timePeriod.toString(),
        series_type: series,
        apikey: this.config.apiKey,
      }
    );
  }

  /**
   * Get MACD indicator
   * Returns any to allow subclasses to transform the data
   */
  async getMACD(
    symbol: string,
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): Promise<any> {
    return this.fetch<AlphaVantageMACD>(
      'getMACD',
      {
        function: 'MACD',
        symbol,
        interval: 'daily',
        fastperiod: fastPeriod.toString(),
        slowperiod: slowPeriod.toString(),
        signalperiod: signalPeriod.toString(),
        apikey: this.config.apiKey,
      }
    );
  }

  /**
   * Get Bollinger Bands
   * Returns any to allow subclasses to transform the data
   */
  async getBollingerBands(
    symbol: string,
    timePeriod: number = 20,
    nbdevup: number = 2
  ): Promise<any> {
    return this.fetch<AlphaVantageBollingerBands>(
      'getBollingerBands',
      {
        function: 'BBANDS',
        symbol,
        interval: 'daily',
        time_period: timePeriod.toString(),
        nbdevup: nbdevup.toString(),
        series_type: 'close',
        apikey: this.config.apiKey,
      }
    );
  }

  /**
   * Parse time series data to OHLCV array
   */
  parseOHLCVFromTimeSeries(timeSeries: Record<string, Record<string, string>>): Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> {
    return Object.entries(timeSeries).map(([timestamp, values]) => ({
      date: timestamp,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume']),
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Parse indicator data to array of values
   */
  parseIndicatorFromData(indicatorData: Record<string, { value: string }>): number[] {
    return Object.entries(indicatorData)
      .map(([_, values]) => parseFloat(values.value))
      .sort((a, b) => a - b);
  }
}

// Singleton instance
let apiClient: APIClient | null = null;

export function getAPIClient(): APIClient {
  if (!apiClient) {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is not defined in environment variables');
    }

    // Validate API key format
    if (typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new APIError('Invalid API key format', 'INVALID_API_KEY');
    }

    // Prevent usage of example keys
    const insecurePatterns = [
      'your_api_key_here', 'example', 'placeholder', 'xxx', 'test_key',
      'dummy', 'fake', 'sample', 'demo', 'test', 'key', 'apikey', 'secret',
      '1234567890', 'abcdefg', 'qwerty', 'password', 'admin'
    ];
    if (insecurePatterns.some(pattern => apiKey.toLowerCase().includes(pattern))) {
      throw new APIError(
        'Insecure API key detected. Please set a real API key in environment variables.',
        'INSECURE_API_KEY'
      );
    }

    // Entropy-based validation (real API keys have high entropy)
    const uniqueChars = new Set(apiKey).size;
    const entropy = uniqueChars / apiKey.length;
    if (entropy < 0.5 && apiKey.length < 20) {
      throw new APIError(
        'API key has insufficient entropy. Please use a valid Alpha Vantage API key.',
        'LOW_ENTROPY_API_KEY'
      );
    }

    apiClient = new APIClient({ apiKey });
  }

  return apiClient;
}
