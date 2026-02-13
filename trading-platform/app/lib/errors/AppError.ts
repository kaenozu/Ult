/**
 * 統一エラークラス - ULT Trading Platform
 * 
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリングを提供します。
 * - 標準化されたエラークラスの基底
 * - エラーコードとメッセージの標準化
 * - スタックトレースの適切な処理
 * 
 * @module lib/errors/AppError
 */

// ============================================================================
// Error Severity Levels
// ============================================================================

/**
 * エラーの重大度レベル
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * エラー重大度の数値マッピング（比較用）
 */
export const SEVERITY_LEVELS: Record<ErrorSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * 標準化されたエラーコード
 */
export const ErrorCodes = {
  // 汎用エラー
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  APP_ERROR: 'APP_ERROR',
  
  // ネットワーク関連
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // 認証・認可
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  
  // バリデーション
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INPUT_ERROR: 'INPUT_ERROR',
  
  // データ関連
  DATA_ERROR: 'DATA_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DATA_NOT_AVAILABLE: 'DATA_NOT_AVAILABLE',
  
  // 取引関連
  TRADING_ERROR: 'TRADING_ERROR',
  ORDER_ERROR: 'ORDER_ERROR',
  RISK_MANAGEMENT_ERROR: 'RISK_MANAGEMENT_ERROR',
  
  // システム関連
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  RESOURCE_LIMIT_ERROR: 'RESOURCE_LIMIT_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// Error Types Enum
// ============================================================================

/**
 * エラータイプの列挙型
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  API = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  TRADING = 'TRADING_ERROR',
  SYSTEM = 'SYSTEM_ERROR',
}

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * 全てのカスタムエラーの基底クラス
 */
export class AppError extends Error {
  /** エラーコード */
  readonly code: ErrorCode | string;
  
  /** 重大度 */
  readonly severity: ErrorSeverity;
  
  /** ステータスコード (HTTP) */
  readonly statusCode: number;
  
  /** タイムスタンプ */
  readonly timestamp: Date;
  
  /** コンテキスト情報 */
  readonly context?: Record<string, unknown>;
  
  /** 元のエラー */
  readonly cause?: Error;
  
  /** ユーザー向けメッセージ */
  readonly userMessage?: string;
  
  /** 復旧可能かどうか */
  readonly recoverable: boolean;

  /**
   * Alias for context (backward compatibility)
   */
  get details(): Record<string, unknown> | undefined {
    return this.context;
  }

  constructor(
    message: string,
    code: ErrorCode | string = ErrorCodes.UNKNOWN_ERROR,
    severity: ErrorSeverity = 'medium',
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
      userMessage?: string;
      recoverable?: boolean;
      statusCode?: number;
    }
  ) {
    super(message);
    
    this.code = code;
    this.severity = severity;
    this.statusCode = options?.statusCode ?? 500;
    this.timestamp = new Date();
    this.context = options?.context;
    this.cause = options?.cause;
    this.userMessage = options?.userMessage;
    this.recoverable = options?.recoverable ?? false;
    
    this.name = 'AppError';
    
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
    
    // スタックトレースの調整（V8エンジンの場合）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * エラー情報をJSON形式で出力
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }

  /**
   * エラー情報を文字列形式で出力
   */
  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  /**
   * 重大度の比較
   */
  isSevererThan(severity: ErrorSeverity): boolean {
    return SEVERITY_LEVELS[this.severity] > SEVERITY_LEVELS[severity];
  }

  /**
   * 指定した重大度以上かどうか
   */
  isAtLeast(severity: ErrorSeverity): boolean {
    return SEVERITY_LEVELS[this.severity] >= SEVERITY_LEVELS[severity];
  }
}

/**
 * AppErrorの型ガード
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
