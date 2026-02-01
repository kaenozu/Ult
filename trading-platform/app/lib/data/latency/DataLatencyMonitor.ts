/**
 * DataLatencyMonitor
 * 
 * Service for monitoring data arrival latency and detecting delays
 * in market data feeds. Provides real-time alerts and statistics.
 */

import type {
  LatencyMeasurement,
  LatencyStats,
  LatencyAlert,
  DataFreshness,
  LatencyMonitorConfig,
  LatencyReport
} from '@/app/types/data-latency';

/**
 * Data Latency Monitor
 * 
 * Monitors the latency of market data arrival and generates alerts
 * when data is delayed beyond acceptable thresholds.
 * 
 * @example
 * ```typescript
 * const monitor = new DataLatencyMonitor({
 *   warningThresholdMs: 5000,
 *   criticalThresholdMs: 10000
 * });
 * monitor.recordLatency('AAPL', dataTimestamp, receivedTimestamp);
 * const freshness = monitor.checkFreshness('AAPL');
 * ```
 */
export class DataLatencyMonitor {
  private measurements: Map<string, LatencyMeasurement[]> = new Map();
  private lastUpdate: Map<string, number> = new Map();
  private config: LatencyMonitorConfig;
  private alerts: LatencyAlert[] = [];

  constructor(config: LatencyMonitorConfig = {}) {
    this.config = {
      warningThresholdMs: 5000,
      criticalThresholdMs: 10000,
      freshnessThresholdMs: 60000, // 1 minute
      measurementWindow: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Record a latency measurement
   * 
   * @param symbol - Symbol for the data
   * @param dataTimestamp - Timestamp of the data point
   * @param receivedTimestamp - Timestamp when data was received
   * @param source - Source of the data
   */
  recordLatency(
    symbol: string,
    dataTimestamp: number,
    receivedTimestamp: number = Date.now(),
    source: string = 'unknown'
  ): void {
    const latencyMs = receivedTimestamp - dataTimestamp;
    const now = Date.now();

    const measurement: LatencyMeasurement = {
      symbol,
      timestamp: now,
      dataTimestamp,
      receivedTimestamp,
      latencyMs,
      source
    };

    // Store measurement
    const measurements = this.measurements.get(symbol) || [];
    measurements.push(measurement);

    // Keep only measurements within the window
    const cutoff = now - (this.config.measurementWindow || 300000);
    const recentMeasurements = measurements.filter(m => m.timestamp > cutoff);
    this.measurements.set(symbol, recentMeasurements);

    // Update last update time
    this.lastUpdate.set(symbol, now);

    // Check for alerts
    this.checkForAlerts(symbol, latencyMs);
  }

  /**
   * Check if latency exceeds thresholds and create alerts
   * 
   * @param symbol - Symbol to check
   * @param latencyMs - Current latency in milliseconds
   */
  private checkForAlerts(symbol: string, latencyMs: number): void {
    const { warningThresholdMs, criticalThresholdMs, alertCallback } = this.config;

    if (latencyMs > (criticalThresholdMs || 10000)) {
      const alert: LatencyAlert = {
        symbol,
        timestamp: Date.now(),
        latencyMs,
        threshold: criticalThresholdMs || 10000,
        severity: 'critical',
        message: `Critical: Data latency for ${symbol} is ${latencyMs}ms (threshold: ${criticalThresholdMs}ms)`
      };
      this.alerts.push(alert);
      if (alertCallback) alertCallback(alert);
    } else if (latencyMs > (warningThresholdMs || 5000)) {
      const alert: LatencyAlert = {
        symbol,
        timestamp: Date.now(),
        latencyMs,
        threshold: warningThresholdMs || 5000,
        severity: 'warning',
        message: `Warning: Data latency for ${symbol} is ${latencyMs}ms (threshold: ${warningThresholdMs}ms)`
      };
      this.alerts.push(alert);
      if (alertCallback) alertCallback(alert);
    }

    // Keep only recent alerts (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.alerts = this.alerts.filter(a => a.timestamp > oneHourAgo);
  }

  /**
   * Get latency statistics for a symbol
   * 
   * @param symbol - Symbol to get statistics for
   * @param period - Time period for statistics
   * @returns Latency statistics
   */
  getStats(symbol: string, period: string = '5m'): LatencyStats | null {
    const measurements = this.measurements.get(symbol);
    
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const latencies = measurements.map(m => m.latencyMs).sort((a, b) => a - b);
    const sum = latencies.reduce((acc, val) => acc + val, 0);
    const avg = sum / latencies.length;

    return {
      symbol,
      avgLatencyMs: avg,
      minLatencyMs: latencies[0],
      maxLatencyMs: latencies[latencies.length - 1],
      p50LatencyMs: this.percentile(latencies, 50),
      p95LatencyMs: this.percentile(latencies, 95),
      p99LatencyMs: this.percentile(latencies, 99),
      measurementCount: latencies.length,
      period
    };
  }

  /**
   * Calculate percentile
   * 
   * @param values - Sorted array of values
   * @param percentile - Percentile to calculate (0-100)
   * @returns Percentile value
   */
  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Check data freshness for a symbol
   * 
   * @param symbol - Symbol to check
   * @returns Data freshness status
   */
  checkFreshness(symbol: string): DataFreshness {
    const lastUpdateTime = this.lastUpdate.get(symbol);
    const now = Date.now();
    
    if (!lastUpdateTime) {
      return {
        symbol,
        lastUpdate: 0,
        ageMs: Infinity,
        isFresh: false,
        staleness: 'very-stale'
      };
    }

    const ageMs = now - lastUpdateTime;
    const freshnessThreshold = this.config.freshnessThresholdMs || 60000;
    const isFresh = ageMs < freshnessThreshold;

    let staleness: 'fresh' | 'stale' | 'very-stale' = 'fresh';
    if (ageMs > freshnessThreshold * 3) {
      staleness = 'very-stale';
    } else if (ageMs > freshnessThreshold) {
      staleness = 'stale';
    }

    return {
      symbol,
      lastUpdate: lastUpdateTime,
      ageMs,
      isFresh,
      staleness
    };
  }

  /**
   * Get all active alerts
   * 
   * @param severity - Filter by severity (optional)
   * @returns Array of alerts
   */
  getAlerts(severity?: 'warning' | 'critical'): LatencyAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Clear alerts for a symbol
   * 
   * @param symbol - Symbol to clear alerts for (optional, clears all if not provided)
   */
  clearAlerts(symbol?: string): void {
    if (symbol) {
      this.alerts = this.alerts.filter(a => a.symbol !== symbol);
    } else {
      this.alerts = [];
    }
  }

  /**
   * Generate comprehensive latency report
   * 
   * @returns Latency report with statistics and alerts
   */
  generateReport(): LatencyReport {
    const stats: LatencyStats[] = [];
    const freshness: Record<string, DataFreshness> = {};
    
    // Collect stats for all symbols
    const symbols = Array.from(this.measurements.keys());
    for (const symbol of symbols) {
      const symbolStats = this.getStats(symbol);
      if (symbolStats) {
        stats.push(symbolStats);
      }
      freshness[symbol] = this.checkFreshness(symbol);
    }

    // Calculate summary
    const totalSymbols = stats.length;
    const freshSymbols = Object.values(freshness).filter(f => f.isFresh).length;
    const staleSymbols = totalSymbols - freshSymbols;
    const avgLatencyMs = stats.length > 0
      ? stats.reduce((sum, s) => sum + s.avgLatencyMs, 0) / stats.length
      : 0;

    return {
      timestamp: Date.now(),
      stats,
      alerts: [...this.alerts],
      freshness,
      summary: {
        totalSymbols,
        freshSymbols,
        staleSymbols,
        avgLatencyMs,
        alertCount: this.alerts.length
      }
    };
  }

  /**
   * Get average latency across all symbols
   * 
   * @returns Average latency in milliseconds
   */
  getAverageLatency(): number {
    let totalLatency = 0;
    let count = 0;

    const allMeasurements = Array.from(this.measurements.values());
    for (const measurements of allMeasurements) {
      for (const measurement of measurements) {
        totalLatency += measurement.latencyMs;
        count++;
      }
    }

    return count > 0 ? totalLatency / count : 0;
  }

  /**
   * Get symbols with high latency
   * 
   * @param threshold - Latency threshold in milliseconds
   * @returns Array of symbols with high latency
   */
  getHighLatencySymbols(threshold?: number): string[] {
    const latencyThreshold = threshold || this.config.warningThresholdMs || 5000;
    const highLatencySymbols: string[] = [];

    const symbols = Array.from(this.measurements.keys());
    for (const symbol of symbols) {
      const stats = this.getStats(symbol);
      if (stats && stats.avgLatencyMs > latencyThreshold) {
        highLatencySymbols.push(symbol);
      }
    }

    return highLatencySymbols;
  }

  /**
   * Reset all monitoring data
   */
  reset(): void {
    this.measurements.clear();
    this.lastUpdate.clear();
    this.alerts = [];
  }

  /**
   * Update configuration
   * 
   * @param config - New configuration to merge
   */
  updateConfig(config: Partial<LatencyMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance for convenient access
 */
export const dataLatencyMonitor = new DataLatencyMonitor();
