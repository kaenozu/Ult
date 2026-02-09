/**
 * Service Tokens
 * 
 * DIコンテナで使用するサービストークンの定義
 */

export const TOKENS = {
  PredictionService: Symbol.for('PredictionService'),
  ApiClient: Symbol.for('ApiClient'),
  MarketDataService: Symbol.for('MarketDataService'),
  BacktestService: Symbol.for('BacktestService'),
  MLModelService: Symbol.for('MLModelService'),
  SignalGenerationService: Symbol.for('SignalGenerationService'),
  PortfolioRiskManagementService: Symbol.for('PortfolioRiskManagementService'),
  // UnifiedTradingPlatform dependencies
  MultiExchangeDataFeed: Symbol.for('MultiExchangeDataFeed'),
  PredictiveAnalyticsEngine: Symbol.for('PredictiveAnalyticsEngine'),
  SentimentAnalysisEngine: Symbol.for('SentimentAnalysisEngine'),
  AdvancedRiskManager: Symbol.for('AdvancedRiskManager'),
  AlgorithmicExecutionEngine: Symbol.for('AlgorithmicExecutionEngine'),
  AdvancedBacktestEngine: Symbol.for('AdvancedBacktestEngine'),
  AlertSystem: Symbol.for('AlertSystem'),
  PaperTradingEnvironment: Symbol.for('PaperTradingEnvironment'),
} as const;
