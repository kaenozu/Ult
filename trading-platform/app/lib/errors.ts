/**
 * errors.ts
 * 
 * シンプルなエラーハンドリングユーティリティ
 * 個人開発向けに必要最小限の機能を提供
 */

/**
 * アプリケーションエラークラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public severity: 'low' | 'medium' | 'high' = 'medium'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * APIエラークラス
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    public statusCode: number = 500,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ) {
    super(message, `API_${statusCode}`, severity);
    this.name = 'ApiError';
  }
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION', 'low');
    this.name = 'ValidationError';
  }
}

/**
 * エラーをAppErrorにラップ
 */
export function handleError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error 
    ? `${context ? `[${context}] ` : ''}${error.message}`
    : `${context ? `[${context}] ` : ''}Unknown error occurred`;

  return new AppError(message, 'UNKNOWN', 'medium');
}

/**
 * エラーをコンソールに出力（開発時のみ詳細表示）
 */
export function logError(error: unknown, context?: string): void {
  const appError = handleError(error, context);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${appError.code}] ${appError.message}`, {
      severity: appError.severity,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    // 本番環境では最小限の情報のみ
    console.error(`[${appError.code}] ${appError.message}`);
  }
}

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    // エラーコードに基づいてユーザーメッセージを返す
    switch (error.code) {
      case 'VALIDATION':
        return error.message;
      case 'API_404':
        return 'データが見つかりませんでした';
      case 'API_429':
        return 'リクエストが多すぎます。しばらく待ってからお試しください';
      case 'API_500':
      case 'API_502':
        return 'サーバーエラーが発生しました。しばらく待ってからお試しください';
      default:
        return 'エラーが発生しました。もう一度お試しください';
    }
  }

  return 'エラーが発生しました。もう一度お試しください';
}

/**
 * 非同期関数のエラーをラップ
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    const appError = handleError(error, context);
    logError(error, context);
    return { data: null, error: appError };
  }
}
