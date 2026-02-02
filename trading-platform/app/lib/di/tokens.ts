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
} as const;
