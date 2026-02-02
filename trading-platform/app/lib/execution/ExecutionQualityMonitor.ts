/**
 * ExecutionQualityMonitor.ts
 * 
 * Monitors and analyzes execution quality metrics
 * Tracks fill rates, slippage, market impact, latency, and fees
 */

import { EventEmitter } from 'events';
import { BrokerOrder, ExecutionReport } from './BrokerConnectors';
import { ManagedOrder, OrderFill } from './OrderManagementSystem';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionMetrics {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  requestedQuantity: number;
  filledQuantity: number;
  fillRate: number; // percentage
  expectedPrice?: number;
  averageExecutionPrice: number;
  slippage: number; // absolute
  slippagePercent: number;
  marketImpact: number; // percentage
  totalCommission: number;
  commissionRate: number; // percentage
  submissionLatency: number; // milliseconds
  fillLatency: number; // milliseconds
  totalLatency: number; // milliseconds
  timestamp: number;
  venue?: string;
}

export interface AggregatedMetrics {
  period: string;
  totalOrders: number;
  totalVolume: number;
  averageFillRate: number;
  averageSlippage: number;
  averageSlippagePercent: number;
  averageMarketImpact: number;
  totalCommissions: number;
  averageCommissionRate: number;
  averageSubmissionLatency: number;
  averageFillLatency: number;
  averageTotalLatency: number;
  bestExecution: ExecutionMetrics;
  worstExecution: ExecutionMetrics;
}

export interface VenuePerformance {
  venue: string;
  orderCount: number;
  totalVolume: number;
  averageFillRate: number;
  averageSlippage: number;
  averageCommission: number;
  averageLatency: number;
  reliabilityScore: number; // 0-100
}

export interface SlippageAnalysis {
  symbol: string;
  timeOfDay: number; // hour of day (0-23)
  orderSize: 'small' | 'medium' | 'large';
  volatility: 'low' | 'medium' | 'high';
  averageSlippage: number;
  sampleCount: number;
}

export interface QualityAlert {
  type: 'HIGH_SLIPPAGE' | 'HIGH_LATENCY' | 'LOW_FILL_RATE' | 'HIGH_COMMISSION' | 'POOR_VENUE_PERFORMANCE';
  severity: 'warning' | 'critical';
  message: string;
  metrics: Partial<ExecutionMetrics | VenuePerformance>;
  timestamp: number;
}

export interface QualityConfig {
  slippageWarningThreshold: number; // percentage
  slippageCriticalThreshold: number; // percentage
  latencyWarningThreshold: number; // milliseconds
  latencyCriticalThreshold: number; // milliseconds
  fillRateWarningThreshold: number; // percentage
  commissionWarningThreshold: number; // percentage
  enableRealTimeAlerts: boolean;
  metricsRetentionPeriod: number; // days
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  slippageWarningThreshold: 0.3, // 0.3%
  slippageCriticalThreshold: 1.0, // 1.0%
  latencyWarningThreshold: 1000, // 1 second
  latencyCriticalThreshold: 5000, // 5 seconds
  fillRateWarningThreshold: 95, // 95%
  commissionWarningThreshold: 0.5, // 0.5%
  enableRealTimeAlerts: true,
  metricsRetentionPeriod: 90, // 90 days
};

// ============================================================================
// Execution Quality Monitor
// ============================================================================

export class ExecutionQualityMonitor extends EventEmitter {
  private config: QualityConfig;
  private executionMetrics: Map<string, ExecutionMetrics> = new Map();
  private venuePerformance: Map<string, VenuePerformance> = new Map();
  private slippageAnalysis: Map<string, SlippageAnalysis[]> = new Map();
  private qualityAlerts: QualityAlert[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<QualityConfig> = {}) {
    super();
    this.config = { ...DEFAULT_QUALITY_CONFIG, ...config };
    this.startPeriodicCleanup();
  }

  // ============================================================================
  // Metrics Recording
  // ============================================================================

  recordExecution(order: ManagedOrder): void {
    if (!order.brokerOrder || order.fills.length === 0) {
      return;
    }

    const metrics = this.calculateMetrics(order);
    this.executionMetrics.set(order.id, metrics);

    // Update venue performance
    if (metrics.venue) {
      this.updateVenuePerformance(metrics);
    }

    // Update slippage analysis
    this.updateSlippageAnalysis(metrics);

    // Check for quality issues
    if (this.config.enableRealTimeAlerts) {
      this.checkQualityThresholds(metrics);
    }

    this.emit('execution_recorded', metrics);
  }

