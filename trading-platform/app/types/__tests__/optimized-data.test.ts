/**
 * Tests for Optimized Data Structures
 */

import { SharedOHLCV } from '../shared';
import {
  OHLCVData,
  OHLCVConverter,
  OHLCVIterators,
  RingBuffer,
  OHLCVRingBuffer,
  DataPipeline,
} from '../optimized-data';

describe('OHLCVConverter', () => {
  let mockData: SharedOHLCV[];

  beforeEach(() => {
    mockData = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100 + i,
      high: 110 + i,
      low: 90 + i,
      close: 105 + i,
      volume: 1000000 + i * 10000,
    }));
  });

  describe('toTypedArray', () => {
    it('should convert array of OHLCV to TypedArray format', () => {
      const result = OHLCVConverter.toTypedArray(mockData);

      expect(result.length).toBe(10);
      expect(result.opens).toBeInstanceOf(Float64Array);
      expect(result.highs).toBeInstanceOf(Float64Array);
      expect(result.lows).toBeInstanceOf(Float64Array);
      expect(result.closes).toBeInstanceOf(Float64Array);
      expect(result.volumes).toBeInstanceOf(Float64Array);
      expect(result.timestamps).toBeInstanceOf(Float64Array);
    });

    it('should preserve all values correctly', () => {
      const result = OHLCVConverter.toTypedArray(mockData);

      for (let i = 0; i < mockData.length; i++) {
        expect(result.opens[i]).toBe(mockData[i].open);
        expect(result.highs[i]).toBe(mockData[i].high);
        expect(result.lows[i]).toBe(mockData[i].low);
        expect(result.closes[i]).toBe(mockData[i].close);
        expect(result.volumes[i]).toBe(mockData[i].volume);
      }
    });

    it('should handle empty array', () => {
      const result = OHLCVConverter.toTypedArray([]);
      expect(result.length).toBe(0);
      expect(result.closes.length).toBe(0);
    });
  });

  describe('fromTypedArray', () => {
    it('should convert TypedArray format back to array of OHLCV', () => {
      const typedData = OHLCVConverter.toTypedArray(mockData);
      const result = OHLCVConverter.fromTypedArray(typedData);

      expect(result.length).toBe(mockData.length);
      
      for (let i = 0; i < result.length; i++) {
        expect(result[i].open).toBe(mockData[i].open);
        expect(result[i].high).toBe(mockData[i].high);
        expect(result[i].low).toBe(mockData[i].low);
        expect(result[i].close).toBe(mockData[i].close);
        expect(result[i].volume).toBe(mockData[i].volume);
      }
    });

    it('should preserve symbol if provided', () => {
      const typedData = OHLCVConverter.toTypedArray(mockData);
      const result = OHLCVConverter.fromTypedArray(typedData, 'TEST');

      expect(result[0].symbol).toBe('TEST');
    });
  });

  describe('slice', () => {
    it('should create a view of data without copying', () => {
      const typedData = OHLCVConverter.toTypedArray(mockData);
      const sliced = OHLCVConverter.slice(typedData, 2, 5);

      expect(sliced.length).toBe(3);
      expect(sliced.closes[0]).toBe(typedData.closes[2]);
      expect(sliced.closes[2]).toBe(typedData.closes[4]);
    });

    it('should handle slice to end', () => {
      const typedData = OHLCVConverter.toTypedArray(mockData);
      const sliced = OHLCVConverter.slice(typedData, 5);

      expect(sliced.length).toBe(5);
      expect(sliced.closes[0]).toBe(typedData.closes[5]);
    });

    it('should share memory with original (zero-copy)', () => {
      const typedData = OHLCVConverter.toTypedArray(mockData);
      const sliced = OHLCVConverter.slice(typedData, 2, 5);

      // Modify original
      typedData.closes[3] = 9999;

      // Slice should reflect the change
      expect(sliced.closes[1]).toBe(9999);
    });
  });

  describe('at', () => {
    it('should get single data point at index', () => {
      const typedData = OHLCVConverter.toTypedArray(mockData);
      const item = OHLCVConverter.at(typedData, 5);

      expect(item.open).toBe(mockData[5].open);
      expect(item.high).toBe(mockData[5].high);
      expect(item.low).toBe(mockData[5].low);
      expect(item.close).toBe(mockData[5].close);
      expect(item.volume).toBe(mockData[5].volume);
    });
  });
});

