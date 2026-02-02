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

// Broker Connectors (NEW)
export {
  BaseBrokerConnector,
  IBKRConnector,
  AlpacaConnector,
  TDAmeritradeConnector,
  createBrokerConnector,
} from './BrokerConnectors';

export type {
  BrokerCredentials,
  OrderRequest,
  BrokerOrder,
  Position,
  AccountBalance,
  OrderBookSnapshot,
  ExecutionReport,
  BrokerConfig,
  OrderType,
  OrderSide,
  OrderStatus,
  TimeInForce,
  BrokerType,
} from './BrokerConnectors';

// Order Management System (NEW)
export {
  OrderManagementSystem,
  getGlobalOrderManagementSystem,
  resetGlobalOrderManagementSystem,
} from './OrderManagementSystem';

export type {
  ManagedOrder,
  OrderFill as OMSOrderFill,
  OMSConfig,
  OrderValidationError,
  OMSStatistics,
  OrderLifecycleState,
} from './OrderManagementSystem';

// Execution Quality Monitor (NEW)
export {
  ExecutionQualityMonitor,
  getGlobalExecutionQualityMonitor,
  resetGlobalExecutionQualityMonitor,
} from './ExecutionQualityMonitor';

export type {
  ExecutionMetrics,
  AggregatedMetrics,
  VenuePerformance,
  SlippageAnalysis,
  QualityAlert,
  QualityConfig,
} from './ExecutionQualityMonitor';

// Advanced Order Types
export type {
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
