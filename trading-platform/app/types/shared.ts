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
