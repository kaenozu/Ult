/**
 * DataQualityChecker
 * 
 * Service for validating market data quality through configurable rules.
 * Checks OHLCV consistency, price outliers, volume validity, and timestamp freshness.
 */

import type { 
  MarketData, 
  QualityReport, 
  QualityMetric, 
  DataQualityRule,
  QualityCheckerConfig 
} from '@/app/types/data-quality';

/**
 * Data Quality Checker Service
 * 
 * Validates market data using predefined and custom rules.
 * Returns detailed quality reports with errors, warnings, and metrics.
 * 
 * @example
 * ```typescript
 * const checker = new DataQualityChecker();
 * const report = checker.check(marketData);
 * if (!report.isValid) {
 *   console.error('Data quality issues:', report.errors);
 * }
 * ```
 */
export class DataQualityChecker {
  private rules: DataQualityRule[] = [];
  private config: QualityCheckerConfig;

  constructor(config: QualityCheckerConfig = {}) {
    this.config = {
      maxPriceChangePercent: 20,
      maxTimestampDelayMs: 60000, // 1 minute
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

    // Volume consistency check
    this.addRule({
      name: 'volume-consistency',
      severity: 'error',
      validate: (data: MarketData): boolean => {
        if (!data.ohlcv) return true;
        const { volume } = data.ohlcv;
        return volume >= 0 && Number.isFinite(volume);
      },
      message: 'ボリュームが無効な値です'
    });

    // Timestamp freshness check
    this.addRule({
      name: 'timestamp-consistency',
      severity: 'error',
      validate: (data: MarketData): boolean => {
        const now = Date.now();
        const dataTime = data.timestamp;
        const maxDelay = this.config.maxTimestampDelayMs || 60000;
        return Math.abs(now - dataTime) < maxDelay;
      },
      message: 'データのタイムスタンプが古すぎます'
    });

    // Price value validation
    this.addRule({
      name: 'price-validity',
      severity: 'error',
      validate: (data: MarketData): boolean => {
        if (!data.ohlcv) return true;
        const { open, high, low, close } = data.ohlcv;
        return [open, high, low, close].every(price => 
          price > 0 && Number.isFinite(price)
        );
      },
      message: '価格が無効な値を含んでいます'
    });

    // High-low spread check
    this.addRule({
      name: 'high-low-spread',
      severity: 'warning',
      validate: (data: MarketData): boolean => {
        if (!data.ohlcv) return true;
        const { high, low } = data.ohlcv;
        const spread = (high - low) / low;
        return spread < 0.5; // 50% spread threshold
      },
      message: '高値と安値の差が異常に大きいです'
    });
  }

  /**
   * Add a custom validation rule
   * 
   * @param rule - The validation rule to add
   */
  addRule(rule: DataQualityRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a rule by name
   * 
   * @param name - Name of the rule to remove
   */
  removeRule(name: string): void {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  /**
   * Check data quality against all rules
   * 
   * @param data - Market data to validate
   * @returns Quality report with validation results
   */
  check(data: MarketData): QualityReport {
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

    return report;
  }

  /**
   * Calculate quality metrics for the data
   * 
   * @param data - Market data to analyze
   * @returns Array of quality metrics
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

    // Upper shadow length
    const upperShadow = (high - Math.max(open, close)) / Math.max(open, close) * 100;
    metrics.push({
      name: 'upper-shadow',
      value: upperShadow,
      unit: '%',
      description: '上ヒゲの長さ'
    });

    // Lower shadow length
    const lowerShadow = (Math.min(open, close) - low) / Math.min(open, close) * 100;
    metrics.push({
      name: 'lower-shadow',
      value: lowerShadow,
      unit: '%',
      description: '下ヒゲの長さ'
    });

    return metrics;
  }

  /**
   * Get list of all registered rules
   * 
   * @returns Array of all validation rules
   */
  getRules(): DataQualityRule[] {
    return [...this.rules];
  }

  /**
   * Update configuration
   * 
   * @param config - New configuration to merge
   */
  updateConfig(config: Partial<QualityCheckerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance for convenient access
 */
export const dataQualityChecker = new DataQualityChecker();