  recordExecutionReport(report: ExecutionReport): void {
    this.emit('execution_report_received', report);
  }

  // ============================================================================
  // Metrics Calculation
  // ============================================================================

  private calculateMetrics(order: ManagedOrder): ExecutionMetrics {
    const brokerOrder = order.brokerOrder!;
    const expectedPrice = order.request.price || 0;
    const averageExecutionPrice = order.averageFillPrice;
    const slippage = this.calculateSlippage(
      order.request.side,
      expectedPrice,
      averageExecutionPrice
    );
    const slippagePercent = expectedPrice > 0 ? (slippage / expectedPrice) * 100 : 0;

    // Calculate latencies
    const submissionLatency = order.submittedAt 
      ? order.submittedAt - order.createdAt 
      : 0;
    const fillLatency = order.filledAt && order.submittedAt
      ? order.filledAt - order.submittedAt
      : 0;
    const totalLatency = order.filledAt
      ? order.filledAt - order.createdAt
      : 0;

    // Calculate market impact (simplified)
    const marketImpact = this.estimateMarketImpact(order);

    return {
      orderId: order.id,
      symbol: order.request.symbol,
      side: order.request.side,
      requestedQuantity: order.request.quantity,
      filledQuantity: order.totalFilled,
      fillRate: (order.totalFilled / order.request.quantity) * 100,
      expectedPrice,
      averageExecutionPrice,
      slippage,
      slippagePercent,
      marketImpact,
      totalCommission: order.totalCommission,
      commissionRate: averageExecutionPrice > 0 
        ? (order.totalCommission / (averageExecutionPrice * order.totalFilled)) * 100 
        : 0,
      submissionLatency,
      fillLatency,
      totalLatency,
      timestamp: order.filledAt || Date.now(),
      venue: order.routingDecision?.primaryVenue,
    };
  }

  private calculateSlippage(
    side: 'BUY' | 'SELL',
    expectedPrice: number,
    executionPrice: number
  ): number {
    if (expectedPrice === 0) return 0;

    if (side === 'BUY') {
      // For buys, positive slippage means we paid more than expected
      return executionPrice - expectedPrice;
    } else {
      // For sells, positive slippage means we received less than expected
      return expectedPrice - executionPrice;
    }
  }

  private estimateMarketImpact(order: ManagedOrder): number {
    // Simplified market impact estimation
    // In a real implementation, this would consider order book depth,
    // volume, and market conditions
    const fillRate = order.totalFilled / order.request.quantity;
    const baseImpact = 0.05; // 0.05% base impact

    if (order.request.type === 'MARKET') {
      return baseImpact * (1 + (1 - fillRate) * 2);
    }

    return baseImpact * fillRate;
  }

  // ============================================================================
  // Venue Performance
  // ============================================================================

  private updateVenuePerformance(metrics: ExecutionMetrics): void {
    if (!metrics.venue) return;

    let performance = this.venuePerformance.get(metrics.venue);

    if (!performance) {
      performance = {
        venue: metrics.venue,
        orderCount: 0,
        totalVolume: 0,
        averageFillRate: 0,
        averageSlippage: 0,
        averageCommission: 0,
        averageLatency: 0,
        reliabilityScore: 100,
      };
      this.venuePerformance.set(metrics.venue, performance);
    }

    // Update performance metrics with moving average
    const alpha = 0.1; // smoothing factor
    performance.orderCount += 1;
    performance.totalVolume += metrics.filledQuantity;
    performance.averageFillRate = 
      performance.averageFillRate * (1 - alpha) + metrics.fillRate * alpha;
    performance.averageSlippage = 
      performance.averageSlippage * (1 - alpha) + Math.abs(metrics.slippagePercent) * alpha;
    performance.averageCommission = 
      performance.averageCommission * (1 - alpha) + metrics.commissionRate * alpha;
    performance.averageLatency = 
      performance.averageLatency * (1 - alpha) + metrics.totalLatency * alpha;

    // Calculate reliability score
    performance.reliabilityScore = this.calculateReliabilityScore(performance);

    this.emit('venue_performance_updated', performance);
  }

