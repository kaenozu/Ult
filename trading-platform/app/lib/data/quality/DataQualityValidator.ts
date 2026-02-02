/**
 * DataQualityValidator
 * 
 * Enhanced data quality validation service with:
 * - Advanced anomaly detection
 * - Cross-source validation
 * - Data freshness monitoring
 * - Statistical outlier detection
 */

import type { OHLCV } from '@/app/types/shared';
import type {
  MarketData,
  QualityReport,
  QualityMetric,
  DataQualityRule,
  QualityCheckerConfig
} from '@/app/types/data-quality';

export interface CrossSourceValidation {
  symbol: string;
  sources: string[];
  priceDiscrepancy: number;
  volumeDiscrepancy: number;
  isConsistent: boolean;
  inconsistentFields: string[];
}

export interface AnomalyDetection {
  hasAnomaly: boolean;
  anomalyType: 'price_spike' | 'volume_spike' | 'gap' | 'zero_volume' | 'none';
  confidence: number;
  description: string;
}

export interface DataFreshnessReport {
  symbol: string;
  lastUpdate: number;
  age: number;
  isFresh: boolean;
  staleness: 'fresh' | 'acceptable' | 'stale' | 'expired';
}

/**
 * Enhanced Data Quality Validator
 * 
 * Provides comprehensive data quality validation including:
 * - Multi-source consistency checks
 * - Statistical anomaly detection
 * - Time-series continuity validation
 * - Real-time freshness monitoring
 */
export class DataQualityValidator {
  private rules: DataQualityRule[] = [];
  private config: QualityCheckerConfig;
  private historicalData: Map<string, OHLCV[]> = new Map();
  private readonly PRICE_SPIKE_THRESHOLD = 0.15; // 15% sudden change
  private readonly VOLUME_SPIKE_THRESHOLD = 3.0; // 3x average volume
  private readonly FRESHNESS_THRESHOLD = 60000; // 1 minute
  private readonly STALE_THRESHOLD = 300000; // 5 minutes
  private readonly EXPIRED_THRESHOLD = 900000; // 15 minutes

  constructor(config: QualityCheckerConfig = {}) {
    this.config = {
      maxPriceChangePercent: 20,
      maxTimestampDelayMs: 60000,
      ...config
    };
    this.initializeDefaultRules();
    
    if (config.customRules) {
      config.customRules.forEach(rule => this.addRule(rule));
    }
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // OHLC consistency check
    this.addRule({
      name: 'ohlc-consistency',
      severity: 'error',
      validate: (data: MarketData): boolean => {
        if (!data.ohlcv) return true;
        const { open, high, low, close } = data.ohlcv;
        return high >= Math.max(open, close) && low <= Math.min(open, close);
      },
      message: 'OHLCデータが整合していません（high >= max(open,close), low <= min(open,close)）'
    });

    // Price validity check
    this.addRule({
      name: 'price-validity',
      severity: 'error',
      validate: (data: MarketData): boolean => {
        if (!data.ohlcv) return true;
        const { open, high, low, close } = data.ohlcv;
        return [open, high, low, close].every(price => 
          price > 0 && Number.isFinite(price) && !Number.isNaN(price)
        );
      },
      message: '価格が無効な値を含んでいます'
    });

    // Volume consistency check
    this.addRule({
      name: 'volume-consistency',
      severity: 'error',
      validate: (data: MarketData): boolean => {
        if (!data.ohlcv) return true;
        const { volume } = data.ohlcv;
        return volume >= 0 && Number.isFinite(volume) && !Number.isNaN(volume);
      },
      message: 'ボリュームが無効な値です'
    });

    // Timestamp freshness check
    this.addRule({
      name: 'timestamp-freshness',
      severity: 'warning',
      validate: (data: MarketData): boolean => {
        const now = Date.now();
        const dataTime = data.timestamp;
        const maxDelay = this.config.maxTimestampDelayMs || 60000;
        return Math.abs(now - dataTime) < maxDelay;
      },
      message: 'データのタイムスタンプが古すぎます'
    });

    // Price outlier check
    this.addRule({
      name: 'price-outlier',
      severity: 'warning',
      validate: (data: MarketData): boolean => {
        if (!data.ohlcv || !data.previousClose) return true;
        const { close } = data.ohlcv;
        const change = Math.abs((close - data.previousClose) / data.previousClose);
        return change < (this.config.maxPriceChangePercent || 20) / 100;
      },
      message: '価格が異常な変動を示しています'
    });
  }

