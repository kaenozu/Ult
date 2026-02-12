import { AppError, ErrorCodes, ErrorSeverity, ErrorCode } from './AppError';

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
      code?: string;
      endpoint?: string;
      statusCode?: number;
      response?: unknown;
      context?: Record<string, unknown>;
    },
    maybeStatusCode?: number,
    maybeContext?: Record<string, unknown>
  ) {
    const options = typeof optionsOrCode === 'object' ? optionsOrCode : {};
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

/**
 * ApiErrorの型ガード
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * NetworkErrorの型ガード
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}
