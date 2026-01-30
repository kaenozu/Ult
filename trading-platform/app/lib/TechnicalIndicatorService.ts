import { OHLCV } from '../types/shared';
import {
    calculateSMA,
    calculateEMA,
    calculateRSI,
    calculateBollingerBands,
    calculateMACD,
    calculateATR as utilsCalculateATR
} from './utils';

/**
 * Service for calculating technical indicators.
 * Centralizes logic previously scattered in utils.ts and analysis.ts.
 * Refactored to delegate calculations to utils.ts to eliminate code duplication.
 */
class TechnicalIndicatorService {
    /**
     * Simple Moving Average (SMA)
     */
    calculateSMA(prices: number[], period: number): number[] {
        return calculateSMA(prices, period);
    }

    /**
     * Exponential Moving Average (EMA)
     */
    calculateEMA(prices: number[], period: number): number[] {
        return calculateEMA(prices, period);
    }

    /**
     * Relative Strength Index (RSI)
     */
    calculateRSI(prices: number[], period: number = 14): number[] {
        return calculateRSI(prices, period);
    }

    /**
     * Moving Average Convergence Divergence (MACD)
     */
    calculateMACD(
        prices: number[],
        fastPeriod: number = 12,
        slowPeriod: number = 26,
        signalPeriod: number = 9
    ): { macd: number[]; signal: number[]; histogram: number[] } {
        return calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
    }

    /**
     * Bollinger Bands
     */
    calculateBollingerBands(
        prices: number[],
        period: number = 20,
        stdDev: number = 2
    ): { upper: number[]; middle: number[]; lower: number[] } {
        return calculateBollingerBands(prices, period, stdDev);
    }

    /**
     * Average True Range (ATR)
     */
    calculateATR(ohlcv: OHLCV[], period: number = 14): number[] {
        const highs = ohlcv.map(d => d.high);
        const lows = ohlcv.map(d => d.low);
        const closes = ohlcv.map(d => d.close);
        return utilsCalculateATR(highs, lows, closes, period);
    }
}

export const technicalIndicatorService = new TechnicalIndicatorService();
