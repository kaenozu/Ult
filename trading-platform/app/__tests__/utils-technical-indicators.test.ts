/**
 * Technical Indicators Test Suite for utils.ts
 * Tests all technical indicator functions directly from utils.ts
 */

import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
} from '../lib/utils';

describe('Technical Indicators - calculateSMA', () => {
  it('should calculate SMA correctly with valid data', () => {
    const prices = [100, 102, 104, 106, 108, 110];
    const period = 3;
    const result = calculateSMA(prices, period);

    expect(result.length).toBe(prices.length);
    expect(result[0]).toBeNaN(); // First period-1 values are NaN
    expect(result[1]).toBeNaN();
    expect(result[2]).toBeCloseTo((100 + 102 + 104) / 3);
    expect(result[3]).toBeCloseTo((102 + 104 + 106) / 3);
    expect(result[4]).toBeCloseTo((104 + 106 + 108) / 3);
    expect(result[5]).toBeCloseTo((106 + 108 + 110) / 3);
  });

  it('should handle NaN values in input', () => {
    const prices = [100, NaN, 104, 106, 108, 110];
    const period = 3;
    const result = calculateSMA(prices, period);

    expect(result[2]).toBeNaN(); // Not enough valid data
    expect(result[5]).toBeCloseTo((104 + 106 + 108) / 3);
  });

  it('should handle null and undefined values', () => {
    const prices = [100, null, 104, undefined, 108, 110] as any;
    const period = 3;
    const result = calculateSMA(prices, period);

    expect(result[2]).toBeNaN(); // Not enough valid data
    expect(result[5]).toBeCloseTo((104 + 108 + 110) / 3);
  });

  it('should handle negative values by treating them as invalid', () => {
    const prices = [100, -50, 104, 106, 108, 110];
    const period = 3;
    const result = calculateSMA(prices, period);

    expect(result[2]).toBeNaN(); // Negative value treated as invalid
    expect(result[5]).toBeCloseTo((104 + 106 + 108) / 3);
  });

  it('should handle zero values as valid', () => {
    const prices = [100, 0, 104, 106, 108, 110];
    const period = 3;
    const result = calculateSMA(prices, period);

    expect(result[2]).toBeCloseTo((100 + 0 + 104) / 3);
  });

  it('should handle empty array', () => {
    const result = calculateSMA([], 3);
    expect(result).toEqual([]);
  });

  it('should handle period larger than array length', () => {
    const prices = [100, 102];
    const result = calculateSMA(prices, 5);

    expect(result.length).toBe(2);
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
  });

  it('should handle period of 1', () => {
    const prices = [100, 102, 104];
    const result = calculateSMA(prices, 1);

    expect(result[0]).toBeCloseTo(100);
    expect(result[1]).toBeCloseTo(102);
    expect(result[2]).toBeCloseTo(104);
  });
});

describe('Technical Indicators - calculateRSI', () => {
  it('should calculate RSI correctly with valid data', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i + Math.sin(i) * 10);
    const period = 14;
    const result = calculateRSI(prices, period);

    expect(result.length).toBe(prices.length);
    expect(result[0]).toBeNaN(); // First period+1 values are NaN
    expect(result[14]).not.toBeNaN();
    expect(result[15]).not.toBeNaN();
    // RSI should be between 0 and 100
    const validRSI = result.filter(v => !isNaN(v));
    validRSI.forEach(rsi => {
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
    });
  });

  it('should handle NaN values in input', () => {
    const prices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, NaN, 132];
    const period = 14;
    const result = calculateRSI(prices, period);

    expect(result[14]).not.toBeNaN();
    expect(result[15]).toBeNaN(); // NaN in calculation
    expect(result[16]).toBeNaN(); // Previous value was NaN
  });

  it('should handle null and undefined values', () => {
    const prices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, null, 132] as any;
    const period = 14;
    const result = calculateRSI(prices, period);

    expect(result[14]).not.toBeNaN();
    expect(result[15]).toBeNaN();
  });

  it('should handle negative values by treating them as invalid', () => {
    const prices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, -50, 132];
    const period = 14;
    const result = calculateRSI(prices, period);

    expect(result[14]).not.toBeNaN();
    expect(result[15]).toBeNaN();
  });

  it('should handle all gains (RSI should be 100)', () => {
    const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
    const period = 14;
    const result = calculateRSI(prices, period);

    expect(result[14]).toBeCloseTo(100);
  });

  it('should handle all losses (RSI should be 0)', () => {
    const prices = [115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
    const period = 14;
    const result = calculateRSI(prices, period);

    expect(result[14]).toBeCloseTo(0);
  });

  it('should handle empty array', () => {
    const result = calculateRSI([], 14);
    expect(result).toEqual([]);
  });

  it('should use default period of 14', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
    const result = calculateRSI(prices);

    expect(result.length).toBe(prices.length);
    expect(result[14]).not.toBeNaN();
  });
});

