/**
 * Data Integration Module
 * 
 * Exports integrated data flow services and utilities
 */

export {
  MultiSourceDataAggregator,
  createMultiSourceDataAggregator,
  type DataSource,
  type AggregationConfig,
  type AggregationResult,
} from '../../../domains/market-data/integration/MultiSourceDataAggregator';
