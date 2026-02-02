/**
 * WebSocketDataFlowService
 * 
 * Integrated service for real-time data flow management with:
 * - WebSocket connection management
 * - Real-time data quality validation
 * - Multi-source data aggregation
 * - Intelligent caching with low latency
 * - Anomaly detection and alerts
 */

import { ResilientWebSocketClient, type WebSocketMessage, type WebSocketConfig } from '@/app/lib/websocket-resilient';
import { DataQualityValidator, type AnomalyDetection, type CrossSourceValidation } from '@/app/lib/data/quality/DataQualityValidator';
import { DataLatencyMonitor } from '@/app/lib/data/latency/DataLatencyMonitor';
import { SmartDataCache } from '@/app/lib/data/cache/SmartDataCache';
import type { MarketData } from '@/app/types/data-quality';
import type { OHLCV } from '@/app/types/shared';

export interface DataFlowConfig {
  websocket: WebSocketConfig;
  enableQualityCheck?: boolean;
  enableLatencyMonitoring?: boolean;
  enableCaching?: boolean;
  maxLatencyMs?: number;
  minQualityScore?: number;
}

export interface DataFlowMetrics {
  totalReceived: number;
  totalValid: number;
  totalInvalid: number;
  anomaliesDetected: number;
  avgLatency: number;
  cacheHitRate: number;
  dataQualityScore: number;
}

export interface DataFlowAlert {
  type: 'quality' | 'latency' | 'anomaly' | 'connection';
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
  data?: unknown;
}

export type DataFlowEventType = 'data' | 'alert' | 'metrics' | 'connected' | 'disconnected';
export type DataFlowEventListener = (data: unknown) => void;

/**
 * WebSocket Data Flow Service
 * 
 * Manages real-time data flow with integrated quality validation and monitoring
 */
export class WebSocketDataFlowService {
  private wsClient: ResilientWebSocketClient;
  private qualityValidator: DataQualityValidator;
  private latencyMonitor: DataLatencyMonitor;
  private cache: SmartDataCache<MarketData>;
  private config: Required<DataFlowConfig>;
  
  // Metrics
  private metrics: DataFlowMetrics = {
    totalReceived: 0,
    totalValid: 0,
    totalInvalid: 0,
    anomaliesDetected: 0,
    avgLatency: 0,
    cacheHitRate: 0,
    dataQualityScore: 100,
  };
  
  // Event listeners
  private eventListeners: Map<DataFlowEventType, Set<DataFlowEventListener>> = new Map();
  
  // Multi-source data buffer
  private multiSourceBuffer: Map<string, Map<string, MarketData>> = new Map();
  
  // Alerts
  private alerts: DataFlowAlert[] = [];
  private readonly MAX_ALERTS = 100;
  
  constructor(config: DataFlowConfig) {
    this.config = {
      websocket: config.websocket,
      enableQualityCheck: config.enableQualityCheck ?? true,
      enableLatencyMonitoring: config.enableLatencyMonitoring ?? true,
      enableCaching: config.enableCaching ?? true,
      maxLatencyMs: config.maxLatencyMs || 100,
      minQualityScore: config.minQualityScore || 0.8,
    };
    
    // Initialize components
    this.qualityValidator = new DataQualityValidator({
      maxPriceChangePercent: 20,
      maxTimestampDelayMs: 60000,
    });
    
    this.latencyMonitor = new DataLatencyMonitor({
      warningThresholdMs: this.config.maxLatencyMs,
      criticalThresholdMs: this.config.maxLatencyMs * 2,
      freshnessThresholdMs: 60000,
      alertCallback: (alert) => this.handleLatencyAlert(alert),
    });
    
    this.cache = new SmartDataCache<MarketData>({
      maxSize: 500,
      defaultTTL: 60000, // 1 minute for real-time data
      enablePrefetch: true,
      enableMetrics: true,
    });
    
    // Initialize WebSocket client
    this.wsClient = new ResilientWebSocketClient(this.config.websocket, {
      onOpen: () => this.handleConnected(),
      onClose: () => this.handleDisconnected(),
      onMessage: (message) => this.handleMessage(message),
      onError: (error) => this.handleError(error),
      onMetricsUpdate: (metrics) => this.handleMetricsUpdate(metrics),
    });
    
    // Start metrics update interval
    this.startMetricsUpdate();
  }
  
  /**
   * Connect to data feed
   */
  connect(): void {
    this.wsClient.connect();
  }
  
  /**
   * Disconnect from data feed
   */
  disconnect(): void {
    this.wsClient.disconnect();
  }
  
  /**
   * Subscribe to market data updates
   */
  subscribe(symbols: string[]): void {
    if (!this.wsClient.isConnected()) {
      console.warn('[DataFlow] Not connected, queueing subscription');
    }
    
    this.wsClient.send({
      type: 'subscribe',
      data: { symbols },
    });
  }
  
