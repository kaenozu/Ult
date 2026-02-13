import { AppError, ErrorCodes } from './AppError';

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

/**
 * SystemErrorの型ガード
 */
export function isSystemError(error: unknown): error is SystemError {
  return error instanceof SystemError;
}
