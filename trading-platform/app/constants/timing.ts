/**
 * Timing Constants
 * Centralized timeout and interval values
 */

// Timeouts (in milliseconds)
export const TIMEOUT = {
  DEFAULT: 30000,                    // 30 seconds - default timeout
  SHORT: 5000,                       // 5 seconds - short operations
  LONG: 60000,                       // 1 minute - long operations
  API_RETRY: 10000,                  // 10 seconds - API retry timeout
  REAL_TIME_POLLING: 20000,          // 20 seconds - real-time data polling
  REAL_TIME_POLLING_JAPAN: 30000,    // 30 seconds - Japan market polling
  SUCCESS_MESSAGE: 3000,             // 3 seconds - show success message
  ANALYTICS_REPORT: 10000,           // 10 seconds - report to analytics
  PROGRESS_RESET: 1000,               // 1 second - reset progress bar
  CLIPBOARD_COPY: 2000,              // 2 seconds - clipboard copy feedback
  DEBOUNCE_SHORT: 100,               // 100ms - short debounce
  DEBOUNCE_MEDIUM: 300,              // 300ms - medium debounce
  IDLE_CALLBACK: 100,                // 100ms - idle callback fallback
};

// Intervals (in milliseconds)
export const INTERVAL = {
  PERFORMANCE_CHECK: 2000,           // 2 seconds - performance metrics check
  MEMORY_CHECK: 30000,                // 30 seconds - memory usage check
  CACHE_CLEANUP: 60000,              // 1 minute - cache cleanup interval
  CACHE_TTL_SHORT: 60000,            // 1 minute - short TTL
  CACHE_TTL_MEDIUM: 300000,          // 5 minutes - medium TTL
};

/**
 * Market data specific timing constants
 * 
 * キャッシュの生存時間（TTL）、最大サイズ、クリーンアップ間隔を定義
 */
export const MARKET_DATA = {
  /** キャッシュの生存時間（TTL）設定 */
  CACHE_TTL: {
    realtime: 30 * 1000,            // 30 seconds - リアルタイムデータ: 30秒でリフレッシュ
    intraday: 5 * 60 * 1000,        // 5 minutes - イントラデイ: 5分間隔
    daily: 24 * 60 * 60 * 1000,    // 24 hours - 日次データ: 24時間保持
    weekly: 7 * 24 * 60 * 60 * 1000, // 1 week - 週次データ: 1週間保持
    quote: 60 * 1000,                // 1 minute - 価格情報: 1分間保持
    signal: 15 * 60 * 1000,          // 15 minutes - シグナル: 15分間保持
    indicators: 30 * 60 * 1000,      // 30 minutes - テクニカル指標: 30分間保持
  },
  /** 最大500エントリまでキャッシュ */
  MAX_CACHE_SIZE: 500,
  /** 1分ごとにクリーンアップ */
  CACHE_CLEANUP_INTERVAL: 60 * 1000,
};

// Animation durations (in milliseconds)
export const ANIMATION = {
  FAST: 150,                         // 150ms - fast animations
  NORMAL: 300,                       // 300ms - normal animations
  SLOW: 500,                         // 500ms - slow animations
};

// Retry delays (in milliseconds)
export const RETRY_DELAY = {
  INITIAL: 1000,                     // 1 second - initial retry
  MAX: 30000,                        // 30 seconds - max retry delay
  EXPONENTIAL_BASE: 500,             // 500ms - exponential backoff base
};
