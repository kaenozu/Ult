/**
 * Data Latency Monitoring Types
 * 
 * Type definitions for monitoring data arrival latency and timeliness.
 */

/**
 * Latency measurement
 */
export interface LatencyMeasurement {
  symbol: string;
  timestamp: number;
  dataTimestamp: number;
  receivedTimestamp: number;
  latencyMs: number;
  source: string;
}

/**
 * Latency statistics
 */
export interface LatencyStats {
  symbol: string;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  measurementCount: number;
  period: string;
}

/**
 * Latency alert
 */
export interface LatencyAlert {
  symbol: string;
  timestamp: number;
  latencyMs: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

/**
 * Data freshness status
 */
export interface DataFreshness {
  symbol: string;
  lastUpdate: number;
  ageMs: number;
  isFresh: boolean;
  staleness: 'fresh' | 'stale' | 'very-stale';
}

/**
 * Latency monitor configuration
 */
export interface LatencyMonitorConfig {
  warningThresholdMs?: number;
  criticalThresholdMs?: number;
  freshnessThresholdMs?: number;
  measurementWindow?: number; // milliseconds
  alertCallback?: (alert: LatencyAlert) => void;
}

/**
 * Latency report
 */
export interface LatencyReport {
  timestamp: number;
  stats: LatencyStats[];
  alerts: LatencyAlert[];
  freshness: Record<string, DataFreshness>;
  summary: {
    totalSymbols: number;
    freshSymbols: number;
    staleSymbols: number;
    avgLatencyMs: number;
    alertCount: number;
  };
}
