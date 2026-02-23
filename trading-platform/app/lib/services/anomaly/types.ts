/**
 * Type definitions for Anomaly Detection and Market Prediction System
 * TRADING-010: 異常検知と市場予測システムの実装
 */

import { OHLCV } from '@/app/types/shared';

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketData {
  symbol: string;
  timestamp: Date;
  ohlcv: OHLCV[];
  recentHistory: MarketData[];
  volume: number;
  price: number;
  indicators?: Record<string, number>;
}

export interface OrderBook {
  bids: Array<{ price: number; volume: number }>;
  asks: Array<{ price: number; volume: number }>;
  timestamp: Date;
}

// ============================================================================
// Anomaly Detection Types
// ============================================================================

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MarketRegime = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'CRISIS';
export type AnomalyType = 
  | 'FLASH_CRASH'
  | 'LIQUIDITY_CRISIS'
  | 'REGIME_CHANGE'
  | 'VOLUME_ANOMALY'
  | 'PRICE_ANOMALY'
  | 'STATISTICAL_ANOMALY';

export interface DetectorResult {
  detectorName: string;
  isAnomaly: boolean;
  score: number;
  confidence: number;
  details?: Record<string, unknown>;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  detectorResults: DetectorResult[];
  severity: AnomalySeverity;
  timestamp: Date;
  type?: AnomalyType;
  affectedSymbols?: string[];
}

export interface FlashCrashAlert {
  type: 'FLASH_CRASH';
  severity: 'CRITICAL';
  timestamp: Date;
  priceDrop: number;
  volumeSpike: number;
  liquidityDrop: number;
  recommendedAction: 'HALT_TRADING' | 'REDUCE_POSITION' | 'MONITOR';
  confidence: number;
  symbol?: string;
}

export interface LiquidityCrisisAlert {
  type: 'LIQUIDITY_CRISIS';
  severity: AnomalySeverity;
  timestamp: Date;
  spread: number;
  depth: number;
  imbalance: number;
  recommendedAction: 'REDUCE_POSITION' | 'AVOID_TRADING' | 'MONITOR';
  symbol?: string;
}

export interface RegimeChangeAlert {
  type: 'REGIME_CHANGE';
  severity: AnomalySeverity;
  timestamp: Date;
  previousRegime: MarketRegime;
  newRegime: MarketRegime;
  confidence: number;
  recommendedAction: string;
  symbol?: string;
}

// ============================================================================
// Event Prediction Types
// ============================================================================

export type EventType = 
  | 'MARKET_CRASH'
  | 'RALLY'
  | 'CONSOLIDATION'
  | 'BREAKOUT'
  | 'TREND_REVERSAL'
  | 'HIGH_VOLATILITY';

export interface EventPrediction {
  eventType: EventType;
  probability: number;
  expectedTime: Date;
  confidence: number;
  attentionWeights: Record<string, number>;
  recommendedActions: string[];
}

export interface PriceMovementPrediction {
  symbol: string;
  predictions: Array<{
    timestamp: Date;
    price: number;
    confidence: number;
  }>;
  uncertainty: {
    lower: number[];
    upper: number[];
    std: number[];
  };
  confidence: number;
  horizon: number;
  timestamp: Date;
}

// ============================================================================
// Risk Assessment Types
// ============================================================================

export interface TailRiskAssessment {
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  evtAnalysis: ExtremeValueAnalysis;
  monteCarloResults: MonteCarloResult;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendations: string[];
}

export interface ExtremeValueAnalysis {
  shape: number;
  scale: number;
  location: number;
  tailIndex: number;
  extremeQuantiles: Record<string, number>;
}

export interface MonteCarloResult {
  scenarios: number;
  worstCase: number;
  bestCase: number;
  meanReturn: number;
  stdDev: number;
  distribution: number[];
}

export interface RiskCorrelationAnalysis {
  correlationMatrix: number[][];
  copula: CopulaModel;
  stressScenarios: StressScenario[];
  diversificationBenefit: number;
  recommendations: string[];
}

export interface CopulaModel {
  type: 'gaussian' | 't' | 'clayton' | 'gumbel';
  parameters: Record<string, number>;
  dependenceStructure: number[][];
}

export interface StressScenario {
  name: string;
  description: string;
  impact: number;
  probability: number;
  affectedAssets: string[];
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertType = 
  | 'ANOMALY_DETECTED'
  | 'EVENT_PREDICTED'
  | 'FLASH_CRASH'
  | 'LIQUIDITY_CRISIS'
  | 'REGIME_CHANGE'
  | 'RISK_WARNING';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AnomalySeverity;
  timestamp: Date;
  data: unknown;
  acknowledged: boolean;
  message: string;
}

export interface CriticalAlert extends Alert {
  recommendedAction: string;
  autoActionExecuted?: boolean;
  escalated: boolean;
}

export interface AggregatedAlert {
  type: AlertType;
  count: number;
  severity: AnomalySeverity;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedSymbols: string[];
  recommendedActions: string[];
}

export interface AlertAnalysis {
  totalAlerts: number;
  bySeverity: Record<AnomalySeverity, number>;
  byType: Record<AlertType, number>;
  bySymbol: Record<string, number>;
  falsePositiveRate: number;
  responseTime: number;
  trends: AlertTrend[];
}

export interface AlertTrend {
  period: string;
  alertCount: number;
  averageSeverity: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AnomalyDetectionConfig {
  forestConfig: {
    nEstimators: number;
    contamination: number;
    maxSamples: number;
  };
  autoencoderConfig: {
    inputDim: number;
    encodingDim: number;
    learningRate: number;
    epochs: number;
  };
  lstmConfig: {
    sequenceLength: number;
    hiddenUnits: number;
    threshold: number;
  };
  flashCrashThreshold: number;
  volumeSpikeThreshold: number;
  liquidityDropThreshold: number;
  spreadThreshold: number;
  depthThreshold: number;
  imbalanceThreshold: number;
  criticalSpread: number;
  anomalyThreshold: number;
}

export interface PredictionConfig {
  lstmConfig: {
    sequenceLength: number;
    hiddenUnits: number;
    learningRate: number;
  };
  transformerConfig: {
    nHeads: number;
    nLayers: number;
    hiddenDim: number;
  };
  attentionConfig: {
    heads: number;
    dropout: number;
  };
}

export interface MonitoringConfig {
  anomalyConfig: AnomalyDetectionConfig;
  predictionConfig: PredictionConfig;
  alertConfig: AlertManagerConfig;
  streamConfig: {
    bufferSize: number;
    updateInterval: number;
  };
  predictionThreshold: number;
}

export interface AlertManagerConfig {
  channels: NotificationChannelConfig[];
  escalationRules: EscalationRule[];
  duplicateWindow: number;
  maxHistorySize: number;
}

export interface NotificationChannelConfig {
  type: 'email' | 'sms' | 'push' | 'webhook';
  severity: AnomalySeverity[];
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface EscalationRule {
  condition: {
    severity?: AnomalySeverity;
    type?: AlertType;
    count?: number;
    timeWindow?: number;
  };
  action: string;
  delay: number;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface Portfolio {
  assets: Asset[];
  totalValue: number;
  cash: number;
  getHistoricalReturns(): number[];
}

export interface Asset {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  getReturns(): number[];
}

// ============================================================================
// Stream Types
// ============================================================================

export interface MarketDataStream {
  on(event: 'data', callback: (data: MarketData) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  start(): void;
  stop(): void;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  dataLatency: number;
  processingLatency: number;
  alertLatency: number;
  timestamp: Date;
}
