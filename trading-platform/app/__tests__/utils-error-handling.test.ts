/**
 * Error Handling Test Suite for utils.ts
 * Tests error handling paths and edge cases
 */

import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatVolume,
  getChangeColor,
  getSignalColor,
  getSignalBgColor,
  getConfidenceColor,
  truncate,
  generateDateRange,
  getTickSize,
  roundToTickSize,
  getPriceLimit,
  getWebSocketUrl,
} from '../lib/utils';

describe('Utils Error Handling', () => {
  describe('Technical Indicators Error Handling', () => {
    it('should handle empty arrays in SMA', () => {
      const result = calculateSMA([], 14);
      expect(result).toEqual([]);
    });

    it('should handle arrays with all NaN in SMA', () => {
      const prices = Array(20).fill(NaN);
      const result = calculateSMA(prices, 14);

      result.forEach(value => {
        expect(value).toBeNaN();
      });
    });

    it('should handle arrays with all zeros in RSI', () => {
      const prices = Array(50).fill(0);
      const result = calculateRSI(prices, 14);

      // All zeros should result in valid RSI values
      const validRSI = result.filter(v => !isNaN(v));
      expect(validRSI.length).toBeGreaterThan(0);
    });

    it('should handle very large arrays in MACD', () => {
      const prices = Array.from({ length: 10000 }, (_, i) => 100 + i);
      const result = calculateMACD(prices);

      expect(result.macd.length).toBe(10000);
      expect(result.signal.length).toBe(10000);
      expect(result.histogram.length).toBe(10000);
    });

    it('should handle arrays with extreme values in Bollinger Bands', () => {
      const prices = [1e10, 1e10, 1e10, 1e10, 1e10];
      const result = calculateBollingerBands(prices, 5, 2);

      expect(result.upper.length).toBe(5);
      expect(result.middle.length).toBe(5);
      expect(result.lower.length).toBe(5);
    });

    it('should handle arrays with negative values in ATR', () => {
      const highs = [110, 112, 114, 116, 118];
      const lows = [95, 97, 99, 101, 103];
      const closes = [-50, -48, -46, -44, -42]; // Negative prices

      const result = calculateATR(highs, lows, closes, 14);

      expect(result.length).toBe(5);
      // Should handle negative values as invalid
    });

    it('should handle arrays with Infinity values', () => {
      const prices = [100, Infinity, 104, 106, 108];
      const result = calculateSMA(prices, 3);

      expect(result.length).toBe(5);
      // Should handle Infinity gracefully
    });
  });

  describe('Formatting Functions Error Handling', () => {
    it('should handle NaN in formatCurrency', () => {
      const result = formatCurrency(NaN, 'JPY');
      expect(result).toBeDefined();
    });

    it('should handle Infinity in formatCurrency', () => {
      const result = formatCurrency(Infinity, 'JPY');
      expect(result).toBeDefined();
    });

    it('should handle negative values in formatCurrency', () => {
      const result = formatCurrency(-1000, 'JPY');
      expect(result).toContain('-');
    });

    it('should handle NaN in formatNumber', () => {
      const result = formatNumber(NaN, 2);
      expect(result).toBeDefined();
    });

    it('should handle very large numbers in formatNumber', () => {
      const result = formatNumber(1e15, 2);
      expect(result).toBeDefined();
    });

    it('should handle very small numbers in formatNumber', () => {
      const result = formatNumber(1e-10, 10);
      expect(result).toBeDefined();
    });

    it('should handle NaN in formatPercent', () => {
      const result = formatPercent(NaN);
      expect(result).toBeDefined();
    });

    it('should handle very large percentages', () => {
      const result = formatPercent(1000);
      expect(result).toContain('1000');
    });

    it('should handle negative percentages', () => {
      const result = formatPercent(-50);
      expect(result).toContain('-50');
    });

    it('should handle zero in formatVolume', () => {
      const result = formatVolume(0);
      expect(result).toBe('0');
    });

    it('should handle negative volume', () => {
      const result = formatVolume(-1000);
      expect(result).toBeDefined();
    });

    it('should handle very large volume', () => {
      const result = formatVolume(1e15);
      expect(result).toBeDefined();
    });
  });

  describe('Color Functions Error Handling', () => {
    it('should handle NaN in getChangeColor', () => {
      const result = getChangeColor(NaN);
      expect(result).toBeDefined();
    });

    it('should handle Infinity in getChangeColor', () => {
      const result = getChangeColor(Infinity);
      expect(result).toBeDefined();
    });

    it('should handle very small changes in getChangeColor', () => {
      const result = getChangeColor(0.000001);
      expect(result).toBeDefined();
    });

    it('should handle very large changes in getChangeColor', () => {
      const result = getChangeColor(1e10);
      expect(result).toBeDefined();
    });

    it('should handle invalid signal values', () => {
      // TypeScript should catch this at compile time, but test runtime behavior
      const result = getSignalColor('BUY' as 'BUY' | 'SELL' | 'HOLD');
      expect(result).toBeDefined();
    });

    it('should handle invalid confidence values', () => {
      const result1 = getConfidenceColor(-10);
      const result2 = getConfidenceColor(150);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle zero confidence', () => {
      const result = getConfidenceColor(0);
      expect(result).toBeDefined();
    });

    it('should handle maximum confidence', () => {
      const result = getConfidenceColor(100);
      expect(result).toBeDefined();
    });
  });

  describe('Utility Functions Error Handling', () => {
    it('should handle empty string in truncate', () => {
      const result = truncate('', 10);
      expect(result).toBe('');
    });

    it('should handle negative length in truncate', () => {
      const result = truncate('Hello', -1);
      expect(result).toBeDefined();
    });

    it('should handle zero length in truncate', () => {
      const result = truncate('Hello', 0);
      expect(result).toBeDefined();
    });

    it('should handle very large length in truncate', () => {
      const result = truncate('Hello', 1000);
      expect(result).toBe('Hello');
    });

    it('should handle negative days in generateDateRange', () => {
      const result = generateDateRange(-5);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle zero days in generateDateRange', () => {
      const result = generateDateRange(0);
      expect(result.length).toBe(1); // Just today
    });

    it('should handle very large days in generateDateRange', () => {
      const result = generateDateRange(10000);
      expect(result.length).toBe(10001);
    });

    it('should handle negative price in getTickSize', () => {
      const result = getTickSize(-100);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle zero price in getTickSize', () => {
      const result = getTickSize(0);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle very large price in getTickSize', () => {
      const result = getTickSize(1e15);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle negative price in roundToTickSize', () => {
      const result = roundToTickSize(-100, 'japan');
      expect(result).toBeDefined();
    });

    it('should handle zero price in roundToTickSize', () => {
      const result = roundToTickSize(0, 'japan');
      expect(result).toBe(0);
    });

    it('should handle very large price in roundToTickSize', () => {
      const result = roundToTickSize(1e15, 'japan');
      expect(result).toBeDefined();
    });

    it('should handle negative reference price in getPriceLimit', () => {
      const result = getPriceLimit(-100);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle zero reference price in getPriceLimit', () => {
      const result = getPriceLimit(0);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle very large reference price in getPriceLimit', () => {
      const result = getPriceLimit(1e15);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('WebSocket URL Error Handling', () => {
    it('should handle empty path', () => {
      const result = getWebSocketUrl('');
      expect(result).toBeDefined();
      expect(result).toContain('localhost:8000');
    });

    it('should handle path without leading slash', () => {
      const result = getWebSocketUrl('ws/signals');
      expect(result).toContain('ws/signals');
    });

    it('should handle path with leading slash', () => {
      const result = getWebSocketUrl('/ws/signals');
      expect(result).toContain('/ws/signals');
    });

    it('should handle path with trailing slash', () => {
      const result = getWebSocketUrl('/ws/signals/');
      expect(result).toBeDefined();
    });

    it('should handle very long path', () => {
      const result = getWebSocketUrl('/very/long/path/with/many/segments/ws/signals');
      expect(result).toBeDefined();
    });

    it('should handle special characters in path', () => {
      const result = getWebSocketUrl('/ws/signals?param=value&other=test');
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle period larger than array length in SMA', () => {
      const prices = [100, 102, 104];
      const result = calculateSMA(prices, 10);

      expect(result.length).toBe(3);
      result.forEach(value => {
        expect(value).toBeNaN();
      });
    });

    it('should handle period of 1 in SMA', () => {
      const prices = [100, 102, 104, 106];
      const result = calculateSMA(prices, 1);

      expect(result[0]).toBeCloseTo(100);
      expect(result[1]).toBeCloseTo(102);
      expect(result[2]).toBeCloseTo(104);
      expect(result[3]).toBeCloseTo(106);
    });

    it('should handle period of 1 in RSI', () => {
      const prices = [100, 102, 104, 106, 108];
      const result = calculateRSI(prices, 1);

      expect(result.length).toBe(5);
    });

    it('should handle very small period in MACD', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = calculateMACD(prices, 2, 3, 1);

      expect(result.macd.length).toBe(50);
      expect(result.signal.length).toBe(50);
      expect(result.histogram.length).toBe(50);
    });

    it('should handle very large period in Bollinger Bands', () => {
      const prices = Array.from({ length: 100 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 90, 2);

      expect(result.upper.length).toBe(100);
      expect(result.middle.length).toBe(100);
      expect(result.lower.length).toBe(100);
    });

    it('should handle very small standard deviations in Bollinger Bands', () => {
      const prices = Array.from({ length: 50 }, () => 100);
      const result = calculateBollingerBands(prices, 20, 0.1);

      expect(result.upper.length).toBe(50);
      expect(result.lower.length).toBe(50);
    });

    it('should handle very large standard deviations in Bollinger Bands', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, 10);

      expect(result.upper.length).toBe(50);
      expect(result.lower.length).toBe(50);
    });

    it('should handle very small period in ATR', () => {
      const highs = [110, 112, 114, 116, 118];
      const lows = [95, 97, 99, 101, 103];
      const closes = [105, 107, 109, 111, 113];

      const result = calculateATR(highs, lows, closes, 1);

      expect(result.length).toBe(5);
    });

    it('should handle very large period in ATR', () => {
      const highs = Array.from({ length: 50 }, (_, i) => 110 + i);
      const lows = Array.from({ length: 50 }, (_, i) => 95 + i);
      const closes = Array.from({ length: 50 }, (_, i) => 105 + i);

      const result = calculateATR(highs, lows, closes, 100);

      expect(result.length).toBe(50);
    });
  });
});
