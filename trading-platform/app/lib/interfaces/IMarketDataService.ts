import { OHLCV } from '../../types';
import { MarketDataResult, MarketData, MarketIndex } from '../MarketDataService';

/**
 * IMarketDataService インターフェース
 */
export interface IMarketDataService {
  fetchMarketData(symbol: string): Promise<MarketDataResult>;
  getMarketData(symbol: string): Promise<MarketData>;
  getCachedData(symbol: string): MarketData | undefined;
  getJapanMarketIndices(): MarketIndex[];
  getUSAMarketIndices(): MarketIndex[];
  calculateTrend(data: OHLCV[]): 'UP' | 'DOWN' | 'NEUTRAL';
  calculateCorrelation(stockData: OHLCV[], indexData: OHLCV[]): number;
  calculateBeta(stockData: OHLCV[], indexData: OHLCV[]): number;
}
