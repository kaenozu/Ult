/**
 * Market Correlation Analysis Service
 * 
 * Analyzes correlation between individual stocks and market indices.
 * Provides market sync, beta calculation, and composite signal generation.
 */

import { OHLCV, Signal } from '../types';

export interface MarketIndex {
  symbol: string;
  name: string;
  data: OHLCV[];
}

export interface CorrelationResult {
  correlation: number;
  beta: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
}

export interface CompositeSignal {
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'CAUTIOUS_BUY' | 'CAUTIOUS_SELL' | 'WAIT';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
  marketTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  individualSignal: 'BUY' | 'SELL' | 'HOLD';
  correlation: number;
  beta: number;
}

export interface MarketSyncData {
  nikkei225: CorrelationResult | null;
  sp500: CorrelationResult | null;
  compositeSignal: CompositeSignal | null;
}

// Constants
const MIN_DATA_POINTS = 20;
const TREND_DETECTION_THRESHOLD = 0.0005; // 0.05% change per step
const LOW_CORRELATION_THRESHOLD = 0.4;
const HIGH_CORRELATION_THRESHOLD = 0.6;

class MarketCorrelationService {
  /**
   * Calculate Pearson correlation coefficient
   */
  calculateCorrelation(stockPrices: number[], indexPrices: number[]): number {
    if (stockPrices.length !== indexPrices.length || stockPrices.length < 2) {
      return 0;
    }

    const n = stockPrices.length;
    const sumX = stockPrices.reduce((a, b) => a + b, 0);
    const sumY = indexPrices.reduce((a, b) => a + b, 0);
    const sumXY = stockPrices.reduce((sum, xi, i) => sum + xi * indexPrices[i], 0);
    const sumX2 = stockPrices.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = indexPrices.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate beta value (stock sensitivity to market)
   */
  calculateBeta(stockPrices: number[], indexPrices: number[]): number {
    if (stockPrices.length !== indexPrices.length || stockPrices.length < 2) {
      return 1.0;
    }

    // Calculate returns
    const stockReturns: number[] = [];
    const indexReturns: number[] = [];

    for (let i = 1; i < stockPrices.length; i++) {
      if (stockPrices[i - 1] !== 0 && indexPrices[i - 1] !== 0) {
        stockReturns.push((stockPrices[i] - stockPrices[i - 1]) / stockPrices[i - 1]);
        indexReturns.push((indexPrices[i] - indexPrices[i - 1]) / indexPrices[i - 1]);
      }
    }

    if (stockReturns.length < 2) {
      return 1.0;
    }

    const n = stockReturns.length;
    const stockMean = stockReturns.reduce((a, b) => a + b, 0) / n;
    const indexMean = indexReturns.reduce((a, b) => a + b, 0) / n;

    // Calculate covariance
    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (stockReturns[i] - stockMean) * (indexReturns[i] - indexMean);
    }
    covariance /= n;

    // Calculate variance of index returns
    let variance = 0;
    for (let i = 0; i < n; i++) {
      variance += Math.pow(indexReturns[i] - indexMean, 2);
    }
    variance /= n;

    return variance === 0 ? 1.0 : covariance / variance;
  }

