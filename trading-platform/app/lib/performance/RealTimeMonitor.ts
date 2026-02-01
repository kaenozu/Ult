/**
 * RealTimeMonitor.ts
 * 
 * Real-time portfolio monitoring system with alert functionality.
 * Monitors portfolio metrics, detects threshold violations, and emits alerts.
 */

import { EventEmitter } from 'events';
import {
  Trade,
  Portfolio,
  MonitoringAlert,
  MonitoringMetrics,
  MonitoringThresholds,
} from '@/app/types/performance';

export class RealTimeMonitor extends EventEmitter {
  private portfolio: Portfolio;
  private alerts: MonitoringAlert[] = [];
  private maxAlerts = 100;
  private metricsHistory: MonitoringMetrics[] = [];
  private maxHistoryLength = 1440; // 24 hours at 1-minute intervals

  private thresholds: MonitoringThresholds = {
    maxDailyLoss: 0.05, // 5%
    maxDrawdown: 0.10, // 10%
    maxPositions: 20,
    maxRiskExposure: 0.80, // 80%
  };

  private priceCache: Map<string, number> = new Map();

  constructor(portfolio: Portfolio) {
    super();
    this.portfolio = portfolio;
  }

  /**
   * Update portfolio and check thresholds
   */
  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
    this.checkThresholds();
    this.recordMetrics();
  }

  /**
   * Record a new trade and check for alerts
   */
  recordTrade(trade: Trade): void {
    this.checkTradeAlerts(trade);
  }

  /**
   * Update cached price for a symbol
   */
  updatePrice(symbol: string, price: number): void {
    this.priceCache.set(symbol, price);
  }

  /**
   * Check all threshold conditions
   */
  private checkThresholds(): void {
    const metrics = this.calculateCurrentMetrics();

    // Check daily loss threshold
    if (metrics.dailyReturn < -this.thresholds.maxDailyLoss) {
      this.emitAlert({
        level: 'critical',
        type: 'daily-loss',
        message: `Daily loss reached ${(metrics.dailyReturn * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        data: metrics,
      });
    }

    // Check max drawdown threshold
    const maxDrawdown = this.calculateMaxDrawdown();
    if (maxDrawdown > this.thresholds.maxDrawdown) {
      this.emitAlert({
        level: 'warning',
        type: 'max-drawdown',
        message: `Maximum drawdown exceeded ${(maxDrawdown * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        data: { maxDrawdown },
      });
    }

    // Check position count threshold
    if (metrics.openPositions > this.thresholds.maxPositions) {
      this.emitAlert({
        level: 'warning',
        type: 'max-positions',
        message: `Open position count reached ${metrics.openPositions}`,
        timestamp: Date.now(),
        data: { openPositions: metrics.openPositions },
      });
    }

    // Check risk exposure threshold
    if (metrics.riskExposure > this.thresholds.maxRiskExposure) {
      this.emitAlert({
        level: 'critical',
        type: 'max-risk-exposure',
        message: `Risk exposure exceeded ${(metrics.riskExposure * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        data: { riskExposure: metrics.riskExposure },
      });
    }
  }

  /**
   * Check for trade-specific alerts
   */
  private checkTradeAlerts(trade: Trade): void {
    // Check for consecutive losses
    const recentTrades = this.portfolio.trades.slice(-10);
    const consecutiveLosses = this.countConsecutiveLosses(recentTrades);

    if (consecutiveLosses >= 3) {
      this.emitAlert({
        level: 'warning',
        type: 'consecutive-losses',
        message: `${consecutiveLosses} consecutive losses detected`,
        timestamp: Date.now(),
        data: { consecutiveLosses },
      });
    }

    // Check for large loss
    if (trade.profit && trade.profit < -1000) {
      this.emitAlert({
        level: 'critical',
        type: 'large-loss',
        message: `Large loss detected: $${trade.profit.toFixed(2)}`,
        timestamp: Date.now(),
        data: { trade },
      });
    }

    // Check for large win (informational)
    if (trade.profit && trade.profit > 1000) {
      this.emitAlert({
        level: 'info',
        type: 'large-win',
        message: `Large win: $${trade.profit.toFixed(2)}`,
        timestamp: Date.now(),
        data: { trade },
      });
    }
  }

  /**
   * Calculate current monitoring metrics
   */
  private calculateCurrentMetrics(): MonitoringMetrics {
    const today = new Date().toDateString();
    const todayTrades = this.portfolio.trades.filter(
      t => new Date(t.timestamp).toDateString() === today
    );

    const dailyPnL = todayTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const dailyReturn = this.portfolio.initialValue > 0
      ? dailyPnL / this.portfolio.initialValue
      : 0;

    const openPositions = Object.keys(this.portfolio.positions).length;
    const unrealizedPnL = this.calculateUnrealizedPnL();
    const riskExposure = this.calculateRiskExposure();

    return {
      timestamp: Date.now(),
      portfolioValue: this.portfolio.currentValue,
      dailyPnL,
      dailyReturn,
      openPositions,
      activeOrders: this.portfolio.orders.filter(o => o.status === 'OPEN').length,
      unrealizedPnL,
      riskExposure,
    };
  }

  /**
   * Calculate unrealized profit/loss
   */
  private calculateUnrealizedPnL(): number {
    let unrealizedPnL = 0;

    for (const [symbol, position] of Object.entries(this.portfolio.positions)) {
      const currentPrice = this.getCurrentPrice(symbol);
      if (currentPrice) {
        unrealizedPnL += (currentPrice - position.entryPrice) * position.quantity;
      }
    }

    return unrealizedPnL;
  }

  /**
   * Calculate total risk exposure
   */
  private calculateRiskExposure(): number {
    let totalRisk = 0;

    for (const [symbol, position] of Object.entries(this.portfolio.positions)) {
      const currentPrice = this.getCurrentPrice(symbol);
      if (currentPrice && position.stopLoss) {
        const risk = Math.abs(currentPrice - position.stopLoss) * position.quantity;
        totalRisk += risk;
      }
    }

    return this.portfolio.currentValue > 0
      ? totalRisk / this.portfolio.currentValue
      : 0;
  }

  /**
   * Calculate maximum drawdown from portfolio history
   */
  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    let peak = this.portfolio.initialValue;

    for (const snapshot of this.portfolio.history) {
      peak = Math.max(peak, snapshot.value);
      const drawdown = (peak - snapshot.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  /**
   * Count consecutive losing trades
   */
  private countConsecutiveLosses(trades: Trade[]): number {
    let count = 0;

    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].profit && trades[i].profit! < 0) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Record current metrics to history
   */
  private recordMetrics(): void {
    const metrics = this.calculateCurrentMetrics();
    this.metricsHistory.push(metrics);

    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Emit an alert
   */
  private emitAlert(alert: MonitoringAlert): void {
    this.alerts.push(alert);

    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    this.emit('alert', alert);
  }

  /**
   * Get current price from cache
   */
  private getCurrentPrice(symbol: string): number | null {
    return this.priceCache.get(symbol) || null;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MonitoringMetrics {
    return this.calculateCurrentMetrics();
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): MonitoringMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Get alerts
   */
  getAlerts(level?: 'info' | 'warning' | 'critical'): MonitoringAlert[] {
    if (level) {
      return this.alerts.filter(a => a.level === level);
    }
    return [...this.alerts];
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Clear alerts by level
   */
  clearAlertsByLevel(level: 'info' | 'warning' | 'critical'): void {
    this.alerts = this.alerts.filter(a => a.level !== level);
  }

  /**
   * Update monitoring thresholds
   */
  setThresholds(thresholds: Partial<MonitoringThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): MonitoringThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    total: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
  } {
    const byLevel: Record<string, number> = { info: 0, warning: 0, critical: 0 };
    const byType: Record<string, number> = {};

    for (const alert of this.alerts) {
      byLevel[alert.level]++;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    }

    return {
      total: this.alerts.length,
      byLevel,
      byType,
    };
  }

  /**
   * Clear metrics history
   */
  clearMetricsHistory(): void {
    this.metricsHistory = [];
  }
}

// Export factory function
export function createRealTimeMonitor(portfolio: Portfolio): RealTimeMonitor {
  return new RealTimeMonitor(portfolio);
}
