/**
 * Forecast Master Service
 * 
 * Main service that integrates all forecast-related features:
 * - ATR-based prediction clouds
 * - Dynamic accuracy calculation
 * - Market correlation analysis
 * - Supply/demand level detection
 */

import { OHLCV, Signal } from '../types';
import { calculateATR } from './utils';
import { marketCorrelationService, MarketSyncData, CompositeSignal } from './marketCorrelation';
import { supplyDemandMaster, SupplyDemandAnalysis, BreakoutEvent } from './supplyDemandMaster';
import { forecastAccuracyService, AccuracyMetrics, Prediction } from './forecastAccuracy';
import { optimizedBacktestEngine, BacktestConfig } from './optimizedBacktest';

export interface ForecastMasterResult {
  signal: Signal;
  marketSync: MarketSyncData;
  supplyDemand: SupplyDemandAnalysis;
  accuracy: AccuracyMetrics;
  predictionCloud: {
    upper: number[];
    lower: number[];
    center: number[];
    confidence: number[];
  };
  backtestResults?: {
    winRate: number;
    totalReturn: number;
    sharpeRatio: number;
  };
}

export interface PredictionCloud {
  steps: number;
  upper: number[];
  lower: number[];
  center: number[];
  confidence: number[];
}

// Constants
const FORECAST_STEPS = 10;
const CONFIDENCE_LEVELS = [0.68, 0.95, 0.99]; // 1σ, 2σ, 3σ

class ForecastMaster {
  /**
   * Generate prediction cloud based on ATR
   */
  generatePredictionCloud(
    data: OHLCV[],
    signal: Signal,
    steps: number = FORECAST_STEPS
  ): PredictionCloud {
    const currentPrice = data[data.length - 1].close;
    const atr = signal.atr || (currentPrice * 0.02);
    const confidence = signal.confidence / 100;

    const upper: number[] = [];
    const lower: number[] = [];
    const center: number[] = [];
    const cloudConfidence: number[] = [];

    const momentum = signal.predictedChange ? signal.predictedChange / 100 : 0;
    const volatilityFactor = (100 - signal.confidence) / 100;

    for (let i = 1; i <= steps; i++) {
      const timeRatio = i / steps;
      const centerPrice = currentPrice * (1 + momentum * timeRatio);
      const spread = atr * timeRatio * volatilityFactor * (1 + timeRatio);

      center.push(centerPrice);
      upper.push(centerPrice + spread);
      lower.push(centerPrice - spread);
      cloudConfidence.push(confidence);
    }

    return {
      steps,
      upper,
      lower,
      center,
      confidence: cloudConfidence
    };
  }

  /**
   * Perform comprehensive forecast analysis
   */
  analyzeForecast(
    symbol: string,
    data: OHLCV[],
    nikkeiData: OHLCV[] | null,
    sp500Data: OHLCV[] | null,
    signal: Signal,
    backtestConfig?: BacktestConfig
  ): ForecastMasterResult {
    // 1. Generate prediction cloud
    const predictionCloud = this.generatePredictionCloud(data, signal);

    // 2. Market correlation analysis
    const marketSync = marketCorrelationService.analyzeMarketSync(
      data,
      nikkeiData,
      sp500Data,
      signal
    );

    // 3. Supply/demand analysis
    const supplyDemand = supplyDemandMaster.analyze(data);

    // 4. Accuracy calculation
    const accuracy = forecastAccuracyService.calculateRealTimeAccuracy(
      symbol,
      data,
      (d, i) => signal, // Use current signal for all historical points
      20
    );

    // 5. Run backtest if config provided
    let backtestResults;
    if (backtestConfig) {
      const backtest = optimizedBacktestEngine.runBacktest(symbol, data, backtestConfig);
      backtestResults = {
        winRate: backtest.winRate,
        totalReturn: backtest.totalReturn,
        sharpeRatio: backtest.sharpeRatio
      };
    }

    return {
      signal,
      marketSync,
      supplyDemand,
      accuracy,
      predictionCloud,
      backtestResults
    };
  }

  /**
   * Get confidence interval for prediction
   */
  getConfidenceInterval(
    currentPrice: number,
    atr: number,
    confidence: number,
    steps: number = 10
  ): { upper: number; lower: number }[] {
    const intervals: { upper: number; lower: number }[] = [];
    const volatilityFactor = (100 - confidence) / 100;

    for (let i = 1; i <= steps; i++) {
      const timeRatio = i / steps;
      const spread = atr * timeRatio * volatilityFactor * (1 + timeRatio);

      intervals.push({
        upper: currentPrice * (1 + spread / currentPrice),
        lower: currentPrice * (1 - spread / currentPrice)
      });
    }

    return intervals;
  }