  private calculateReliabilityScore(performance: VenuePerformance): number {
    let score = 100;

    // Penalize low fill rates
    if (performance.averageFillRate < 95) {
      score -= (95 - performance.averageFillRate) * 2;
    }

    // Penalize high slippage
    if (performance.averageSlippage > 0.5) {
      score -= (performance.averageSlippage - 0.5) * 10;
    }

    // Penalize high latency
    if (performance.averageLatency > 1000) {
      score -= (performance.averageLatency - 1000) / 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  getVenuePerformance(venue: string): VenuePerformance | undefined {
    return this.venuePerformance.get(venue);
  }

  getAllVenuePerformances(): VenuePerformance[] {
    return Array.from(this.venuePerformance.values())
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  }

  // ============================================================================
  // Slippage Analysis
  // ============================================================================

  private updateSlippageAnalysis(metrics: ExecutionMetrics): void {
    const key = `${metrics.symbol}_${this.getTimeOfDayCategory(metrics.timestamp)}`;
    let analyses = this.slippageAnalysis.get(key) || [];

    const analysis: SlippageAnalysis = {
      symbol: metrics.symbol,
      timeOfDay: new Date(metrics.timestamp).getHours(),
      orderSize: this.categorizeOrderSize(metrics.requestedQuantity),
      volatility: 'medium', // Would be calculated from market data
      averageSlippage: Math.abs(metrics.slippagePercent),
      sampleCount: 1,
    };

    analyses.push(analysis);
    this.slippageAnalysis.set(key, analyses);
  }

  private getTimeOfDayCategory(timestamp: number): string {
    const hour = new Date(timestamp).getHours();
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 16) return 'afternoon';
    return 'evening';
  }

  private categorizeOrderSize(quantity: number): 'small' | 'medium' | 'large' {
    if (quantity < 100) return 'small';
    if (quantity < 1000) return 'medium';
    return 'large';
  }

  // ============================================================================
  // Quality Alerts
  // ============================================================================

  private checkQualityThresholds(metrics: ExecutionMetrics): void {
    // Check slippage
    if (Math.abs(metrics.slippagePercent) >= this.config.slippageCriticalThreshold) {
      this.raiseAlert({
        type: 'HIGH_SLIPPAGE',
        severity: 'critical',
        message: `Critical slippage detected: ${metrics.slippagePercent.toFixed(2)}% on order ${metrics.orderId}`,
        metrics,
        timestamp: Date.now(),
      });
    } else if (Math.abs(metrics.slippagePercent) >= this.config.slippageWarningThreshold) {
      this.raiseAlert({
        type: 'HIGH_SLIPPAGE',
        severity: 'warning',
        message: `High slippage detected: ${metrics.slippagePercent.toFixed(2)}% on order ${metrics.orderId}`,
        metrics,
        timestamp: Date.now(),
      });
    }

    // Check latency
    if (metrics.totalLatency >= this.config.latencyCriticalThreshold) {
      this.raiseAlert({
        type: 'HIGH_LATENCY',
        severity: 'critical',
        message: `Critical latency detected: ${metrics.totalLatency}ms on order ${metrics.orderId}`,
        metrics,
        timestamp: Date.now(),
      });
    } else if (metrics.totalLatency >= this.config.latencyWarningThreshold) {
      this.raiseAlert({
        type: 'HIGH_LATENCY',
        severity: 'warning',
        message: `High latency detected: ${metrics.totalLatency}ms on order ${metrics.orderId}`,
        metrics,
        timestamp: Date.now(),
      });
    }

    // Check fill rate
    if (metrics.fillRate < this.config.fillRateWarningThreshold) {
      this.raiseAlert({
        type: 'LOW_FILL_RATE',
        severity: 'warning',
        message: `Low fill rate detected: ${metrics.fillRate.toFixed(2)}% on order ${metrics.orderId}`,
        metrics,
        timestamp: Date.now(),
      });
    }

    // Check commission
    if (metrics.commissionRate >= this.config.commissionWarningThreshold) {
      this.raiseAlert({
        type: 'HIGH_COMMISSION',
        severity: 'warning',
        message: `High commission detected: ${metrics.commissionRate.toFixed(2)}% on order ${metrics.orderId}`,
        metrics,
        timestamp: Date.now(),
      });
    }
  }

  private raiseAlert(alert: QualityAlert): void {
    this.qualityAlerts.push(alert);
    this.emit('quality_alert', alert);
  }

  getAlerts(filter?: { type?: QualityAlert['type']; severity?: QualityAlert['severity'] }): QualityAlert[] {
    let alerts = this.qualityAlerts;

    if (filter?.type) {
      alerts = alerts.filter(a => a.type === filter.type);
    }

    if (filter?.severity) {
      alerts = alerts.filter(a => a.severity === filter.severity);
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  clearAlerts(): void {
    this.qualityAlerts = [];
  }

  // ============================================================================
  // Aggregated Metrics
  // ============================================================================

  getAggregatedMetrics(period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'day'): AggregatedMetrics | null {
    const now = Date.now();
    const periodMs = this.getPeriodMilliseconds(period);
    const cutoff = period === 'all' ? 0 : now - periodMs;

    const filteredMetrics = Array.from(this.executionMetrics.values())
      .filter(m => m.timestamp >= cutoff);

    if (filteredMetrics.length === 0) {
      return null;
    }

    const totalOrders = filteredMetrics.length;
    const totalVolume = filteredMetrics.reduce((sum, m) => sum + m.filledQuantity, 0);
    const averageFillRate = filteredMetrics.reduce((sum, m) => sum + m.fillRate, 0) / totalOrders;
    const averageSlippage = filteredMetrics.reduce((sum, m) => sum + Math.abs(m.slippage), 0) / totalOrders;
    const averageSlippagePercent = filteredMetrics.reduce((sum, m) => sum + Math.abs(m.slippagePercent), 0) / totalOrders;
    const averageMarketImpact = filteredMetrics.reduce((sum, m) => sum + m.marketImpact, 0) / totalOrders;
    const totalCommissions = filteredMetrics.reduce((sum, m) => sum + m.totalCommission, 0);
    const averageCommissionRate = filteredMetrics.reduce((sum, m) => sum + m.commissionRate, 0) / totalOrders;
    const averageSubmissionLatency = filteredMetrics.reduce((sum, m) => sum + m.submissionLatency, 0) / totalOrders;
    const averageFillLatency = filteredMetrics.reduce((sum, m) => sum + m.fillLatency, 0) / totalOrders;
    const averageTotalLatency = filteredMetrics.reduce((sum, m) => sum + m.totalLatency, 0) / totalOrders;

    const bestExecution = filteredMetrics.reduce((best, m) => 
      Math.abs(m.slippagePercent) < Math.abs(best.slippagePercent) ? m : best
    );

    const worstExecution = filteredMetrics.reduce((worst, m) => 
      Math.abs(m.slippagePercent) > Math.abs(worst.slippagePercent) ? m : worst
    );

    return {
      period,
      totalOrders,
      totalVolume,
      averageFillRate,
      averageSlippage,
      averageSlippagePercent,
      averageMarketImpact,
      totalCommissions,
      averageCommissionRate,
      averageSubmissionLatency,
      averageFillLatency,
      averageTotalLatency,
      bestExecution,
      worstExecution,
    };
  }

  private getPeriodMilliseconds(period: 'hour' | 'day' | 'week' | 'month' | 'all'): number {
    switch (period) {
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      default: return Number.MAX_SAFE_INTEGER;
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  private startPeriodicCleanup(): void {
    // Clean up old metrics every day
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanupOldMetrics(): void {
    const retentionMs = this.config.metricsRetentionPeriod * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;

    for (const [orderId, metrics] of this.executionMetrics.entries()) {
      if (metrics.timestamp < cutoff) {
        this.executionMetrics.delete(orderId);
      }
    }

    // Clean up old alerts
    this.qualityAlerts = this.qualityAlerts.filter(a => a.timestamp >= cutoff);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalQualityMonitorInstance: ExecutionQualityMonitor | null = null;

export function getGlobalExecutionQualityMonitor(): ExecutionQualityMonitor {
  if (!globalQualityMonitorInstance) {
    globalQualityMonitorInstance = new ExecutionQualityMonitor();
  }
  return globalQualityMonitorInstance;
}

export function resetGlobalExecutionQualityMonitor(): void {
  if (globalQualityMonitorInstance) {
    globalQualityMonitorInstance.shutdown();
    globalQualityMonitorInstance = null;
  }
}
