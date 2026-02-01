/**
 * Error Handler Service
 * 
 * Comprehensive error handling and recovery mechanism
 */

import {
  TradingError,
  ConnectionError,
  ApiError,
  RateLimitError,
  AuthenticationError,
  StrategyError,
  RiskManagementError,
  OrderError,
  ExecutionError,
  DataError,
  SymbolNotFoundError,
  DataNotAvailableError,
  PositionLimitError,
  DrawdownLimitError,
  CapitalLimitError,
  ConfigurationError,
  SystemError,
  TimeoutError,
  ResourceLimitError,
  ValidationError,
  ErrorRecovery,
  ErrorContext,
  getUserErrorMessage
} from '@/app/lib/errors';

export class ErrorHandler {
  // Global error handler instance
  private static instance: ErrorHandler;
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle errors with appropriate recovery strategies
   */
  handleError(error: TradingError, context?: ErrorContext): ErrorRecovery {
    // Default recovery strategy
    let recovery: ErrorRecovery = {
      canRecover: false,
      recoveryAction: 'log',
      fatal: true,
    };

    // Specific recovery strategies by error type
    if (error instanceof RateLimitError) {
      recovery = {
        canRecover: true,
        recoveryAction: 'retry',
        retryDelay: (error.retryAfter || 60) * 1000,
        retryCount: 3,
        fatal: false,
      };
    } else if (error instanceof ConnectionError) {
      recovery = {
        canRecover: true,
        recoveryAction: 'reconnect',
        retryDelay: 5000,
        retryCount: 5,
        fatal: false,
      };
    } else if (error instanceof DataNotAvailableError) {
      recovery = {
        canRecover: true,
        recoveryAction: 'fallback',
        retryDelay: 30000,
        retryCount: 2,
        fatal: false,
      };
    } else if (error instanceof TimeoutError) {
      recovery = {
        canRecover: true,
        recoveryAction: 'retry',
        retryDelay: 10000,
        retryCount: 2,
        fatal: false,
      };
    } else if (error instanceof RiskManagementError) {
      // Risk management errors are usually fatal to current operation
      recovery = {
        canRecover: false,
        recoveryAction: 'cancel_operation',
        fatal: error.severity === 'critical',
      };
    } else if (error instanceof ValidationError || error instanceof ConfigurationError) {
      // Configuration errors are fatal and require manual intervention
      recovery = {
        canRecover: false,
        recoveryAction: 'abort_and_notify',
        fatal: true,
      };
    } else if (error instanceof SymbolNotFoundError || error instanceof AuthenticationError) {
      recovery = {
        canRecover: false,
        recoveryAction: 'notify',
        fatal: true,
      };
    } else if (error instanceof ApiError) {
      if (error.statusCode === 429) { // Too many requests
        recovery = {
          canRecover: true,
          recoveryAction: 'retry',
          retryDelay: 60000,
          retryCount: 3,
          fatal: false,
        };
      } else if (error.statusCode && error.statusCode >= 500) { // Server errors
        recovery = {
          canRecover: true,
          recoveryAction: 'retry',
          retryDelay: 15000,
          retryCount: 3,
          fatal: false,
        };
      } else { // Client errors
        recovery = {
          canRecover: false,
          recoveryAction: 'notify',
          fatal: true,
        };
      }
    } else if (error instanceof SystemError) {
      if (error instanceof ResourceLimitError) {
        recovery = {
          canRecover: true,
          recoveryAction: 'wait_and_retry',
          retryDelay: 60000,
          retryCount: 3,
          fatal: false,
        };
      } else {
        recovery = {
          canRecover: false,
          recoveryAction: 'critical',
          fatal: true,
        };
      }
    }

    this.reportError(error, context);
    return recovery;
  }