describe('OHLCVIterators', () => {
  let typedData: OHLCVData;

  beforeEach(() => {
    const mockData = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100 + i,
      high: 110 + i,
      low: 90 + i,
      close: 105 + i,
      volume: 1000000 + i * 10000,
    }));
    typedData = OHLCVConverter.toTypedArray(mockData);
  });

  describe('prices', () => {
    it('should iterate over close prices', () => {
      const prices = Array.from(OHLCVIterators.prices(typedData));
      expect(prices).toEqual([105, 106, 107, 108, 109, 110, 111, 112, 113, 114]);
    });

    it('should support range iteration', () => {
      const prices = Array.from(OHLCVIterators.prices(typedData, 2, 5));
      expect(prices).toEqual([107, 108, 109]);
    });
  });

  describe('volumes', () => {
    it('should iterate over volumes', () => {
      const volumes = Array.from(OHLCVIterators.volumes(typedData));
      expect(volumes.length).toBe(10);
      expect(volumes[0]).toBe(1000000);
    });
  });

  describe('returns', () => {
    it('should calculate price returns', () => {
      const returns = Array.from(OHLCVIterators.returns(typedData));
      expect(returns.length).toBe(9); // N-1 returns

      // Each return should be positive and small
      // First return: (106-105)/105
      expect(returns[0]).toBeCloseTo(1 / 105, 3);
      // All returns should be positive
      returns.forEach(ret => {
        expect(ret).toBeGreaterThan(0);
      });
    });
  });

  describe('trueRanges', () => {
    it('should calculate true ranges', () => {
      const trs = Array.from(OHLCVIterators.trueRanges(typedData));
      expect(trs.length).toBe(10);

      // First TR should be high - low = (110 - 90) = 20
      expect(trs[0]).toBe(20);
      
      // All TRs should be at least high - low = 20
      trs.forEach(tr => {
        expect(tr).toBeGreaterThanOrEqual(20);
      });
    });

    it('should consider previous close in TR calculation', () => {
      const trs = Array.from(OHLCVIterators.trueRanges(typedData, 0));
      expect(trs.length).toBe(10);
      
      // Each TR should be at least high - low
      trs.forEach(tr => {
        expect(tr).toBeGreaterThanOrEqual(20);
      });
    });
  });
});

describe('RingBuffer', () => {
  let buffer: RingBuffer<number>;

  beforeEach(() => {
    buffer = new RingBuffer(5);
  });

  describe('basic operations', () => {
    it('should add items to buffer', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.size()).toBe(3);
      expect(buffer.get(0)).toBe(1);
      expect(buffer.get(1)).toBe(2);
      expect(buffer.get(2)).toBe(3);
    });

    it('should handle capacity overflow', () => {
      for (let i = 1; i <= 7; i++) {
        buffer.push(i);
      }

      expect(buffer.size()).toBe(5);
      expect(buffer.get(0)).toBe(3); // Oldest is 3 (1,2 were removed)
      expect(buffer.get(4)).toBe(7); // Newest is 7
    });

    it('should get newest and oldest items', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.oldest()).toBe(1);
      expect(buffer.newest()).toBe(3);
    });

    it('should convert to array', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should clear buffer', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.clear();

      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty buffer', () => {
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.oldest()).toBeUndefined();
      expect(buffer.newest()).toBeUndefined();
      expect(buffer.get(0)).toBeUndefined();
    });

    it('should detect full buffer', () => {
      for (let i = 0; i < 5; i++) {
        buffer.push(i);
      }

      expect(buffer.isFull()).toBe(true);
    });

    it('should handle single capacity', () => {
      const tiny = new RingBuffer<number>(1);
      tiny.push(1);
      expect(tiny.size()).toBe(1);
      
      tiny.push(2);
      expect(tiny.size()).toBe(1);
      expect(tiny.get(0)).toBe(2);
    });
  });

  describe('iterator', () => {
    it('should iterate over items', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      const items = Array.from(buffer);
      expect(items).toEqual([1, 2, 3]);
    });

    it('should iterate in correct order after overflow', () => {
      for (let i = 1; i <= 7; i++) {
        buffer.push(i);
      }

      const items = Array.from(buffer);
      expect(items).toEqual([3, 4, 5, 6, 7]);
    });
  });
});

