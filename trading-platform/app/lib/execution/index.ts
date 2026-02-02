/**
 * execution/index.ts
 * 
 * Central export for all execution-related services and components
 */

// Advanced Order Manager
export {
  AdvancedOrderManager,
  getGlobalAdvancedOrderManager,
  resetGlobalAdvancedOrderManager,
} from './AdvancedOrderManager';

export type {
  MarketPrice,
  OrderFill,
  AdvancedOrderManagerConfig,
} from './AdvancedOrderManager';

// Slippage Prediction Service
export {
  SlippagePredictionService,
  getGlobalSlippagePredictionService,
  resetGlobalSlippagePredictionService,
} from './SlippagePredictionService';

export type {
  OrderBookLevel,
  OrderBook,
  SlippageEstimate,
  MarketDepthAnalysis,
  HistoricalSlippage,
  SlippageConfig,
} from './SlippagePredictionService';

// Smart Order Router
export {
  SmartOrderRouter,
  getGlobalSmartOrderRouter,
  resetGlobalSmartOrderRouter,
} from './SmartOrderRouter';

export type {
  ExecutionVenue,
  VenueLiquidity,
  RoutingDecision,
  ExecutionRoute,
  SmartRouterConfig,
} from './SmartOrderRouter';

// Algorithmic Execution Engine (existing)
export {
  AlgorithmicExecutionEngine,
  getGlobalExecutionEngine,
  resetGlobalExecutionEngine,
  DEFAULT_EXECUTION_CONFIG,
} from './AlgorithmicExecutionEngine';

export type {
  Order,
  ExecutionAlgorithm,
  OrderBook as AlgoOrderBook,
  ExecutionResult,
  ExecutionConfig,
  MarketImpactEstimate,
  LatencyMetrics,
} from './AlgorithmicExecutionEngine';

// Slippage Monitor
export {
  SlippageMonitor,
  getGlobalSlippageMonitor,
  resetGlobalSlippageMonitor,
} from './SlippageMonitor';

export type {
  Order as SlippageOrder,
  Execution,
  SlippageRecord,
  SlippageAnalysis,
  SlippageAlert,
  SlippageMonitorConfig,
} from './SlippageMonitor';

// Advanced Order Types
export type {
  OrderSide,
  TimeInForce,
  OrderStatus,
  BaseOrder,
  StopLossOrder,
  TakeProfitOrder,
  OCOOrder,
  IcebergOrder,
  TrailingStopOrder,
  BracketOrder,
  AdvancedOrder,
  OrderEventType,
  OrderEvent,
} from '../../types/advancedOrder';

export {
  isStopLossOrder,
  isTakeProfitOrder,
  isOCOOrder,
  isIcebergOrder,
  isTrailingStopOrder,
  isBracketOrder,
} from '../../types/advancedOrder';
