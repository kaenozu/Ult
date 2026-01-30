/**
 * Trading Platform Error Types
 * 
 * Comprehensive error handling and type definitions
 */

// Base Error Classes
export class TradingError extends Error {
  constructor(public message: string, public code?: string) {
    super(message);
    this.name = 'TradingError';
  }
}

export class ValidationError extends TradingError {
  constructor(public field: string, message: string) {
    super(`Validation error for ${field}: ${message}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConnectionError extends TradingError {
  constructor(public endpoint: string, message: string) {
    super(`Connection to ${endpoint} failed: ${message}`, 'CONNECTION_ERROR');
    this.name = 'ConnectionError';
  }
}

export class ApiError extends TradingError {
  constructor(
    public endpoint: string,
    public status: number,
    public response: unknown
  ) {
    super(`API error: ${status} from ${endpoint}`, 'API_ERROR');
    this.name = 'ApiError';
  }
}

export class RateLimitError extends TradingError {
  constructor(public retryAfter?: number) {
    super(
      retryAfter 
        ? `Rate limit exceeded, try again after ${retryAfter} seconds` 
        : 'Rate limit exceeded', 
      'RATE_LIMIT_ERROR'
    );
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends TradingError {
  constructor() {
    super('Authentication failed', 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

// Strategy and Trading Errors
export class StrategyError extends TradingError {
  constructor(public strategyName: string, message: string) {
    super(`Strategy ${strategyName}: ${message}`, 'STRATEGY_ERROR');
    this.name = 'StrategyError';
  }
}

export class RiskManagementError extends TradingError {
  constructor(
    public symbol?: string,
    public reason?: string,
    public severity: 'warning' | 'error' | 'critical' = 'error'
  ) {
    super(`Risk management failed${symbol ? ` for ${symbol}` : ''}${reason ? `: ${reason}` : ''}`, 'RISK_MANAGEMENT_ERROR');
    this.name = 'RiskManagementError';
  }
}

export class OrderError extends TradingError {
  constructor(
    public orderId?: string,
    public symbol?: string,
    public reason?: string
  ) {
    super(`Order ${orderId}: ${reason || 'Unknown error'}`, 'ORDER_ERROR');
    this.name = 'OrderError';
  }
}

export class ExecutionError extends TradingError {
  constructor(
    public orderId?: string,
    public symbol?: string,
    public reason?: string
  ) {
    super(`Execution ${orderId}: ${reason || 'Unknown error'}`, 'EXECUTION_ERROR');
    this.name = 'ExecutionError';
  }
}

// Data Errors
export class DataError extends TradingError {
  constructor(
    public symbol?: string,
    public dataType?: string,
    public reason?: string
  ) {
    super(`Data ${dataType ? dataType : 'error'}${symbol ? ` for ${symbol}` : ''}${reason ? `: ${reason}` : ''}`, 'DATA_ERROR');
    this.name = 'DataError';
  }
}

export class SymbolNotFoundError extends DataError {
  constructor(public symbol: string) {
    super(symbol, 'symbol', 'Symbol not found');
    this.name = 'SymbolNotFoundError';
  }
}

export class DataNotAvailableError extends DataError {
  constructor(
    public symbol?: string,
    public dataType?: string
  ) {
    super(symbol, dataType, 'Data not available');
    this.name = 'DataNotAvailableError';
  }
}

// Risk Control Errors
export class PositionLimitError extends RiskManagementError {
  constructor(public symbol: string, public currentSize: number, public limit: number) {
    super(symbol, `Position size ${currentSize} exceeds limit ${limit}`, 'error');
    this.name = 'PositionLimitError';
  }
}

export class DrawdownLimitError extends RiskManagementError {
  constructor(public currentDrawdown: number, public limit: number) {
    super(undefined, `Drawdown ${currentDrawdown} exceeds limit ${limit}`, 'critical');
    this.name = 'DrawdownLimitError';
  }
}

export class CapitalLimitError extends RiskManagementError {
  constructor(public availableCapital: number, public requiredCapital: number) {
    super(undefined, `Available capital ${availableCapital} < required ${requiredCapital}`, 'error');
    this.name = 'CapitalLimitError';
  }
}

// Configuration Errors
export class ConfigurationError extends TradingError {
  constructor(public configPath: string, message: string) {
    super(`Configuration error ${configPath}: ${message}`, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

// System Errors
export class SystemError extends TradingError {
  constructor(message: string) {
    super(`System error: ${message}`, 'SYSTEM_ERROR');
    this.name = 'SystemError';
  }
}

export class TimeoutError extends SystemError {
  constructor(public operation: string, public timeout: number) {
    super(`${operation} timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class ResourceLimitError extends SystemError {
  constructor(public resource: string) {
    super(`${resource} limit reached`);
    this.name = 'ResourceLimitError';
  }
}

// Recovery Types
export type ErrorRecovery = {
  canRecover: boolean;
  recoveryAction: string;
  retryDelay?: number;
  retryCount?: number;
  fatal: boolean;
};

export type ErrorContext = {
  timestamp: number;
  operation: string;
  symbol?: string;
  orderId?: string;
  metadata: Record<string, unknown>;
};

export type ErrorHandler = {
  handleError: (error: TradingError, context?: ErrorContext) => ErrorRecovery;
  reportError: (error: TradingError, context?: ErrorContext) => Promise<void>;
  canRecover: (error: TradingError) => boolean;
};