describe('Technical Indicators - calculateMACD', () => {
  it('should calculate MACD correctly with valid data', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 + i + Math.sin(i) * 10);
    const result = calculateMACD(prices, 12, 26, 9);

    expect(result.macd.length).toBe(prices.length);
    expect(result.signal.length).toBe(prices.length);
    expect(result.histogram.length).toBe(prices.length);

    // First few values should be NaN
    expect(result.macd[0]).toBeNaN();
    expect(result.signal[0]).toBeNaN();
    expect(result.histogram[0]).toBeNaN();

    // Later values should be valid
    expect(result.macd[50]).not.toBeNaN();
    expect(result.signal[50]).not.toBeNaN();
    expect(result.histogram[50]).not.toBeNaN();
  });

  it('should handle NaN values in input', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
    prices[25] = NaN;
    const result = calculateMACD(prices, 12, 26, 9);

    expect(result.macd[25]).toBeNaN();
    expect(result.signal[25]).toBeNaN();
    expect(result.histogram[25]).toBeNaN();
  });

  it('should handle custom periods', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 + i);
    const result = calculateMACD(prices, 5, 10, 3);

    expect(result.macd.length).toBe(prices.length);
    expect(result.signal.length).toBe(prices.length);
    expect(result.histogram.length).toBe(prices.length);
  });

  it('should handle empty array', () => {
    const result = calculateMACD([], 12, 26, 9);

    expect(result.macd).toEqual([]);
    expect(result.signal).toEqual([]);
    expect(result.histogram).toEqual([]);
  });

  it('should calculate histogram correctly (macd - signal)', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 + i);
    const result = calculateMACD(prices);

    const validIndex = 50;
    expect(result.histogram[validIndex]).toBeCloseTo(
      result.macd[validIndex] - result.signal[validIndex]
    );
  });
});

describe('Technical Indicators - calculateBollingerBands', () => {
  it('should calculate Bollinger Bands correctly with valid data', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i) * 10);
    const result = calculateBollingerBands(prices, 20, 2);

    expect(result.upper.length).toBe(prices.length);
    expect(result.middle.length).toBe(prices.length);
    expect(result.lower.length).toBe(prices.length);

    // First period-1 values should be NaN
    for (let i = 0; i < 19; i++) {
      expect(result.upper[i]).toBeNaN();
      expect(result.middle[i]).toBeNaN();
      expect(result.lower[i]).toBeNaN();
    }

    // Later values should be valid
    expect(result.upper[50]).not.toBeNaN();
    expect(result.middle[50]).not.toBeNaN();
    expect(result.lower[50]).not.toBeNaN();

    // Upper band should be above middle band
    expect(result.upper[50]).toBeGreaterThan(result.middle[50]);
    // Lower band should be below middle band
    expect(result.lower[50]).toBeLessThan(result.middle[50]);
  });

  it('should handle NaN values in input', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
    prices[25] = NaN;
    const result = calculateBollingerBands(prices, 20, 2);

    expect(result.upper[25]).toBeNaN();
    expect(result.middle[25]).toBeNaN();
    expect(result.lower[25]).toBeNaN();
  });

  it('should handle custom period and standard deviations', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 + i);
    const result = calculateBollingerBands(prices, 10, 3);

    expect(result.upper.length).toBe(prices.length);
    expect(result.middle.length).toBe(prices.length);
    expect(result.lower.length).toBe(prices.length);

    // Upper band should be above middle band
    expect(result.upper[50]).toBeGreaterThan(result.middle[50]);
    expect(result.lower[50]).toBeLessThan(result.middle[50]);
  });

  it('should handle empty array', () => {
    const result = calculateBollingerBands([], 20, 2);

    expect(result.upper).toEqual([]);
    expect(result.middle).toEqual([]);
    expect(result.lower).toEqual([]);
  });

  it('should handle period of 1', () => {
    const prices = [100, 102, 104, 106];
    const result = calculateBollingerBands(prices, 1, 2);

    expect(result.upper[0]).toBeCloseTo(100);
    expect(result.middle[0]).toBeCloseTo(100);
    expect(result.lower[0]).toBeCloseTo(100);
  });
});

