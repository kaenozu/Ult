/**
 * Forecast Module Index
 * 
 * Exports all forecast-related services and types.
 */

// Market Correlation
export {
  marketCorrelationService,
  type MarketIndex,
  type CorrelationResult,
  type CompositeSignal,
  type MarketSyncData
} from '../marketCorrelation';

// Supply/Demand Master
export {
  supplyDemandMaster,
  type SupplyDemandLevel,
  type BreakoutEvent,
  type SupplyDemandAnalysis,
  type VolumeProfileBucket
} from '../supplyDemandMaster';

// Forecast Accuracy
export {
  forecastAccuracyService,
  type Prediction,
  type AccuracyMetrics,
  type PredictionHistory
} from '../forecastAccuracy';

// Optimized Backtest
export {
  optimizedBacktestEngine,
  DEFAULT_CONFIG,
  type BacktestConfig,
  type PreCalculatedIndicators,
  type SimulationResult
} from '../optimizedBacktest';

// Forecast Master
export {
  forecastMaster,
  type ForecastMasterResult,
  type PredictionCloud
} from '../forecastMaster';
