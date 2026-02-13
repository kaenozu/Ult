import { AppError, ErrorCodes, ErrorSeverity } from './AppError';

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

/**
 * TradingErrorの型ガード
 */
export function isTradingError(error: unknown): error is TradingError {
  return error instanceof TradingError;
}
