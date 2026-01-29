
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { OHLCV } from '../../types';

describe('TechnicalIndicatorService', () => {
    describe('calculateSMA', () => {
        it('calculates SMA correctly', () => {
            const prices = [10, 20, 30, 40, 50];
            const sma = technicalIndicatorService.calculateSMA(prices, 3);
            expect(sma.length).toBe(5);
            expect(sma[0]).toBeNaN();
            expect(sma[1]).toBeNaN();
            expect(sma[2]).toBe(20); // (10+20+30)/3
            expect(sma[3]).toBe(30); // (20+30+40)/3
            expect(sma[4]).toBe(40); // (30+40+50)/3
        });

        it('handles insufficient data', () => {
            const prices = [10, 20];
            const sma = technicalIndicatorService.calculateSMA(prices, 3);
            expect(sma).toEqual([NaN, NaN]);
        });
    });

    describe('calculateEMA', () => {
        it('calculates EMA correctly', () => {
            const prices = [10, 10, 10, 10, 10];
            const ema = technicalIndicatorService.calculateEMA(prices, 3);
            // EMA of constant series should be constant after initialization
            expect(ema[4]).toBeCloseTo(10);
        });

        it('reacts to price changes', () => {
            const prices = [10, 10, 10, 20, 20];
            const ema = technicalIndicatorService.calculateEMA(prices, 3);
            // Initial SMA (first 3) is 10.
            // Next price 20. Multiplier 2/(3+1) = 0.5.
            // EMA = (20 - 10)*0.5 + 10 = 15.
            expect(ema[3]).toBeCloseTo(15);
        });

        it('handles empty array', () => {
            expect(technicalIndicatorService.calculateEMA([], 3)).toEqual([]);
        });
    });

    describe('calculateRSI', () => {
        it('calculates RSI correctly', () => {
            // Create a sequence of gains
            const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
            // 14 periods of gain. AvgGain = 1, AvgLoss = 0. RS = Infinity. RSI = 100.
            const rsi = technicalIndicatorService.calculateRSI(prices, 14);
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
             const rsi = technicalIndicatorService.calculateRSI(prices, 14);
             expect(rsi[14]).toBeGreaterThan(0);
             expect(rsi[14]).toBeLessThan(100);
        });

        it('handles insufficient data', () => {
            const prices = [100, 101];
            const rsi = technicalIndicatorService.calculateRSI(prices, 14);
            expect(rsi[0]).toBeNaN();
        });
    });

    describe('calculateBollingerBands', () => {
        it('calculates bands correctly', () => {
            const prices = [10, 10, 10, 10, 10];
            const bb = technicalIndicatorService.calculateBollingerBands(prices, 5, 2);
            expect(bb.middle[4]).toBe(10);
            expect(bb.upper[4]).toBe(10); // StdDev is 0
            expect(bb.lower[4]).toBe(10);
        });

        it('expands with volatility', () => {
            const prices = [10, 20, 10, 20, 10]; // Mean 14.
            const bb = technicalIndicatorService.calculateBollingerBands(prices, 5, 2);
            expect(bb.upper[4]).toBeGreaterThan(bb.middle[4]);
            expect(bb.lower[4]).toBeLessThan(bb.middle[4]);
        });

        it('handles insufficient data', () => {
             const prices = [10, 20];
             const bb = technicalIndicatorService.calculateBollingerBands(prices, 5, 2);
             expect(bb.upper[0]).toBeNaN();
             expect(bb.lower[1]).toBeNaN();
        });
    });
});
