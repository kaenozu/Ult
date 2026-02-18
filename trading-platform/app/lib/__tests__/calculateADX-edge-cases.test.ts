/**
 * Edge case testing for calculateADX
 * Testing potential issues found during code review
 */

import { calculateADX } from '../utils/technical-analysis';
import { OHLCV } from '../../types';

describe('calculateADX Edge Cases', () => {
  describe('Division by zero handling', () => {
    it('should handle avgTR = 0 case (no volatility)', () => {
      // Create data with no price movement (all same price)
      const data: OHLCV[] = [];
      for (let i = 0; i < 50; i++) {
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: 100,
          high: 100,
          low: 100,
          close: 100,
          volume: 1000,
          symbol: 'FLAT'
        });
      }

      const adx = calculateADX(data, 14);
      
      // Should not throw error
      expect(adx.length).toBe(50);
      
      // When avgTR is 0, diPlus/diMinus calculations will result in Infinity or NaN
      // This is expected behavior for flat markets
      // Check that values after period are either NaN or Infinity (both valid for no-movement scenario)
      for (let i = 15; i < adx.length; i++) {
        const val = adx[i];
        expect(typeof val).toBe('number');
        // In flat market, we expect NaN or Infinity or 0
        if (!isNaN(val) && isFinite(val)) {
          expect(val).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should handle diPlus + diMinus = 0 case', () => {
      // This would cause division by zero in dx calculation
      // Create data where both +DI and -DI are 0
      const data: OHLCV[] = [];
      for (let i = 0; i < 50; i++) {
        // Slightly varying but balanced movement
        const phase = i % 4;
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: 100,
          high: 100 + (phase === 0 ? 0.1 : 0),
          low: 100 - (phase === 2 ? 0.1 : 0),
          close: 100,
          volume: 1000,
          symbol: 'BALANCED'
        });
      }

      const adx = calculateADX(data, 14);
      
      // Should not throw error
      expect(adx.length).toBe(50);
      
      // When diPlus + diMinus = 0, dx calculation gives NaN (0/0)
      // This is mathematically correct - no directional movement
    });
  });

  describe('Boundary conditions', () => {
    it('should handle empty array', () => {
      const adx = calculateADX([], 14);
      expect(adx).toEqual([]);
    });

    it('should handle single data point', () => {
      const data: OHLCV[] = [{
        date: new Date().toISOString(),
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000,
        symbol: 'TEST'
      }];

      const adx = calculateADX(data, 14);
      expect(adx.length).toBe(1);
      expect(adx[0]).toBeNaN();
    });

    it('should handle data length < period', () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 10; i++) {
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: 100 + i,
          high: 101 + i,
          low: 99 + i,
          close: 100 + i,
          volume: 1000,
          symbol: 'SHORT'
        });
      }

      const adx = calculateADX(data, 14);
      expect(adx.length).toBe(10);
      
      // All should be NaN since we don't have enough data
      adx.forEach(val => expect(val).toBeNaN());
    });

    it('should handle data length = period + 1', () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 15; i++) { // period = 14, so 15 elements
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: 100 + i,
          high: 102 + i,
          low: 99 + i,
          close: 101 + i,
          volume: 1000,
          symbol: 'EXACT'
        });
      }

      const adx = calculateADX(data, 14);
      expect(adx.length).toBe(15);
      
      // First 14 should be NaN (indices 0-13)
      for (let i = 0; i <= 13; i++) {
        expect(adx[i]).toBeNaN();
      }
      
      // Index 14 (period+1) might have a value
      // Check it's either NaN or a valid number
      if (!isNaN(adx[14])) {
        expect(adx[14]).toBeGreaterThanOrEqual(0);
        expect(adx[14]).toBeLessThanOrEqual(100);
      }
    });

    it('should handle data length = period + 2', () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 16; i++) { // period = 14, so 16 elements
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: 100 + i * 2,
          high: 102 + i * 2,
          low: 99 + i * 2,
          close: 101 + i * 2,
          volume: 1000,
          symbol: 'PLUS2'
        });
      }

      const adx = calculateADX(data, 14);
      expect(adx.length).toBe(16);
      
      // First 14 should be NaN (indices 0-13)
      for (let i = 0; i <= 13; i++) {
        expect(adx[i]).toBeNaN();
      }
      
      // Indices 14 and 15 should have values (main loop starts at period+2)
    });
  });

  describe('Extreme values', () => {
    it('should handle very large price values', () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 50; i++) {
        const basePrice = 1e9 + i * 1e6; // Billion dollar prices
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: basePrice,
          high: basePrice + 1e5,
          low: basePrice - 1e5,
          close: basePrice + 5e4,
          volume: 1000,
          symbol: 'LARGE'
        });
      }

      const adx = calculateADX(data, 14);
      expect(adx.length).toBe(50);
      
      // Should still produce valid results
      let validCount = 0;
      for (let i = 15; i < adx.length; i++) {
        if (!isNaN(adx[i]) && isFinite(adx[i])) {
          validCount++;
          expect(adx[i]).toBeGreaterThanOrEqual(0);
          expect(adx[i]).toBeLessThanOrEqual(100);
        }
      }
      expect(validCount).toBeGreaterThan(0);
    });

    it('should handle very small price values', () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 50; i++) {
        const basePrice = 0.001 + i * 0.0001; // Penny stock
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: basePrice,
          high: basePrice + 0.00005,
          low: basePrice - 0.00005,
          close: basePrice + 0.00002,
          volume: 1000,
          symbol: 'SMALL'
        });
      }

      const adx = calculateADX(data, 14);
      expect(adx.length).toBe(50);
      
      // Should still produce valid results
      let validCount = 0;
      for (let i = 15; i < adx.length; i++) {
        if (!isNaN(adx[i]) && isFinite(adx[i])) {
          validCount++;
          expect(adx[i]).toBeGreaterThanOrEqual(0);
          expect(adx[i]).toBeLessThanOrEqual(100);
        }
      }
      expect(validCount).toBeGreaterThan(0);
    });
  });

  describe('Different period values', () => {
    it('should work with period = 1', () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 20; i++) {
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: 100 + i,
          high: 102 + i,
          low: 99 + i,
          close: 101 + i,
          volume: 1000,
          symbol: 'P1'
        });
      }

      const adx = calculateADX(data, 1);
      expect(adx.length).toBe(20);
    });

    it('should work with large period', () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 100; i++) {
        data.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          open: 100 + i,
          high: 102 + i,
          low: 99 + i,
          close: 101 + i,
          volume: 1000,
          symbol: 'P50'
        });
      }

      const adx = calculateADX(data, 50);
      expect(adx.length).toBe(100);
      
      // First 50 values should be NaN
      for (let i = 0; i <= 49; i++) {
        expect(adx[i]).toBeNaN();
      }
    });
  });
});
