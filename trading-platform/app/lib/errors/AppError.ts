/**
 * 統一エラークラス - ULT Trading Platform
 * 
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリングを提供します。
 * - 標準化されたエラークラス
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
 * 
 * @example
 * ```typescript
 * class CustomError extends AppError {
 *   constructor(message: string) {
 *     super(message, 'CUSTOM_ERROR', 'high');
 *     this.name = 'CustomError';
 *   }
 * }
 * ```
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

// ============================================================================
// Network Errors
// ============================================================================

/**
 * ネットワークエラー
 */
export class NetworkError extends AppError {
  readonly endpoint?: string;
  readonly response?: unknown;

  constructor(
    message: string = 'ネットワークエラーが発生しました',
    options?: {
      endpoint?: string;
      statusCode?: number;
      response?: unknown;
      cause?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, ErrorCodes.NETWORK_ERROR, 'high', {
      cause: options?.cause,
      context: {
        ...options?.context,
        endpoint: options?.endpoint,
        statusCode: options?.statusCode,
      },
      statusCode: options?.statusCode ?? 503,
      userMessage: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      recoverable: true,
    });
    
    this.endpoint = options?.endpoint;
    this.response = options?.response;
    this.name = 'NetworkError';
    
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * APIエラー
 */
export class ApiError extends AppError {
  readonly endpoint?: string;
  readonly response?: unknown;

  constructor(
    message: string,
    optionsOrCode?: string | {
      endpoint?: string;
      statusCode?: number;
      response?: unknown;
      context?: Record<string, unknown>;
    },
    maybeStatusCode?: number,
    maybeContext?: Record<string, unknown>
  ) {
    const options: any = typeof optionsOrCode === 'object' ? optionsOrCode : {};
    let code: string = typeof optionsOrCode === 'string' ? optionsOrCode : (options?.code || ErrorCodes.API_ERROR);
    const statusCode = maybeStatusCode ?? options?.statusCode ?? 500;
    const context = maybeContext ?? options?.context ?? {};

    if (statusCode === 404) code = ErrorCodes.NOT_FOUND_ERROR;
    else if (statusCode === 429) code = ErrorCodes.RATE_LIMIT_ERROR;
    else if (statusCode === 401 || statusCode === 403) code = ErrorCodes.AUTHENTICATION_ERROR;
    
    const severity: ErrorSeverity = statusCode >= 500 ? 'high' : 'medium';
    
    super(message, code, severity, {
      context: {
        ...context,
        endpoint: options?.endpoint,
        statusCode,
      },
      statusCode,
      userMessage: ApiError.getUserMessage(statusCode),
      recoverable: statusCode >= 500 || statusCode === 429,
    });
    
    this.endpoint = options?.endpoint;
    this.response = options?.response;
    this.name = 'ApiError';
    
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static getUserMessage(statusCode?: number): string {
    if (statusCode === 404) return 'データが見つかりませんでした';
    if (statusCode === 429) return 'リクエストが多すぎます。しばらく待ってからお試しください';
    if (statusCode === 401 || statusCode === 403) return '認証に失敗しました。再度ログインしてください';
    if (statusCode && statusCode >= 500) return 'サーバーエラーが発生しました。しばらく待ってからお試しください';
    return 'データの取得に失敗しました';
  }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends AppError {
  readonly retryAfter?: number;

  constructor(
    message: string = 'リクエスト回数の上限を超えました',
    retryAfter?: number
  ) {
    super(message, ErrorCodes.RATE_LIMIT_ERROR, 'medium', {
      context: { retryAfter },
      statusCode: 429,
      userMessage: 'リクエストが多すぎます。しばらく待ってからお試しください。',
      recoverable: true,
    });
    
    this.retryAfter = retryAfter;
    this.name = 'RateLimitError';
    
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends AppError {
  readonly operation?: string;
  readonly timeoutMs: number;

  constructor(
    operation: string,
    timeoutMs: number
  ) {
    super(`${operation}がタイムアウトしました（${timeoutMs}ms）`, ErrorCodes.TIMEOUT_ERROR, 'high', {
      context: { operation, timeoutMs },
      userMessage: '処理がタイムアウトしました。もう一度お試しください。',
      recoverable: true,
    });
    
    this.operation = operation;
    this.timeoutMs = timeoutMs;
    this.name = 'TimeoutError';
    
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * 認証エラー
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = '認証に失敗しました',
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, ErrorCodes.AUTHENTICATION_ERROR, 'high', {
      ...options,
      userMessage: '認証に失敗しました。再度ログインしてください。',
      recoverable: false,
    });
    
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 認可エラー
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'アクセス権限がありません',
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, ErrorCodes.AUTHORIZATION_ERROR, 'high', {
      ...options,
      userMessage: 'この操作を実行する権限がありません。',
      recoverable: false,
    });
    
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  readonly field: string;
  readonly value?: unknown;

  constructor(
    field: string,
    message: string,
    options?: {
      value?: unknown;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      statusCode?: number;
    }
  ) {
    super(`Validation error for ${field}: ${message}`, ErrorCodes.VALIDATION_ERROR, options?.severity ?? 'low', {
      context: {
        ...options?.context,
        field,
        value: options?.value,
      },
      statusCode: options?.statusCode ?? 400,
      userMessage: `${field}の入力内容を確認してください`,
      recoverable: true,
    });
    
    this.field = field;
    this.value = options?.value;
    this.name = 'ValidationError';
    
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 入力値エラー
 */
export class InputError extends AppError {
  readonly field: string;

  constructor(
    field: string,
    message: string
  ) {
    super(`Input error for ${field}: ${message}`, ErrorCodes.INPUT_ERROR, 'low', {
      context: { field },
      userMessage: `${field}の入力内容を確認してください`,
      recoverable: true,
    });
    
    this.field = field;
    this.name = 'InputError';
    
    Object.setPrototypeOf(this, InputError.prototype);
  }
}

// ============================================================================
// Data Errors
// ============================================================================

/**
 * データ関連エラー
 */
export class DataError extends AppError {
  readonly symbol?: string;
  readonly dataType?: string;

  constructor(
    message: string,
    options?: {
      symbol?: string;
      dataType?: string;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, ErrorCodes.DATA_ERROR, 'medium', {
      context: {
        ...options?.context,
        symbol: options?.symbol,
        dataType: options?.dataType,
      },
      userMessage: 'データの取得に失敗しました',
      recoverable: true,
    });
    
    this.symbol = options?.symbol;
    this.dataType = options?.dataType;
    this.name = 'DataError';
    
    Object.setPrototypeOf(this, DataError.prototype);
  }
}

/**
 * 未検出エラー
 */
export class NotFoundError extends AppError {
  readonly resource: string;
  readonly resourceType: string;

  constructor(
    resource: string,
    resourceType: string = 'リソース'
  ) {
    super(
      `${resourceType}「${resource}」が見つかりません`,
      ErrorCodes.NOT_FOUND_ERROR,
      'low',
      {
        context: { resource, resourceType },
        userMessage: `${resourceType}が見つかりませんでした`,
        recoverable: false,
      }
    );
    
    this.resource = resource;
    this.resourceType = resourceType;
    this.name = 'NotFoundError';
    
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * データ利用不可エラー
 */
export class DataNotAvailableError extends AppError {
  readonly symbol?: string;
  readonly dataType?: string;

  constructor(
    symbol?: string,
    dataType?: string
  ) {
    super(
      symbol ? `${symbol}のデータが利用できません` : 'データが利用できません',
      ErrorCodes.DATA_NOT_AVAILABLE,
      'medium',
      {
        context: { symbol, dataType },
        userMessage: symbol ? `${symbol}のデータが利用できません` : 'データが利用できません',
        recoverable: true,
      }
    );
    
    this.symbol = symbol;
    this.dataType = dataType;
    this.name = 'DataNotAvailableError';
    
    Object.setPrototypeOf(this, DataNotAvailableError.prototype);
  }
}

// ============================================================================
// Trading Errors
// ============================================================================

/**
 * 取引関連エラー
 */
export class TradingError extends AppError {
  readonly symbol?: string;
  readonly orderId?: string;

  constructor(
    message: string,
    options?: {
      symbol?: string;
      orderId?: string;
      code?: string;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options?.code ?? ErrorCodes.TRADING_ERROR, options?.severity ?? 'high', {
      context: {
        ...options?.context,
        symbol: options?.symbol,
        orderId: options?.orderId,
      },
      userMessage: '取引処理でエラーが発生しました',
      recoverable: false,
    });
    
    this.symbol = options?.symbol;
    this.orderId = options?.orderId;
    this.name = 'TradingError';
    
    Object.setPrototypeOf(this, TradingError.prototype);
  }
}

/**
 * 注文エラー
 */
export class OrderError extends AppError {
  readonly symbol?: string;
  readonly orderId?: string;
  readonly reason?: string;

  constructor(
    message: string,
    options?: {
      symbol?: string;
      orderId?: string;
      reason?: string;
    }
  ) {
    super(`Order error: ${message}`, ErrorCodes.ORDER_ERROR, 'high', {
      context: {
        symbol: options?.symbol,
        orderId: options?.orderId,
        reason: options?.reason,
      },
      userMessage: '注文処理でエラーが発生しました',
      recoverable: false,
    });
    
    this.symbol = options?.symbol;
    this.orderId = options?.orderId;
    this.reason = options?.reason;
    this.name = 'OrderError';
    
    Object.setPrototypeOf(this, OrderError.prototype);
  }
}

/**
 * リスク管理エラー
 */
export class RiskManagementError extends AppError {
  readonly symbol?: string;
  readonly reason?: string;

  constructor(
    message: string,
    options?: {
      symbol?: string;
      reason?: string;
    }
  ) {
    super(`Risk management: ${message}`, ErrorCodes.RISK_MANAGEMENT_ERROR, 'critical', {
      context: {
        symbol: options?.symbol,
        reason: options?.reason,
      },
      userMessage: 'リスク管理制限に達しました',
      recoverable: false,
    });
    
    this.symbol = options?.symbol;
    this.reason = options?.reason;
    this.name = 'RiskManagementError';
    
    Object.setPrototypeOf(this, RiskManagementError.prototype);
  }
}

// ============================================================================
// System Errors
// ============================================================================

/**
 * システムエラー
 */
export class SystemError extends AppError {
  readonly operation?: string;

  constructor(
    message: string,
    operation?: string
  ) {
    super(message, ErrorCodes.SYSTEM_ERROR, 'critical', {
      context: { operation },
      userMessage: 'システムエラーが発生しました。管理者にお問い合わせください。',
      recoverable: false,
    });
    
    this.operation = operation;
    this.name = 'SystemError';
    
    Object.setPrototypeOf(this, SystemError.prototype);
  }
}

/**
 * 設定エラー
 */
export class ConfigurationError extends AppError {
  readonly configKey: string;

  constructor(
    configKey: string,
    message: string
  ) {
    super(`Configuration error [${configKey}]: ${message}`, ErrorCodes.CONFIGURATION_ERROR, 'high', {
      context: { configKey },
      userMessage: '設定エラーが発生しました。管理者にお問い合わせください。',
      recoverable: false,
    });
    
    this.configKey = configKey;
    this.name = 'ConfigurationError';
    
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * AppErrorの型ガード
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * NetworkErrorの型ガード
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * ApiErrorの型ガード
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * ValidationErrorの型ガード
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * NotFoundErrorの型ガード
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * AuthenticationErrorの型ガード
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * TradingErrorの型ガード
 */
export function isTradingError(error: unknown): error is TradingError {
  return error instanceof TradingError;
}

/**
 * SystemErrorの型ガード
 */
export function isSystemError(error: unknown): error is SystemError {
  return error instanceof SystemError;
}
