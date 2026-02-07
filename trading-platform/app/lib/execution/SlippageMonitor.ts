/**
 * SlippageMonitor.ts
 * 
 * リアルタイムスリッページ監視・分析サービス
 * Real-time slippage monitoring and analysis service
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

import { logger } from '@/app/core/logger';
export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  expectedPrice: number;
  timestamp: number;
}

export interface Execution {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  actualPrice: number;
  timestamp: number;
}

export interface SlippageRecord {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  expectedPrice: number;
  actualPrice: number;
  slippageBps: number; // Basis points
  slippagePercentage: number;
  timestamp: number;
  hour: number; // Hour of day (0-23)
}

export interface SlippageAnalysis {
  symbol: string;
  avgSlippageBps: number;
  maxSlippageBps: number;
  minSlippageBps: number;
  stdDevBps: number;
  sampleSize: number;
  timeAnalysis: {
    hourly: Map<number, { avgBps: number; count: number }>;
    bestHour: number;
    worstHour: number;
  };
  recommendations: string[];
}

export interface SlippageAlert {
  level: 'WARNING' | 'CRITICAL';
  message: string;
  orderId: string;
  symbol: string;
  slippageBps: number;
  timestamp: number;
}

export interface SlippageMonitorConfig {
  warningThresholdBps: number; // Warning at this slippage level
  criticalThresholdBps: number; // Critical alert at this level
  historyWindowSize: number; // Number of records to keep
  enableRealTimeAlerts: boolean;
  targetSlippageBps: number; // Target slippage for success metrics
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: SlippageMonitorConfig = {
  warningThresholdBps: 30, // 30 basis points
  criticalThresholdBps: 50, // 50 basis points
  historyWindowSize: 1000,
  enableRealTimeAlerts: true,
  targetSlippageBps: 25, // 25 basis points target (50% reduction from 50bps)
};

// ============================================================================
// Slippage Monitor
// ============================================================================

export class SlippageMonitor extends EventEmitter {
  private config: SlippageMonitorConfig;
  private slippageHistory: Map<string, SlippageRecord[]> = new Map();
  private pendingOrders: Map<string, Order> = new Map();
  private alerts: SlippageAlert[] = [];

  constructor(config: Partial<SlippageMonitorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Order Tracking
  // ============================================================================

  /**
   * Register an order for slippage monitoring
   */
  registerOrder(order: Order): void {
    this.pendingOrders.set(order.id, order);
    this.emit('order_registered', order);
  }

  /**
   * Record execution and calculate slippage
   */
  recordExecution(execution: Execution): SlippageRecord | null {
    const order = this.pendingOrders.get(execution.orderId);
    if (!order) {
      logger.warn(`[SlippageMonitor] Order ${execution.orderId} not found`);
      return null;
    }

    // Calculate slippage
    const slippage = this.calculateRealTimeSlippage(order, execution);
    
    // Store in history
    if (!this.slippageHistory.has(order.symbol)) {
      this.slippageHistory.set(order.symbol, []);
    }

    const history = this.slippageHistory.get(order.symbol)!;
    history.push(slippage);

    // Maintain history window size
    if (history.length > this.config.historyWindowSize) {
      history.shift();
    }

    // Check for excessive slippage
    this.checkExcessiveSlippage(slippage);

    // Clean up
    this.pendingOrders.delete(execution.orderId);

    this.emit('slippage_recorded', slippage);

    return slippage;
  }

  // ============================================================================
  // Slippage Calculation
  // ============================================================================

  /**
   * Calculate real-time slippage for an execution
   */
  calculateRealTimeSlippage(order: Order, execution: Execution): SlippageRecord {
    const priceDiff = execution.actualPrice - order.expectedPrice;
    
    // For SELL orders, negative slippage is good (sold at higher price)
    // For BUY orders, negative slippage is good (bought at lower price)
    let adjustedDiff = priceDiff;
    if (order.side === 'SELL') {
      adjustedDiff = -priceDiff; // Flip sign for sell orders
    }

    const slippagePercentage = (adjustedDiff / order.expectedPrice) * 100;
    const slippageBps = slippagePercentage * 100; // Convert to basis points

    const timestamp = execution.timestamp || Date.now();
    const date = new Date(timestamp);

    return {
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      expectedPrice: order.expectedPrice,
      actualPrice: execution.actualPrice,
      slippageBps,
      slippagePercentage,
      timestamp,
      hour: date.getHours(),
    };
  }

  /**
   * Detect excessive slippage and trigger alerts
   */
  detectExcessiveSlippage(slippageBps: number): boolean {
    return slippageBps > this.config.warningThresholdBps;
  }

  /**
   * Check for excessive slippage and emit alerts
   */
  private checkExcessiveSlippage(record: SlippageRecord): void {
    if (!this.config.enableRealTimeAlerts) {
      return;
    }

    if (record.slippageBps >= this.config.criticalThresholdBps) {
      const alert: SlippageAlert = {
        level: 'CRITICAL',
        message: `Critical slippage: ${record.slippageBps.toFixed(2)}bps on ${record.symbol} (${record.side})`,
        orderId: record.orderId,
        symbol: record.symbol,
        slippageBps: record.slippageBps,
        timestamp: Date.now(),
      };
      
      this.alerts.push(alert);
      this.emit('critical_slippage', alert);
      
    } else if (record.slippageBps >= this.config.warningThresholdBps) {
      const alert: SlippageAlert = {
        level: 'WARNING',
        message: `High slippage: ${record.slippageBps.toFixed(2)}bps on ${record.symbol} (${record.side})`,
        orderId: record.orderId,
        symbol: record.symbol,
        slippageBps: record.slippageBps,
        timestamp: Date.now(),
      };
      
      this.alerts.push(alert);
      this.emit('slippage_warning', alert);
    }
  }

  // ============================================================================
  // Historical Analysis
  // ============================================================================

  /**
   * Analyze historical slippage for a symbol
   */
  analyzeSlippageHistory(symbol: string): SlippageAnalysis {
    const history = this.slippageHistory.get(symbol) || [];
    
    if (history.length === 0) {
      return this.createEmptyAnalysis(symbol);
    }

    // Calculate statistics
    const slippages = history.map(r => r.slippageBps);
    const avgSlippageBps = slippages.reduce((sum, s) => sum + s, 0) / slippages.length;
    const maxSlippageBps = Math.max(...slippages);
    const minSlippageBps = Math.min(...slippages);
    
    const variance = slippages.reduce((sum, s) => sum + Math.pow(s - avgSlippageBps, 2), 0) / slippages.length;
    const stdDevBps = Math.sqrt(variance);

    // Time-based analysis
    const hourlyData = new Map<number, { sum: number; count: number }>();
    
    for (const record of history) {
      const hour = record.hour;
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { sum: 0, count: 0 });
      }
      
      const data = hourlyData.get(hour)!;
      data.sum += record.slippageBps;
      data.count += 1;
    }

    // Calculate hourly averages
    const hourly = new Map<number, { avgBps: number; count: number }>();
    let bestHour = 0;
    let worstHour = 0;
    let bestSlippage = Infinity;
    let worstSlippage = -Infinity;

    for (const [hour, data] of hourlyData.entries()) {
      const avgBps = data.sum / data.count;
      hourly.set(hour, { avgBps, count: data.count });

      if (avgBps < bestSlippage) {
        bestSlippage = avgBps;
        bestHour = hour;
      }
      if (avgBps > worstSlippage) {
        worstSlippage = avgBps;
        worstHour = hour;
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      avgSlippageBps,
      maxSlippageBps,
      stdDevBps,
      bestHour,
      worstHour,
      sampleSize: history.length,
    });

    return {
      symbol,
      avgSlippageBps,
      maxSlippageBps,
      minSlippageBps,
      stdDevBps,
      sampleSize: history.length,
      timeAnalysis: {
        hourly,
        bestHour,
        worstHour,
      },
      recommendations,
    };
  }

  /**
   * Get slippage statistics across all symbols
   */
  getOverallStatistics(): {
    totalRecords: number;
    avgSlippageBps: number;
    symbolCount: number;
    targetAchieved: boolean;
    reductionPercentage: number;
  } {
    let totalRecords = 0;
    let totalSlippage = 0;

    for (const history of this.slippageHistory.values()) {
      totalRecords += history.length;
      totalSlippage += history.reduce((sum, r) => sum + r.slippageBps, 0);
    }

    const avgSlippageBps = totalRecords > 0 ? totalSlippage / totalRecords : 0;
    const targetAchieved = avgSlippageBps <= this.config.targetSlippageBps;
    
    // Calculate reduction percentage (from baseline 50bps)
    const baseline = 50;
    const reductionPercentage = ((baseline - avgSlippageBps) / baseline) * 100;

    return {
      totalRecords,
      avgSlippageBps,
      symbolCount: this.slippageHistory.size,
      targetAchieved,
      reductionPercentage,
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): SlippageAlert[] {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.emit('alerts_cleared');
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(stats: {
    avgSlippageBps: number;
    maxSlippageBps: number;
    stdDevBps: number;
    bestHour: number;
    worstHour: number;
    sampleSize: number;
  }): string[] {
    const recommendations: string[] = [];

    // High average slippage
    if (stats.avgSlippageBps > this.config.targetSlippageBps) {
      recommendations.push(
        `Average slippage (${stats.avgSlippageBps.toFixed(2)}bps) exceeds target (${this.config.targetSlippageBps}bps). ` +
        `Consider using algorithmic orders (TWAP/VWAP/Iceberg) to split large orders.`
      );
    }

    // High maximum slippage
    if (stats.maxSlippageBps > 100) {
      recommendations.push(
        `Maximum slippage is very high (${stats.maxSlippageBps.toFixed(2)}bps). ` +
        `Review large orders and consider implementing stricter size limits.`
      );
    }

    // High variance
    if (stats.stdDevBps > 20) {
      recommendations.push(
        `Slippage variance is high (${stats.stdDevBps.toFixed(2)}bps std dev). ` +
        `This indicates inconsistent execution quality. Consider analyzing market conditions before trading.`
      );
    }

    // Time-based recommendations - always include if we have enough data
    if (stats.sampleSize >= 5) {
      recommendations.push(
        `Best execution time: ${stats.bestHour}:00. Worst time: ${stats.worstHour}:00. ` +
        `Schedule non-urgent orders during optimal hours.`
      );
    }

    // Small sample size
    if (stats.sampleSize < 50) {
      recommendations.push(
        `Sample size is small (${stats.sampleSize} records). ` +
        `Continue collecting data for more accurate analysis.`
      );
    }

    // Success message
    if (stats.avgSlippageBps <= this.config.targetSlippageBps) {
      recommendations.push(
        `✓ Target achieved! Average slippage is within target range (${stats.avgSlippageBps.toFixed(2)}bps ≤ ${this.config.targetSlippageBps}bps).`
      );
    }

    return recommendations;
  }

  /**
   * Create empty analysis result
   */
  private createEmptyAnalysis(symbol: string): SlippageAnalysis {
    return {
      symbol,
      avgSlippageBps: 0,
      maxSlippageBps: 0,
      minSlippageBps: 0,
      stdDevBps: 0,
      sampleSize: 0,
      timeAnalysis: {
        hourly: new Map(),
        bestHour: 10,
        worstHour: 10,
      },
      recommendations: ['No data available yet. Start trading to collect slippage data.'],
    };
  }

  // ============================================================================
  // Data Access
  // ============================================================================

  /**
   * Get slippage history for a symbol
   */
  getHistory(symbol: string): SlippageRecord[] {
    return this.slippageHistory.get(symbol) || [];
  }

  /**
   * Get all slippage history
   */
  getAllHistory(): Map<string, SlippageRecord[]> {
    return this.slippageHistory;
  }

  /**
   * Clear history for a symbol
   */
  clearHistory(symbol?: string): void {
    if (symbol) {
      this.slippageHistory.delete(symbol);
      this.emit('history_cleared', symbol);
    } else {
      this.slippageHistory.clear();
      this.emit('all_history_cleared');
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SlippageMonitorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SlippageMonitorConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config_updated', this.config);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<SlippageMonitorConfig>) => new SlippageMonitor(config)
);

export const getGlobalSlippageMonitor = getInstance;
export const resetGlobalSlippageMonitor = resetInstance;

export default SlippageMonitor;
