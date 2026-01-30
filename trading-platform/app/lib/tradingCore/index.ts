/**
 * Trading Core Module - Index
 * 
 * 統合トレーディングプラットフォームの中核モジュールエクスポート
 */

// Core Platform
export { 
  UnifiedTradingPlatform, 
  getGlobalTradingPlatform, 
  resetGlobalTradingPlatform,
  type PlatformConfig,
  type PlatformStatus,
  type TradingSignal,
  type TradeDecision,
} from './UnifiedTradingPlatform';

// Market Data
export {
  MultiExchangeDataFeed,
  getGlobalDataFeed,
  resetGlobalDataFeed,
  type MarketData,
  type ExchangeConfig,
  type DataFeedConfig,
  DEFAULT_EXCHANGE_CONFIGS,
} from '../marketDataFeed/MultiExchangeDataFeed';

// AI Analytics
export {
  PredictiveAnalyticsEngine,
  getGlobalAnalyticsEngine,
  resetGlobalAnalyticsEngine,
  type TechnicalFeatures,
  type ModelPrediction,
  type PredictionResult,
  type TradingSignal as AITradingSignal,
  type PriceForecast,
  type ModelConfig,
  DEFAULT_MODEL_CONFIG,
} from '../aiAnalytics/PredictiveAnalyticsEngine';

// Sentiment Analysis
export {
  SentimentAnalysisEngine,
  getGlobalSentimentEngine,
  resetGlobalSentimentEngine,
  type NewsArticle,
  type SocialMediaPost,
  type SentimentScore,
  type AggregatedSentiment,
  type SentimentAlert,
  type SentimentConfig,
  DEFAULT_SENTIMENT_CONFIG,
} from '../sentiment/SentimentAnalysisEngine';

// Risk Management
export {
  AdvancedRiskManager,
  getGlobalRiskManager,
  resetGlobalRiskManager,
  type Position,
  type Portfolio,
  type RiskMetrics,
  type PositionSizingParams,
  type PositionSizingResult,
  type RiskLimits,
  type RiskAlert,
  type PortfolioOptimizationParams,
  type OptimizationResult,
  DEFAULT_RISK_LIMITS,
} from '../risk/AdvancedRiskManager';

// Execution Engine
export {
  AlgorithmicExecutionEngine,
  getGlobalExecutionEngine,
  resetGlobalExecutionEngine,
  type Order,
  type ExecutionAlgorithm,
  type OrderBook,
  type ExecutionResult,
  type ExecutionConfig,
  type MarketImpactEstimate,
  type LatencyMetrics,
  DEFAULT_EXECUTION_CONFIG,
} from '../execution/AlgorithmicExecutionEngine';

// Backtest Engine
export {
  AdvancedBacktestEngine,
  getGlobalBacktestEngine,
  resetGlobalBacktestEngine,
  type OHLCV,
  type Trade,
  type BacktestConfig,
  type BacktestResult,
  type PerformanceMetrics,
  type Strategy,
  type StrategyContext,
  type StrategyAction,
  DEFAULT_BACKTEST_CONFIG,
} from '../backtest/AdvancedBacktestEngine';

// Alert System
export {
  AlertSystem,
  getGlobalAlertSystem,
  resetGlobalAlertSystem,
  type AlertCondition,
  type AlertType,
  type NotificationChannel,
  type AlertTrigger,
  type AlertHistory,
  type AlertTemplate,
  type MarketData as AlertMarketData,
  ALERT_TEMPLATES,
} from '../alerts/AlertSystem';

// Paper Trading
export {
  PaperTradingEnvironment,
  getGlobalPaperTrading,
  resetGlobalPaperTrading,
  type PaperPosition,
  type PaperTrade,
  type PaperPortfolio,
  type ClosedTrade,
  type PaperTradingConfig,
  type StrategyPerformance,
  type MarketData as PaperMarketData,
  DEFAULT_PAPER_TRADING_CONFIG,
} from '../paperTrading/PaperTradingEnvironment';
