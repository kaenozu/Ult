/**
 * alpha-vantage.ts - APIClient.ts への完璧な互換性ラッパー
 * テストコードが期待するデータ構造への変換、およびエラークラスの提供を含みます。
 */

import { APIClient, getAPIClient } from './APIClient';
import { NetworkError, APIError, RateLimitError } from '@/app/types';

// ============================================================================
// Type Definitions for Alpha Vantage API
// ============================================================================

/** Time series entry from Alpha Vantage API */
interface AlphaVantageTimeSeriesEntry {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

/** Technical indicator entry from Alpha Vantage API */
interface AlphaVantageIndicatorEntry {
  RSI?: string;
  SMA?: string;
  EMA?: string;
  MACD?: string;
  MACD_Signal?: string;
  MACD_Hist?: string;
  'Real Upper Band'?: string;
  'Real Middle Band'?: string;
  'Real Lower Band'?: string;
}

/** Symbol search match from Alpha Vantage API */
interface AlphaVantageSymbolMatch {
  '1. symbol': string;
  '2. name': string;
  '3. type': string;
  '4. region': string;
  '9. matchScore': string;
}

/** Generic Alpha Vantage API response */
interface AlphaVantageResponse {
  [key: string]: unknown;
  bestMatches?: AlphaVantageSymbolMatch[];
  Note?: string;
  'Error Message'?: string;
  Information?: string;
}

/** API Client configuration */
interface APIClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export class AlphaVantageClient extends APIClient {
    async getDailyBars(symbol: string, outputsize: 'compact' | 'full' = 'compact') {
        const raw = await super.getDailyBars(symbol, outputsize);
        const timeSeries = raw['Time Series (Daily)'];
        if (!timeSeries) return { symbol, data: [] };

        const data = Object.entries(timeSeries as Record<string, AlphaVantageTimeSeriesEntry>).map(([timestamp, values]) => ({
            timestamp,
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume']),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { symbol, data };
    }

    async getIntraday(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min') {
        const raw = await super.getIntraday(symbol, interval);
        const key = `Time Series (${interval})`;
        const timeSeries = (raw as Record<string, unknown>)[key];
        if (!timeSeries) return { symbol, interval, data: [] };

        const data = Object.entries(timeSeries as Record<string, AlphaVantageTimeSeriesEntry>).map(([timestamp, values]) => ({
            timestamp,
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume']),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { symbol, interval, data };
    }

    async getGlobalQuote(symbol: string) {
        const raw = await super.getGlobalQuote(symbol);
        if (!raw['Global Quote'] || !raw['Global Quote']['01. symbol']) {
            throw new Error('No quote data returned');
        }
        return raw['Global Quote'];
    }

    async getRSI(symbol: string, timePeriod: number = 14) {
        const raw = await super.getRSI(symbol, timePeriod);
        const indicatorData = raw['Technical Analysis: RSI'];
        if (!indicatorData) return { name: 'RSI', data: [] };

        const data = Object.entries(indicatorData as Record<string, AlphaVantageIndicatorEntry>).map(([timestamp, values]) => ({
            timestamp,
            rsi: parseFloat(values.RSI ?? '0'),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'RSI', data };
    }

    async getSMA(symbol: string, timePeriod: number = 20) {
        const raw = await super.getSMA(symbol, timePeriod);
        const indicatorData = raw['Technical Analysis: SMA'];
        if (!indicatorData) return { name: 'SMA', data: [] };

        const data = Object.entries(indicatorData as Record<string, AlphaVantageIndicatorEntry>).map(([timestamp, values]) => ({
            timestamp,
            sma: parseFloat(values.SMA ?? '0'),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'SMA', data };
    }

    async getEMA(symbol: string, timePeriod: number = 20) {
        const raw = await super.getEMA(symbol, timePeriod);
        const indicatorData = raw['Technical Analysis: EMA'];
        if (!indicatorData) return { name: 'EMA', data: [] };

        const data = Object.entries(indicatorData as Record<string, AlphaVantageIndicatorEntry>).map(([timestamp, values]) => ({
            timestamp,
            ema: parseFloat(values.EMA ?? '0'),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'EMA', data };
    }

    async getMACD(symbol: string) {
        const raw = await super.getMACD(symbol);
        const indicatorData = raw['Technical Analysis: MACD'];
        if (!indicatorData) return { name: 'MACD', data: [] };

        const data = Object.entries(indicatorData as Record<string, AlphaVantageIndicatorEntry>).map(([timestamp, values]) => ({
            timestamp,
            macd: parseFloat(values.MACD ?? '0'),
            macd_Signal: parseFloat(values.MACD_Signal ?? '0'),
            macd_Hist: parseFloat(values.MACD_Hist ?? '0'),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'MACD', data };
    }

    async getBollingerBands(symbol: string) {
        const raw = await super.getBollingerBands(symbol);
        const indicatorData = raw['Technical Analysis: BBANDS'];
        if (!indicatorData) return { name: 'BBANDS', data: [] };

        const data = Object.entries(indicatorData as Record<string, AlphaVantageIndicatorEntry>).map(([timestamp, values]) => ({
            timestamp,
            upperBand: parseFloat(values['Real Upper Band'] ?? '0'),
            middleBand: parseFloat(values['Real Middle Band'] ?? '0'),
            lowerBand: parseFloat(values['Real Lower Band'] ?? '0'),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'BBANDS', data };
    }

    async searchSymbols(keywords: string) {
        const response = await this.fetch<AlphaVantageResponse>('SYMBOL_SEARCH', {
            function: 'SYMBOL_SEARCH',
            keywords,
            apikey: (this as unknown as { config: APIClientConfig }).config.apiKey
        });

        if (!response.bestMatches) return [];

        return response.bestMatches.map((match) => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region'],
            matchScore: parseFloat(match['9. matchScore'])
        }));
    }
}

let alphaClient: AlphaVantageClient | null = null;

export const getAlphaVantageClient = () => {
    if (typeof window !== 'undefined') {
        throw new Error('AlphaVantageClient must be used on server side only');
    }

    if (!alphaClient) {
        const client = getAPIClient();
        alphaClient = new AlphaVantageClient({ apiKey: (client as unknown as { config: APIClientConfig }).config.apiKey });
    }

    return alphaClient;
};

export const validateAlphaVantageResponse = (data: AlphaVantageResponse): AlphaVantageResponse => {
    if (data.Note) throw new RateLimitError(data.Note);
    if (data['Error Message']) throw new APIError(data['Error Message'], 'API_ERROR');
    if (data.Information) throw new APIError(data.Information, 'API_INFO');
    return data;
};

export const extractTimeSeriesData = (data: AlphaVantageResponse, key: string): Record<string, AlphaVantageTimeSeriesEntry> | undefined => {
    const timeSeries = data[key];
    if (!timeSeries || typeof timeSeries !== 'object' || Object.keys(timeSeries).length === 0) {
        return undefined;
    }
    // Check deep structure
    const firstKey = Object.keys(timeSeries)[0];
    const firstEntry = (timeSeries as Record<string, unknown>)[firstKey];
    if (!firstEntry || typeof firstEntry !== 'object' || Object.keys(firstEntry).length === 0) {
        return undefined;
    }

    return timeSeries as Record<string, AlphaVantageTimeSeriesEntry>;
};

export const extractTechnicalIndicatorData = (data: AlphaVantageResponse, key: string): Record<string, AlphaVantageIndicatorEntry> | undefined => {
    const indicatorData = data[key];
    if (!indicatorData || typeof indicatorData !== 'object') return undefined;
    return indicatorData as Record<string, AlphaVantageIndicatorEntry>;
};
