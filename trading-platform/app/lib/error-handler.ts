/**
 * 共通エラーハンドラー
 *
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリングを提供します。
 * - APIルート用のHTTPレスポンス生成
 * - ユーザー向けエラーメッセージの標準化
 * - エラーログの統一
 */

import { NextResponse } from 'next/server';
import {
  TradingError,
  ApiError,
  NetworkError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  logError as logErrorFromErrors,
} from './errors';

/**
 * エラーレスポンスの構造
 */
export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
  debug?: unknown;
}

/**
 * エラーの種類
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  API = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
}

/**
 * ユーザー向けのエラーメッセージマッピング
 * エラーコードからわかりやすいメッセージへ変換
 */
export const ERROR_MESSAGES: Record<string, { message: string; details?: string }> = {
  VALIDATION_ERROR: {
    message: '入力内容を確認してください',
    details: '無効なパラメータが含まれています',
  },
  NETWORK_ERROR: {
    message: 'ネットワークエラーが発生しました',
    details: 'インターネット接続を確認してください',
  },
  API_ERROR: {
    message: 'データの取得に失敗しました',
    details: '外部サービスとの通信でエラーが発生しました',
  },
  RATE_LIMIT_ERROR: {
    message: 'リクエスト回数の上限を超えました',
    details: 'しばらく待ってから再度お試しください',
  },
  INTERNAL_ERROR: {
    message: '予期しないエラーが発生しました',
    details: '管理者にお問い合わせください',
  },
  NOT_FOUND: {
    message: '要求されたデータが見つかりません',
  },
  INSECURE_API_KEY: {
    message: 'API設定エラー',
    details: '管理者にお問い合わせください',
  },
};

/**
 * エラーオブジェクトから情報を抽出
 */
