/**
 * Shared Type Definitions
 * 
 * Centralized type definitions to avoid duplication across the codebase.
 * All shared types should be defined here and re-exported from other type files.
 */

// ============================================================================
// Core Market Data Types
// ============================================================================

/**
 * OHLCV (Open, High, Low, Close, Volume) data structure
 * Used across multiple services for market data representation
 */
export interface SharedOHLCV {
  symbol?: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Price data array for technical analysis
 */
export type PriceData = number[];

// ============================================================================
// Signal and Entry Timing Types
// ============================================================================

/**
 * Entry timing recommendation
 */
export type EntryTimingRecommendation = 'IMMEDIATE' | 'WAIT' | 'AVOID';

// ============================================================================
// Technical Indicator Types
// ============================================================================

/**
 * Technical indicator calculation result interface
 */
export interface TechnicalIndicatorResult {
  symbol: string;
  timestamp: string;
  indicators: {
    sma5?: number;
    sma20?: number;
    sma50?: number;
    sma200?: number;
    ema12?: number;
    ema26?: number;
    rsi?: number;
    macd?: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollingerBands?: {
      upper: number;
      middle: number;
      lower: number;
    };
    atr?: number;
    volumeRatio?: number;
  };
}

// ============================================================================
// Trading Types
// ============================================================================

/**
 * Trading order types
 */
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED';

/**
 * Trading signal types
 */
export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

/**
 * Market types
 */
export type MarketType = 'japan' | 'usa';

/**
 * Time horizon for predictions
 */
export type TimeHorizon = 'short' | 'medium' | 'long';

// ============================================================================
// Risk Management Types
// ============================================================================

/**
 * Position sizing method types
 */
export type PositionSizingMethod = 
  | 'fixed_ratio' 
  | 'fixed_amount' 
  | 'kelly_criterion' 
  | 'volatility_based' 
  | 'volatility_adjusted' 
  | 'risk_parity';

/**
 * Stop loss type
 */
export type StopLossType = 'percentage' | 'atr' | 'fixed' | 'price' | 'trailing';

// ============================================================================
// Event System Types
// ============================================================================

/**
 * Event types for the event bus
 */
export interface EventMap {
  'market:data': { symbol: string; data: SharedOHLCV };
  'analysis:complete': { symbol: string; result: TechnicalIndicatorResult };
  'signal:generated': { symbol: string; signal: SignalType; confidence: number };
  'order:placed': { orderId: string; symbol: string; side: OrderSide; quantity: number };
  'order:executed': { orderId: string; symbol: string; executionPrice: number };
  'risk:alert': { type: string; message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' };
  'portfolio:updated': { totalValue: number; dailyPnL: number };
  'error:occurred': { error: Error; context: string };
  'connection:status': { status: 'connected' | 'disconnected' | 'reconnecting' };
}

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Audit event types
 */
export type AuditEventType = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'PASSWORD_CHANGE'
  | 'ORDER_PLACED' 
  | 'ORDER_CANCELLED' 
  | 'ORDER_EXECUTED'
  | 'POSITION_OPENED' 
  | 'POSITION_CLOSED'
  | 'SETTINGS_CHANGED' 
  | 'API_KEY_CREATED' 
  | 'API_KEY_REVOKED'
  | 'DATA_EXPORTED' 
  | 'PERMISSION_CHANGED';

/**
 * Audit event outcome
 */
export type AuditEventOutcome = 'SUCCESS' | 'FAILURE' | 'PARTIAL';

/**
 * Audit event interface
 */
export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  type: AuditEventType;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  outcome: AuditEventOutcome;
}

// ============================================================================
// Rate Limiter Types
// ============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blockedUntil?: number;
}

// ============================================================================
// Re-exports for backward compatibility
// ============================================================================

// Re-export OHLCV as the primary type name
export type { SharedOHLCV as OHLCV };

// ============================================================================
// Type Guard Functions
// ============================================================================

/**
 * Type guard for OHLCV data
 * Validates that an unknown value is a valid OHLCV object
 */
export function isOHLCV(value: unknown): value is SharedOHLCV {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.date === 'string' &&
    typeof obj.open === 'number' &&
    typeof obj.high === 'number' &&
    typeof obj.low === 'number' &&
    typeof obj.close === 'number' &&
    typeof obj.volume === 'number' &&
    (obj.symbol === undefined || typeof obj.symbol === 'string')
  );
}

/**
 * Type guard for array of OHLCV data
 */
export function isOHLCVArray(value: unknown): value is SharedOHLCV[] {
  return Array.isArray(value) && value.every(isOHLCV);
}

/**
 * Type guard for OrderSide
 */
export function isOrderSide(value: unknown): value is OrderSide {
  return value === 'BUY' || value === 'SELL';
}

/**
 * Type guard for OrderType
 */
export function isOrderType(value: unknown): value is OrderType {
  return value === 'MARKET' || value === 'LIMIT';
}

/**
 * Type guard for OrderStatus
 */
export function isOrderStatus(value: unknown): value is OrderStatus {
  return value === 'PENDING' || value === 'FILLED' || value === 'CANCELLED';
}

/**
 * Type guard for SignalType
 */
export function isSignalType(value: unknown): value is SignalType {
  return (
    value === 'STRONG_BUY' ||
    value === 'BUY' ||
    value === 'HOLD' ||
    value === 'SELL' ||
    value === 'STRONG_SELL'
  );
}

/**
 * Type guard for MarketType
 */
export function isMarketType(value: unknown): value is MarketType {
  return value === 'japan' || value === 'usa';
}

/**
 * Type guard for TimeHorizon
 */
export function isTimeHorizon(value: unknown): value is TimeHorizon {
  return value === 'short' || value === 'medium' || value === 'long';
}

/**
 * Type guard for PositionSizingMethod
 */
export function isPositionSizingMethod(value: unknown): value is PositionSizingMethod {
  return (
    value === 'fixed_ratio' ||
    value === 'fixed_amount' ||
    value === 'kelly_criterion' ||
    value === 'volatility_based' ||
    value === 'volatility_adjusted' ||
    value === 'risk_parity'
  );
}

/**
 * Type guard for StopLossType
 */
export function isStopLossType(value: unknown): value is StopLossType {
  return (
    value === 'percentage' ||
    value === 'atr' ||
    value === 'fixed' ||
    value === 'price' ||
    value === 'trailing'
  );
}

/**
 * Assertion function for OHLCV data
 * Throws an error if the value is not a valid OHLCV object
 */
export function assertOHLCV(value: unknown, message = 'Invalid OHLCV data'): asserts value is SharedOHLCV {
  if (!isOHLCV(value)) {
    throw new TypeError(message);
  }
}

/**
 * Assertion function for array of OHLCV data
 */
export function assertOHLCVArray(value: unknown, message = 'Invalid OHLCV array'): asserts value is SharedOHLCV[] {
  if (!isOHLCVArray(value)) {
    throw new TypeError(message);
  }
}