  /**
   * Detect market trend from price series
   */
  detectTrend(prices: number[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (prices.length < MIN_DATA_POINTS) {
      return 'NEUTRAL';
    }

    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prices;

    // Calculate slope using linear regression
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return 'NEUTRAL';
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;

    // Normalize slope by dividing by average price
    const avgPrice = sumY / n;
    if (avgPrice === 0) {
      return 'NEUTRAL';
    }

    const normalizedSlope = slope / avgPrice;

    if (normalizedSlope > TREND_DETECTION_THRESHOLD) {
      return 'BULLISH';
    } else if (normalizedSlope < -TREND_DETECTION_THRESHOLD) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Get correlation strength
   */
  getCorrelationStrength(correlation: number): 'WEAK' | 'MODERATE' | 'STRONG' {
    const absCorrelation = Math.abs(correlation);
    if (absCorrelation < LOW_CORRELATION_THRESHOLD) {
      return 'WEAK';
    } else if (absCorrelation < HIGH_CORRELATION_THRESHOLD) {
      return 'MODERATE';
    } else {
      return 'STRONG';
    }
  }

  /**
   * Analyze correlation with market index
   */
  analyzeCorrelation(stockData: OHLCV[], indexData: OHLCV[]): CorrelationResult | null {
    if (stockData.length < MIN_DATA_POINTS || indexData.length < MIN_DATA_POINTS) {
      return null;
    }

    // Use the minimum length
    const minLength = Math.min(stockData.length, indexData.length);
    const stockPrices = stockData.slice(-minLength).map(d => d.close);
    const indexPrices = indexData.slice(-minLength).map(d => d.close);

    const correlation = this.calculateCorrelation(stockPrices, indexPrices);
    const beta = this.calculateBeta(stockPrices, indexPrices);
    const trend = this.detectTrend(indexPrices);
    const strength = this.getCorrelationStrength(correlation);

    return {
      correlation,
      beta,
      trend,
      strength
    };
  }

  /**
   * Generate composite signal based on market correlation
   */
  generateCompositeSignal(
    marketTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    individualSignal: 'BUY' | 'SELL' | 'HOLD',
    correlation: number,
    beta: number
  ): CompositeSignal {
    let recommendation: CompositeSignal['recommendation'] = 'HOLD';
    let confidence: CompositeSignal['confidence'] = 'MEDIUM';
    let reasoning = '';

    const absCorrelation = Math.abs(correlation);
    const isHighCorrelation = absCorrelation > HIGH_CORRELATION_THRESHOLD;
    const isLowCorrelation = absCorrelation < LOW_CORRELATION_THRESHOLD;

    // Adjust signal based on market trend and correlation
    if (individualSignal === 'BUY') {
      if (marketTrend === 'BULLISH') {
        if (isLowCorrelation) {
          recommendation = 'BUY';
          confidence = 'HIGH';
          reasoning = '強気市場＋個別銘柄の強さ（低相関＝銘柄固有の Catalyst）';
        } else {
          recommendation = 'BUY';
          confidence = 'HIGH';
          reasoning = '強気市場が個別シグナルをサポート';
        }
      } else if (marketTrend === 'BEARISH') {
        if (isHighCorrelation) {
          recommendation = 'WAIT';
          confidence = 'LOW';
          reasoning = '弱気市場が個別シグナルを上書き（高相関）';
        } else {
          recommendation = 'CAUTIOUS_BUY';
          confidence = 'LOW';
          reasoning = '弱気市場にもかかわらず個別の強さ（低相関）';
        }
      } else {
        recommendation = 'BUY';
        confidence = 'MEDIUM';
        reasoning = '中立市場での個別シグナル';
      }
    } else if (individualSignal === 'SELL') {
      if (marketTrend === 'BEARISH') {
        if (isLowCorrelation) {
          recommendation = 'SELL';
          confidence = 'HIGH';
          reasoning = '弱気市場＋個別銘柄の弱さ（低相関）';
        } else {
          recommendation = 'SELL';
          confidence = 'HIGH';
          reasoning = '弱気市場が個別シグナルをサポート';
        }
      } else if (marketTrend === 'BULLISH') {
        if (isHighCorrelation) {
          recommendation = 'WAIT';
          confidence = 'LOW';
          reasoning = '強気市場が個別シグナルを上書き（高相関）';
        } else {
          recommendation = 'CAUTIOUS_SELL';
          confidence = 'LOW';
          reasoning = '強気市場にもかかわらず個別の弱さ（低相関）';
        }
      } else {
        recommendation = 'SELL';
        confidence = 'MEDIUM';
        reasoning = '中立市場での個別シグナル';
      }
    } else {
      recommendation = 'HOLD';
      confidence = 'MEDIUM';
      reasoning = '明確なシグナルなし';
    }

    // Adjust based on beta
    if (beta > 1.5 && recommendation === 'BUY') {
      reasoning += '（高ベータ＝市場変動に対して過敏）';
    } else if (beta < 0.5 && recommendation === 'SELL') {
      reasoning += '（低ベータ＝市場変動に対して鈍感）';
    }

    return {
      recommendation,
      confidence,
      reasoning,
      marketTrend,
      individualSignal,
      correlation,
      beta
    };
  }

  /**
   * Perform complete market sync analysis
   */
  analyzeMarketSync(
    stockData: OHLCV[],
    nikkeiData: OHLCV[] | null,
    sp500Data: OHLCV[] | null,
    signal: Signal
  ): MarketSyncData {
    const nikkeiResult = nikkeiData ? this.analyzeCorrelation(stockData, nikkeiData) : null;
    const sp500Result = sp500Data ? this.analyzeCorrelation(stockData, sp500Data) : null;

    // Use the more relevant market index based on correlation strength
    let relevantResult: CorrelationResult | null = null;
    if (nikkeiResult && sp500Result) {
      const nikkeiStrength = Math.abs(nikkeiResult.correlation);
      const sp500Strength = Math.abs(sp500Result.correlation);
      relevantResult = nikkeiStrength > sp500Strength ? nikkeiResult : sp500Result;
    } else {
      relevantResult = nikkeiResult || sp500Result;
    }

    const compositeSignal = relevantResult
      ? this.generateCompositeSignal(
          relevantResult.trend,
          signal.type,
          relevantResult.correlation,
          relevantResult.beta
        )
      : null;

    return {
      nikkei225: nikkeiResult,
      sp500: sp500Result,
      compositeSignal
    };
  }

  /**
   * Get beta-adjusted target price
   */
  getBetaAdjustedTargetPrice(
    targetPrice: number,
    stopLoss: number,
    beta: number,
    marketTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ): { targetPrice: number; stopLoss: number } {
    if (beta === 1.0 || marketTrend === 'NEUTRAL') {
      return { targetPrice, stopLoss };
    }

    const adjustmentFactor = beta > 1 ? 1.1 : 0.9;
    const currentPrice = (targetPrice + stopLoss) / 2;
    const range = targetPrice - stopLoss;

    let adjustedRange = range * adjustmentFactor;

    // Adjust based on market trend
    if (marketTrend === 'BULLISH') {
      adjustedRange *= 1.05;
    } else if (marketTrend === 'BEARISH') {
      adjustedRange *= 0.95;
    }

    return {
      targetPrice: currentPrice + adjustedRange / 2,
      stopLoss: currentPrice - adjustedRange / 2
    };
  }
}

export const marketCorrelationService = new MarketCorrelationService();
