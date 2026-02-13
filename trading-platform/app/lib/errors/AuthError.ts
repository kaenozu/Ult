import { AppError, ErrorCodes } from './AppError';

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

/**
 * AuthenticationErrorの型ガード
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}
