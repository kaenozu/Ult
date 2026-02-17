import { Stock, OHLCV } from '@/app/types';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';
import { TECHNICAL_INDICATORS, DATA_REQUIREMENTS } from '@/app/constants';

export interface TechFilters {
  rsiMax?: string;
  rsiMin?: string;
  trend?: string; // 'uptrend' | 'downtrend' | 'all'
}

export function filterByTechnicals(stock: Stock, ohlcv: OHLCV[], filters: TechFilters): boolean {
  if (!ohlcv || ohlcv.length < DATA_REQUIREMENTS.MIN_DATA_PERIOD) return false;

  const prices = ohlcv.map(d => d.close);
  const currentPrice = prices[prices.length - 1];

  // 1. RSI Filter
  if (filters.rsiMax || filters.rsiMin) {
    const rsiArray = technicalIndicatorService.calculateRSI(prices, TECHNICAL_INDICATORS.RSI_PERIOD);
    const currentRSI = rsiArray[rsiArray.length - 1];

    if (filters.rsiMax && currentRSI > parseFloat(filters.rsiMax)) return false;
    if (filters.rsiMin && currentRSI < parseFloat(filters.rsiMin)) return false;
  }

  // 2. Trend Filter (SMA50)
  if (filters.trend && filters.trend !== 'all') {
    const sma50Array = technicalIndicatorService.calculateSMA(prices, TECHNICAL_INDICATORS.SMA_PERIOD_LONG);
    const currentSMA50 = sma50Array[sma50Array.length - 1];

    if (filters.trend === 'uptrend' && currentPrice <= currentSMA50) return false;
    if (filters.trend === 'downtrend' && currentPrice >= currentSMA50) return false;
  }

  return true;
}
