import { OHLCV } from '../types';

/**
 * Service for calculating technical indicators.
 * Centralizes logic previously scattered in utils.ts and analysis.ts.
 */
class TechnicalIndicatorService {
    /**
     * Simple Moving Average (SMA)
     */
    calculateSMA(prices: number[], period: number): number[] {
        const sma: number[] = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sma.push(NaN);
            } else {
                const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                sma.push(sum / period);
            }
        }
        return sma;
    }

    /**
     * Exponential Moving Average (EMA)
     */
    calculateEMA(prices: number[], period: number): number[] {
        const ema: number[] = [];
        const multiplier = 2 / (period + 1);

        let sum = 0;
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sum += prices[i];
                ema.push(NaN);
            } else if (i === period - 1) {
                sum += prices[i];
                ema.push(sum / period);
            } else {
                const prevEMA = ema[i - 1];
                const emaValue = (prices[i] - prevEMA) * multiplier + prevEMA;
                ema.push(emaValue);
            }
        }
        return ema;
    }

    /**
     * Relative Strength Index (RSI)
     */
    calculateRSI(prices: number[], period: number = 14): number[] {
        const rsi: number[] = [];
        const gains: number[] = [];
        const losses: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }

        // First RSI
        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                rsi.push(NaN);
            } else if (i === period) {
                const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
                const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
                const rs = avgGain / (avgLoss || 0.0001);
                rsi.push(100 - 100 / (1 + rs));
            } else {
                // Simple SMA version
                const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
                const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
                const rs = avgGain / (avgLoss || 0.0001);
                rsi.push(100 - 100 / (1 + rs));
            }
        }

        return rsi;
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
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);

        const macdLine = prices.map((_, i) => fastEMA[i] - slowEMA[i]);
        const validMacd = macdLine.filter(v => !isNaN(v));
        const signalEMA = this.calculateEMA(validMacd, signalPeriod);

        const signal: number[] = [];
        const histogram: number[] = [];
        let signalIndex = 0;

        for (let i = 0; i < prices.length; i++) {
            if (i < slowPeriod - 1) {
                signal.push(NaN);
                histogram.push(NaN);
            } else {
                const sigValue = signalEMA[signalIndex] || NaN;
                signal.push(sigValue);
                histogram.push(macdLine[i] - sigValue);
                signalIndex++;
            }
        }

        return { macd: macdLine, signal, histogram };
    }

    /**
     * Bollinger Bands
     */
    calculateBollingerBands(
        prices: number[],
        period: number = 20,
        stdDev: number = 2
    ): { upper: number[]; middle: number[]; lower: number[] } {
        const middle = this.calculateSMA(prices, period);
        const upper: number[] = [];
        const lower: number[] = [];

        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                upper.push(NaN);
                lower.push(NaN);
            } else {
                const slice = prices.slice(i - period + 1, i + 1);
                const mean = middle[i];
                const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
                const std = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
                upper.push(mean + stdDev * std);
                lower.push(mean - stdDev * std);
            }
        }

        return { upper, middle, lower };
    }

    /**
     * Average True Range (ATR)
     */
    calculateATR(ohlcv: OHLCV[], period: number = 14): number[] {
        if (ohlcv.length === 0) return [];
        const tr: number[] = [ohlcv[0].high - ohlcv[0].low];

        for (let i = 1; i < ohlcv.length; i++) {
            const hl = ohlcv[i].high - ohlcv[i].low;
            const hpc = Math.abs(ohlcv[i].high - ohlcv[i - 1].close);
            const lpc = Math.abs(ohlcv[i].low - ohlcv[i - 1].close);
            tr.push(Math.max(hl, hpc, lpc));
        }

        const atr: number[] = [];
        for (let i = 0; i < ohlcv.length; i++) {
            if (i < period - 1) {
                atr.push(NaN);
            } else if (i === period - 1) {
                const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
                atr.push(sum / period);
            } else {
                const prevATR = atr[i - 1];
                atr.push((prevATR * (period - 1) + tr[i]) / period);
            }
        }

        return atr;
    }
}

export const technicalIndicatorService = new TechnicalIndicatorService();
