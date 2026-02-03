// @ts-nocheck
/**
 * データパイプライン最適化
 * 
 * このモジュールは、時系列データの効率的な処理のためのデータ構造を提供します。
 * (#526: データパイプライン最適化)
 */

import { OHLCV } from '../../types';

/**
 * カラム指向OHLCVデータ構造
 * Float64Arrayを使用してメモリ効率と計算パフォーマンスを最適化
 */
export interface ColumnarOHLCV {
  timestamps: Float64Array;
  opens: Float64Array;
  highs: Float64Array;
  lows: Float64Array;
  closes: Float64Array;
  volumes: Float64Array;
  length: number;
}

/**
 * OHLCV配列をカラム指向構造に変換
 */
export function toColumnarOHLCV(data: OHLCV[]): ColumnarOHLCV {
  const length = data.length;
  const timestamps = new Float64Array(length);
  const opens = new Float64Array(length);
  const highs = new Float64Array(length);
  const lows = new Float64Array(length);
  const closes = new Float64Array(length);
  const volumes = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    const candle = data[i];
    timestamps[i] = candle.timestamp;
    opens[i] = candle.open;
    highs[i] = candle.high;
    lows[i] = candle.low;
    closes[i] = candle.close;
    volumes[i] = candle.volume;
  }

  return {
    timestamps,
    opens,
    highs,
    lows,
    closes,
    volumes,
    length,
  };
}

/**
 * カラム指向構造をOHLCV配列に変換
 */
export function fromColumnarOHLCV(columnar: ColumnarOHLCV): OHLCV[] {
  const result: OHLCV[] = [];
  for (let i = 0; i < columnar.length; i++) {
    result.push({
      timestamp: columnar.timestamps[i],
      open: columnar.opens[i],
      high: columnar.highs[i],
      low: columnar.lows[i],
      close: columnar.closes[i],
      volume: columnar.volumes[i],
    });
  }
  return result;
}

/**
 * カラム指向OHLCVのスライスを取得
 */
export function sliceColumnarOHLCV(
  columnar: ColumnarOHLCV,
  start: number,
  end?: number
): ColumnarOHLCV {
  const actualEnd = end ?? columnar.length;
  return {
    timestamps: columnar.timestamps.slice(start, actualEnd),
    opens: columnar.opens.slice(start, actualEnd),
    highs: columnar.highs.slice(start, actualEnd),
    lows: columnar.lows.slice(start, actualEnd),
    closes: columnar.closes.slice(start, actualEnd),
    volumes: columnar.volumes.slice(start, actualEnd),
    length: actualEnd - start,
  };
}

/**
 * 時系列データ用リングバッファ
 * 固定サイズの循環バッファで効率的なデータ管理を実現
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * 要素を追加
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  /**
   * 最新の要素を取得
   */
  peek(): T | undefined {
    if (this.count === 0) return undefined;
    const index = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }

  /**
   * 最古の要素を取得
   */
  peekOldest(): T | undefined {
    if (this.count === 0) return undefined;
    return this.buffer[this.tail];
  }

  /**
   * すべての要素を取得（古い順）
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.tail + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * 現在の要素数
   */
  size(): number {
    return this.count;
  }

  /**
   * バッファが満杯か
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * バッファが空か
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * バッファをクリア
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.buffer = new Array(this.capacity);
  }
}

/**
 * 数値用高速リングバッファ（Float64Arrayベース）
 */
export class Float64RingBuffer {
  private buffer: Float64Array;
  private head = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity);
  }

  /**
   * 値を追加
   */
  push(value: number): void {
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * 最新の値を取得
   */
  peek(): number {
    if (this.count === 0) return 0;
    const index = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }

  /**
   * すべての値を取得（古い順）
   */
  toArray(): Float64Array {
    if (this.count === 0) return new Float64Array(0);

    const result = new Float64Array(this.count);
    const tail = (this.head - this.count + this.capacity) % this.capacity;

    for (let i = 0; i < this.count; i++) {
      result[i] = this.buffer[(tail + i) % this.capacity];
    }

    return result;
  }

  /**
   * 移動平均を計算
   */
  movingAverage(period: number): number {
    if (period > this.count) return 0;

    let sum = 0;
    const start = (this.head - period + this.capacity) % this.capacity;

    for (let i = 0; i < period; i++) {
      sum += this.buffer[(start + i) % this.capacity];
    }

    return sum / period;
  }

  /**
   * 現在の要素数
   */
  size(): number {
    return this.count;
  }

  /**
   * バッファをクリア
   */
  clear(): void {
    this.head = 0;
    this.count = 0;
    this.buffer.fill(0);
  }
}

/**
 * 配列操作の最適化ユーティリティ
 */
export const OptimizedArrays = {
  /**
   * 高速合計計算
   */
  sum(arr: Float64Array | number[]): number {
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
      total += arr[i];
    }
    return total;
  },

  /**
   * 高速平均計算
   */
  average(arr: Float64Array | number[]): number {
    if (arr.length === 0) return 0;
    return OptimizedArrays.sum(arr) / arr.length;
  },

  /**
   * 高速分散計算
   */
  variance(arr: Float64Array | number[]): number {
    if (arr.length < 2) return 0;
    const avg = OptimizedArrays.average(arr);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      const diff = arr[i] - avg;
      sum += diff * diff;
    }
    return sum / arr.length;
  },

  /**
   * 高速標準偏差計算
   */
  stdDev(arr: Float64Array | number[]): number {
    return Math.sqrt(OptimizedArrays.variance(arr));
  },

  /**
   * 高速最大値計算
   */
  max(arr: Float64Array | number[]): number {
    if (arr.length === 0) return -Infinity;
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > max) max = arr[i];
    }
    return max;
  },

  /**
   * 高速最小値計算
   */
  min(arr: Float64Array | number[]): number {
    if (arr.length === 0) return Infinity;
    let min = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < min) min = arr[i];
    }
    return min;
  },

  /**
   * 高速移動平均
   */
  movingAverage(data: Float64Array | number[], period: number): Float64Array {
    if (period <= 0 || period > data.length) {
      return new Float64Array(0);
    }

    const result = new Float64Array(data.length - period + 1);
    let sum = 0;

    // 最初のウィンドウ
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    result[0] = sum / period;

    // スライディングウィンドウ
    for (let i = period; i < data.length; i++) {
      sum += data[i] - data[i - period];
      result[i - period + 1] = sum / period;
    }

    return result;
  },

  /**
   * 高速リターン計算
   */
  returns(prices: Float64Array | number[]): Float64Array {
    if (prices.length < 2) return new Float64Array(0);

    const result = new Float64Array(prices.length - 1);
    for (let i = 1; i < prices.length; i++) {
      result[i - 1] = (prices[i] - prices[i - 1]) / prices[i - 1];
    }

    return result;
  },
};
