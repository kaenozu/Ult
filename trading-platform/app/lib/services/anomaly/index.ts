/**
 * Anomaly Detection and Market Prediction System
 * TRADING-010: 異常検知と市場予測システムの実装
 * 
 * Export all components for easy import
 */

// Core classes
export { AnomalyDetector } from './AnomalyDetector';
export { EventPredictor } from './EventPredictor';
export { AlertManager } from './AlertManager';
export { IsolationForest } from './IsolationForest';
export { StatisticalDetector } from './StatisticalDetector';

// Types
export type {
  // Market Data
  MarketData,
  OrderBook,
  
  // Anomaly Detection
  AnomalySeverity,
  MarketRegime,
  AnomalyType,
  DetectorResult,
  AnomalyDetectionResult,
  FlashCrashAlert,
  LiquidityCrisisAlert,
  RegimeChangeAlert,
  
  // Event Prediction
  EventType,
  EventPrediction,
  PriceMovementPrediction,
  
  // Risk Assessment
  TailRiskAssessment,
  ExtremeValueAnalysis,
  MonteCarloResult,
  RiskCorrelationAnalysis,
  CopulaModel,
  StressScenario,
  
  // Alerts
  AlertType,
  Alert,
  CriticalAlert,
  AggregatedAlert,
  AlertAnalysis,
  AlertTrend,
  
  // Configuration
  AnomalyDetectionConfig,
  PredictionConfig,
  MonitoringConfig,
  AlertManagerConfig,
  NotificationChannelConfig,
  EscalationRule,
  
  // Portfolio
  Portfolio,
  Asset,
  
  // Stream
  MarketDataStream,
  HealthCheckResult,
} from './types';

// Default configurations
export const DEFAULT_ANOMALY_CONFIG: Partial<import('./types').AnomalyDetectionConfig> = {
  flashCrashThreshold: 0.05, // 5% drop
  volumeSpikeThreshold: 3.0, // 3x average volume
  liquidityDropThreshold: 0.5, // 50% liquidity drop
  spreadThreshold: 0.01, // 1% spread
  depthThreshold: 100000, // Minimum order book depth
  imbalanceThreshold: 0.7, // 70% imbalance
  criticalSpread: 0.02, // 2% critical spread
  anomalyThreshold: 0.7, // 70% confidence threshold
};

export const DEFAULT_PREDICTION_CONFIG: Partial<import('./types').PredictionConfig> = {
  lstmConfig: {
    sequenceLength: 20,
    hiddenUnits: 64,
    learningRate: 0.001,
  },
  transformerConfig: {
    nHeads: 4,
    nLayers: 2,
    hiddenDim: 128,
  },
  attentionConfig: {
    heads: 4,
    dropout: 0.1,
  },
};

export const DEFAULT_ALERT_CONFIG: Partial<import('./types').AlertManagerConfig> = {
  duplicateWindow: 300000, // 5 minutes
  maxHistorySize: 1000,
  channels: [],
  escalationRules: [
    {
      condition: {
        severity: 'CRITICAL',
        count: 3,
        timeWindow: 600000, // 10 minutes
      },
      action: 'ESCALATE_TO_SENIOR',
      delay: 0,
    },
    {
      condition: {
        severity: 'HIGH',
        count: 5,
        timeWindow: 1800000, // 30 minutes
      },
      action: 'NOTIFY_TEAM',
      delay: 60000, // 1 minute
    },
  ],
};
