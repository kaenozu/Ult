/**
 * API Response Types
 * APIレスポンスの型定義
 */

/**
 * 汎用APIレスポンス型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp?: string;
}

/**
 * APIエラーレスポンス型
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp?: string;
}

/**
 * 成功レスポンス型
 */
export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * ページネーションレスポンス型
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * APIリクエストオプション
 */
export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

/**
 * APIリクエストメタデータ
 */
export interface ApiRequestMetadata {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timestamp: number;
}

/**
 * APIレスポンスメタデータ
 */
export interface ApiResponseMetadata {
  status: number;
  headers: Record<string, string>;
  duration: number;
  cached: boolean;
  timestamp: number;
}

/**
 * APIエラーコード
 */
export enum ApiErrorCode {
  // 一般エラー
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // クライアントエラー (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // サーバーエラー (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_GATEWAY = 'BAD_GATEWAY',
}

/**
 * APIエラーオブジェクト
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * マーケットデータAPIリクエスト
 */
export interface MarketDataRequest {
  symbol: string;
  interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * トレードシグナルAPIリクエスト
 */
export interface TradeSignalRequest {
  symbol: string;
  timeframe: string;
  indicators?: Record<string, unknown>;
  marketContext?: {
    indexTrend?: 'UP' | 'DOWN' | 'NEUTRAL';
    correlation?: number;
    indexSymbol?: string;
  };
}

/**
 * バックテストAPIリクエスト
 */
export interface BacktestRequest {
  symbol: string;
  strategy: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  parameters?: Record<string, unknown>;
}

/**
 * バックテストAPIレスポンス
 */
export interface BacktestResponse {
  trades: Array<{
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    profit: number;
    profitPercent: number;
    exitReason: string;
  }>;
  metrics: {
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
}
