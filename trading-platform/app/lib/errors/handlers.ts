/**
 * 統一エラーハンドラ - ULT Trading Platform
 * 
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリング関数を提供します。
 * - 統一エラーハンドリング関数
 * - ログ出力の標準化
 * - ユーザー向けエラーメッセージの生成
 * - APIエラーレスポンスの標準化
 * 
 * @module lib/errors/handlers
 */

import { NextResponse } from 'next/server';
import { logger } from '@/app/core/logger';
import {
  AppError,
  NetworkError,
  ApiError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  TradingError,
  SystemError,
  TimeoutError,
  ErrorCodes,
  ErrorType,
  type ErrorSeverity,
  isAppError,
  isNetworkError,
  isApiError,
  isValidationError,
  isNotFoundError,
  isAuthenticationError,
  isTradingError,
  isSystemError,
} from './AppError';

// ============================================================================
// Types
// ============================================================================

/**
 * エラーレスポンスの構造
 */
export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
  severity?: ErrorSeverity;
  recoverable?: boolean;
  debug?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * エラーコンテキスト
 */
export interface ErrorContext {
  timestamp: number;
  operation: string;
  symbol?: string;
  orderId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * エラー復旧情報
 */
export interface ErrorRecovery {
  canRecover: boolean;
  recoveryAction: string;
  retryDelay?: number;
  retryCount?: number;
  fatal: boolean;
}

/**
 * エラーハンドラインターフェース
 */
export interface ErrorHandlerConfig {
  logErrors: boolean;
  includeStackTrace: boolean;
  maxRetryCount: number;
  defaultRetryDelay: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV !== 'production',
  maxRetryCount: 3,
  defaultRetryDelay: 1000,
};

// ============================================================================
// User-Facing Error Messages
// ============================================================================

/**
 * ユーザー向けのエラーメッセージマッピング
 */
export const USER_ERROR_MESSAGES: Record<string, { message: string; details?: string }> = {
  [ErrorCodes.VALIDATION_ERROR]: {
    message: '入力内容を確認してください',
    details: '無効なパラメータが含まれています',
  },
  [ErrorCodes.NETWORK_ERROR]: {
    message: 'ネットワークエラーが発生しました',
    details: 'インターネット接続を確認してください',
  },
  [ErrorCodes.API_ERROR]: {
    message: 'データの取得に失敗しました',
    details: '外部サービスとの通信でエラーが発生しました',
  },
  [ErrorCodes.RATE_LIMIT_ERROR]: {
    message: 'リクエスト回数の上限を超えました',
    details: 'しばらく待ってから再度お試しください',
  },
  [ErrorCodes.TIMEOUT_ERROR]: {
    message: '処理がタイムアウトしました',
    details: 'もう一度お試しください',
  },
  [ErrorCodes.AUTHENTICATION_ERROR]: {
    message: '認証に失敗しました',
    details: '再度ログインしてください',
  },
  [ErrorCodes.AUTHORIZATION_ERROR]: {
    message: 'アクセス権限がありません',
    details: 'この操作を実行する権限がありません',
  },
  [ErrorCodes.NOT_FOUND_ERROR]: {
    message: '要求されたデータが見つかりません',
  },
  [ErrorCodes.DATA_NOT_AVAILABLE]: {
    message: 'データが利用できません',
    details: 'しばらく待ってから再度お試しください',
  },
  [ErrorCodes.TRADING_ERROR]: {
    message: '取引処理でエラーが発生しました',
    details: 'しばらく待ってから再度お試しください',
  },
  [ErrorCodes.ORDER_ERROR]: {
    message: '注文処理でエラーが発生しました',
    details: '注文を確認してください',
  },
  [ErrorCodes.RISK_MANAGEMENT_ERROR]: {
    message: 'リスク管理制限に達しました',
    details: 'ポジションサイズを確認してください',
  },
  [ErrorCodes.SYSTEM_ERROR]: {
    message: 'システムエラーが発生しました',
    details: '管理者にお問い合わせください',
  },
  [ErrorCodes.CONFIGURATION_ERROR]: {
    message: '設定エラー',
    details: '管理者にお問い合わせください',
  },
  [ErrorCodes.UNKNOWN_ERROR]: {
    message: '予期しないエラーが発生しました',
    details: '管理者にお問い合わせください',
  },
};

// ============================================================================
// Error Handling Functions
// ============================================================================

/**
 * 統一エラーハンドリング関数
 * 
 * 任意のエラーをAppErrorに変換し、ログに出力します。
 * 
 * @param error - キャッチされたエラー
 * @param context - エラーが発生したコンテキスト
 * @returns AppErrorインスタンス
 * 
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const appError = handleError(error, 'fetchData');
 *   // appErrorは常にAppErrorインスタンス
 * }
 * ```
 */
export function handleError(error: unknown, context?: string): AppError {
  // 既にAppErrorの場合はそのまま返す
  if (isAppError(error)) {
    return error;
  }
  
  // 標準Errorの場合
  if (error instanceof Error) {
    // ネットワーク関連エラーの検出
    const message = error.message.toLowerCase();
    
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return new NetworkError(error.message, { cause: error });
    }
    
    if (message.includes('timeout')) {
      return new TimeoutError(context || 'Operation', 0);
    }
    
    if (message.includes('unauthorized') || error.message.includes('401')) {
      return new AuthenticationError(error.message, { cause: error });
    }
    
    // その他のエラーはAppErrorでラップ
    return new AppError(
      context ? `[${context}] ${error.message}` : error.message,
      ErrorCodes.UNKNOWN_ERROR,
      'medium',
      { cause: error }
    );
  }
  
