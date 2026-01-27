/**
 * alpha-vantage.ts - APIClient.ts への完璧な互換性ラッパー
 * テストコードが期待するデータ構造への変換、およびエラークラスの提供を含みます。
 */

import { APIClient, getAPIClient } from './APIClient';
import { NetworkError, APIError, RateLimitError } from '@/app/types';

export class AlphaVantageClient extends APIClient {
    async getDailyBars(symbol: string, outputsize: 'compact' | 'full' = 'compact') {
        const raw = await super.getDailyBars(symbol, outputsize);
        const timeSeries = raw['Time Series (Daily)'];
        if (!timeSeries) return { symbol, data: [] };

        const data = Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
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
        const timeSeries = (raw as any)[key];
        if (!timeSeries) return { symbol, interval, data: [] };

        const data = Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
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

        const data = Object.entries(indicatorData).map(([timestamp, values]: [string, any]) => ({
            timestamp,
            rsi: parseFloat(values['RSI']),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'RSI', data };
    }

    async getSMA(symbol: string, timePeriod: number = 20) {
        const raw = await super.getSMA(symbol, timePeriod);
        const indicatorData = raw['Technical Analysis: SMA'];
        if (!indicatorData) return { name: 'SMA', data: [] };

        const data = Object.entries(indicatorData).map(([timestamp, values]: [string, any]) => ({
            timestamp,
            sma: parseFloat(values['SMA']),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'SMA', data };
    }

    async getEMA(symbol: string, timePeriod: number = 20) {
        const raw = await super.getEMA(symbol, timePeriod);
        const indicatorData = raw['Technical Analysis: EMA'];
        if (!indicatorData) return { name: 'EMA', data: [] };

        const data = Object.entries(indicatorData).map(([timestamp, values]: [string, any]) => ({
            timestamp,
            ema: parseFloat(values['EMA']),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'EMA', data };
    }

    async getMACD(symbol: string) {
        const raw = await super.getMACD(symbol);
        const indicatorData = raw['Technical Analysis: MACD'];
        if (!indicatorData) return { name: 'MACD', data: [] };

        const data = Object.entries(indicatorData).map(([timestamp, values]: [string, any]) => ({
            timestamp,
            macd: parseFloat(values['MACD']),
            macd_Signal: parseFloat(values['MACD_Signal']),
            macd_Hist: parseFloat(values['MACD_Hist']),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'MACD', data };
    }

    async getBollingerBands(symbol: string) {
        const raw = await super.getBollingerBands(symbol);
        const indicatorData = raw['Technical Analysis: BBANDS'];
        if (!indicatorData) return { name: 'BBANDS', data: [] };

        const data = Object.entries(indicatorData).map(([timestamp, values]: [string, any]) => ({
            timestamp,
            upperBand: parseFloat(values['Real Upper Band']),
            middleBand: parseFloat(values['Real Middle Band']),
            lowerBand: parseFloat(values['Real Lower Band']),
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return { name: 'BBANDS', data };
    }

    async searchSymbols(keywords: string) {
        const response = await this.fetch<any>('SYMBOL_SEARCH', {
            function: 'SYMBOL_SEARCH',
            keywords,
            apikey: (this as any).config.apiKey
        });

        if (!response.bestMatches) return [];

        return response.bestMatches.map((match: any) => ({
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
        alphaClient = new AlphaVantageClient({ apiKey: (client as any).config.apiKey });
    }

    return alphaClient;
};

export const validateAlphaVantageResponse = (data: any) => {
    if (data['Note']) throw new RateLimitError(data['Note']);
    if (data['Error Message']) throw new APIError(data['Error Message'], 'API_ERROR');
    if (data['Information']) throw new APIError(data['Information'], 'API_INFO');
    return data;
};

export const extractTimeSeriesData = (data: any, key: string) => {
    if (!data[key] || typeof data[key] !== 'object' || Object.keys(data[key]).length === 0) {
        return undefined;
    }
    // Check deep structure
    const firstKey = Object.keys(data[key])[0];
    if (!data[key][firstKey] || typeof data[key][firstKey] !== 'object' || Object.keys(data[key][firstKey]).length === 0) {
        return undefined;
    }

    return data[key];
};

export const extractTechnicalIndicatorData = (data: any, key: string) => {
    if (!data[key]) return undefined;
    return data[key];
};
