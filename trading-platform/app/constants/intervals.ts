/**
 * Constants for chart intervals and market data
 */

/**
 * Intraday intervals that require minute/hour-level data
 * These are not available for Japanese stocks via yahoo-finance2
 */
export const INTRADAY_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1H', '4H'] as const;

/**
 * Daily and longer intervals that are available for all markets
 */
export const DAILY_INTERVALS = ['1d', 'D', '1wk', '1mo'] as const;

/**
 * All supported intervals
 */
export const ALL_INTERVALS = [...INTRADAY_INTERVALS, ...DAILY_INTERVALS] as const;

/**
 * Japanese market data delay in minutes
 * Due to data provider limitations
 */
export const JAPANESE_MARKET_DELAY_MINUTES = 20;

/**
 * Check if an interval is intraday
 */
export function isIntradayInterval(interval: string): boolean {
  return INTRADAY_INTERVALS.some(i => i.toLowerCase() === interval.toLowerCase());
}

/**
 * Normalize interval string (handle both uppercase and lowercase variations)
 */
export function normalizeInterval(interval: string): string {
  const upper = interval.toUpperCase();
  const lower = interval.toLowerCase();
  
  // Map common variations
  const mapping: Record<string, string> = {
    '1H': '1h',
    '4H': '4h',
    'D': '1d'
  };
  
  return mapping[interval] || mapping[upper] || lower;
}
