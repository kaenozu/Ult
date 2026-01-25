/**
 * API通信に関連する定数
 */

// キャッシュの設定
export const CACHE_CONFIG = {
  /** デフォルトキャッシュ期間（ミリ秒） */
  DEFAULT_DURATION_MS: 5 * 60 * 1000, // 5分
  /** 株価データの更新間隔（ミリ秒） */
  STOCK_UPDATE_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24時間
  /** チャンクサイズ（データ取得単位） */
  CHUNK_SIZE: 50,
} as const;

// レート制限の設定
export const RATE_LIMIT = {
  /** リクエストの間隔（ミリ秒） */
  REQUEST_INTERVAL_MS: 12000, // 12秒
  /** 最大リトライ回数 */
  MAX_RETRIES: 3,
  /** リトライの遅延（ミリ秒） */
  RETRY_DELAY_MS: 1000,
} as const;

// データ品質の設定
export const DATA_QUALITY = {
  /** 最小データ期間 */
  MIN_DATA_LENGTH: 20,
  /** 無効な価格の閾値 */
  MIN_PRICE_THRESHOLD: 0.0001,
  /** ギャップ補完の最大日数 */
  MAX_GAP_DAYS: 7,
} as const;

// APIエンドポイントの設定
export const API_ENDPOINTS = {
  /** Alpha Vantage API */
  ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
} as const;
