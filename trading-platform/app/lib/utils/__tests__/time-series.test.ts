import { interpolateOHLCV } from '../time-series';
import { OHLCV } from '@/app/types';

describe('interpolateOHLCV', () => {
  it('should return original data if length is less than 2', () => {
    const data: OHLCV[] = [
      { date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 }
    ];
    expect(interpolateOHLCV(data)).toEqual(data);
  });

  it('should fill gaps between dates', () => {
    // 2023-01-02 is Monday. 2023-01-05 is Thursday.
    const data: OHLCV[] = [
      { date: '2023-01-02', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { date: '2023-01-05', open: 130, high: 130, low: 130, close: 130, volume: 1000 }
    ];
    // Gap: 03 (Tue), 04 (Wed).

    const result = interpolateOHLCV(data);

    expect(result.length).toBe(4);
    expect(result[1].date).toBe('2023-01-03');
    expect(result[2].date).toBe('2023-01-04');

    // Interpolation check
    // Indices: 0, 1, 2, 3.
    // Prev: 0 (val 100), Next: 3 (val 130).
    // i=1: 100 + (30 * 1/3) = 110.
    // i=2: 100 + (30 * 2/3) = 120.

    expect(result[1].close).toBe(110);
    expect(result[2].close).toBe(120);
  });
});
