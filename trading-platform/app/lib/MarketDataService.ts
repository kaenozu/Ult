import { OHLCV } from '../types';
import { technicalIndicatorService } from './TechnicalIndicatorService';

export interface MarketIndex {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
}

export interface MarketData {
  symbol: string;
  data: OHLCV[];
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  changePercent: number;
}

export interface CorrelationData {
  symbol: string;
  correlation: number;
  beta: number;
  indexSymbol: string;
  indexTrend: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: 'low' | 'medium' | 'high';
}

export const MARKET_INDICES: MarketIndex[] = [
  { symbol: '^N225', name: '日経225', market: 'japan' },
  { symbol: '^GSPC', name: 'S&P 500', market: 'usa' },
];

export class MarketDataService {
  private marketDataCache = new Map<string, OHLCV[]>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async fetchMarketData(symbol: string): Promise<OHLCV[]> {
    const now = Date.now();
    const cached = this.marketDataCache.get(symbol);

    if (cached && cached.length > 0 && (now - new Date(cached[cached.length - 1].date).getTime()) < this.cacheTimeout) {
      return cached;
    }

    try {
      const response = await fetch(`/api/market?type=history&symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const ohlcv = result.data.map((item: any) => ({
          symbol,
          date: item.date,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume) || 0,
        }));

        this.marketDataCache.set(symbol, ohlcv);
        return ohlcv;
      }

      return [];
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return [];
    }
  }

  getCachedMarketData(symbol: string): OHLCV[] | undefined {
    return this.marketDataCache.get(symbol);
  }

  async getAllMarketData(): Promise<Map<string, OHLCV[]>> {
    const dataMap = new Map<string, OHLCV[]>();

    for (const index of MARKET_INDICES) {
      const data = await this.fetchMarketData(index.symbol);
      dataMap.set(index.symbol, data);
    }

    return dataMap;
  }

  calculateTrend(data: OHLCV[]): 'UP' | 'DOWN' | 'NEUTRAL' {
    if (data.length < 20) return 'NEUTRAL';

    const closes = data.map(d => d.close);
    const shortSMA = technicalIndicatorService.calculateSMA(closes, 10);
    const longSMA = technicalIndicatorService.calculateSMA(closes, 50);

    const latestShort = shortSMA[shortSMA.length - 1];
    const latestLong = longSMA[longSMA.length - 1];
    const latestPrice = closes[closes.length - 1];

    if (latestShort > latestLong && latestPrice > latestShort) {
      return 'UP';
    } else if (latestShort < latestLong && latestPrice < latestShort) {
      return 'DOWN';
    }
    return 'NEUTRAL';
  }


  calculateCorrelation(stockData: OHLCV[], indexData: OHLCV[]): number {
    if (stockData.length < 50 || indexData.length < 50) {
      return 0;
    }

    const minLen = Math.min(stockData.length, indexData.length);
    const stockReturns: number[] = [];
    const indexReturns: number[] = [];

    for (let i = 1; i < minLen; i++) {
      const stockRet = (stockData[i].close - stockData[i - 1].close) / stockData[i - 1].close;
      const indexRet = (indexData[i].close - indexData[i - 1].close) / indexData[i - 1].close;
      stockReturns.push(stockRet);
      indexReturns.push(indexRet);
    }

    const avgStockRet = stockReturns.reduce((a, b) => a + b, 0) / stockReturns.length;
    const avgIndexRet = indexReturns.reduce((a, b) => a + b, 0) / indexReturns.length;

    let covarianceSum = 0;
    for (let i = 0; i < stockReturns.length; i++) {
      covarianceSum += (stockReturns[i] - avgStockRet) * (indexReturns[i] - avgIndexRet);
    }

    const covariance = covarianceSum / stockReturns.length;

    const stockVariance = stockReturns.reduce((sum, ret) => {
      return sum + Math.pow(ret - avgStockRet, 2);
    }, 0) / stockReturns.length;

    const indexVariance = indexReturns.reduce((sum, ret) => {
      return sum + Math.pow(ret - avgIndexRet, 2);
    }, 0) / indexReturns.length;

    const stockStd = Math.sqrt(stockVariance);
    const indexStd = Math.sqrt(indexVariance);

    if (indexStd === 0 || stockStd === 0) return 0;
    return covariance / (stockStd * indexStd);
  }

  calculateBeta(stockData: OHLCV[], indexData: OHLCV[]): number {
    const correlation = this.calculateCorrelation(stockData, indexData);

    const stockStd = this.calculateStd(stockData.map(d => d.close));
    const indexStd = this.calculateStd(indexData.map(d => d.close));

    if (indexStd === 0) return 0;
    return correlation * (stockStd / indexStd);
  }

  calculateStd(data: number[]): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  getCorrelationConfidence(dataLength: number): 'low' | 'medium' | 'high' {
    if (dataLength >= 252) return 'high';    // 1 year of daily data
    if (dataLength >= 126) return 'medium'; // 6 months
    return 'low';                             // < 6 months
  }
}

export const marketDataService = new MarketDataService();