  // 文字列エラーの場合
  if (typeof error === 'string') {
    return new AppError(
      context ? `[${context}] ${error}` : error,
      ErrorCodes.UNKNOWN_ERROR,
      'medium'
    );
  }
  
  // その他の型
  return new AppError(
    context ? `[${context}] Unknown error occurred` : 'Unknown error occurred',
    ErrorCodes.UNKNOWN_ERROR,
    'medium'
  );
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * エラーをログに出力する
 * 
 * @param error - エラーオブジェクト
 * @param context - エラーが発生したコンテキスト
 * @param config - ログ設定
 */
export function logError(
  error: unknown,
  context: string,
  config: Partial<ErrorHandlerConfig> = {}
): void {
  const { logErrors } = { ...DEFAULT_CONFIG, ...config };
  
  if (!logErrors) return;
  
  const timestamp = new Date().toISOString();
  const appError = isAppError(error) ? error : handleError(error, context);
  
  // エラーの重大度に応じてログレベルを変更
  const logData = {
    timestamp,
    context,
    ...appError.toJSON(),
  };
  
  switch (appError.severity) {
    case 'critical':
      logger.error(`[CRITICAL] [${timestamp}] [${context}] ${appError.name}:`, logData);
      break;
    case 'high':
      logger.error(`[HIGH] [${timestamp}] [${context}] ${appError.name}:`, logData);
      break;
    case 'medium':
      logger.warn(`[MEDIUM] [${timestamp}] [${context}] ${appError.name}:`, logData);
      break;
    case 'low':
      logger.info(`[LOW] [${timestamp}] [${context}] ${appError.name}:`, logData);
      break;
  }
}

/**
 * エラーを報告する（外部サービスへの送信など）
 * 
 * @param error - エラーオブジェクト
 * @param context - エラーコンテキスト
 */
export async function reportError(
  error: unknown,
  context: ErrorContext
): Promise<void> {
  const appError = isAppError(error) ? error : handleError(error, context.operation);
  
  // 本番環境では外部エラー追跡サービスに送信
  if (process.env.NODE_ENV === 'production') {
    try {
      // 将来的にSentryや他のエラー追跡サービスに送信可能
      // 現在はログのみ
      logger.error('Error reported:', {
        ...context,
        error: appError.toJSON(),
      });
    } catch (reportError) {
      logger.error('Failed to report error:', reportError);
    }
  }
}

// ============================================================================
// User Message Functions
// ============================================================================

/**
 * ユーザー向けエラーメッセージを取得する
 * 
 * @param error - エラーオブジェクト
 * @returns ユーザー向けメッセージ
 */
export function getUserErrorMessage(error: unknown): string {
  const appError = isAppError(error) ? error : handleError(error);
  
  // userMessageが設定されている場合はそれを返す
  if (appError.userMessage) {
    return appError.userMessage;
  }
  
  // エラーコードに基づいてメッセージを返す
  const errorInfo = USER_ERROR_MESSAGES[appError.code];
  if (errorInfo) {
    return errorInfo.message;
  }
  
  // デフォルトメッセージ
  return 'エラーが発生しました。もう一度お試しください';
}

/**
 * 詳細なユーザー向けエラー情報を取得する
 */
export function getUserErrorDetails(error: unknown): {
  message: string;
  details?: string;
  recoverable: boolean;
  retryDelay?: number;
} {
  const appError = isAppError(error) ? error : handleError(error);
  const errorInfo = USER_ERROR_MESSAGES[appError.code];
  
  return {
    message: appError.userMessage || errorInfo?.message || 'エラーが発生しました',
    details: errorInfo?.details,
    recoverable: appError.recoverable,
    retryDelay: appError instanceof RateLimitError ? appError.retryAfter : undefined,
  };
}

// ============================================================================
// Recovery Functions
// ============================================================================

/**
 * エラーから復旧可能かどうかを判定
 */
export function canRecover(error: unknown): boolean {
  const appError = isAppError(error) ? error : handleError(error);
  
  // 復旧可能フラグをチェック
  if (appError.recoverable) {
    return true;
  }
  
  // エラータイプに基づく判定
  if (isNetworkError(error)) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof RateLimitError) return true;
  if (isValidationError(error)) return true;
  
