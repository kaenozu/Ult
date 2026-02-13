import { AppError, ErrorCodes, ErrorSeverity } from './AppError';

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

/**
 * ValidationErrorの型ガード
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
