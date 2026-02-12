import { AppError, ErrorCodes } from './AppError';

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

/**
 * NotFoundErrorの型ガード
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}
