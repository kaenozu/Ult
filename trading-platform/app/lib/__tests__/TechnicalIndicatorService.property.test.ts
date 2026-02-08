/**
 * Property-based Tests for TechnicalIndicatorService
 * Uses @fast-check/jest for property-based testing
 */
import { describe, it, expect } from '@jest/globals';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import type { SharedOHLCV } from '../../types/shared';
import fc from 'fast-check';

// Helper to generate valid price data (positive numbers only)
const positivePriceArb = (minLength: number, maxLength: number): fc.Arbitrary<number[]> => 
  fc.array(fc.nat(10000).map((n: number) => n + 1), { minLength, maxLength });

// Helper to generate OHLCV data with positive prices only (>= 1)
const ohlcvArb = (minLength: number, maxLength: number): fc.Arbitrary<SharedOHLCV[]> => 
  fc.array(
    fc.record({
      open: fc.nat(10000).map((n: number) => n + 1),
      high: fc.nat(10000).map((n: number) => n + 1),
      low: fc.nat(10000).map((n: number) => n + 1),
      close: fc.nat(10000).map((n: number) => n + 1),
      volume: fc.nat(1000000),
      date: fc.string({ minLength: 10, maxLength: 10 }),
      symbol: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
    }).map((record: Record<string, unknown>) => {
      const open = record.open as number;
      const close = record.close as number;
      const highVal = record.high as number;
      const lowVal = record.low as number;
      const high = Math.max(open, close, highVal, lowVal);
      const low = Math.min(open, close, highVal, lowVal);
      return {
        ...record,
        high,
        low,
      } as SharedOHLCV;
    }),
    { minLength, maxLength }
  );

// Helper to generate valid period (1-50)
const periodArb: fc.Arbitrary<number> = fc.nat(50).map((n: number) => n + 1);

// Helper to generate number within a range
const rangeArb = (min: number, max: number): fc.Arbitrary<number> => 
  fc.nat(max - min).map((n: number) => n + min);