  return false;
}

/**
 * エラー復旧情報を取得
 */
export function getRecoveryInfo(error: unknown): ErrorRecovery {
  const appError = isAppError(error) ? error : handleError(error);
  
  const canRecoverFromError = canRecover(error);
  
  return {
    canRecover: canRecoverFromError,
    recoveryAction: getRecoveryAction(appError),
    retryDelay: appError instanceof RateLimitError ? appError.retryAfter : DEFAULT_CONFIG.defaultRetryDelay,
    retryCount: 0,
    fatal: !canRecoverFromError && appError.severity === 'critical',
  };
}

/**
 * 復旧アクションを取得
 */
function getRecoveryAction(error: AppError): string {
  if (isNetworkError(error)) return 'retry';
  if (error instanceof TimeoutError) return 'retry';
  if (error instanceof RateLimitError) return 'wait_and_retry';
  if (isValidationError(error)) return 'fix_input';
  if (isAuthenticationError(error)) return 'reauthenticate';
  if (isNotFoundError(error)) return 'navigate_back';
  if (isTradingError(error)) return 'check_order';
  
  return 'contact_support';
}

// ============================================================================
// API Error Response Functions
// ============================================================================

/**
 * エラーからHTTPステータスコードを取得
 */
export function getHttpStatusCode(error: unknown): number {
  const appError = isAppError(error) ? error : handleError(error);
  
  // ApiErrorの場合はステータスコードを優先
  if (isApiError(error) && error.statusCode) {
    return error.statusCode;
  }
  
  // エラーコードに基づく判定
  switch (appError.code) {
    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.INPUT_ERROR:
      return 400;
    case ErrorCodes.AUTHENTICATION_ERROR:
      return 401;
    case ErrorCodes.AUTHORIZATION_ERROR:
      return 403;
    case ErrorCodes.NOT_FOUND_ERROR:
      return 404;
    case ErrorCodes.RATE_LIMIT_ERROR:
      return 429;
    case ErrorCodes.TIMEOUT_ERROR:
      return 408;
    case ErrorCodes.NETWORK_ERROR:
      return 502;
    case ErrorCodes.SYSTEM_ERROR:
    case ErrorCodes.CONFIGURATION_ERROR:
      return 500;
    default:
      return 500;
  }
}

/**
 * エラーからErrorTypeを取得
 */
export function getErrorType(error: unknown): ErrorType {
  const appError = isAppError(error) ? error : handleError(error);
  
  if (isValidationError(error)) return ErrorType.VALIDATION;
  if (isNetworkError(error)) return ErrorType.NETWORK;
  if (isApiError(error)) return ErrorType.API;
  if (error instanceof RateLimitError) return ErrorType.RATE_LIMIT;
  if (isNotFoundError(error)) return ErrorType.NOT_FOUND;
  if (isAuthenticationError(error)) return ErrorType.AUTHENTICATION;
  if (isTradingError(error)) return ErrorType.TRADING;
  if (isSystemError(error)) return ErrorType.SYSTEM;
  
  return ErrorType.INTERNAL;
}