describe('Technical Indicators - calculateATR', () => {
  it('should calculate ATR correctly with valid data', () => {
    const highs = Array.from({ length: 50 }, (_, i) => 110 + i + Math.random() * 5);
    const lows = Array.from({ length: 50 }, (_, i) => 95 + i + Math.random() * 5);
    const closes = Array.from({ length: 50 }, (_, i) => 105 + i + Math.random() * 5);
    const period = 14;
    const result = calculateATR(highs, lows, closes, period);

    expect(result.length).toBe(highs.length);
    expect(result[0]).toBeNaN(); // First period-1 values are NaN
    expect(result[13]).not.toBeNaN(); // First valid value
    expect(result[14]).not.toBeNaN();

    // ATR should be positive
    const validATR = result.filter(v => !isNaN(v) && v > 0);
    expect(validATR.length).toBeGreaterThan(0);
  });

  it('should handle NaN values in input', () => {
    const highs = [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126];
    const lows = [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111];
    const closes = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121];
    highs[10] = NaN;
    const result = calculateATR(highs, lows, closes, 14);

    expect(result[13]).not.toBeNaN();
    expect(result[14]).toBeNaN(); // NaN in calculation
  });

  it('should handle null and undefined values', () => {
    const highs = [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126];
    const lows = [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111];
    const closes = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121];
    lows[10] = null as any;
    const result = calculateATR(highs, lows, closes, 14);

    expect(result[13]).not.toBeNaN();
    expect(result[14]).toBeNaN();
  });

  it('should handle negative values by treating them as invalid', () => {
    const highs = [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126];
    const lows = [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111];
    const closes = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121];
    closes[10] = -50;
    const result = calculateATR(highs, lows, closes, 14);

    expect(result[13]).not.toBeNaN();
    expect(result[14]).toBeNaN();
  });

  it('should handle empty arrays', () => {
    const result = calculateATR([], [], [], 14);
    expect(result).toEqual([]);
  });

  it('should handle arrays of different lengths', () => {
    const highs = [110, 111, 112];
    const lows = [95, 96];
    const closes = [105, 106, 107, 108];
    const result = calculateATR(highs, lows, closes, 14);

    // Should use the minimum length
    expect(result.length).toBe(2);
  });

  it('should use default period of 14', () => {
    const highs = Array.from({ length: 50 }, (_, i) => 110 + i);
    const lows = Array.from({ length: 50 }, (_, i) => 95 + i);
    const closes = Array.from({ length: 50 }, (_, i) => 105 + i);
    const result = calculateATR(highs, lows, closes);

    expect(result.length).toBe(50);
    expect(result[13]).not.toBeNaN();
  });

  it('should calculate true range correctly for first element', () => {
    const highs = [110];
    const lows = [95];
    const closes = [105];
    const result = calculateATR(highs, lows, closes, 1);

    expect(result[0]).toBeCloseTo(110 - 95); // high - low
  });

  it('should calculate true range correctly for subsequent elements', () => {
    const highs = [110, 120];
    const lows = [95, 105];
    const closes = [105, 115];
    const result = calculateATR(highs, lows, closes, 1);

    expect(result[0]).toBeCloseTo(110 - 95); // high - low
    expect(result[1]).toBeCloseTo(Math.max(
      120 - 105,           // high - low
      Math.abs(120 - 105), // |high - prevClose|
      Math.abs(105 - 105)  // |low - prevClose|
    ));
  });
});

describe('Technical Indicators - Edge Cases and Error Handling', () => {
  it('should handle arrays with all NaN values', () => {
    const prices = Array(50).fill(NaN);
    const sma = calculateSMA(prices, 14);
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);

    sma.forEach(v => expect(v).toBeNaN());
    rsi.forEach(v => expect(v).toBeNaN());
    macd.macd.forEach(v => expect(v).toBeNaN());
  });

  it('should handle arrays with mixed valid and invalid data', () => {
    const prices = [100, NaN, 104, null, 108, undefined, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130] as any;
    const sma = calculateSMA(prices, 5);

    expect(sma[4]).toBeNaN(); // Not enough valid data
    expect(sma[15]).not.toBeNaN(); // Should have valid data by the end
  });

  it('should handle very large values', () => {
    const prices = [1000000, 1000001, 1000002, 1000003, 1000004];
    const sma = calculateSMA(prices, 3);

    expect(sma[2]).toBeCloseTo((1000000 + 1000001 + 1000002) / 3);
  });

  it('should handle very small values', () => {
    const prices = [0.001, 0.002, 0.003, 0.004, 0.005];
    const sma = calculateSMA(prices, 3);

    expect(sma[2]).toBeCloseTo((0.001 + 0.002 + 0.003) / 3);
  });

  it('should handle constant prices', () => {
    const prices = Array(50).fill(100);
    const rsi = calculateRSI(prices, 14);

    // With no change, RSI should be 50 (or undefined depending on implementation)
    const validRSI = rsi.filter(v => !isNaN(v));
    expect(validRSI.length).toBeGreaterThan(0);
  });

  it('should handle single element array', () => {
    const prices = [100];
    const sma = calculateSMA(prices, 1);
    const rsi = calculateRSI(prices, 14);

    expect(sma[0]).toBeCloseTo(100);
    expect(rsi[0]).toBeNaN(); // Not enough data for RSI
  });
});
