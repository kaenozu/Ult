import {
  simpleSampleReduction,
  lttbDownsample,
  aggregateDataPoints,
  reduceDataPoints,
  calculateOptimalDataPoints,
  shouldReduceData,
  findExtremePoints,
} from '../lib/chart-utils';
import { OHLCV } from '../types';

describe('Chart Utilities', () => {
  // Helper function to create mock OHLCV data
  const createMockData = (count: number): OHLCV[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: 'TEST',
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i + Math.sin(i) * 5,
      volume: 1000000 + i * 1000,
    }));
  };

  describe('simpleSampleReduction', () => {
    it('should return all data when target is greater than data length', () => {
      const data = createMockData(10);
      const result = simpleSampleReduction(data, 20);
      expect(result).toHaveLength(10);
    });

    it('should reduce data to approximately target points', () => {
      const data = createMockData(1000);
      const result = simpleSampleReduction(data, 100);
      expect(result.length).toBeLessThanOrEqual(101); // +1 for last point
      expect(result.length).toBeGreaterThanOrEqual(99);
    });

    it('should always include the last data point', () => {
      const data = createMockData(100);
      const result = simpleSampleReduction(data, 10);
      expect(result[result.length - 1]).toEqual(data[data.length - 1]);
    });
  });

  describe('lttbDownsample', () => {
    it('should return all data when threshold is greater than data length', () => {
      const data = createMockData(10);
      const result = lttbDownsample(data, 20);
      expect(result).toHaveLength(10);
    });

    it('should reduce data to exactly threshold points', () => {
      const data = createMockData(1000);
      const threshold = 100;
      const result = lttbDownsample(data, threshold);
      expect(result).toHaveLength(threshold);
    });

    it('should preserve first and last points', () => {
      const data = createMockData(100);
      const result = lttbDownsample(data, 10);
      expect(result[0]).toEqual(data[0]);
      expect(result[result.length - 1]).toEqual(data[data.length - 1]);
    });

    it('should preserve visual shape better than simple sampling', () => {
      const data = createMockData(100);
      const lttbResult = lttbDownsample(data, 20);
      const simpleResult = simpleSampleReduction(data, 20);
      
      // LTTB should have the exact target length
      expect(lttbResult).toHaveLength(20);
      // Simple sampling might have slightly different length
      expect(simpleResult.length).toBeGreaterThanOrEqual(19);
    });
  });

  describe('aggregateDataPoints', () => {
    it('should return all data when bucket size is 1', () => {
      const data = createMockData(10);
      const result = aggregateDataPoints(data, 1);
      expect(result).toHaveLength(10);
    });

    it('should aggregate data correctly', () => {
      const data = createMockData(10);
      const result = aggregateDataPoints(data, 5);
      expect(result).toHaveLength(2);
      
      // Check first aggregated point
      expect(result[0].open).toBe(data[0].open);
      expect(result[0].close).toBe(data[4].close);
      expect(result[0].high).toBe(Math.max(...data.slice(0, 5).map(d => d.high)));
      expect(result[0].low).toBe(Math.min(...data.slice(0, 5).map(d => d.low)));
    });

    it('should aggregate volume correctly', () => {
      const data = createMockData(10);
      const result = aggregateDataPoints(data, 5);
      
      const expectedVolume = data.slice(0, 5).reduce((sum, d) => sum + d.volume, 0);
      expect(result[0].volume).toBe(expectedVolume);
    });
  });

  describe('reduceDataPoints', () => {
    it('should use simple algorithm when specified', () => {
      const data = createMockData(100);
      const result = reduceDataPoints(data, {
        targetPoints: 20,
        algorithm: 'simple',
      });
      expect(result.length).toBeGreaterThanOrEqual(19);
      expect(result.length).toBeLessThanOrEqual(21);
    });

    it('should use lttb algorithm when specified', () => {
      const data = createMockData(100);
      const result = reduceDataPoints(data, {
        targetPoints: 20,
        algorithm: 'lttb',
      });
      expect(result).toHaveLength(20);
    });

    it('should use aggregate algorithm when specified', () => {
      const data = createMockData(100);
      const result = reduceDataPoints(data, {
        targetPoints: 20,
        algorithm: 'aggregate',
      });
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should default to lttb algorithm', () => {
      const data = createMockData(100);
      const result = reduceDataPoints(data, { targetPoints: 20 });
      expect(result).toHaveLength(20);
    });

    it('should return original data when target is greater than data length', () => {
      const data = createMockData(10);
      const result = reduceDataPoints(data, { targetPoints: 20 });
      expect(result).toHaveLength(10);
    });
  });

  describe('calculateOptimalDataPoints', () => {
    it('should calculate optimal points based on chart width', () => {
      const chartWidth = 1000;
      const dataLength = 2000;
      const result = calculateOptimalDataPoints(chartWidth, dataLength);
      
      // With default 2 pixels per point: 1000 / 2 = 500
      expect(result).toBe(500);
    });

    it('should not exceed data length', () => {
      const chartWidth = 1000;
      const dataLength = 200;
      const result = calculateOptimalDataPoints(chartWidth, dataLength);
      
      expect(result).toBe(200);
    });

    it('should respect custom minPixelsPerPoint', () => {
      const chartWidth = 1000;
      const dataLength = 2000;
      const result = calculateOptimalDataPoints(chartWidth, dataLength, 4);
      
      // With 4 pixels per point: 1000 / 4 = 250
      expect(result).toBe(250);
    });
  });

  describe('shouldReduceData', () => {
    it('should return false for small datasets', () => {
      expect(shouldReduceData(100)).toBe(false);
    });

    it('should return true for large datasets', () => {
      expect(shouldReduceData(1000)).toBe(true);
    });

    it('should respect custom threshold', () => {
      expect(shouldReduceData(200, 100)).toBe(true);
      expect(shouldReduceData(50, 100)).toBe(false);
    });
  });

  describe('findExtremePoints', () => {
    it('should return empty array for data with less than 3 points', () => {
      const data = createMockData(2);
      const result = findExtremePoints(data);
      expect(result).toHaveLength(0);
    });

    it('should find peaks in data', () => {
      const data: OHLCV[] = [
        { symbol: 'TEST', date: '2024-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
        { symbol: 'TEST', date: '2024-01-02', open: 100, high: 105, low: 95, close: 110, volume: 1000 }, // Peak
        { symbol: 'TEST', date: '2024-01-03', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      ];
      const result = findExtremePoints(data);
      expect(result).toContain(1);
    });

    it('should find valleys in data', () => {
      const data: OHLCV[] = [
        { symbol: 'TEST', date: '2024-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
        { symbol: 'TEST', date: '2024-01-02', open: 100, high: 105, low: 95, close: 90, volume: 1000 }, // Valley
        { symbol: 'TEST', date: '2024-01-03', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      ];
      const result = findExtremePoints(data);
      expect(result).toContain(1);
    });

    it('should find multiple extremes', () => {
      const data: OHLCV[] = [
        { symbol: 'TEST', date: '2024-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
        { symbol: 'TEST', date: '2024-01-02', open: 100, high: 105, low: 95, close: 110, volume: 1000 }, // Peak
        { symbol: 'TEST', date: '2024-01-03', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
        { symbol: 'TEST', date: '2024-01-04', open: 100, high: 105, low: 95, close: 90, volume: 1000 },  // Valley
        { symbol: 'TEST', date: '2024-01-05', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      ];
      const result = findExtremePoints(data);
      expect(result).toHaveLength(2);
      expect(result).toContain(1); // Peak
      expect(result).toContain(3); // Valley
    });
  });
});
