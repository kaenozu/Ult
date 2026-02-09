/**
 * Centralized Type Definitions (Aggregator)
 * 
 * This file re-exports types from specialized modules to maintain 
 * backward compatibility while improving maintainability.
 */

// API Types
export * from './api';

// Stock and Indicators
export * from './stock';

// AI Signals
export * from './signal';

// Portfolio and Orders
export * from './portfolio';

// Backtest
export * from './backtest';

// Risk Management
export * from './risk';

// UI and State
export * from './ui';

// Shared and Branded (Re-exports)
export type { SharedOHLCV as OHLCV } from './shared';
export {
  isOHLCV,
  isOHLCVArray,
  isOrderSide,
  isOrderType,
  isOrderStatus,
  isSignalType,
  isMarketType,
  isTimeHorizon,
  isPositionSizingMethod,
  isStopLossType,
  assertOHLCV,
  assertOHLCVArray,
} from './shared';

export type {
  OrderSide,
  OrderType,
  OrderStatus,
  SignalType,
  MarketType,
  TimeHorizon,
  EntryTimingRecommendation,
  PriceData,
  TechnicalIndicatorResult,
  EventMap,
  AuditEventType,
  AuditEventOutcome,
  AuditEvent,
  RateLimitConfig,
  RateLimitResult,
  PositionSizingMethod,
  StopLossType,
  TimeFrame,
  TimeFrameSignal,
  MultiTimeFrameAnalysis,
  TimeFrameWeights,
  MultiTimeFrameConfig,
} from './shared';

export type {
  OrderRequest,
  OrderResult,
} from './order';

export type {
  SymbolId,
  Percentage,
  Ratio,
  Price,
  Volume,
  TimestampMs,
  DateString,
  TradeId,
  OrderId,
} from './branded';

export {
  createSymbolId,
  isSymbolId,
  createPercentage,
  createRatio,
  createPrice,
  createVolume,
  createTimestampMs,
  createDateString,
  createTradeId,
  createOrderId,
  percentageToRatio,
  ratioToPercentage,
} from './branded';

export type {
  EmotionType,
  EmotionScore,
  MentalState,
  MentalHealthMetrics,
  DisciplineViolation,
  ViolationSeverity,
  DisciplineRules,
  TradingSession,
  CoachingRecommendation,
  CoachingPriority,
  CoachingType,
  WarningLevel,
  PsychologyAnalysisResult,
  EnhancedJournalEntry,
  PsychologyState,
  MentalHealthGaugeProps,
  EmotionIndicatorProps,
  DisciplineScoreProps,
  CoachPanelProps,
  PsychologyAlertConfig,
  PsychologyAlert,
  PsychologyAnalysisRequest,
  PsychologyAnalysisResponse,
  DisciplineCheckRequest,
  DisciplineCheckResponse,
} from './psychology';