  /**
   * Add a validation rule
   */
  addRule(rule: DataQualityRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a rule by name
   */
  removeRule(name: string): void {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  /**
   * Validate market data with comprehensive checks
   */
  validate(data: MarketData): QualityReport {
    const report: QualityReport = {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      metrics: this.calculateMetrics(data),
      timestamp: Date.now()
    };

    const enabledRules = this.config.enabledRules 
      ? this.rules.filter(rule => this.config.enabledRules?.includes(rule.name))
      : this.rules;

    for (const rule of enabledRules) {
      if (rule.enabled === false) continue;

      try {
        const isValid = rule.validate(data);
        if (!isValid) {
          if (rule.severity === 'error') {
            report.isValid = false;
            report.errors.push(rule.message);
          } else if (rule.severity === 'warning') {
            report.warnings.push(rule.message);
          } else {
            report.info.push(rule.message);
          }
        }
      } catch (error) {
        report.isValid = false;
        report.errors.push(`Rule "${rule.name}" failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add anomaly detection
    const anomaly = this.detectAnomalies(data);
    if (anomaly.hasAnomaly) {
      if (anomaly.confidence > 0.8) {
        report.warnings.push(`異常検知: ${anomaly.description}`);
      } else {
        report.info.push(`疑わしい変動: ${anomaly.description}`);
      }
    }

    return report;
  }

  /**
   * Validate consistency across multiple data sources
   */
  validateCrossSources(dataFromSources: Map<string, MarketData>): CrossSourceValidation {
    const symbol = Array.from(dataFromSources.values())[0]?.symbol || 'UNKNOWN';
    const sources = Array.from(dataFromSources.keys());
    
    if (dataFromSources.size < 2) {
      return {
        symbol,
        sources,
        priceDiscrepancy: 0,
        volumeDiscrepancy: 0,
        isConsistent: true,
        inconsistentFields: []
      };
    }

    const prices: number[] = [];
    const volumes: number[] = [];
    const inconsistentFields: string[] = [];

    dataFromSources.forEach((data) => {
      if (data.ohlcv) {
        prices.push(data.ohlcv.close);
        volumes.push(data.ohlcv.volume);
      }
    });

    const priceDiscrepancy = this.calculateDiscrepancy(prices);
    const volumeDiscrepancy = this.calculateDiscrepancy(volumes);

    // Check if discrepancy is within acceptable range (5% for price, 20% for volume)
    const isConsistent = priceDiscrepancy < 0.05 && volumeDiscrepancy < 0.20;

    if (priceDiscrepancy >= 0.05) {
      inconsistentFields.push('price');
    }
    if (volumeDiscrepancy >= 0.20) {
      inconsistentFields.push('volume');
    }

    return {
      symbol,
      sources,
      priceDiscrepancy,
      volumeDiscrepancy,
      isConsistent,
      inconsistentFields
    };
  }

  /**
   * Detect anomalies in market data using statistical methods
   */
  detectAnomalies(data: MarketData): AnomalyDetection {
    if (!data.ohlcv) {
      return {
        hasAnomaly: false,
        anomalyType: 'none',
        confidence: 0,
        description: 'データ不足'
      };
    }

    // Check for zero volume
    if (data.ohlcv.volume === 0) {
      return {
        hasAnomaly: true,
        anomalyType: 'zero_volume',
        confidence: 1.0,
        description: '出来高がゼロです'
      };
    }

    // Check for price spike
    if (data.previousClose) {
      const priceChange = Math.abs((data.ohlcv.close - data.previousClose) / data.previousClose);
      if (priceChange > this.PRICE_SPIKE_THRESHOLD) {
        return {
          hasAnomaly: true,
          anomalyType: 'price_spike',
          confidence: Math.min(priceChange / this.PRICE_SPIKE_THRESHOLD, 1.0),
          description: `急激な価格変動: ${(priceChange * 100).toFixed(2)}%`
        };
      }
    }

    // Check for volume spike using historical data
    const historicalData = this.historicalData.get(data.symbol);
    if (historicalData && historicalData.length >= 20) {
      const avgVolume = historicalData
        .slice(-20)
        .reduce((sum, d) => sum + d.volume, 0) / 20;
      
      const volumeRatio = data.ohlcv.volume / avgVolume;
      if (volumeRatio > this.VOLUME_SPIKE_THRESHOLD) {
        return {
          hasAnomaly: true,
          anomalyType: 'volume_spike',
          confidence: Math.min(volumeRatio / this.VOLUME_SPIKE_THRESHOLD, 1.0),
          description: `異常な出来高: 平均の${volumeRatio.toFixed(1)}倍`
        };
      }
    }

    // Check for gap (large difference between close and open)
    const gapPercent = Math.abs(data.ohlcv.open - (data.previousClose || data.ohlcv.open)) / (data.previousClose || data.ohlcv.open);
    if (gapPercent > 0.05) {
      return {
        hasAnomaly: true,
        anomalyType: 'gap',
        confidence: Math.min(gapPercent / 0.1, 1.0),
        description: `価格ギャップ検知: ${(gapPercent * 100).toFixed(2)}%`
      };
    }

    return {
      hasAnomaly: false,
      anomalyType: 'none',
      confidence: 0,
      description: '正常'
    };
  }

  /**
   * Monitor data freshness
   */
  checkFreshness(data: MarketData): DataFreshnessReport {
    const now = Date.now();
    const age = now - data.timestamp;

    let staleness: 'fresh' | 'acceptable' | 'stale' | 'expired';
    let isFresh: boolean;

    if (age < this.FRESHNESS_THRESHOLD) {
      staleness = 'fresh';
      isFresh = true;
    } else if (age < this.STALE_THRESHOLD) {
      staleness = 'acceptable';
      isFresh = true;
    } else if (age < this.EXPIRED_THRESHOLD) {
      staleness = 'stale';
      isFresh = false;
    } else {
      staleness = 'expired';
      isFresh = false;
    }

    return {
      symbol: data.symbol,
      lastUpdate: data.timestamp,
      age,
      isFresh,
      staleness
    };
  }

  /**
   * Update historical data for anomaly detection
   */
  updateHistoricalData(symbol: string, ohlcv: OHLCV): void {
    if (!this.historicalData.has(symbol)) {
      this.historicalData.set(symbol, []);
    }

    const history = this.historicalData.get(symbol)!;
    history.push(ohlcv);

    // Keep only last 100 data points
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Calculate statistical discrepancy between values
   */
  private calculateDiscrepancy(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const maxDeviation = Math.max(...values.map(val => Math.abs(val - mean)));

    return mean > 0 ? maxDeviation / mean : 0;
  }

  /**
   * Calculate quality metrics
   */
  private calculateMetrics(data: MarketData): QualityMetric[] {
    const metrics: QualityMetric[] = [];

    if (!data.ohlcv) {
      return metrics;
    }

    const { open, high, low, close, volume } = data.ohlcv;

    // Price change percentage
    if (data.previousClose) {
      metrics.push({
        name: 'price-change',
        value: ((close - data.previousClose) / data.previousClose) * 100,
        unit: '%',
        description: '前回終値からの変動率'
      });
    }

    // High-low range
    metrics.push({
      name: 'high-low-range',
      value: ((high - low) / low) * 100,
      unit: '%',
      description: '高値と安値の幅'
    });

    // Body size (candle body)
    metrics.push({
      name: 'body-size',
      value: Math.abs(close - open) / open * 100,
      unit: '%',
      description: 'ローソク足実体の大きさ'
    });

    // Volume change
    if (data.previousVolume) {
      metrics.push({
        name: 'volume-change',
        value: ((volume - data.previousVolume) / data.previousVolume) * 100,
        unit: '%',
        description: '出来高の変化率'
      });
    }

    // Volatility indicator
    const volatility = (high - low) / ((high + low) / 2) * 100;
    metrics.push({
      name: 'volatility',
      value: volatility,
      unit: '%',
      description: 'ボラティリティ指標'
    });

    // Data age
    metrics.push({
      name: 'data-age',
      value: (Date.now() - data.timestamp) / 1000,
      unit: 's',
      description: 'データの鮮度（秒）'
    });

    return metrics;
  }

  /**
   * Get all validation rules
   */
  getRules(): DataQualityRule[] {
    return [...this.rules];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QualityCheckerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear historical data
   */
  clearHistory(symbol?: string): void {
    if (symbol) {
      this.historicalData.delete(symbol);
    } else {
      this.historicalData.clear();
    }
  }
}

/**
 * Singleton instance for convenient access
 */
export const dataQualityValidator = new DataQualityValidator();
