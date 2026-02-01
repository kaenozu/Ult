/**
 * Data Quality Types
 * 
 * Type definitions for data quality checking, validation, and reporting.
 */

import { OHLCV } from './shared';

/**
 * Severity levels for quality issues
 */
export type QualitySeverity = 'error' | 'warning' | 'info';

/**
 * Quality metric for data analysis
 */
export interface QualityMetric {
  name: string;
  value: number;
  unit: string;
  description?: string;
}

/**
 * Quality report result
 */
export interface QualityReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  metrics: QualityMetric[];
  timestamp?: number;
}

/**
 * Market data structure with quality metadata
 */
export interface MarketData {
  symbol: string;
  timestamp: number;
  ohlcv?: OHLCV;
  previousClose?: number;
  previousVolume?: number;
  source?: string;
}

/**
 * Data quality rule definition
 */
export interface DataQualityRule {
  name: string;
  severity: QualitySeverity;
  validate: (data: MarketData) => boolean;
  message: string;
  enabled?: boolean;
}

/**
 * Quality checker configuration
 */
export interface QualityCheckerConfig {
  enabledRules?: string[];
  customRules?: DataQualityRule[];
  maxPriceChangePercent?: number;
  maxTimestampDelayMs?: number;
}
