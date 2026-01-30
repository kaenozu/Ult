
import {
    calculateSMA,
    calculateEMA,
    calculateRSI,
    calculateBollingerBands,
    calculateMACD,
    calculateATR
} from '../utils';

describe('utils.ts Technical Indicators', () => {
    describe('calculateSMA', () => {
        it('calculates SMA correctly', () => {
            const prices = [10, 20, 30, 40, 50];
            const sma = calculateSMA(prices, 3);
            expect(sma.length).toBe(5);
            expect(sma[0]).toBeNaN();
            expect(sma[1]).toBeNaN();
            expect(sma[2]).toBe(20); // (10+20+30)/3
            expect(sma[3]).toBe(30); // (20+30+40)/3
            expect(sma[4]).toBe(40); // (30+40+50)/3
        });

        it('handles insufficient data', () => {
            const prices = [10, 20];
            const sma = calculateSMA(prices, 3);
            expect(sma).toEqual([NaN, NaN]);
        });

        it('handles NaNs in data robustly (recovering from poisoned window)', () => {
             const prices = [10, NaN, 20, 30, 40];
             const sma = calculateSMA(prices, 2);
             expect(sma[2]).toBeNaN();
             expect(sma[3]).toBe(25); // (20+30)/2
             expect(sma[4]).toBe(35); // (30+40)/2
        });
    });

    describe('calculateEMA', () => {
        it('calculates EMA correctly', () => {
            const prices = [10, 10, 10, 10, 10];
            const ema = calculateEMA(prices, 3);
            // EMA of constant series should be constant after initialization
            expect(ema[4]).toBeCloseTo(10);
        });

        it('reacts to price changes', () => {
            const prices = [10, 10, 10, 20, 20];
            const ema = calculateEMA(prices, 3);
            // Initial SMA (first 3) is 10.
            // Next price 20. Multiplier 2/(3+1) = 0.5.
            // EMA = (20 - 10)*0.5 + 10 = 15.
            expect(ema[3]).toBeCloseTo(15);
        });

        it('handles empty array', () => {
            expect(calculateEMA([], 3)).toEqual([]);
        });
    });

    describe('calculateRSI', () => {
        it('calculates RSI correctly', () => {
            // Create a sequence of gains
            const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
            // 14 periods of gain. AvgGain = 1, AvgLoss = 0. RS = Infinity. RSI = 100.
            const rsi = calculateRSI(prices, 14);
            // Index 14 is the 15th element.
            // Due to division by zero protection (avgLoss || 0.0001), it might be 99.99 instead of 100
            expect(rsi[14]).toBeGreaterThan(99);
        });

        it('calculates RSI for mixed data', () => {
             const prices = [
                 100, 105, 100, 105, 100, 105, 100, 105, 100, 105,
                 100, 105, 100, 105, 100
             ];
             // Just ensure it returns valid numbers between 0 and 100
             const rsi = calculateRSI(prices, 14);
             expect(rsi[14]).toBeGreaterThan(0);
             expect(rsi[14]).toBeLessThan(100);
        });

        it('handles insufficient data', () => {
            const prices = [100, 101];
            const rsi = calculateRSI(prices, 14);
            expect(rsi[0]).toBeNaN();
        });
    });

    describe('calculateBollingerBands', () => {
        it('calculates bands correctly', () => {
            const prices = [10, 10, 10, 10, 10];
            const bb = calculateBollingerBands(prices, 5, 2);
            expect(bb.middle[4]).toBe(10);
            expect(bb.upper[4]).toBe(10); // StdDev is 0
            expect(bb.lower[4]).toBe(10);
        });

        it('expands with volatility', () => {
            const prices = [10, 20, 10, 20, 10]; // Mean 14.
            const bb = calculateBollingerBands(prices, 5, 2);
            expect(bb.upper[4]).toBeGreaterThan(bb.middle[4]);
            expect(bb.lower[4]).toBeLessThan(bb.middle[4]);
        });

        it('handles insufficient data', () => {
             const prices = [10, 20];
             const bb = calculateBollingerBands(prices, 5, 2);
             expect(bb.upper[0]).toBeNaN();
             expect(bb.lower[1]).toBeNaN();
        });
    });

    describe('calculateMACD', () => {
        it('calculates MACD correctly', () => {
             const prices = Array.from({ length: 30 }, (_, i) => 10 + i); // Linear trend
             const { macd, signal, histogram } = calculateMACD(prices);
             expect(macd.length).toBe(30);
             expect(signal.length).toBe(30);
             expect(histogram.length).toBe(30);
             // Ensure values are generated after initialization
             const lastIdx = 29;
             expect(macd[lastIdx]).not.toBeNaN();
        });
    });

    describe('calculateATR', () => {
        it('calculates ATR correctly', () => {
            const highs = [10, 11, 12, 13, 14, 15];
            const lows = [8, 9, 10, 11, 12, 13];
            const closes = [9, 10, 11, 12, 13, 14];
            // Period 3
            // i=0: TR = 10-8 = 2
            // i=1: TR = max(11-9, |11-9|, |9-9|) = 2
            // i=2: TR = 2
            // ATR[2] = avg(2,2,2) = 2
            const atr = calculateATR(highs, lows, closes, 3);
            expect(atr[2]).toBe(2);
        });

        it('handles insufficient data', () => {
             const highs = [10, 11];
             const lows = [9, 10];
             const closes = [9, 10];
             const atr = calculateATR(highs, lows, closes, 3);
             expect(atr[0]).toBeNaN();
             expect(atr[1]).toBeNaN();
        });
    });
});
