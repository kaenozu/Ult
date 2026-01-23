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
  data: any[];
  meta: {
    symbol: string;
    indicator: string;
    interval: string;
    timePeriod?: number | string;
    [key: string]: any;
  };
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
        throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      if (data['Note']) {
        // API limit reached message from API
        throw new Error(data['Note']);
      }

      if (!data['Time Series (Daily)']) {
        throw new Error('No time series data returned');
      }

      const timeSeries = data['Time Series (Daily)'];
      const parsed: OHLCV[] = Object.entries(timeSeries)
        .map(([timestamp, values]: [string, any]) => ({
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
   * @param symbol Stock symbol
   * @param interval Time interval between two consecutive data points (1min, 5min, 15min, 30min, 60min)
   * @param outputsize Compact or full output
   * @param month Month in YYYY-MM format (required for full output)
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
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Time Series (' + interval + ')']) {
      throw new Error('No time series data returned');
    }

    const timeSeries = data['Time Series (' + interval + ')'];
    const parsed: OHLCV[] = Object.entries(timeSeries)
      .map(([timestamp, values]: [string, any]) => ({
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
   * Get RSI (Relative Strength Index) indicator
   * @param symbol Stock symbol
   * @param timePeriod Time period for RSI calculation (default: 14)
   * @param series Type of price data (open, high, low, close)
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
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Technical Analysis: RSI']) {
      throw new Error('No RSI data returned');
    }

    const rsiData = data['Technical Analysis: RSI'];
    const parsed: any[] = Object.entries(rsiData)
      .map(([timestamp, values]: [string, any]) => ({
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
   * Get SMA (Simple Moving Average) indicator
   * @param symbol Stock symbol
   * @param timePeriod Time period for SMA calculation
   * @param series Type of price data
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
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Technical Analysis: SMA']) {
      throw new Error('No SMA data returned');
    }

    const smaData = data['Technical Analysis: SMA'];
    const parsed: any[] = Object.entries(smaData)
      .map(([timestamp, values]: [string, any]) => ({
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
   * Get EMA (Exponential Moving Average) indicator
   * @param symbol Stock symbol
   * @param timePeriod Time period for EMA calculation
   * @param series Type of price data
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
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Technical Analysis: EMA']) {
      throw new Error('No EMA data returned');
    }

    const emaData = data['Technical Analysis: EMA'];
    const parsed: any[] = Object.entries(emaData)
      .map(([timestamp, values]: [string, any]) => ({
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
   * Get MACD (Moving Average Convergence Divergence) indicator
   * @param symbol Stock symbol
   * @param fastperiod Fast MA period (default: 12)
   * @param slowperiod Slow MA period (default: 26)
   * @param signalperiod Signal line MA period (default: 9)
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
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Technical Analysis: MACD']) {
      throw new Error('No MACD data returned');
    }

    const macdData = data['Technical Analysis: MACD'];
    const parsed: any[] = Object.entries(macdData)
      .map(([timestamp, values]: [string, any]) => ({
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
   * @param symbol Stock symbol
   * @param timePeriod Time period for MA calculation (default: 20)
   * @param series Type of price data
   * @param nbdevup Standard deviation multiplier for upper band (default: 2)
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
      throw new Error(`Alpha Vantage API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Technical Analysis: BBANDS']) {
      throw new Error('No Bollinger Bands data returned');
    }

    const bbData = data['Technical Analysis: BBANDS'];
    const parsed: any[] = Object.entries(bbData)
      .map(([timestamp, values]: [string, any]) => ({
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
   * @param keywords Search keywords
   * @param datatype Data type to return (default: "equity")
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

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['bestMatches']) {
      return [];
    }

    return data['bestMatches'].map((match: any) => ({
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
   * @param symbol Stock symbol or comma-separated symbols
   */
  async getGlobalQuote(symbol: string): Promise<any> {
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

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Global Quote']) {
      throw new Error('No quote data returned');
    }

    return data['Global Quote'];
  }
}

// Singleton instance
let clientInstance: AlphaVantageClient | null = null;

export function getAlphaVantageClient(): AlphaVantageClient {
  // SECURITY: Ensure this is only run on the server to protect API keys
  if (typeof window !== 'undefined') {
    throw new Error('AlphaVantageClient must be used on server side only');
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not defined in environment variables');
  }

  if (!clientInstance) {
    clientInstance = new AlphaVantageClient({ apiKey });
  }

  return clientInstance;
}
