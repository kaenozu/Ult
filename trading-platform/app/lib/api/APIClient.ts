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
  private config: APIConfig;

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
  ): Record<string, { timestamp: string; values: Record<string, string> }> | undefined {
    const timeSeries = data[keyName];
    if (!timeSeries) {
      return undefined;
    }

    const entries: [string, Record<string, string>][] = Object.entries(timeSeries)
      .filter(([timestamp, values]) => {
        if (!values || typeof values !== 'object') return false;
        return '1. open' in values && '2. high' in values && '3. low' in values && '4. close' in values && '5. volume' in values;
      })
      .map(([timestamp, values]) => [timestamp, values as Record<string, string>]);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries) as Record<string, { timestamp: string; values: Record<string, string> }>;
  }

  /**
   * Extract technical indicator data with type safety
   */
  private extractIndicatorData(
    data: Record<string, unknown>,
    keyName: string
  ): Record<string, { timestamp: string; value: number }> | undefined {
    const indicatorData = data[keyName];
    if (!indicatorData || typeof indicatorData !== 'object') {
      return undefined;
    }

    const entries: [string, Record<string, string>][] = Object.entries(indicatorData)
      .filter(([timestamp, values]) => {
        if (!values || typeof values !== 'object') return false;
        return !isNaN(parseFloat(values));
      })
      .map(([timestamp, values]) => [timestamp, values as Record<string, string>]);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries) as Record<string, { timestamp: string; value: number }>;
  }

  /**
   * Generic fetch method for Alpha Vantage
   */
  async fetch<T>(
    functionName: string,
    endpoint: string,
    params: Record<string, string | number>
  ): Promise<T> {
    const url = new URLSearchParams(params).toString();
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
   */
  async getDailyBars(symbol: string, outputsize: 'compact' | 'full' = 'compact') {
    return this.fetch<AlphaVantageTimeSeriesDaily>(
      'getDailyBars',
      endpoint,
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
   */
  async getIntraday(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min',
    month?: string
  ) {
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
      endpoint,
      params
    );
  }

  /**
   * Get RSI indicator
   */
  async getRSI(
    symbol: string,
    timePeriod: number = 14,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ) {
    return this.fetch<AlphaVantageRSI>(
      'getRSI',
      endpoint,
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
   */
  async getSMA(
    symbol: string,
    timePeriod: number = 20,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ) {
    return this.fetch<AlphaVantageSMA>(
      'getSMA',
      endpoint,
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
   */
  async getEMA(
    symbol: string,
    timePeriod: number = 20,
    series: 'open' | 'high' | 'low' | 'close' = 'close'
  ) {
    return this.fetch<AlphaVantageEMA>(
      'getEMA',
      endpoint,
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
   */
  async getMACD(
    symbol: string,
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ) {
    return this.fetch<AlphaVantageMACD>(
      'getMACD',
      endpoint,
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
   */
  async getBollingerBands(
    symbol: string,
    timePeriod: number = 20,
    nbdevup: number = 2
  ) {
    return this.fetch<AlphaVantageBollingerBands>(
      'getBollingerBands',
      endpoint,
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
  parseOHLCVFromTimeSeries(timeSeries: Record<string, { timestamp: string; values: Record<string, string> }>): Array<{
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
    })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Parse indicator data to array of values
   */
  parseIndicatorFromData(indicatorData: Record<string, { timestamp: string; value: number }>): number[] {
    return Object.entries(indicatorData)
      .map(([timestamp, values]) => parseFloat(values.value))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
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
    const insecurePatterns = ['your_api_key_here', 'example', 'placeholder', 'xxx', 'test_key'];
    if (insecurePatterns.some(pattern => apiKey.toLowerCase().includes(pattern))) {
      throw new APIError(
        'Insecure API key detected. Please set a real API key in environment variables.',
        'INSECURE_API_KEY'
      );
    }

    apiClient = new APIClient({ apiKey });
  }

  return apiClient;
}
