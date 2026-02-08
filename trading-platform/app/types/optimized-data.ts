/**
 * Optimized Data Structures for High-Performance Data Processing
 * 
 * This module provides TypedArray-based data structures for efficient memory usage
 * and faster computation in data pipelines.
 */

import { SharedOHLCV } from './shared';

/**
 * Column-oriented OHLCV data using TypedArrays for efficient memory usage
 * and faster computation.
 * 
 * Benefits:
 * - ~50% memory reduction compared to array of objects
 * - Better CPU cache utilization (contiguous memory)
 * - Faster iteration and mathematical operations
 * - Zero-copy operations possible
 */
export interface OHLCVData {
  length: number;
  opens: Float64Array;
  highs: Float64Array;
  lows: Float64Array;
  closes: Float64Array;
  volumes: Float64Array;
  timestamps: Float64Array;  // Unix timestamps in milliseconds
}

/**
 * Converter utilities for OHLCV data formats
 */
export class OHLCVConverter {
  /**
   * Convert array of OHLCV objects to column-oriented TypedArray format
   */
  static toTypedArray(data: SharedOHLCV[]): OHLCVData {
    const length = data.length;
    const opens = new Float64Array(length);
    const highs = new Float64Array(length);
    const lows = new Float64Array(length);
    const closes = new Float64Array(length);
    const volumes = new Float64Array(length);
    const timestamps = new Float64Array(length);

    for (let i = 0; i < length; i++) {
      const item = data[i];
      opens[i] = item.open;
      highs[i] = item.high;
      lows[i] = item.low;
      closes[i] = item.close;
      volumes[i] = item.volume;
      timestamps[i] = new Date(item.date).getTime();
    }

    return { length, opens, highs, lows, closes, volumes, timestamps };
  }

  /**
   * Convert column-oriented TypedArray format to array of OHLCV objects
   */
  static fromTypedArray(data: OHLCVData, symbol?: string): SharedOHLCV[] {
    const result: SharedOHLCV[] = new Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      result[i] = {
        symbol,
        date: new Date(data.timestamps[i]).toISOString(),
        open: data.opens[i],
        high: data.highs[i],
        low: data.lows[i],
        close: data.closes[i],
        volume: data.volumes[i],
      };
    }

    return result;
  }

  /**
   * Create a slice of OHLCVData without copying (view of original data)
   * This is much more efficient than array slice operations
   */
  static slice(data: OHLCVData, start: number, end?: number): OHLCVData {
    const clampedStart = Math.max(0, Math.min(start, data.length));
    const actualEnd = Math.min(end ?? data.length, data.length);
    const length = Math.max(0, actualEnd - clampedStart);

    return {
      length,
      opens: data.opens.subarray(clampedStart, actualEnd),
      highs: data.highs.subarray(clampedStart, actualEnd),
      lows: data.lows.subarray(clampedStart, actualEnd),
      closes: data.closes.subarray(clampedStart, actualEnd),
      volumes: data.volumes.subarray(clampedStart, actualEnd),
      timestamps: data.timestamps.subarray(clampedStart, actualEnd),
    };
  }

  /**
   * Get a single OHLCV data point at index
   */
  static at(data: OHLCVData, index: number, symbol?: string): SharedOHLCV {
    return {
      symbol,
      date: new Date(data.timestamps[index]).toISOString(),
      open: data.opens[index],
      high: data.highs[index],
      low: data.lows[index],
      close: data.closes[index],
      volume: data.volumes[index],
    };
  }
}

/**
 * Iterator utilities for lazy evaluation and efficient data processing
 */
export class OHLCVIterators {
  /**
   * Generator for iterating over close prices
   */
  static *prices(data: OHLCVData, start = 0, end?: number): Generator<number> {
    const actualEnd = end ?? data.length;
    for (let i = start; i < actualEnd; i++) {
      yield data.closes[i];
    }
  }

  /**
   * Generator for iterating over volumes
   */
  static *volumes(data: OHLCVData, start = 0, end?: number): Generator<number> {
    const actualEnd = end ?? data.length;
    for (let i = start; i < actualEnd; i++) {
      yield data.volumes[i];
    }
  }

  /**
   * Generator for iterating over price changes (returns)
   */
  static *returns(data: OHLCVData, start = 1, end?: number): Generator<number> {
    const actualEnd = end ?? data.length;
    for (let i = start; i < actualEnd; i++) {
      const prev = data.closes[i - 1];
      const curr = data.closes[i];
      yield (curr - prev) / prev;
    }
  }

  /**
   * Generator for iterating over true ranges
   */
  static *trueRanges(data: OHLCVData, start = 0, end?: number): Generator<number> {
    const actualEnd = end ?? data.length;
    
    for (let i = start; i < actualEnd; i++) {
      const high = data.highs[i];
      const low = data.lows[i];
      
      if (i === 0) {
        // First element uses high - low
        yield high - low;
      } else {
        const prevClose = data.closes[i - 1];
        const tr = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );
        yield tr;
      }
    }
  }
}

/**
 * Ring buffer for efficient sliding window operations on time-series data
 * Automatically manages memory and provides O(1) append operations
 */