  /**
   * Adjust signal based on composite factors
   */
  adjustSignal(
    signal: Signal,
    compositeSignal: CompositeSignal | null,
    supplyDemand: SupplyDemandAnalysis
  ): Signal {
    const adjustedSignal = { ...signal };
    let confidenceAdjustment = 0;

    // Adjust based on composite signal
    if (compositeSignal) {
      if (compositeSignal.confidence === 'HIGH') {
        confidenceAdjustment += 10;
      } else if (compositeSignal.confidence === 'LOW') {
        confidenceAdjustment -= 10;
      }

      // Override signal if composite recommendation differs
      if (compositeSignal.recommendation === 'WAIT') {
        adjustedSignal.type = 'HOLD';
        adjustedSignal.reason = `複合シグナルによる保留: ${compositeSignal.reasoning}`;
      } else if (compositeSignal.recommendation === 'CAUTIOUS_BUY' && signal.type === 'BUY') {
        adjustedSignal.confidence = Math.max(50, adjustedSignal.confidence - 10);
        adjustedSignal.reason += ` (慎重な買い推奨: ${compositeSignal.reasoning})`;
      } else if (compositeSignal.recommendation === 'CAUTIOUS_SELL' && signal.type === 'SELL') {
        adjustedSignal.confidence = Math.max(50, adjustedSignal.confidence - 10);
        adjustedSignal.reason += ` (慎重な売り推奨: ${compositeSignal.reasoning})`;
      }
    }

    // Adjust based on supply/demand levels
    if (supplyDemand.breakout) {
      if (supplyDemand.breakout.direction === 'up' && signal.type === 'BUY') {
        confidenceAdjustment += 5;
        adjustedSignal.reason += ` (ブレイクアウト確認: ${supplyDemand.breakout.level.price.toFixed(2)})`;
      } else if (supplyDemand.breakout.direction === 'down' && signal.type === 'SELL') {
        confidenceAdjustment += 5;
        adjustedSignal.reason += ` (ブレイクアウト確認: ${supplyDemand.breakout.level.price.toFixed(2)})`;
      }
    }

    // Apply confidence adjustment
    adjustedSignal.confidence = Math.min(95, Math.max(50, adjustedSignal.confidence + confidenceAdjustment));

    // Adjust target and stop loss based on beta
    if (compositeSignal && compositeSignal.beta !== 1.0) {
      const adjustedPrices = marketCorrelationService.getBetaAdjustedTargetPrice(
        adjustedSignal.targetPrice,
        adjustedSignal.stopLoss,
        compositeSignal.beta,
        compositeSignal.marketTrend
      );
      adjustedSignal.targetPrice = adjustedPrices.targetPrice;
      adjustedSignal.stopLoss = adjustedPrices.stopLoss;
    }

    return adjustedSignal;
  }

  /**
   * Get forecast summary for display
   */
  getForecastSummary(result: ForecastMasterResult): {
    signalType: string;
    confidence: number;
    marketAlignment: boolean;
    breakoutDetected: boolean;
    accuracy: number;
    recommendation: string;
  } {
    const signalType = result.signal.type;
    const confidence = result.signal.confidence;
    const marketAlignment = result.marketSync.compositeSignal?.recommendation === signalType ||
      result.marketSync.compositeSignal?.recommendation === `CAUTIOUS_${signalType}`;
    const breakoutDetected = result.supplyDemand.breakout !== null;
    const accuracy = result.accuracy.accuracy;

    let recommendation = '様子見';
    if (signalType === 'BUY' && confidence >= 70 && marketAlignment) {
      recommendation = '買い推奨';
    } else if (signalType === 'SELL' && confidence >= 70 && marketAlignment) {
      recommendation = '売り推奨';
    } else if (signalType === 'BUY' && confidence >= 60) {
      recommendation = '慎重に買い';
    } else if (signalType === 'SELL' && confidence >= 60) {
      recommendation = '慎重に売り';
    }

    return {
      signalType,
      confidence,
      marketAlignment,
      breakoutDetected,
      accuracy,
      recommendation
    };
  }

  /**
   * Validate forecast quality
   */
  validateForecast(result: ForecastMasterResult): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check confidence
    if (result.signal.confidence < 50) {
      issues.push('信頼度が低すぎます (50%未満)');
    }

    // Check accuracy
    if (result.accuracy.totalPredictions > 10 && result.accuracy.accuracy < 40) {
      warnings.push('的中率が低いです (40%未満)');
    }

    // Check market alignment
    if (result.marketSync.compositeSignal) {
      const composite = result.marketSync.compositeSignal;
      if (composite.recommendation === 'WAIT') {
        warnings.push('市場相関分析により保留推奨');
      }
    }

    // Check breakout
    if (result.supplyDemand.breakout) {
      const breakout = result.supplyDemand.breakout;
      if (!breakout.volumeConfirmation) {
        warnings.push('ブレイクアウトの出来高確認なし');
      }
      if (!breakout.followThrough) {
        warnings.push('ブレイクアウトのフォロースルーなし');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
}

export const forecastMaster = new ForecastMaster();
