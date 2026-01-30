/**
 * フロントエンド用の統合エラーハンドリングユーティリティ
 * 
 * このモジュールは、クライアントサイドでのエラーハンドリングを提供します。
 * - エラーメッセージの標準化
 * - ユーザーへの通知
 * - エラーログの収集
 */

import { toast } from 'sonner'; // 一般的な通知ライブラリを仮定

/**
 * エラーのカテゴリ
 */
export enum ErrorCategory {
  API = 'API_ERROR',
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  BUSINESS = 'BUSINESS_ERROR',
  SYSTEM = 'SYSTEM_ERROR',
}

/**
 * エラー詳細情報
 */
export interface ErrorDetails {
  category: ErrorCategory;
  code?: string;
  message: string;
  details?: string;
  context?: string;
  originalError?: unknown;
}

/**
 * 標準化されたエラーメッセージマッピング
 */
const STANDARD_ERROR_MESSAGES: Record<string, { message: string; details?: string }> = {
  // APIエラー
  'FETCH_ERROR': {
    message: 'データの取得に失敗しました',
    details: 'インターネット接続を確認してください'
  },
  'PARSE_ERROR': {
    message: 'データ形式が正しくありません',
    details: '管理者にお問い合わせください'
  },
  'RESPONSE_ERROR': {
    message: 'サーバーからの応答に問題があります',
    details: '時間をおいて再度お試しください'
  },
  
  // ネットワークエラー
  'NETWORK_ERROR': {
    message: 'ネットワークエラーが発生しました',
    details: 'インターネット接続を確認してください'
  },
  'TIMEOUT_ERROR': {
    message: 'リクエストがタイムアウトしました',
    details: '時間をおいて再度お試しください'
  },
  
  // バリデーションエラー
  'VALIDATION_ERROR': {
    message: '入力内容に誤りがあります',
    details: '入力内容を確認してください'
  },
  
  // ビジネスロジックエラー
  'INSUFFICIENT_FUNDS': {
    message: '残高が不足しています',
    details: '取引数量を見直してください'
  },
  'INVALID_ORDER': {
    message: '注文内容が無効です',
    details: '注文内容を確認してください'
  },
  'POSITION_NOT_FOUND': {
    message: '指定されたポジションが見つかりません',
    details: 'ポジションを確認してください'
  },
  
  // システムエラー
  'UNKNOWN_ERROR': {
    message: '不明なエラーが発生しました',
    details: '管理者にお問い合わせください'
  }
};

/**
 * エラー情報を標準化
 */
export function normalizeError(error: unknown, context?: string): ErrorDetails {
  // 既にErrorDetails形式の場合
  if (typeof error === 'object' && error !== null && 'category' in error) {
    return error as ErrorDetails;
  }

  // エラーオブジェクトの場合
  if (error instanceof Error) {
    // カスタムエラーコードがある場合
    if ('code' in error) {
      const code = (error as any).code as string;
      const standardMessage = STANDARD_ERROR_MESSAGES[code];
      
      return {
        category: determineCategory(code),
        code,
        message: standardMessage?.message || error.message,
        details: standardMessage?.details,
        context,
        originalError: error
      };
    }

    // 特定のエラータイプを判定
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        category: ErrorCategory.NETWORK,
        code: 'FETCH_ERROR',
        message: STANDARD_ERROR_MESSAGES.FETCH_ERROR.message,
        details: STANDARD_ERROR_MESSAGES.FETCH_ERROR.details,
        context,
        originalError: error
      };
    }

    // 一般的なエラー
    return {
      category: ErrorCategory.SYSTEM,
      code: 'UNKNOWN_ERROR',
      message: STANDARD_ERROR_MESSAGES.UNKNOWN_ERROR.message,
      details: STANDARD_ERROR_MESSAGES.UNKNOWN_ERROR.details,
      context,
      originalError: error
    };
  }

  // 文字列エラー
  if (typeof error === 'string') {
    return {
      category: ErrorCategory.SYSTEM,
      code: 'UNKNOWN_ERROR',
      message: error,
      context,
      originalError: error
    };
  }

  // その他の型
  return {
    category: ErrorCategory.SYSTEM,
    code: 'UNKNOWN_ERROR',
    message: '不明なエラーが発生しました',
    details: '詳細はコンソールを確認してください',
    context,
    originalError: error
  };
}

