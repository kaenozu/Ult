import { renderHook } from '@testing-library/react';
import { useChartData } from './useChartData';
import { OHLCV } from '@/app/types';

describe('useChartData', () => {
  it('correctly normalizes index data', () => {
    const data: OHLCV[] = [
      { date: '2023-01-01', close: 100, open: 100, high: 100, low: 100, volume: 100 },
      { date: '2023-01-02', close: 110, open: 110, high: 110, low: 110, volume: 110 },
      { date: '2023-01-03', close: 120, open: 120, high: 120, low: 120, volume: 120 },
    ];

    const indexData: OHLCV[] = [
      { date: '2023-01-01', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
      { date: '2023-01-02', close: 1050, open: 1050, high: 1050, low: 1050, volume: 1050 }, // +5%
      { date: '2023-01-04', close: 1100, open: 1100, high: 1100, low: 1100, volume: 1100 }, // Skip 2023-01-03
      // Filler to satisfy length < 10 check
      { date: '2023-01-05', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
      { date: '2023-01-06', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
      { date: '2023-01-07', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
      { date: '2023-01-08', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
      { date: '2023-01-09', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
      { date: '2023-01-10', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
      { date: '2023-01-11', close: 1000, open: 1000, high: 1000, low: 1000, volume: 1000 },
    ];

    const { result } = renderHook(() => useChartData(data, null, indexData));

    // Stock start: 100. Index start: 1000. Ratio: 100/1000 = 0.1.
    // Normalized index:
    // 2023-01-01: 1000 * 0.1 = 100
    // 2023-01-02: 1050 * 0.1 = 105
    // 2023-01-03: No index data -> NaN

    const normalized = result.current.normalizedIndexData;

    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toBe(100);
    expect(normalized[1]).toBe(105);
    expect(normalized[2]).toBeNaN();
  });

  it('handles empty data gracefully', () => {
      const { result } = renderHook(() => useChartData([], null, []));
      expect(result.current.normalizedIndexData).toEqual([]);
  });
});
