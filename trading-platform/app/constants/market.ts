/**
 * Market Data Constants
 * Refactor 001: Centralized constants
 */

export const MARKET_DATA_CACHE_TTL = {
  realtime: 30 * 1000,          // 30 seconds - Realtime data
  intraday: 5 * 60 * 1000,      // 5 minutes - Intraday data
  daily: 24 * 60 * 60 * 1000,   // 24 hours - Daily data (Fixed from 24 mins)
  weekly: 7 * 24 * 60 * 60 * 1000, // 1 week - Weekly data (Fixed from ~3 hours)
  quote: 60 * 1000,             // 1 minute - Quote data
  signal: 15 * 60 * 1000,       // 15 minutes - Signal
  indicators: 30 * 60 * 1000    // 30 minutes - Technical indicators
};

export const MARKET_DATA_MAX_CACHE_SIZE = 500; // Reduced from 1000 for memory efficiency
export const MARKET_DATA_CACHE_CLEANUP_INTERVAL = 60 * 1000; // 1 minute cleanup interval
