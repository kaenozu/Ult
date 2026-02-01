
import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
} from '../utils';

describe('utils/technicalIndicators', () => {
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

    it('handles NaNs in data robustly', () => {
      const prices = [10, NaN, 20, 30, 40];
      const sma = calculateSMA(prices, 2);
      // Valid stream after filtering NaN: 10, 20, 30, 40
      // Original indices: 0(10), 1(NaN), 2(20), 3(30), 4(40)

      // utils.ts implementation creates a 'validPrices' array first?
      // Let's check utils.ts behavior.
      // If it filters NaNs first, then indices might shift or it maps back to original?
      // Reading utils.ts again: "result.push(NaN)" if i < period-1.
      // And "validPrices = prices.map(...)".
      // Then "slice = validPrices.slice(i-period+1, i+1)".
      // So it preserves indices but replaces invalid values with NaN.
      // Then "validValues = slice.filter(val => !isNaN(val))".
      // Then "if (validValues.length < period) result.push(NaN)".

      // So if period=2.
      // i=0: slice=[10]. valid=[10]. len=1 < 2 -> NaN.
      // i=1: slice=[10, NaN]. valid=[10]. len=1 < 2 -> NaN.
      // i=2: slice=[NaN, 20]. valid=[20]. len=1 < 2 -> NaN.
      // i=3: slice=[20, 30]. valid=[20,30]. len=2. avg=25.
      // i=4: slice=[30, 40]. valid=[30,40]. len=2. avg=35.

      expect(sma[2]).toBeNaN();
      expect(sma[3]).toBe(25);
      expect(sma[4]).toBe(35);
    });
  });

  describe('calculateRSI', () => {
    it('calculates RSI correctly', () => {
      // 14 periods of gain
      const prices = Array.from({ length: 15 }, (_, i) => 100 + i);
      const rsi = calculateRSI(prices, 14);
      // Last element should be 100
      expect(rsi[14]).toBeCloseTo(100);
    });

    it('handles flat prices', () => {
        const prices = Array.from({ length: 20 }, () => 100);
        const rsi = calculateRSI(prices, 14);
        // If avgLoss is 0 and avgGain is 0, RSI defaults to 50 (Neutral)
        expect(rsi[14]).toBe(50);
        expect(rsi[19]).toBe(50);
    });
  });

  describe('calculateMACD', () => {
    it('calculates MACD structure correctly', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i); // Trending up
      const { macd, signal, histogram } = calculateMACD(prices, 12, 26, 9);
      expect(macd.length).toBe(50);
      expect(signal.length).toBe(50);
      expect(histogram.length).toBe(50);

      // After initialization (26 + 9 = 35ish), should have values
      expect(isNaN(macd[49])).toBe(false);
      expect(isNaN(signal[49])).toBe(false);
      expect(isNaN(histogram[49])).toBe(false);
    });
  });

  describe('calculateBollingerBands', () => {
    it('calculates bands correctly', () => {
      const prices = [10, 10, 10, 10, 10];
      const { upper, middle, lower } = calculateBollingerBands(prices, 5, 2);
      expect(middle[4]).toBe(10);
      expect(upper[4]).toBe(10);
      expect(lower[4]).toBe(10);
    });
  });

  describe('calculateATR', () => {
    it('calculates ATR correctly', () => {
        // Highs, Lows, Closes
        const highs =  [10, 11, 12, 13, 14];
        const lows =   [ 9, 10, 11, 12, 13];
        const closes = [10, 11, 12, 13, 14];
        // TR:
        // i=0: H-L = 1
        // i=1: max(11-10, |11-10|=1, |10-10|=0) = 1
        // All TRs are 1.
        // ATR period 3.

        const atr = calculateATR(highs, lows, closes, 3);
        // i=0: NaN
        // i=1: NaN
        // i=2: avg(1,1,1) = 1.
        expect(atr[2]).toBe(1);
        expect(atr[3]).toBe(1);
        expect(atr[4]).toBe(1);
    });
  });
});
