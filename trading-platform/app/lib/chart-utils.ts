/**
 * Chart Utilities for Performance Optimization
 * 
 * Provides utilities for optimizing chart rendering performance:
 * - Data point reduction for large datasets
 * - Downsampling algorithms (LTTB - Largest Triangle Three Buckets)
 * - Data aggregation
 */

import { OHLCV } from '@/app/types';

/**
 * Configuration for data point reduction
 */
export interface DataReductionConfig {
  /** Target number of data points */
  targetPoints: number;
  /** Algorithm to use for reduction */
  algorithm?: 'simple' | 'lttb' | 'aggregate';
  /** Whether to preserve peaks and valleys */
  preserveExtremes?: boolean;
}

/**
 * Reduce data points using simple sampling
 * Fast but may miss important data points
 * 
 * @param data - Input OHLCV data array
 * @param targetPoints - Target number of points
 * @returns Reduced data array
 */
export function simpleSampleReduction(data: OHLCV[], targetPoints: number): OHLCV[] {
  if (data.length <= targetPoints) {
    return data;
  }

  const step = Math.floor(data.length / targetPoints);
  const result: OHLCV[] = [];

  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }

  // Always include the last data point
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }

  return result;
}

/**
 * Largest Triangle Three Buckets (LTTB) algorithm
 * More sophisticated downsampling that preserves visual shape
 * 
 * Reference: https://github.com/sveinn-steinarsson/flot-downsample
 * 
 * @param data - Input OHLCV data array
 * @param threshold - Target number of points
 * @returns Downsampled data array
 */
export function lttbDownsample(data: OHLCV[], threshold: number): OHLCV[] {
  if (data.length <= threshold) {
    return data;
  }

  const sampled: OHLCV[] = [];
  
  // Always add first point
  sampled.push(data[0]);

  // Bucket size
  const bucketSize = (data.length - 2) / (threshold - 2);

  let a = 0; // Initially a is the first point in the triangle

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket
    let avgX = 0;
    let avgY = 0;
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeLength = Math.min(avgRangeEnd, data.length) - avgRangeStart;

    for (let j = avgRangeStart; j < Math.min(avgRangeEnd, data.length); j++) {
      avgX += j;
      avgY += data[j].close;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point a
    const pointAX = a;
    const pointAY = data[a].close;

    let maxArea = -1;
    let maxAreaPoint = 0;

    for (let j = rangeOffs; j < Math.min(rangeTo, data.length); j++) {
      // Calculate triangle area over three buckets
      const area = Math.abs(
        (pointAX - avgX) * (data[j].close - pointAY) -
        (pointAX - j) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint; // This point is the next a
  }

  // Always add last point
  sampled.push(data[data.length - 1]);

  return sampled;
}

/**
 * Aggregate data points by time buckets
 * Useful for reducing noise and showing trends
 * 
 * @param data - Input OHLCV data array
 * @param bucketSize - Number of points to aggregate into one
 * @returns Aggregated data array
 */
export function aggregateDataPoints(data: OHLCV[], bucketSize: number): OHLCV[] {
  if (data.length <= bucketSize || bucketSize <= 1) {
    return data;
  }

  const result: OHLCV[] = [];
  
  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, Math.min(i + bucketSize, data.length));
    
    if (bucket.length === 0) continue;

    // Aggregate OHLCV data
    const aggregated: OHLCV = {
      symbol: bucket[0].symbol,
      date: bucket[0].date, // Use first date in bucket
      open: bucket[0].open,
      high: Math.max(...bucket.map(d => d.high)),
      low: Math.min(...bucket.map(d => d.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((sum, d) => sum + d.volume, 0),
    };

    result.push(aggregated);
  }

  return result;
}

/**
 * Main data reduction function with configurable algorithms
 * 
 * @param data - Input OHLCV data array
 * @param config - Configuration for data reduction
 * @returns Reduced data array
 */
export function reduceDataPoints(
  data: OHLCV[],
  config: DataReductionConfig
): OHLCV[] {
  if (data.length <= config.targetPoints) {
    return data;
  }

  const algorithm = config.algorithm || 'lttb';

  switch (algorithm) {
    case 'simple':
      return simpleSampleReduction(data, config.targetPoints);
    
    case 'lttb':
      return lttbDownsample(data, config.targetPoints);
    
    case 'aggregate': {
      const bucketSize = Math.ceil(data.length / config.targetPoints);
      return aggregateDataPoints(data, bucketSize);
    }
    
    default:
      return data;
  }
}

/**
 * Preserve extreme points (peaks and valleys) in data
 * 
 * @param data - Input OHLCV data array
 * @returns Array of indices for extreme points
 */
export function findExtremePoints(data: OHLCV[]): number[] {
  if (data.length < 3) {
    return [];
  }

  const extremes: number[] = [];

  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1].close;
    const curr = data[i].close;
    const next = data[i + 1].close;

    // Peak
    if (curr > prev && curr > next) {
      extremes.push(i);
    }
    // Valley
    else if (curr < prev && curr < next) {
      extremes.push(i);
    }
  }

  return extremes;
}

/**
 * Calculate optimal number of data points for a given chart width
 * 
 * @param chartWidth - Width of the chart in pixels
 * @param dataLength - Total number of data points
 * @param minPixelsPerPoint - Minimum pixels per data point (default: 2)
 * @returns Optimal number of points to display
 */
export function calculateOptimalDataPoints(
  chartWidth: number,
  dataLength: number,
  minPixelsPerPoint: number = 2
): number {
  const maxPoints = Math.floor(chartWidth / minPixelsPerPoint);
  return Math.min(maxPoints, dataLength);
}

/**
 * Check if data reduction is beneficial
 * 
 * @param dataLength - Number of data points
 * @param threshold - Threshold to trigger reduction (default: 500)
 * @returns Whether reduction should be applied
 */
export function shouldReduceData(dataLength: number, threshold: number = 500): boolean {
  return dataLength > threshold;
}

/**
 * Efficiently calculates the min and max values for chart Y-axis scaling.
 * Avoids creating intermediate arrays and uses a single pass loop.
 *
 * @param data - OHLCV data array
 * @param indicators - Optional object containing indicator arrays (sma, upper, lower)
 * @returns Object containing min and max values
 */
export function calculateChartMinMax(
  data: OHLCV[],
  indicators: {
    sma?: number[],
    upper?: number[],
    lower?: number[],
  } = {}
): { min: number, max: number } {
  let min = Infinity;
  let max = -Infinity;
  const hasData = data.length > 0;

  // 1. Current Price
  if (hasData) {
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
    }
  }

  // 2. Indicators (SMA, Bollinger)
  const { sma, upper, lower } = indicators;

  // Helper to update min/max from number array
  const updateFromSeries = (arr: number[]) => {
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (typeof v === 'number' && !isNaN(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  };

  if (sma) updateFromSeries(sma);
  if (upper) updateFromSeries(upper);
  if (lower) updateFromSeries(lower);

  // Fallback if no valid numbers found
  if (min === Infinity) return { min: 0, max: 100 };

  return { min, max };
}