  /**
   * Report errors to monitoring system
   */
  async reportError(error: TradingError, context?: ErrorContext): Promise<void> {
    const errorData = {
      name: error.name,
      message: error.message,
      code: error instanceof TradingError ? (error as any).code : 'UNKNOWN_ERROR',
      stack: error.stack,
      context: {
        timestamp: context?.timestamp || Date.now(),
        operation: context?.operation,
        symbol: context?.symbol,
        orderId: context?.orderId,
        metadata: context?.metadata,
      },
    };

    try {
      // In production, send to error tracking service like Sentry
      if (process.env.NODE_ENV === 'production') {
        // await sentry.captureException(errorData);
      } else {
        // Console logging for development
        console.error(`[${error.name}] ${error.message}`, context);
        if (error.stack) {
          console.error(error.stack);
        }
      }

      // Send to analytics
      this.trackErrorAnalytics(errorData);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  /**
   * Track error analytics
   */
  private trackErrorAnalytics(errorData: any): void {
    try {
      // Track error statistics
      const errorStats = this.getErrorStats();
      const newStats = {
        ...errorStats,
        [errorData.name]: (errorStats[errorData.name] || 0) + 1,
        'total': (errorStats['total'] || 0) + 1,
      };

      // Store statistics in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_error_stats', JSON.stringify(newStats));
      }
    } catch (error) {
      console.error('Failed to track error analytics:', error);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    try {
      if (typeof window === 'undefined') {
        return { total: 0 };
      }

      const stored = localStorage.getItem('trading_error_stats');
      return stored ? JSON.parse(stored) : { total: 0 };
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return { total: 0 };
    }
  }

  /**
   * Reset error statistics
   */
  resetErrorStats(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('trading_error_stats');
      }
    } catch (error) {
      console.error('Failed to reset error stats:', error);
    }
  }

  /**
   * Check if error is recoverable
   */
  canRecover(error: TradingError): boolean {
    const recovery = this.handleError(error);
    return recovery.canRecover;
  }

  /**
   * Generate user-friendly message from error
   */
  getUserFriendlyMessage(error: TradingError): string {
    return getUserErrorMessage(error);
  }

  /**
   * Handle error with fallback for UI display
   */
  async handleWithFallback(
    operation: string,
    action: () => Promise<any>,
    fallback: () => any = () => null
  ): Promise<any> {
    const context: ErrorContext = {
      timestamp: Date.now(),
      operation,
      metadata: {},
    };

    try {
      return await action();
    } catch (error) {
      const typedError = this.normalizeError(error, context);
      const recovery = this.handleError(typedError, context);

      if (recovery.recoveryAction === 'retry') {
        return this.retryWithDelay(operation, action, recovery.retryDelay || 1000);
      }

      return fallback();
    }
  }

  /**
   * Normalize raw error to TradingError type
   */
  normalizeError(error: any, context: ErrorContext): TradingError {
    if (error instanceof TradingError) {
      return error;
    }

    let normalizedError: TradingError;

    if (error.code === 'ENOENT' || error.code === 'ETIMEDOUT') {
      normalizedError = new ConnectionError(context.operation || 'unknown', error.message);
    } else if (typeof error === 'string') {
      normalizedError = new SystemError(error);
    } else if (error.message) {
      normalizedError = new SystemError(error.message);
    } else {
      normalizedError = new SystemError('Unknown error');
    }

    // Copy properties from original error
    if (error && typeof error === 'object') {
      Object.assign(normalizedError, error);
    }

    return normalizedError;
  }

  /**
   * Retry operation with delay
   */
  private async retryWithDelay(
    operation: string,
    action: () => Promise<any>,
    delay: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await action();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * Handle batch operations with error aggregation
   */
  async handleBatch<T>(
    items: T[],
    processItem: (item: T) => Promise<any>,
    onError?: (item: T, error: TradingError) => void
  ): Promise<Array<{ item: T; result?: any; error?: TradingError }>> {
    const results = [];

    for (const item of items) {
      try {
        const result = await processItem(item);
        results.push({ item, result });
      } catch (error) {
        const typedError = this.normalizeError(error, {
          timestamp: Date.now(),
          operation: 'batch_process',
          metadata: { item },
        });

        if (onError) {
          onError(item, typedError);
        }

        results.push({ item, error: typedError });
      }
    }

    return results;
  }

  /**
   * Health check for error recovery system
   */
  healthCheck(): { isHealthy: boolean; errors: number; lastError?: Date } {
    const stats = this.getErrorStats();
    const lastErrorTime = this.getLastErrorTime();

    // Check if there have been recent critical errors
    const hasRecentErrors = lastErrorTime && (Date.now() - lastErrorTime.getTime()) < 300000; // 5 minutes

    return {
      isHealthy: !hasRecentErrors,
      errors: stats['total'] || 0,
      lastError: lastErrorTime || undefined,
    };
  }

  private getLastErrorTime(): Date | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      const stored = localStorage.getItem('trading_last_error');
      return stored ? new Date(stored) : null;
    } catch (error) {
      return null;
    }
  }
}

// Export instance
export const errorHandler = ErrorHandler.getInstance();
