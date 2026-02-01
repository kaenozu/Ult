/**
 * Alternative Data Integration Module
 * 
 * 代替データ統合モジュール - 複数のデータソースからの代替データを統合し、
 * 強化されたセンチメント分析を提供します。
 */

// Export DataCollector
export {
  AlternativeDataCollector,
  getGlobalDataCollector,
  resetGlobalDataCollector,
  DEFAULT_COLLECTOR_CONFIG
} from './DataCollector';

export type {
  DataSourceType,
  DataSourcePriority,
  DataSourceConfig,
  DataQualityMetrics,
  CollectedData,
  CollectionStats,
  CollectorConfig
} from './DataCollector';

// Export EnhancedSentimentService
export {
  EnhancedSentimentService,
  getGlobalEnhancedSentimentService,
  resetGlobalEnhancedSentimentService
} from './EnhancedSentimentService';

export type {
  InvestorSentiment,
  SentimentLeadingIndicator,
  EnhancedSentimentResult,
  EnhancedSentimentConfig
} from './EnhancedSentimentService';
