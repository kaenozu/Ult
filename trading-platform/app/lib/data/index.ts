/**
 * Data Quality and Reliability Services
 * 
 * Central export point for all data quality, completion, microstructure, and latency monitoring services.
 */

export { DataQualityChecker, dataQualityChecker } from './quality/DataQualityChecker';
export { DataQualityValidator, dataQualityValidator } from './quality/DataQualityValidator';
export { DataCompletionPipeline, dataCompletionPipeline } from './completion/DataCompletionPipeline';
export { MicrostructureAnalyzer, microstructureAnalyzer } from './microstructure/MicrostructureAnalyzer';
export { DataLatencyMonitor, dataLatencyMonitor } from './latency/DataLatencyMonitor';
export { DataPersistenceLayer, dataPersistenceLayer } from './persistence/DataPersistenceLayer';
export { SmartDataCache, marketDataCache, indicatorCache, apiCache } from './cache/SmartDataCache';

// Re-export types
export type {
  MarketData,
  QualityReport,
  QualityMetric,
  DataQualityRule,
  QualityCheckerConfig
} from '@/app/types/data-quality';

export type {
  CompletionResult,
  DataGap,
  CompletionStrategy,
  CompletionStrategyType,
  CompletionPipelineConfig,
  DataSource
} from '@/app/types/data-completion';

export type {
  OrderBook,
  OrderBookLevel,
  TradeTick,
  OrderFlow,
  MarketImpact,
  MicrostructureMetrics,
  MicrostructureConfig
} from '@/app/types/microstructure';

export type {
  LatencyMeasurement,
  LatencyStats,
  LatencyAlert,
  DataFreshness,
  LatencyMonitorConfig,
  LatencyReport
} from '@/app/types/data-latency';

// Persistence types
export type {
  TradeHistory,
  ModelConfiguration,
  BackupMetadata,
  PersistenceOptions,
  QueryOptions
} from './persistence/DataPersistenceLayer';

// Cache types
export type {
  CacheEntry,
  CacheStats,
  CacheConfig,
  PrefetchStrategy
} from './cache/SmartDataCache';

// Validator types
export type {
  CrossSourceValidation,
  AnomalyDetection,
  DataFreshnessReport
} from './quality/DataQualityValidator';
