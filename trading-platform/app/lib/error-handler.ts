/**
 * 共通エラーハンドラー
 *
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリングを提供します。
 * - APIルート用のHTTPレスポンス生成
 * - ユーザー向けエラーメッセージの標準化
 * - エラーログの統一
 */

import { NextResponse } from 'next/server';
// import type { APIError, NetworkError, RateLimitError } from '@/app/types';

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
const ERROR_MESSAGES: Record<string, { message: string; details?: string }> = {
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
  // カスタムエラークラスの処理
  if (error instanceof Error) {
    // APIError系のエラー
    if ('code' in error) {
      const apiError = error as { code: string; message: string };
      const errorInfo = ERROR_MESSAGES[apiError.code];
      return {
        type: apiError.code as ErrorType,
        message: errorInfo?.message || apiError.message,
        code: apiError.code,
        details: errorInfo?.details,
      };
    }

    // 標準エラー
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

  // エラーログの出力
  logError(error, context);

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
 * エラーログの出力
 *
 * @param error - エラーオブジェクト
 * @param context - エラーが発生したコンテキスト
 */
export function logError(error: unknown, context: string): void {
  const timestamp = new Date().toISOString();

  if (error instanceof Error) {
    console.error(`[${timestamp}] Error in ${context}:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(`[${timestamp}] Error in ${context}:`, error);
  }
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
