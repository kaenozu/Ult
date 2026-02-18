import { renderHook } from '@testing-library/react';
import { usePreCalculatedIndicators } from '../usePreCalculatedIndicators';
import { OHLCV } from '@/app/types';
import { RSI_CONFIG, SMA_CONFIG } from '@/app/constants';

// Mock data
const mockData: OHLCV[] = Array.from({ length: 100 }, (_, i) => ({
  date: `2023-01-${String(i + 1).padStart(2, '0')}`,
  open: 100 + i,
  high: 105 + i,
  low: 95 + i,
  close: 100 + i,
  volume: 1000,
}));

describe('usePreCalculatedIndicators', () => {
  it('should calculate RSI, SMA, and ATR for all configured periods', () => {
    const { result } = renderHook(() => usePreCalculatedIndicators(mockData));

    const { rsi, sma, atr } = result.current;

    // Verify RSI calculations
    expect(rsi).toBeInstanceOf(Map);
    for (const period of RSI_CONFIG.PERIOD_OPTIONS) {
      expect(rsi.has(period)).toBe(true);
      expect(rsi.get(period)).toHaveLength(mockData.length);
    }

    // Verify SMA calculations
    expect(sma).toBeInstanceOf(Map);
    for (const period of SMA_CONFIG.PERIOD_OPTIONS) {
      expect(sma.has(period)).toBe(true);
      expect(sma.get(period)).toHaveLength(mockData.length);
    }

    // Verify ATR calculation
    expect(atr).toHaveLength(mockData.length);
    // Simple check that ATR is calculated
    // In our mock data, high-low = 10 every day. So ATR should be close to 10.
    const lastATR = atr[atr.length - 1];
    expect(lastATR).toBeGreaterThan(0);
  });
});