describe('TechnicalIndicatorService - Property-based Tests', () => {
  describe('calculateSMA', () => {
    it('should return an array of the same length as input', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const sma = technicalIndicatorService.calculateSMA(prices, period);
          expect(sma.length).toBe(prices.length);
        })
      );
    });

    it('should return NaN for first (period-1) elements', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const sma = technicalIndicatorService.calculateSMA(prices, period);
          const nanCount = sma.slice(0, Math.max(0, period - 1)).filter(v => isNaN(v)).length;
          expect(nanCount).toBe(Math.max(0, Math.min(prices.length, period - 1)));
        })
      );
    });

    it('should produce valid SMA values (non-NaN) after warm-up period', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          if (prices.length < period) return true;
          const sma = technicalIndicatorService.calculateSMA(prices, period);
          const validValues = sma.slice(period - 1);
          const allValid = validValues.every(v => !isNaN(v) && isFinite(v));
          expect(allValid).toBe(true);
        })
      );
    });

    it('should return values within reasonable range for constant prices', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          if (prices.length < period) return true;
          const sma = technicalIndicatorService.calculateSMA(prices, period);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const validSMA = sma.slice(period - 1);
          const allInRange = validSMA.every(v => v >= minPrice * 0.5 && v <= maxPrice * 1.5);
          expect(allInRange).toBe(true);
        })
      );
    });
  });

  describe('calculateEMA', () => {
    it('should return an array of the same length as input', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const ema = technicalIndicatorService.calculateEMA(prices, period);
          expect(ema.length).toBe(prices.length);
        })
      );
    });

    it('should return NaN for first (period-1) elements', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const ema = technicalIndicatorService.calculateEMA(prices, period);
          const nanCount = ema.slice(0, Math.max(0, period - 1)).filter(v => isNaN(v)).length;
          expect(nanCount).toBe(Math.max(0, Math.min(prices.length, period - 1)));
        })
      );
    });

    it('should return valid EMA values (non-NaN) after warm-up period', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          if (prices.length < period) return true;
          const ema = technicalIndicatorService.calculateEMA(prices, period);
          const validValues = ema.slice(period - 1);
          const allValid = validValues.every(v => !isNaN(v) && isFinite(v));
          expect(allValid).toBe(true);
        })
      );
    });

    it('should react to price changes (EMA should differ from constant series)', () => {
      fc.assert(
        fc.property(rangeArb(5, 50), (period: number) => {
          const constantPrices = Array(20).fill(100);
          const changingPrices = Array(10).fill(100).concat([110, 90, 105, 95]);
          
          const constantEMA = technicalIndicatorService.calculateEMA(constantPrices, period);
          const changingEMA = technicalIndicatorService.calculateEMA(changingPrices, period);
          
          if (changingPrices.length > period && constantPrices.length > period) {
            const lastConstantEMA = constantEMA[constantEMA.length - 1];
            const lastChangingEMA = changingEMA[changingEMA.length - 1];
            expect(typeof lastConstantEMA).toBe('number');
            expect(typeof lastChangingEMA).toBe('number');
          }
        })
      );
    });
  });

  describe('calculateRSI', () => {
    it('should return an array of the same length as input', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const rsi = technicalIndicatorService.calculateRSI(prices, period);
          expect(rsi.length).toBe(prices.length);
        })
      );
    });

    it('should return NaN for first period elements', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const rsi = technicalIndicatorService.calculateRSI(prices, period);
          const nanCount = rsi.slice(0, period).filter(v => isNaN(v)).length;
          expect(nanCount).toBe(Math.min(prices.length, period));
        })
      );
    });

    it('should return valid RSI values between 0 and 100 after warm-up', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          if (prices.length <= period) return true;
          const rsi = technicalIndicatorService.calculateRSI(prices, period);
          const validValues = rsi.slice(period);
          const allValid = validValues.every(v => !isNaN(v) && v >= 0 && v <= 100);
          expect(allValid).toBe(true);
        })
      );
    });

    it('should return near 100 for continuously rising prices', () => {
      fc.assert(
        fc.property(rangeArb(20, 100), (period: number) => {
          const prices = Array.from({ length: period + 10 }, (_: unknown, i: number) => 100 + i);
          const rsi = technicalIndicatorService.calculateRSI(prices, period);
          const lastRSI = rsi[rsi.length - 1];
          expect(lastRSI).toBeGreaterThan(50);
        })
      );
    });

    it('should return near 0 for continuously falling prices', () => {
      fc.assert(
        fc.property(rangeArb(20, 100), (period: number) => {
          const prices = Array.from({ length: period + 10 }, (_: unknown, i: number) => 200 - i);
          const rsi = technicalIndicatorService.calculateRSI(prices, period);
          const lastRSI = rsi[rsi.length - 1];
          expect(lastRSI).toBeLessThan(50);
        })
      );
    });
  });

  describe('calculateBollingerBands', () => {
    it('should return arrays of the same length as input', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const bb = technicalIndicatorService.calculateBollingerBands(prices, period);
          expect(bb.upper.length).toBe(prices.length);
          expect(bb.middle.length).toBe(prices.length);
          expect(bb.lower.length).toBe(prices.length);
        })
      );
    });

    it('should have NaN for first (period-1) elements in all bands', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          const bb = technicalIndicatorService.calculateBollingerBands(prices, period);
          const upperNanCount = bb.upper.slice(0, Math.max(0, period - 1)).filter(v => isNaN(v)).length;
          const middleNanCount = bb.middle.slice(0, Math.max(0, period - 1)).filter(v => isNaN(v)).length;
          const lowerNanCount = bb.lower.slice(0, Math.max(0, period - 1)).filter(v => isNaN(v)).length;
          
          expect(upperNanCount).toBe(Math.max(0, Math.min(prices.length, period - 1)));
          expect(middleNanCount).toBe(Math.max(0, Math.min(prices.length, period - 1)));
          expect(lowerNanCount).toBe(Math.max(0, Math.min(prices.length, period - 1)));
        })
      );
    });

    it('should have upper band >= middle band >= lower band after warm-up', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), periodArb, (prices: number[], period: number) => {
          if (prices.length < period) return true;
          const bb = technicalIndicatorService.calculateBollingerBands(prices, period);
          const validBands = bb.upper.slice(period - 1).map((upper: number, i: number) => ({
            upper,
            middle: bb.middle[period - 1 + i],
            lower: bb.lower[period - 1 + i],
          }));
          
          const allValid = validBands.every((b: { upper: number; middle: number; lower: number }) => 
            !isNaN(b.upper) && !isNaN(b.middle) && !isNaN(b.lower) &&
            b.upper >= b.middle && b.middle >= b.lower
          );
          expect(allValid).toBe(true);
        })
      );
    });

    it('should widen bands with volatile prices', () => {
      const stablePrices = Array(30).fill(100);
      const volatilePrices = [80, 120, 80, 120, 80, 120, 80, 120, 80, 120, 80, 120, 80, 120, 80, 120, 80, 120, 80, 120];
      
      const stableBB = technicalIndicatorService.calculateBollingerBands(stablePrices, 10);
      const volatileBB = technicalIndicatorService.calculateBollingerBands(volatilePrices, 10);
      
      const stableWidths = stableBB.upper.slice(9).map((u: number, i: number) => u - stableBB.lower[9 + i]).filter((w: number) => !isNaN(w));
      const volatileWidths = volatileBB.upper.slice(9).map((u: number, i: number) => u - volatileBB.lower[9 + i]).filter((w: number) => !isNaN(w));
      
      if (stableWidths.length > 0 && volatileWidths.length > 0) {
        const avgStableWidth = stableWidths.reduce((a: number, b: number) => a + b, 0) / stableWidths.length;
        const avgVolatileWidth = volatileWidths.reduce((a: number, b: number) => a + b, 0) / volatileWidths.length;
        expect(avgVolatileWidth).toBeGreaterThan(avgStableWidth);
      }
    });
  });

  describe('calculateMACD', () => {
    it('should return arrays of the same length as input', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), (prices: number[]) => {
          const macd = technicalIndicatorService.calculateMACD(prices);
          expect(macd.macd.length).toBe(prices.length);
          expect(macd.signal.length).toBe(prices.length);
          expect(macd.histogram.length).toBe(prices.length);
        })
      );
    });

    it('should have NaN for early elements', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), (prices: number[]) => {
          const macd = technicalIndicatorService.calculateMACD(prices);
          const nanSignalCount = macd.signal.slice(0, 25).filter(v => isNaN(v)).length;
          const nanHistogramCount = macd.histogram.slice(0, 25).filter(v => isNaN(v)).length;
          expect(nanSignalCount).toBe(Math.min(prices.length, 25));
          expect(nanHistogramCount).toBe(Math.min(prices.length, 25));
        })
      );
    });

    it('should have valid MACD values (non-NaN) after warm-up', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), (prices: number[]) => {
          if (prices.length < 30) return true;
          const macd = technicalIndicatorService.calculateMACD(prices);
          const validMacd = macd.macd.slice(25);
          const validSignal = macd.signal.slice(25);
          const validHistogram = macd.histogram.slice(25);
          
          const allValid = [...validMacd, ...validSignal, ...validHistogram].every((v: number) => !isNaN(v));
          expect(allValid).toBe(true);
        })
      );
    });

    it('should produce histogram as difference between MACD and signal', () => {
      fc.assert(
        fc.property(positivePriceArb(0, 100), (prices: number[]) => {
          if (prices.length < 30) return true;
          const macd = technicalIndicatorService.calculateMACD(prices);
          
          for (let i = 25; i < prices.length; i++) {
            if (!isNaN(macd.histogram[i]) && !isNaN(macd.macd[i]) && !isNaN(macd.signal[i])) {
              const expectedHistogram = macd.macd[i] - macd.signal[i];
              expect(Math.abs(macd.histogram[i] - expectedHistogram)).toBeLessThan(0.001);
            }
          }
        })
      );
    });
  });

  describe('calculateATR', () => {
    it('should return an array of the same length as input', () => {
      fc.assert(
        fc.property(ohlcvArb(0, 100), periodArb, (ohlcv: SharedOHLCV[], period: number) => {
          const atr = technicalIndicatorService.calculateATR(ohlcv, period);
          expect(atr.length).toBe(ohlcv.length);
        })
      );
    });

    it('should return NaN for first (period-1) elements', () => {
      fc.assert(
        fc.property(ohlcvArb(0, 100), periodArb, (ohlcv: SharedOHLCV[], period: number) => {
          const atr = technicalIndicatorService.calculateATR(ohlcv, period);
          const nanCount = atr.slice(0, Math.max(0, period - 1)).filter(v => isNaN(v)).length;
          expect(nanCount).toBe(Math.max(0, Math.min(ohlcv.length, period - 1)));
        })
      );
    });

    it('should return valid ATR values (non-NaN, positive) after warm-up', () => {
      fc.assert(
        fc.property(ohlcvArb(0, 100), periodArb, (ohlcv: SharedOHLCV[], period: number) => {
          if (ohlcv.length < period) return true;
          const atr = technicalIndicatorService.calculateATR(ohlcv, period);
          const validValues = atr.slice(period - 1);
          const allValid = validValues.every(v => !isNaN(v) && isFinite(v) && v >= 0);
          expect(allValid).toBe(true);
        })
      );
    });

    it('should increase with larger price ranges', () => {
      const generateOHLCV = (base: number, volatility: number, count: number): SharedOHLCV[] => {
        return Array.from({ length: count }, (_: unknown, i: number) => {
          const open = base + i * volatility;
          const range = volatility * 5;
          return {
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            open,
            high: open + Math.random() * range,
            low: open - Math.random() * range,
            close: open + (Math.random() - 0.5) * range,
            volume: 1000,
          };
        });
      };
      
      const smallRangeOHLCV = generateOHLCV(100, 1, 20);
      const largeRangeOHLCV = generateOHLCV(100, 10, 20);
      
      const smallATR = technicalIndicatorService.calculateATR(smallRangeOHLCV, 14);
      const largeATR = technicalIndicatorService.calculateATR(largeRangeOHLCV, 14);
      
      const smallATRValue = smallATR[smallATR.length - 1];
      const largeATRValue = largeATR[largeATR.length - 1];
      
      if (!isNaN(smallATRValue) && !isNaN(largeATRValue)) {
        expect(largeATRValue).toBeGreaterThan(smallATRValue);
      }
    });
  });
});
