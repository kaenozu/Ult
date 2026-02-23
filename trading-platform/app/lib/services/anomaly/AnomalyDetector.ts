/**
 * Anomaly Detector
 * Orchestrates multiple detection algorithms to identify market anomalies
 * TRADING-010: 異常検知と市場予測システムの実装
 */

import { OHLCV } from '@/app/types/shared';
import { IsolationForest } from './IsolationForest';
import { StatisticalDetector } from './StatisticalDetector';
import {
  AnomalyDetectionConfig,
  AnomalyDetectionResult,
  AnomalySeverity,
  DetectorResult,
  FlashCrashAlert,
  LiquidityCrisisAlert,
  MarketData,
  MarketRegime,
  OrderBook,
  RegimeChangeAlert,
} from './types';

export class AnomalyDetector {
  private isolationForest: IsolationForest;
  private statisticalDetector: StatisticalDetector;
  private config: AnomalyDetectionConfig;
  private currentRegime: MarketRegime = 'RANGING';

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      forestConfig: {
        nEstimators: 100,
        contamination: 0.1,
        maxSamples: 256,
        ...config?.forestConfig,
      },
      autoencoderConfig: {
        inputDim: 10,
        encodingDim: 5,
        learningRate: 0.001,
        epochs: 100,
        ...config?.autoencoderConfig,
      },
      lstmConfig: {
        sequenceLength: 20,
        hiddenUnits: 64,
        threshold: 0.5,
        ...config?.lstmConfig,
      },
      flashCrashThreshold: config?.flashCrashThreshold ?? 0.05,
      volumeSpikeThreshold: config?.volumeSpikeThreshold ?? 3.0,
      liquidityDropThreshold: config?.liquidityDropThreshold ?? 0.5,
      spreadThreshold: config?.spreadThreshold ?? 0.01,
      depthThreshold: config?.depthThreshold ?? 100000,
      imbalanceThreshold: config?.imbalanceThreshold ?? 0.7,
      criticalSpread: config?.criticalSpread ?? 0.02,
      anomalyThreshold: config?.anomalyThreshold ?? 0.7,
    };

    this.isolationForest = new IsolationForest(this.config.forestConfig);
    this.statisticalDetector = new StatisticalDetector({
      zScoreThreshold: 3.0,
      iqrMultiplier: 1.5,
      windowSize: 20,
    });
  }

  /**
   * Detect anomalies using multiple detectors
   */
  detectAnomaly(data: MarketData): AnomalyDetectionResult {
    const results: DetectorResult[] = [];

    // Run all detectors
    results.push(this.isolationForest.detect(data));
    results.push(this.statisticalDetector.detect(data));

    // Aggregate results
    return this.aggregateResults(results);
  }

  /**
   * Detect flash crash events
   */
  detectFlashCrash(data: OHLCV[]): FlashCrashAlert | null {
    if (data.length < 10) return null;

    const priceDrop = this.calculatePriceDrop(data);
    const volumeSpike = this.calculateVolumeSpike(data);
    const liquidityDrop = this.calculateLiquidityDrop(data);

    if (
      priceDrop > this.config.flashCrashThreshold &&
      volumeSpike > this.config.volumeSpikeThreshold &&
      liquidityDrop > this.config.liquidityDropThreshold
    ) {
      return {
        type: 'FLASH_CRASH',
        severity: 'CRITICAL',
        timestamp: new Date(),
        priceDrop,
        volumeSpike,
        liquidityDrop,
        recommendedAction: 'HALT_TRADING',
        confidence: this.calculateConfidence(priceDrop, volumeSpike, liquidityDrop),
      };
    }

    return null;
  }

  /**
   * Detect liquidity crisis
   */
  detectLiquidityCrisis(orderBook: OrderBook): LiquidityCrisisAlert | null {
    const spread = this.calculateSpread(orderBook);
    const depth = this.calculateDepth(orderBook);
    const imbalance = this.calculateImbalance(orderBook);

    if (
      spread > this.config.spreadThreshold ||
      depth < this.config.depthThreshold ||
      imbalance > this.config.imbalanceThreshold
    ) {
      const severity: AnomalySeverity = 
        spread > this.config.criticalSpread ? 'CRITICAL' : 'HIGH';

      return {
        type: 'LIQUIDITY_CRISIS',
        severity,
        timestamp: new Date(),
        spread,
        depth,
        imbalance,
        recommendedAction: severity === 'CRITICAL' ? 'REDUCE_POSITION' : 'MONITOR',
      };
    }

    return null;
  }

  /**
   * Detect market regime changes
   */
  detectRegimeChange(data: OHLCV[]): RegimeChangeAlert | null {
    if (data.length < 200) return null;

    const currentRegime = this.detectRegime(data.slice(-100));
    const previousRegime = this.detectRegime(data.slice(-200, -100));

    if (currentRegime !== previousRegime) {
      this.currentRegime = currentRegime;

      return {
        type: 'REGIME_CHANGE',
        severity: 'HIGH',
        timestamp: new Date(),
        previousRegime,
        newRegime: currentRegime,
        confidence: this.calculateRegimeConfidence(data),
        recommendedAction: this.getRegimeAction(currentRegime),
      };
    }

    return null;
  }

  /**
   * Aggregate detector results
   */
  private aggregateResults(results: DetectorResult[]): AnomalyDetectionResult {
    const anomalyScore = this.calculateAnomalyScore(results);
    const isAnomaly = anomalyScore > this.config.anomalyThreshold;

    return {
      isAnomaly,
      anomalyScore,
      detectorResults: results,
      severity: this.calculateSeverity(anomalyScore),
      timestamp: new Date(),
    };
  }

  /**
   * Calculate aggregate anomaly score
   */
  private calculateAnomalyScore(results: DetectorResult[]): number {
    // Weighted voting based on confidence
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of results) {
      const weight = result.confidence;
      totalWeight += weight;
      weightedSum += result.isAnomaly ? result.score * weight : 0;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate severity from anomaly score
   */
  private calculateSeverity(score: number): AnomalySeverity {
    if (score >= 0.9) return 'CRITICAL';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate price drop percentage
   */
  private calculatePriceDrop(data: OHLCV[]): number {
    const recentData = data.slice(-10);
    const maxPrice = Math.max(...recentData.map(d => d.high));
    const currentPrice = data[data.length - 1].close;
    return (maxPrice - currentPrice) / maxPrice;
  }

  /**
   * Calculate volume spike ratio
   */
  private calculateVolumeSpike(data: OHLCV[]): number {
    const recentData = data.slice(-20, -1);
    const avgVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length;
    const currentVolume = data[data.length - 1].volume;
    return avgVolume > 0 ? currentVolume / avgVolume : 0;
  }

  /**
   * Calculate liquidity drop
   */
  private calculateLiquidityDrop(data: OHLCV[]): number {
    // Simplified: use volume as liquidity proxy
    const recent = data.slice(-5);
    const previous = data.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.volume, 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + d.volume, 0) / previous.length;
    
    return previousAvg > 0 ? (previousAvg - recentAvg) / previousAvg : 0;
  }

  /**
   * Calculate bid-ask spread
   */
  private calculateSpread(orderBook: OrderBook): number {
    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return Infinity;
    }

    const bestBid = Math.max(...orderBook.bids.map(b => b.price));
    const bestAsk = Math.min(...orderBook.asks.map(a => a.price));
    
    return (bestAsk - bestBid) / bestAsk;
  }

  /**
   * Calculate order book depth
   */
  private calculateDepth(orderBook: OrderBook): number {
    const bidVolume = orderBook.bids.reduce((sum, b) => sum + b.volume, 0);
    const askVolume = orderBook.asks.reduce((sum, a) => sum + a.volume, 0);
    return bidVolume + askVolume;
  }

  /**
   * Calculate order book imbalance
   */
  private calculateImbalance(orderBook: OrderBook): number {
    const bidVolume = orderBook.bids.reduce((sum, b) => sum + b.volume, 0);
    const askVolume = orderBook.asks.reduce((sum, a) => sum + a.volume, 0);
    const totalVolume = bidVolume + askVolume;
    
    if (totalVolume === 0) return 0;
    return Math.abs(bidVolume - askVolume) / totalVolume;
  }

  /**
   * Detect market regime from data
   */
  private detectRegime(data: OHLCV[]): MarketRegime {
    const volatility = this.calculateVolatility(data);
    const trendStrength = this.calculateTrendStrength(data);

    if (volatility > 0.03) return 'VOLATILE';
    if (trendStrength > 0.6) return 'TRENDING';
    return 'RANGING';
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(data: OHLCV[]): number {
    const returns = data.slice(1).map((d, i) => {
      return (d.close - data[i].close) / data[i].close;
    });

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => {
      return sum + Math.pow(r - mean, 2);
    }, 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate trend strength
   */
  private calculateTrendStrength(data: OHLCV[]): number {
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const change = Math.abs(lastPrice - firstPrice) / firstPrice;
    
    // Simple trend strength based on directional consistency
    let consistentMoves = 0;
    const direction = lastPrice > firstPrice ? 1 : -1;
    
    for (let i = 1; i < data.length; i++) {
      const move = data[i].close > data[i - 1].close ? 1 : -1;
      if (move === direction) consistentMoves++;
    }
    
    const consistency = consistentMoves / (data.length - 1);
    return change * consistency;
  }

  /**
   * Calculate regime confidence
   */
  private calculateRegimeConfidence(data: OHLCV[]): number {
    // Simplified: use data length and consistency
    const minConfidence = 0.5;
    const dataFactor = Math.min(data.length / 200, 1.0);
    const volatility = this.calculateVolatility(data.slice(-50));
    const stabilityFactor = 1 - Math.min(volatility * 10, 0.5);
    
    return minConfidence + (1 - minConfidence) * dataFactor * stabilityFactor;
  }

  /**
   * Get recommended action for regime
   */
  private getRegimeAction(regime: MarketRegime): string {
    const actions: Record<MarketRegime, string> = {
      TRENDING: 'Consider trend-following strategies',
      RANGING: 'Consider mean-reversion strategies',
      VOLATILE: 'Reduce position sizes and tighten stops',
      CRISIS: 'Minimize exposure and preserve capital',
    };

    return actions[regime] || 'Monitor market conditions';
  }

  /**
   * Calculate confidence for flash crash alert
   */
  private calculateConfidence(
    priceDrop: number,
    volumeSpike: number,
    liquidityDrop: number
  ): number {
    const scores = [
      Math.min(priceDrop / this.config.flashCrashThreshold, 1.0),
      Math.min(volumeSpike / this.config.volumeSpikeThreshold, 1.0),
      Math.min(liquidityDrop / this.config.liquidityDropThreshold, 1.0),
    ];

    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.isolationForest.reset();
    this.currentRegime = 'RANGING';
  }
}