  /**
   * Unsubscribe from market data updates
   */
  unsubscribe(symbols: string[]): void {
    this.wsClient.send({
      type: 'unsubscribe',
      data: { symbols },
    });
  }
  
  /**
   * Get cached market data
   */
  getCachedData(symbol: string): MarketData | undefined {
    return this.cache.get(`market:${symbol}`);
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): DataFlowMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get recent alerts
   */
  getAlerts(severity?: 'info' | 'warning' | 'error'): DataFlowAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return [...this.alerts];
  }
  
  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
  
  /**
   * Register event listener
   */
  on(event: DataFlowEventType, listener: DataFlowEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(listener);
    };
  }
  
  /**
   * Validate cross-source data consistency
   */
  validateCrossSources(symbol: string): CrossSourceValidation | null {
    const sourceData = this.multiSourceBuffer.get(symbol);
    if (!sourceData || sourceData.size < 2) {
      return null;
    }
    
    return this.qualityValidator.validateCrossSources(sourceData);
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.wsClient.destroy();
    this.cache.clear();
    this.eventListeners.clear();
    this.multiSourceBuffer.clear();
    this.stopMetricsUpdate();
  }
  
  // ========================================================================
  // Private Methods
  // ========================================================================
  
  /**
   * Handle WebSocket connected
   */
  private handleConnected(): void {
    this.emit('connected', { timestamp: Date.now() });
  }
  
  /**
   * Handle WebSocket disconnected
   */
  private handleDisconnected(): void {
    this.emit('disconnected', { timestamp: Date.now() });
    
    this.addAlert({
      type: 'connection',
      severity: 'warning',
      message: 'Disconnected from data feed',
      timestamp: Date.now(),
    });
  }
  
  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Record receive time for latency tracking
    const receiveTime = Date.now();
    
    // Handle different message types
    switch (message.type) {
      case 'market_data':
        this.handleMarketData(message.data, receiveTime);
        break;
      case 'signal':
      case 'alert':
        this.emit('data', message);
        break;
      default:
        // Ignore other message types
        break;
    }
  }
  
  /**
   * Handle market data message
   */
  private handleMarketData(data: unknown, receiveTime: number): void {
    this.metrics.totalReceived++;
    
    // Parse and validate market data
    const marketData = this.parseMarketData(data);
    if (!marketData) {
      this.metrics.totalInvalid++;
      return;
    }
    
    // Record latency
    if (this.config.enableLatencyMonitoring) {
      this.latencyMonitor.recordLatency(
        marketData.symbol,
        marketData.timestamp,
        receiveTime
      );
    }
    
    // Check data quality
    if (this.config.enableQualityCheck) {
      const qualityReport = this.qualityValidator.validate(marketData);
      
      if (!qualityReport.isValid) {
        this.metrics.totalInvalid++;
        this.addAlert({
          type: 'quality',
          severity: 'error',
          message: `Data quality check failed for ${marketData.symbol}: ${qualityReport.errors.join(', ')}`,
          timestamp: Date.now(),
          data: marketData,
        });
        return;
      }
      
      // Check for warnings
      if (qualityReport.warnings.length > 0) {
        this.addAlert({
          type: 'quality',
          severity: 'warning',
          message: `Data quality warnings for ${marketData.symbol}: ${qualityReport.warnings.join(', ')}`,
          timestamp: Date.now(),
          data: marketData,
        });
      }
    }
    
    // Detect anomalies
    const anomaly = this.qualityValidator.detectAnomalies(marketData);
    if (anomaly.hasAnomaly) {
      this.metrics.anomaliesDetected++;
      this.addAlert({
        type: 'anomaly',
        severity: anomaly.confidence > 0.8 ? 'warning' : 'info',
        message: `Anomaly detected in ${marketData.symbol}: ${anomaly.description}`,
        timestamp: Date.now(),
        data: { marketData, anomaly },
      });
    }
    
    // Update historical data for anomaly detection
    if (marketData.ohlcv) {
      this.qualityValidator.updateHistoricalData(marketData.symbol, marketData.ohlcv);
    }
    
    // Store in multi-source buffer
    this.storeMultiSourceData(marketData);
    
    // Cache the data
    if (this.config.enableCaching) {
      this.cache.set(`market:${marketData.symbol}`, marketData, 60000, ['market']);
    }
    
    this.metrics.totalValid++;
    
    // Emit data event
    this.emit('data', marketData);
  }
  
  /**
   * Store data in multi-source buffer for cross-validation
   */
  private storeMultiSourceData(data: MarketData): void {
    const source = (data as any).source || 'default';
    
    if (!this.multiSourceBuffer.has(data.symbol)) {
      this.multiSourceBuffer.set(data.symbol, new Map());
    }
    
    this.multiSourceBuffer.get(data.symbol)!.set(source, data);
    
    // Limit buffer size - keep only last 3 sources per symbol
    const sourceMap = this.multiSourceBuffer.get(data.symbol)!;
    if (sourceMap.size > 3) {
      const firstKey = sourceMap.keys().next().value;
      sourceMap.delete(firstKey);
    }
  }
  
  /**
   * Parse market data from message
   */
  private parseMarketData(data: unknown): MarketData | null {
    try {
      if (!data || typeof data !== 'object') {
        return null;
      }
      
      const obj = data as Record<string, unknown>;
      
      // Validate required fields
      if (!obj.symbol || typeof obj.symbol !== 'string') {
        return null;
      }
      
      if (!obj.timestamp || typeof obj.timestamp !== 'number') {
        return null;
      }
      
      // Parse OHLCV if available
      let ohlcv: OHLCV | undefined;
      if (obj.ohlcv && typeof obj.ohlcv === 'object') {
        const ohlcvObj = obj.ohlcv as Record<string, unknown>;
        ohlcv = {
          symbol: obj.symbol,
          date: new Date(obj.timestamp).toISOString().split('T')[0],
          open: Number(ohlcvObj.open) || 0,
          high: Number(ohlcvObj.high) || 0,
          low: Number(ohlcvObj.low) || 0,
          close: Number(ohlcvObj.close) || 0,
          volume: Number(ohlcvObj.volume) || 0,
        };
      }
      
      return {
        symbol: obj.symbol,
        timestamp: obj.timestamp,
        ohlcv,
        previousClose: obj.previousClose as number | undefined,
        previousVolume: obj.previousVolume as number | undefined,
      };
    } catch (error) {
      console.error('[DataFlow] Failed to parse market data:', error);
      return null;
    }
  }
  
  /**
   * Handle WebSocket error
   */
  private handleError(error: unknown): void {
    console.error('[DataFlow] WebSocket error:', error);
    
    this.addAlert({
      type: 'connection',
      severity: 'error',
      message: `WebSocket error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now(),
      data: error,
    });
  }
  
  /**
   * Handle metrics update from WebSocket
   */
  private handleMetricsUpdate(wsMetrics: unknown): void {
    // Update latency from WebSocket metrics
    if (wsMetrics && typeof wsMetrics === 'object') {
      const metrics = wsMetrics as Record<string, unknown>;
      if (typeof metrics.avgLatency === 'number') {
        this.metrics.avgLatency = metrics.avgLatency;
      }
    }
  }
  
  /**
   * Handle latency alert
   */
  private handleLatencyAlert(alert: unknown): void {
    if (alert && typeof alert === 'object') {
      const latencyAlert = alert as Record<string, unknown>;
      this.addAlert({
        type: 'latency',
        severity: latencyAlert.severity === 'critical' ? 'error' : 'warning',
        message: latencyAlert.message as string || 'High latency detected',
        timestamp: Date.now(),
        data: alert,
      });
    }
  }
  
  /**
   * Add alert
   */
  private addAlert(alert: DataFlowAlert): void {
    this.alerts.push(alert);
    
    // Limit alerts array size
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.shift();
    }
    
    // Emit alert event
    this.emit('alert', alert);
  }
  
  /**
   * Emit event to listeners
   */
  private emit(event: DataFlowEventType, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[DataFlow] Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  /**
   * Start metrics update interval
   */
  private metricsUpdateInterval: ReturnType<typeof setInterval> | null = null;
  
  private startMetricsUpdate(): void {
    this.metricsUpdateInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000); // Update every second
  }
  
  /**
   * Stop metrics update interval
   */
  private stopMetricsUpdate(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(): void {
    // Update cache hit rate
    const cacheStats = this.cache.getStats();
    this.metrics.cacheHitRate = cacheStats.hitRate;
    
    // Update average latency
    const avgLatency = this.latencyMonitor.getAverageLatency();
    if (avgLatency > 0) {
      this.metrics.avgLatency = avgLatency;
    }
    
    // Calculate data quality score
    const total = this.metrics.totalReceived;
    if (total > 0) {
      const validRate = this.metrics.totalValid / total;
      const anomalyRate = this.metrics.anomaliesDetected / total;
      this.metrics.dataQualityScore = (validRate * 0.8 + (1 - anomalyRate) * 0.2) * 100;
    }
    
    // Emit metrics event
    this.emit('metrics', this.metrics);
  }
}

/**
 * Factory function to create WebSocketDataFlowService
 */
export function createWebSocketDataFlowService(config: DataFlowConfig): WebSocketDataFlowService {
  return new WebSocketDataFlowService(config);
}