export class RingBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity);
  }

  /**
   * Add an item to the buffer. If full, oldest item is automatically removed.
   */
  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Buffer is full, move head forward
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Get item at index (0 = oldest, size-1 = newest)
   * Returns undefined if index is out of bounds
   * 
   * @param index - Index to retrieve (0-based from oldest)
   * @returns The item at the index, or undefined if out of bounds
   * @example
   * const buffer = new RingBuffer<number>(5);
   * buffer.push(1, 2, 3);
   * buffer.get(0);  // Returns 1 (oldest)
   * buffer.get(10); // Returns undefined (out of bounds)
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Get the newest item
   */
  newest(): T | undefined {
    if (this.count === 0) return undefined;
    const index = (this.tail - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }

  /**
   * Get the oldest item
   */
  oldest(): T | undefined {
    if (this.count === 0) return undefined;
    return this.buffer[this.head];
  }

  /**
   * Get current size
   */
  size(): number {
    return this.count;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Convert to array (oldest to newest)
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Iterate over items (oldest to newest)
   */
  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      yield this.buffer[index];
    }
  }
}

/**
 * Ring buffer specialized for OHLCV data
 * Maintains a sliding window of recent market data
 */
export class OHLCVRingBuffer {
  private opens: RingBuffer<number>;
  private highs: RingBuffer<number>;
  private lows: RingBuffer<number>;
  private closes: RingBuffer<number>;
  private volumes: RingBuffer<number>;
  private timestamps: RingBuffer<number>;

  constructor(capacity: number) {
    this.opens = new RingBuffer(capacity);
    this.highs = new RingBuffer(capacity);
    this.lows = new RingBuffer(capacity);
    this.closes = new RingBuffer(capacity);
    this.volumes = new RingBuffer(capacity);
    this.timestamps = new RingBuffer(capacity);
  }

  /**
   * Add a new OHLCV data point
   */
  push(data: SharedOHLCV): void {
    this.opens.push(data.open);
    this.highs.push(data.high);
    this.lows.push(data.low);
    this.closes.push(data.close);
    this.volumes.push(data.volume);
    this.timestamps.push(new Date(data.date).getTime());
  }

  /**
   * Get current size
   */
  size(): number {
    return this.closes.size();
  }

  /**
   * Convert to OHLCVData format
   */
  toOHLCVData(): OHLCVData {
    const length = this.size();
    return {
      length,
      opens: new Float64Array(this.opens.toArray()),
      highs: new Float64Array(this.highs.toArray()),
      lows: new Float64Array(this.lows.toArray()),
      closes: new Float64Array(this.closes.toArray()),
      volumes: new Float64Array(this.volumes.toArray()),
      timestamps: new Float64Array(this.timestamps.toArray()),
    };
  }

  /**
   * Convert to array of OHLCV objects
   */
  toArray(symbol?: string): SharedOHLCV[] {
    const length = this.size();
    const result: SharedOHLCV[] = new Array(length);
    
    for (let i = 0; i < length; i++) {
      result[i] = {
        symbol,
        date: new Date(this.timestamps.get(i)!).toISOString(),
        open: this.opens.get(i)!,
        high: this.highs.get(i)!,
        low: this.lows.get(i)!,
        close: this.closes.get(i)!,
        volume: this.volumes.get(i)!,
      };
    }

    return result;
  }

  /**
   * Get the most recent close price
   */
  getLatestClose(): number | undefined {
    return this.closes.newest();
  }

  /**
   * Get array of recent close prices
   */
  getCloses(): number[] {
    return this.closes.toArray();
  }

  /**
   * Get array of recent volumes
   */
  getVolumes(): number[] {
    return this.volumes.toArray();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.opens.clear();
    this.highs.clear();
    this.lows.clear();
    this.closes.clear();
    this.volumes.clear();
    this.timestamps.clear();
  }
}

/**
 * Pipeline processing utilities for composing data transformations
 */
export class DataPipeline {
  /**
   * Calculate average from iterator (single pass)
   */
  static average(values: Iterable<number>): number {
    let sum = 0;
    let count = 0;
    for (const value of values) {
      sum += value;
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * Calculate sum from iterator (single pass)
   */
  static sum(values: Iterable<number>): number {
    let sum = 0;
    for (const value of values) {
      sum += value;
    }
    return sum;
  }

  /**
   * Calculate min and max in a single pass
   */
  static minMax(values: Iterable<number>): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    for (const value of values) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { min, max };
  }

  /**
   * Calculate mean and standard deviation in a single pass (Welford's method)
   */
  static meanStdDev(values: Iterable<number>): { mean: number; stdDev: number } {
    let count = 0;
    let mean = 0;
    let m2 = 0;

    for (const value of values) {
      count++;
      const delta = value - mean;
      mean += delta / count;
      const delta2 = value - mean;
      m2 += delta * delta2;
    }

    const variance = count > 1 ? m2 / count : 0;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Map values through a transformation function
   */
  static *map<T, U>(values: Iterable<T>, fn: (value: T, index: number) => U): Generator<U> {
    let index = 0;
    for (const value of values) {
      yield fn(value, index++);
    }
  }

  /**
   * Filter values through a predicate function
   */
  static *filter<T>(values: Iterable<T>, fn: (value: T, index: number) => boolean): Generator<T> {
    let index = 0;
    for (const value of values) {
      if (fn(value, index++)) {
        yield value;
      }
    }
  }

  /**
   * Take first N values
   */
  static *take<T>(values: Iterable<T>, n: number): Generator<T> {
    let count = 0;
    for (const value of values) {
      if (count++ >= n) break;
      yield value;
    }
  }

  /**
   * Skip first N values
   */
  static *skip<T>(values: Iterable<T>, n: number): Generator<T> {
    let count = 0;
    for (const value of values) {
      if (count++ < n) continue;
      yield value;
    }
  }
}
