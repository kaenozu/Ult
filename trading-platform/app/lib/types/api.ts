/**
 * API レスポンス型定義
 * 
 * APIエンドポイントからのレスポンスの型安全性を向上させるための型定義
 */

// ============================================================================
// 基本API レスポンス型
// ============================================================================

/**
 * 基本的なAPI成功レスポンス
 */
export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

/**
 * 基本的なAPIエラーレスポンス
 */
export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp?: string;
}

/**
 * 統合API レスポンス型
 */
export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

// ============================================================================
// 市場データ API レスポンス型
// ============================================================================

/**
 * OHLCV データ型
 */
export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 市場データ履歴レスポンス
 */
export interface MarketHistoryResponse extends APISuccessResponse<OHLCVData[]> {
  symbol?: string;
}

/**
 * 市場データAPI レスポンス型
 */
export type MarketDataAPIResponse = APIResponse<OHLCVData[]>;

// ============================================================================
// シグナル関連型
// ============================================================================

/**
 * 取引シグナル型
 */
export interface TradingSignal {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  timestamp: number;
  confidence: number;
}

/**
 * シグナルバリデーション結果
 */
export interface SignalValidationResult {
  hitRate: number;
  totalSignals: number;
  successfulSignals: number;
  averageReturn: number;
}

// ============================================================================
// 型ガード関数
// ============================================================================

/**
 * レスポンスが成功かどうかを判定
 */
export function isSuccessResponse<T>(
  response: APIResponse<T>
): response is APISuccessResponse<T> {
  return response.success === true;
}

/**
 * レスポンスがエラーかどうかを判定
 */
export function isErrorResponse<T>(
  response: APIResponse<T>
): response is APIErrorResponse {
  return response.success === false;
}

/**
 * 値がOHLCVData型かどうかを判定
 */
export function isOHLCVData(value: unknown): value is OHLCVData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const data = value as Record<string, unknown>;
  return (
    typeof data.date === 'string' &&
    typeof data.open === 'number' &&
    typeof data.high === 'number' &&
    typeof data.low === 'number' &&
    typeof data.close === 'number' &&
    typeof data.volume === 'number'
  );
}

/**
 * 値がOHLCVData配列かどうかを判定
 */
export function isOHLCVDataArray(value: unknown): value is OHLCVData[] {
  return Array.isArray(value) && value.every(isOHLCVData);
}

/**
 * 値がTradingSignal型かどうかを判定
 */
export function isTradingSignal(value: unknown): value is TradingSignal {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const signal = value as Record<string, unknown>;
  return (
    typeof signal.symbol === 'string' &&
    (signal.type === 'BUY' || signal.type === 'SELL' || signal.type === 'HOLD') &&
    typeof signal.price === 'number' &&
    typeof signal.timestamp === 'number' &&
    typeof signal.confidence === 'number'
  );
}

/**
 * 安全にAPIレスポンスからデータを取得
 */
export function safeGetResponseData<T>(
  response: APIResponse<T>,
  defaultValue: T
): T {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  return defaultValue;
}

/**
 * 安全にOHLCVデータのclose価格を取得
 */
export function safeGetClose(data: unknown): number {
  if (isOHLCVData(data)) {
    return data.close;
  }
  return 0;
}

/**
 * 安全にOHLCVデータの日付を取得
 */
export function safeGetDate(data: unknown): string {
  if (isOHLCVData(data)) {
    return data.date;
  }
  return '';
}
