/**
 * Statistical Anomaly Detector
 * Uses statistical methods (z-score, IQR) to detect anomalies
 */

import { OHLCV } from '@/app/types/shared';
import { DetectorResult, MarketData } from './types';

export interface StatisticalDetectorConfig {
  zScoreThreshold: number;
  iqrMultiplier: number;
  windowSize: number;
}

export class StatisticalDetector {
  private config: StatisticalDetectorConfig;

  constructor(config?: Partial<StatisticalDetectorConfig>) {
    this.config = {
      zScoreThreshold: config?.zScoreThreshold ?? 3.0,
      iqrMultiplier: config?.iqrMultiplier ?? 1.5,
      windowSize: config?.windowSize ?? 20,
    };
  }

  /**
   * Detect anomalies using statistical methods
   */
  detect(data: MarketData): DetectorResult {
    const ohlcv = data.ohlcv;
    
    if (ohlcv.length < this.config.windowSize) {
      return {
        detectorName: 'Statistical',
        isAnomaly: false,
        score: 0,
        confidence: 0,
        details: { reason: 'Insufficient data' },
      };
    }

    // Get recent data for analysis
    const recentData = ohlcv.slice(-this.config.windowSize);
    const currentPrice = ohlcv[ohlcv.length - 1].close;
    const currentVolume = ohlcv[ohlcv.length - 1].volume;

    // Calculate price anomaly score
    const priceZScore = this.calculateZScore(
      currentPrice,
      recentData.map(d => d.close)
    );

    // Calculate volume anomaly score
    const volumeZScore = this.calculateZScore(
      currentVolume,
      recentData.map(d => d.volume)
    );

    // Calculate price change anomaly
    const priceChanges = this.calculateReturns(recentData);
    const currentChange = priceChanges[priceChanges.length - 1];
    const changeZScore = this.calculateZScore(currentChange, priceChanges);

    // Aggregate anomaly score
    const maxZScore = Math.max(
      Math.abs(priceZScore),
      Math.abs(volumeZScore),
      Math.abs(changeZScore)
    );

    const isAnomaly = maxZScore > this.config.zScoreThreshold;
    const confidence = Math.min(maxZScore / this.config.zScoreThreshold, 1.0);

    return {
      detectorName: 'Statistical',
      isAnomaly,
      score: maxZScore,
      confidence,
      details: {
        priceZScore,
        volumeZScore,
        changeZScore,
        threshold: this.config.zScoreThreshold,
      },
    };
  }

  /**
   * Calculate z-score for a value
   */
  private calculateZScore(value: number, dataset: number[]): number {
    const mean = this.calculateMean(dataset);
    const std = this.calculateStdDev(dataset, mean);
    
    if (std === 0) return 0;
    return (value - mean) / std;
  }

  /**
   * Calculate mean
   */
  private calculateMean(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(data: number[], mean: number): number {
    const variance = data.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate returns (percentage changes)
   */
  private calculateReturns(data: OHLCV[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].close - data[i - 1].close) / data[i - 1].close;
      returns.push(ret);
    }
    return returns;
  }
}