describe('OHLCVRingBuffer', () => {
  let buffer: OHLCVRingBuffer;
  let mockData: SharedOHLCV[];

  beforeEach(() => {
    buffer = new OHLCVRingBuffer(5);
    mockData = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100 + i,
      high: 110 + i,
      low: 90 + i,
      close: 105 + i,
      volume: 1000000 + i * 10000,
    }));
  });

  describe('basic operations', () => {
    it('should add OHLCV data points', () => {
      buffer.push(mockData[0]);
      buffer.push(mockData[1]);
      buffer.push(mockData[2]);

      expect(buffer.size()).toBe(3);
      expect(buffer.getLatestClose()).toBe(107);
    });

    it('should handle capacity overflow', () => {
      mockData.forEach(data => buffer.push(data));

      expect(buffer.size()).toBe(5);
      const closes = buffer.getCloses();
      expect(closes).toEqual([107, 108, 109, 110, 111]); // Last 5
    });

    it('should convert to array', () => {
      buffer.push(mockData[0]);
      buffer.push(mockData[1]);
      buffer.push(mockData[2]);

      const array = buffer.toArray('TEST');
      expect(array.length).toBe(3);
      expect(array[0].symbol).toBe('TEST');
      expect(array[0].close).toBe(105);
      expect(array[2].close).toBe(107);
    });

    it('should convert to OHLCVData', () => {
      buffer.push(mockData[0]);
      buffer.push(mockData[1]);
      buffer.push(mockData[2]);

      const data = buffer.toOHLCVData();
      expect(data.length).toBe(3);
      expect(data.closes[0]).toBe(105);
      expect(data.closes[2]).toBe(107);
    });

    it('should get closes and volumes', () => {
      buffer.push(mockData[0]);
      buffer.push(mockData[1]);

      const closes = buffer.getCloses();
      const volumes = buffer.getVolumes();

      expect(closes).toEqual([105, 106]);
      expect(volumes).toEqual([1000000, 1010000]);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      buffer.push(mockData[0]);
      buffer.push(mockData[1]);
      buffer.clear();

      expect(buffer.size()).toBe(0);
      expect(buffer.getLatestClose()).toBeUndefined();
    });
  });
});

