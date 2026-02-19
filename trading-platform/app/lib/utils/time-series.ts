import { OHLCV } from '@/app/types';

/**
 * Interpolate OHLCV data to fill gaps.
 * This function sorts the data by date and fills any missing days (excluding weekends)
 * using linear interpolation.
 */
export function interpolateOHLCV(data: OHLCV[]): OHLCV[] {
  if (data.length < 2) return data;
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return interpolateValues(fillGaps(sorted));
}

/**
 * Fill gaps in OHLCV data with zero-value entries.
 * Exposed for testing and advanced usage.
 */
export function fillGaps(sorted: OHLCV[]): OHLCV[] {
  const filled: OHLCV[] = [];
  const MS_PER_DAY = 86400000;
  const MAX_GAP_DAYS = 365; // Security: Prevent DoS from massive gaps

  for (let i = 0; i < sorted.length; i++) {
    filled.push(sorted[i]);
    if (i >= sorted.length - 1) continue;
    const diffDays = Math.floor((new Date(sorted[i + 1].date).getTime() - new Date(sorted[i].date).getTime()) / MS_PER_DAY);
    if (diffDays <= 1) continue;

    const gapsToFill = Math.min(diffDays, MAX_GAP_DAYS);
    for (let d = 1; d < gapsToFill; d++) {
      const gapDate = new Date(new Date(sorted[i].date).getTime() + d * MS_PER_DAY);
      if (gapDate.getDay() !== 0 && gapDate.getDay() !== 6) {
        filled.push({ date: gapDate.toISOString().split('T')[0], open: 0, high: 0, low: 0, close: 0, volume: 0 });
      }
    }
  }
  return filled;
}

/**
 * Interpolate values for zero-value entries created by fillGaps.
 */
export function interpolateValues(data: OHLCV[]): OHLCV[] {
  const result = [...data];
  const fields: (keyof Pick<OHLCV, 'open' | 'high' | 'low' | 'close'>)[] = ['open', 'high', 'low', 'close'];
  for (const field of fields) {
    for (let i = 0; i < result.length; i++) {
      const entry = result[i];
      if (entry[field] !== 0) continue;

      const prevIdx = findNearest(result, i, field, -1);
      const nextIdx = findNearest(result, i, field, 1);

      if (prevIdx >= 0 && nextIdx < result.length) {
        const prevValue = result[prevIdx][field]!;
        const nextValue = result[nextIdx][field]!;
        const gap = nextIdx - prevIdx;
        result[i][field] = Number((prevValue + (nextValue - prevValue) * (i - prevIdx) / gap).toFixed(2));
      } else if (prevIdx >= 0) {
        result[i][field] = result[prevIdx][field]!;
      } else if (nextIdx < result.length) {
        result[i][field] = result[nextIdx][field]!;
      }
    }
  }
  return result;
}

/**
 * Find the nearest non-zero value index in the specified direction.
 */
export function findNearest(data: OHLCV[], idx: number, field: keyof OHLCV, dir: -1 | 1): number {
  let curr = idx + dir;
  while (curr >= 0 && curr < data.length && data[curr][field] === 0) curr += dir;
  return curr;
}