/**
 * Next.js APIルート用のエラーレスポンスを生成
 * 
 * @param error - キャッチされたエラー
 * @param context - エラーが発生したコンテキスト（ログ用）
 * @param statusCode - HTTPステータスコード（オプション）
 * @returns NextResponse with error JSON
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * } catch (error) {
 *   return handleApiError(error, 'fetchData');
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context: string = 'API',
  statusCode?: number
): NextResponse<ErrorResponse> {
  const appError = isAppError(error) ? error : handleError(error, context);
  
  // エラーログの出力
  logError(appError, context);
  
  // ステータスコードの決定
  const status = statusCode ?? getHttpStatusCode(appError);
  
  // レスポンスボディの構築
  const responseBody: ErrorResponse = {
    error: status === 500 ? 'Internal server error' : getUserErrorMessage(appError),
    code: appError.code,
    severity: appError.severity,
    recoverable: appError.recoverable,
  };
  
  // 詳細情報の追加（開発環境のみ）
  if (DEFAULT_CONFIG.includeStackTrace) {
    const errorInfo = USER_ERROR_MESSAGES[appError.code];
    if (errorInfo?.details) {
      responseBody.details = errorInfo.details;
    }
    
    responseBody.debug = {
      name: appError.name,
      message: appError.message,
      stack: appError.stack,
    };
  }
  
  return NextResponse.json(responseBody, { status });
}

/**
 * バリデーションエラーのレスポンスを生成（ショートカット）
 */
export function validationError(message: string, field?: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCodes.VALIDATION_ERROR,
      severity: 'low',
      recoverable: true,
      ...(field && { details: `Field: ${field}` }),
    },
    { status: 400 }
  );
}

/**
 * 未検出エラーのレスポンスを生成（ショートカット）
 */
export function notFoundError(message: string = '要求されたリソースが見つかりません'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCodes.NOT_FOUND_ERROR,
      severity: 'low',
      recoverable: false,
    },
    { status: 404 }
  );
}

/**
 * レート制限エラーのレスポンスを生成（ショートカット）
 */
export function rateLimitError(
  message: string = USER_ERROR_MESSAGES[ErrorCodes.RATE_LIMIT_ERROR].message,
  retryAfter?: number
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCodes.RATE_LIMIT_ERROR,
      severity: 'medium',
      recoverable: true,
      details: `Retry after ${retryAfter || 60} seconds`,
    },
    { 
      status: 429,
      headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
    }
  );
}

/**
 * 認証エラーのレスポンスを生成（ショートカット）
 */
export function authenticationError(message: string = '認証に失敗しました'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCodes.AUTHENTICATION_ERROR,
      severity: 'high',
      recoverable: false,
    },
    { status: 401 }
  );
}

/**
 * 内部エラーのレスポンスを生成（ショートカット）
 */
export function internalError(message?: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message || USER_ERROR_MESSAGES[ErrorCodes.UNKNOWN_ERROR].message,
      code: ErrorCodes.SYSTEM_ERROR,
      severity: 'critical',
      recoverable: false,
    },
    { status: 500 }
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * エラーを安全に文字列化
 */
export function stringifyError(error: unknown): string {
  if (isAppError(error)) {
    return error.toString();
  }
  
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Unknown error';
}

/**
 * エラー情報を抽出してオブジェクト化
 */
export function extractErrorInfo(error: unknown): {
  type: ErrorType;
  message: string;
  code: string;
  severity: ErrorSeverity;
  details?: string;
} {
  const appError = isAppError(error) ? error : handleError(error);
  const errorInfo = USER_ERROR_MESSAGES[appError.code];
  
  return {
    type: getErrorType(appError),
    message: appError.userMessage || errorInfo?.message || appError.message,
    code: appError.code,
    severity: appError.severity,
    details: errorInfo?.details,
  };
}

// ============================================================================
// Re-exports for Backward Compatibility
// ============================================================================

export { logError as logErrorFromErrors };