describe('DataPipeline', () => {
  describe('average', () => {
    it('should calculate average from iterator', () => {
      const values = [1, 2, 3, 4, 5];
      const avg = DataPipeline.average(values);
      expect(avg).toBe(3);
    });

    it('should handle empty iterator', () => {
      const avg = DataPipeline.average([]);
      expect(avg).toBe(0);
    });
  });

  describe('sum', () => {
    it('should calculate sum from iterator', () => {
      const values = [1, 2, 3, 4, 5];
      const total = DataPipeline.sum(values);
      expect(total).toBe(15);
    });
  });

  describe('minMax', () => {
    it('should find min and max in single pass', () => {
      const values = [3, 1, 4, 1, 5, 9, 2, 6];
      const result = DataPipeline.minMax(values);
      expect(result.min).toBe(1);
      expect(result.max).toBe(9);
    });
  });

  describe('meanStdDev', () => {
    it('should calculate mean and standard deviation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = DataPipeline.meanStdDev(values);
      
      expect(result.mean).toBe(5);
      expect(result.stdDev).toBeCloseTo(2, 0);
    });

    it('should handle single value', () => {
      const values = [5];
      const result = DataPipeline.meanStdDev(values);
      
      expect(result.mean).toBe(5);
      expect(result.stdDev).toBe(0);
    });
  });

  describe('map', () => {
    it('should map values through function', () => {
      const values = [1, 2, 3, 4, 5];
      const mapped = Array.from(DataPipeline.map(values, x => x * 2));
      expect(mapped).toEqual([2, 4, 6, 8, 10]);
    });

    it('should provide index to mapper', () => {
      const values = [10, 20, 30];
      const mapped = Array.from(DataPipeline.map(values, (x, i) => x + i));
      expect(mapped).toEqual([10, 21, 32]);
    });
  });

  describe('filter', () => {
    it('should filter values through predicate', () => {
      const values = [1, 2, 3, 4, 5];
      const filtered = Array.from(DataPipeline.filter(values, x => x % 2 === 0));
      expect(filtered).toEqual([2, 4]);
    });
  });

  describe('take', () => {
    it('should take first N values', () => {
      const values = [1, 2, 3, 4, 5];
      const taken = Array.from(DataPipeline.take(values, 3));
      expect(taken).toEqual([1, 2, 3]);
    });

    it('should handle N larger than iterable', () => {
      const values = [1, 2, 3];
      const taken = Array.from(DataPipeline.take(values, 10));
      expect(taken).toEqual([1, 2, 3]);
    });
  });

  describe('skip', () => {
    it('should skip first N values', () => {
      const values = [1, 2, 3, 4, 5];
      const skipped = Array.from(DataPipeline.skip(values, 2));
      expect(skipped).toEqual([3, 4, 5]);
    });

    it('should handle N larger than iterable', () => {
      const values = [1, 2, 3];
      const skipped = Array.from(DataPipeline.skip(values, 10));
      expect(skipped).toEqual([]);
    });
  });

  describe('pipeline composition', () => {
    it('should compose multiple operations', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      // Skip first 2, take 5, filter evens, double them
      const result = Array.from(
        DataPipeline.map(
          DataPipeline.filter(
            DataPipeline.take(
              DataPipeline.skip(values, 2),
              5
            ),
            x => x % 2 === 0
          ),
          x => x * 2
        )
      );
      
      // Skip 2: [3,4,5,6,7,8,9,10]
      // Take 5: [3,4,5,6,7]
      // Filter evens: [4,6]
      // Double: [8,12]
      expect(result).toEqual([8, 12]);
    });

    it('should work with lazy evaluation (generators)', () => {
      let callCount = 0;
      const generator = function*() {
        for (let i = 1; i <= 100; i++) {
          callCount++;
          yield i;
        }
      };

      // Only take 3, so generator should only be called few times
      const result = Array.from(DataPipeline.take(generator(), 3));
      
      expect(result).toEqual([1, 2, 3]);
      // Generator should be called approximately 3-4 times (lazy evaluation working)
      expect(callCount).toBeLessThan(10); // Much less than 100
    });
  });
});

describe('Performance characteristics', () => {
  it('should demonstrate TypedArray memory efficiency', () => {
    const mockData = Array.from({ length: 1000 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100 + i * 0.1,
      high: 110 + i * 0.1,
      low: 90 + i * 0.1,
      close: 105 + i * 0.1,
      volume: 1000000 + i * 100,
    }));

    const typedData = OHLCVConverter.toTypedArray(mockData);

    // TypedArray should have predictable size
    const expectedBytes = 1000 * 8 * 6; // 1000 items * 8 bytes * 6 fields
    const actualBytes = (
      typedData.opens.byteLength +
      typedData.highs.byteLength +
      typedData.lows.byteLength +
      typedData.closes.byteLength +
      typedData.volumes.byteLength +
      typedData.timestamps.byteLength
    );

    expect(actualBytes).toBe(expectedBytes);
  });

  it('should demonstrate zero-copy slice efficiency', () => {
    const mockData = Array.from({ length: 1000 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000000,
    }));

    const typedData = OHLCVConverter.toTypedArray(mockData);
    const slice1 = OHLCVConverter.slice(typedData, 100, 200);
    const slice2 = OHLCVConverter.slice(slice1, 10, 50);

    // All slices should share the same underlying buffer
    expect(slice1.closes.buffer).toBe(typedData.closes.buffer);
    expect(slice2.closes.buffer).toBe(typedData.closes.buffer);
  });
});
