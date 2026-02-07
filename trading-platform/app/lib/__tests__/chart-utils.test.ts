import { calculateChartMinMax } from '../chart-utils';
import { OHLCV } from '@/app/types';

describe('calculateChartMinMax', () => {
  const createOHLCV = (close: number, low: number, high: number): OHLCV => ({
    symbol: 'TEST',
    date: '2023-01-01',
    open: close,
    high,
    low,
    close,
    volume: 1000,
  });

  it('should return default range for empty data', () => {
    const result = calculateChartMinMax([]);
    expect(result).toEqual({ min: 0, max: 100 });
  });

  it('should calculate min and max from OHLCV data', () => {
    const data: OHLCV[] = [
      createOHLCV(100, 90, 110),
      createOHLCV(105, 95, 115),
      createOHLCV(110, 100, 120),
    ];
    const result = calculateChartMinMax(data);
    expect(result).toEqual({ min: 90, max: 120 });
  });

  it('should consider indicators in range calculation', () => {
    const data: OHLCV[] = [
      createOHLCV(100, 90, 110),
    ];
    const indicators = {
      sma: [85], // Lower than low
      upper: [125], // Higher than high
      lower: [80], // Lower than sma
    };
    const result = calculateChartMinMax(data, indicators);
    expect(result).toEqual({ min: 80, max: 125 });
  });

  it('should handle NaN and non-number values in indicators', () => {
    const data: OHLCV[] = [
      createOHLCV(100, 90, 110),
    ];
    const indicators = {
      sma: [NaN, 85, NaN],
      upper: [125, null as any, undefined as any],
    };
    const result = calculateChartMinMax(data, indicators);
    expect(result).toEqual({ min: 85, max: 125 });
  });

  it('should handle mix of data and indicators correctly', () => {
    const data: OHLCV[] = [
      createOHLCV(100, 90, 110), // min 90, max 110
      createOHLCV(100, 95, 105),
    ];
    const indicators = {
      sma: [100, 100], // within range
      upper: [115, 108], // 115 is max
      lower: [85, 92], // 85 is min
    };
    const result = calculateChartMinMax(data, indicators);
    expect(result).toEqual({ min: 85, max: 115 });
  });

  it('should handle case where indicators are empty', () => {
    const data: OHLCV[] = [
      createOHLCV(100, 90, 110),
    ];
    const result = calculateChartMinMax(data, { sma: [], upper: [], lower: [] });
    expect(result).toEqual({ min: 90, max: 110 });
  });
});
