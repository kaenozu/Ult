
import { calculateADX } from '../utils/technical-analysis';
import { OHLCV } from '../../types';

describe('Technical Analysis Utils', () => {
  describe('calculateADX', () => {
    // Helper to generate test data
    function generateData(length: number, trend: 'up' | 'down' | 'flat' = 'flat'): OHLCV[] {
      const data: OHLCV[] = [];
      let price = 100;
      for (let i = 0; i < length; i++) {
        let change = (Math.random() - 0.5) * 2;
        if (trend === 'up') change += 1;
        if (trend === 'down') change -= 1;

        price += change;
        const high = price + Math.random();
        const low = price - Math.random();
        const close = price + (Math.random() - 0.5);

        data.push({
            date: new Date(Date.now() + i * 86400000).toISOString(),
            open: price,
            high: Math.max(high, low, close),
            low: Math.min(high, low, close),
            close: close,
            volume: 1000,
            symbol: 'TEST'
        });
      }
      return data;
    }

    it('should return array of correct length', () => {
      const data = generateData(50);
      const adx = calculateADX(data, 14);
      expect(adx.length).toBe(50);
    });

    it('should return NaN for initial periods', () => {
      const data = generateData(50);
      const period = 14;
      const adx = calculateADX(data, period);

      // Original implementation pushed NaN for i <= period (indices 0 to period-1?)
      // Wait, original pushed NaN for i=1 to period.
      // And initialized with [NaN].
      // So indices 0 to period (total 15 items) should be NaN?
      // Let's verify with current implementation.
      // i=1 (period=14). pushed NaN. adx has [NaN, NaN].
      // i=14. pushed NaN. adx has 0..14 as NaN.
      // i=15 (period+1). pushed dx.
      // So indices 0 to 14 are NaN.

      for (let i = 0; i <= period; i++) {
        expect(adx[i]).toBeNaN();
      }

      expect(adx[period + 1]).not.toBeNaN();
    });

    it('should calculate valid ADX values (0-100)', () => {
      const data = generateData(100, 'up');
      const adx = calculateADX(data, 14);

      for (let i = 15; i < 100; i++) {
        if (!isNaN(adx[i])) {
          expect(adx[i]).toBeGreaterThanOrEqual(0);
          expect(adx[i]).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should show trend strength', () => {
        // Strong trend
        const data = generateData(100, 'up');
        // Force very strong trend
        for(let i=1; i<100; i++) {
            data[i].high = data[i-1].high + 2;
            data[i].low = data[i-1].low + 2;
            data[i].close = data[i-1].close + 2;
        }

        const adx = calculateADX(data, 14);
        const lastAdx = adx[adx.length - 1];

        // Should be high
        expect(lastAdx).toBeGreaterThan(50);
    });
  });
});
