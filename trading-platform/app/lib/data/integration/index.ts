/**
 * Data Integration Module
 * 
 * Exports integrated data flow services and utilities
 */

export {
  WebSocketDataFlowService,
  createWebSocketDataFlowService,
  type DataFlowConfig,
  type DataFlowMetrics,
  type DataFlowAlert,
  type DataFlowEventType,
  type DataFlowEventListener,
} from './WebSocketDataFlowService';

export {
  MultiSourceDataAggregator,
  createMultiSourceDataAggregator,
  type DataSource,
  type AggregationConfig,
  type AggregationResult,
} from './MultiSourceDataAggregator';