function extractErrorInfo(error: unknown): { type: ErrorType; message: string; code?: string; details?: string } {
  // エラーにcodeプロパティがある場合の処理（types/index.tsのエラークラスを含む）
  if (error instanceof Error && 'code' in error) {
    const errorWithCode = error as { code: string; message: string; statusCode?: number; field?: string };
    const errorInfo = ERROR_MESSAGES[errorWithCode.code];
    
    // エラータイプの決定（codeに基づく）
    let type: ErrorType;
    switch (errorWithCode.code) {
      case 'VALIDATION_ERROR':
        type = ErrorType.VALIDATION;
        break;
      case 'NETWORK_ERROR':
        type = ErrorType.NETWORK;
        break;
      case 'RATE_LIMIT_ERROR':
        type = ErrorType.RATE_LIMIT;
        break;
      case 'NOT_FOUND_ERROR':
      case 'NOT_FOUND':
        type = ErrorType.NOT_FOUND;
        break;
      case 'API_ERROR':
        type = ErrorType.API;
        break;
      default:
        type = ErrorType.INTERNAL;
    }
    
    // HTTPステータスコードからもタイプを判定
    if (errorWithCode.statusCode) {
      if (errorWithCode.statusCode === 404) type = ErrorType.NOT_FOUND;
      else if (errorWithCode.statusCode === 429) type = ErrorType.RATE_LIMIT;
      else if (errorWithCode.statusCode === 400) type = ErrorType.VALIDATION;
      else if (errorWithCode.statusCode >= 500) type = ErrorType.API;
    }
    
    // detailsの構築
    let details = errorInfo?.details;
    if (errorWithCode.field) {
      details = `Field: ${errorWithCode.field}`;
    }
    
    return {
      type,
      message: errorInfo?.message || errorWithCode.message,
      code: errorWithCode.code,
      details,
    };
  }

  // TradingError系のカスタムエラーの処理（errors.ts）
  if (error instanceof TradingError) {
    const errorInfo = ERROR_MESSAGES[error.code];
    
    // エラータイプの決定
    let type: ErrorType;
    if (error instanceof ValidationError) {
      type = ErrorType.VALIDATION;
    } else if (error instanceof NetworkError) {
      type = ErrorType.NETWORK;
    } else if (error instanceof RateLimitError) {
      type = ErrorType.RATE_LIMIT;
    } else if (error instanceof NotFoundError) {
      type = ErrorType.NOT_FOUND;
    } else if (error instanceof ApiError) {
      type = ErrorType.API;
    } else {
      type = ErrorType.INTERNAL;
    }
    
    return {
      type,
      message: errorInfo?.message || error.message,
      code: error.code,
      details: errorInfo?.details,
    };
  }

  // 標準Errorの処理
  if (error instanceof Error) {
    // ネットワーク関連エラーの検出
    const message = error.message.toLowerCase();
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return {
        type: ErrorType.NETWORK,
        message: ERROR_MESSAGES[ErrorType.NETWORK].message,
        code: ErrorType.NETWORK,
        details: ERROR_MESSAGES[ErrorType.NETWORK].details,
      };
    }
    
    // タイムアウト関連
    if (message.includes('timeout')) {
      return {
        type: ErrorType.NETWORK,
        message: ERROR_MESSAGES[ErrorType.NETWORK].message,
        code: 'TIMEOUT_ERROR',
        details: '処理がタイムアウトしました',
      };
    }

    return {
      type: ErrorType.INTERNAL,
      message: error.message || ERROR_MESSAGES[ErrorType.INTERNAL].message,
      code: ErrorType.INTERNAL,
      details: ERROR_MESSAGES[ErrorType.INTERNAL].details,
    };
  }

  // 文字列エラー
  if (typeof error === 'string') {
    return {
      type: ErrorType.INTERNAL,
      message: error,
      code: ErrorType.INTERNAL,
    };
  }

  // プレーンオブジェクトで code を持つ場合
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const apiError = error as { code: string; message?: string };
    const errorInfo = ERROR_MESSAGES[apiError.code];
    if (errorInfo) {
      return {
        type: apiError.code as ErrorType,
        message: errorInfo.message,
        code: apiError.code,
        details: errorInfo.details,
      };
    }
  }

  // その他の型
  return {
    type: ErrorType.INTERNAL,
    message: ERROR_MESSAGES[ErrorType.INTERNAL].message,
    code: ErrorType.INTERNAL,
    details: ERROR_MESSAGES[ErrorType.INTERNAL].details,
  };
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
 * ```ts
 * try {
 *   const data = await fetchData();
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
  const errorInfo = extractErrorInfo(error);

  // エラーログの出力（errors.tsからインポート）
  logErrorFromErrors(error, context);

  // ステータスコードの決定
  let status = statusCode;
  if (!status) {
    switch (errorInfo.type) {
      case ErrorType.VALIDATION:
        status = 400;
        break;
      case ErrorType.NOT_FOUND:
        status = 404;
        break;
      case ErrorType.RATE_LIMIT:
        status = 429;
        break;
      case ErrorType.NETWORK:
      case ErrorType.API:
        status = 502;
        break;
      default:
        status = 500;
    }
  }

  // レスポンスボディの構築
  const responseBody: ErrorResponse = {
    error: errorInfo.message,
    code: errorInfo.code,
  };

  // 詳細情報の追加（開発環境のみ）
  if (process.env.NODE_ENV !== 'production') {
    if (errorInfo.details) {
      responseBody.details = errorInfo.details;
    }
    if (error instanceof Error) {
      responseBody.debug = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
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
      code: ErrorType.VALIDATION,
      ...(field && { details: `Field: ${field}` }),
    },
    { status: 400 }
  );
}

/**
 * 見つからないエラーのレスポンスを生成（ショートカット）
 */
export function notFoundError(message: string = '要求されたリソースが見つかりません'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorType.NOT_FOUND,
    },
    { status: 404 }
  );
}

/**
 * レート制限エラーのレスポンスを生成（ショートカット）
 */
export function rateLimitError(message: string = ERROR_MESSAGES[ErrorType.RATE_LIMIT].message): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorType.RATE_LIMIT,
    },
    { status: 429 }
  );
}

/**
 * 内部エラーのレスポンスを生成（ショートカット）
 */
export function internalError(message?: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message || ERROR_MESSAGES[ErrorType.INTERNAL].message,
      code: ErrorType.INTERNAL,
    },
    { status: 500 }
  );
}

// Re-export logError from errors.ts for backward compatibility
export { logErrorFromErrors as logError };