/**
 * エラーコードからカテゴリを判定
 */
function determineCategory(code?: string): ErrorCategory {
  if (!code) return ErrorCategory.SYSTEM;
  
  if (code.includes('VALIDATION')) return ErrorCategory.VALIDATION;
  if (code.includes('NETWORK') || code.includes('FETCH')) return ErrorCategory.NETWORK;
  if (code.includes('API')) return ErrorCategory.API;
  if (code.includes('BUSINESS')) return ErrorCategory.BUSINESS;
  
  // 特定のコードをチェック
  switch (code) {
    case 'INSUFFICIENT_FUNDS':
    case 'INVALID_ORDER':
    case 'POSITION_NOT_FOUND':
      return ErrorCategory.BUSINESS;
    default:
      return ErrorCategory.SYSTEM;
  }
}

/**
 * エラーをユーザーに通知
 */
export function notifyError(error: ErrorDetails): void {
  // カテゴリに応じた通知方法を実施
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      toast.error(error.message, {
        description: error.details,
        duration: 5000
      });
      break;
    case ErrorCategory.NETWORK:
    case ErrorCategory.API:
      toast.error(error.message, {
        description: error.details || 'ネットワーク接続を確認してください',
        duration: 7000
      });
      break;
    case ErrorCategory.BUSINESS:
      toast.warning(error.message, {
        description: error.details,
        duration: 5000
      });
      break;
    case ErrorCategory.SYSTEM:
    default:
      toast.error(error.message, {
        description: error.details || 'システムエラーが発生しました',
        duration: 10000
      });
      break;
  }
}

/**
 * エラーをコンソールに出力（開発用）
 */
export function logError(error: ErrorDetails): void {
  const timestamp = new Date().toISOString();
  
  console.group(`[%s] %s Error in %s`, timestamp, error.category, error.context || 'Unknown Context');
  console.error('Message:', error.message);
  if (error.details) console.error('Details:', error.details);
  if (error.code) console.error('Code:', error.code);
  if (error.originalError) console.error('Original Error:', error.originalError);
  console.groupEnd();
}

/**
 * エラーを処理する統合関数
 * 
 * @param error - 発生したエラー
 * @param context - エラー発生時のコンテキスト（例: 'fetchStockData', 'placeOrder' など）
 * @param options - 処理オプション
 */
export function handleError(
  error: unknown, 
  context?: string, 
  options: {
    notify?: boolean;  // ユーザーに通知するかどうか
    log?: boolean;     // コンソールにログを出力するかどうか
    returnError?: boolean; // エラーオブジェクトを返すかどうか
  } = {}
): ErrorDetails | null {
  // デフォルトオプション
  const opts = {
    notify: true,
    log: process.env.NODE_ENV !== 'production',
    returnError: false,
    ...options
  };

  // エラーを標準化
  const errorDetails = normalizeError(error, context);

  // ログ出力
  if (opts.log) {
    logError(errorDetails);
  }

  // ユーザー通知
  if (opts.notify) {
    notifyError(errorDetails);
  }

  // エラーオブジェクトを返す場合
  if (opts.returnError) {
    return errorDetails;
  }

  return null;
}

/**
 * API呼び出し用のエラーハンドリングラッパー
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  context: string,
  options?: {
    notify?: boolean;
    log?: boolean;
    returnError?: boolean;
  }
): Promise<{ success: boolean; data?: T; error?: ErrorDetails }> {
  try {
    const data = await apiCall();
    return { success: true, data };
  } catch (error) {
    const errorDetails = handleError(error, context, { ...options, returnError: true }) as ErrorDetails;
    return { success: false, error: errorDetails };
  }
}