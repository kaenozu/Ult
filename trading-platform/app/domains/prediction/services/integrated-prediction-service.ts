/**
 * Integrated Prediction Service
 * 
 * Combines the enhanced ML service with existing prediction pipeline.
 * This service orchestrates feature calculation, prediction, and signal generation.
 */


import { Stock, OHLCV, Signal } from '@/app/types';
import { featureEngineeringService } from '@/app/lib/services/feature-engineering-service';
import { enhancedMLService } from './enhanced-ml-service';
import type { EnhancedPrediction } from '../types';
import { analyzeStock } from '@/app/lib/analysis';
import { PRICE_CALCULATION, RISK_MANAGEMENT } from '@/app/constants';
import { roundToTickSize } from '@/app/lib/utils';

export interface IntegratedPredictionResult {
  signal: Signal;
  enhancedMetrics: {
    expectedValue: number;
    kellyFraction: number;
    recommendedPositionSize: number;
    driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    marketRegime: unknown; 
    volatility: unknown;
  };
  modelStats: {
    rfHitRate: number;
    xgbHitRate: number;
    lstmHitRate: number;
    ensembleWeights: {
      RF: number;
      XGB: number;
      LSTM: number;
    };
  };
}

export class IntegratedPredictionService {

  constructor() {
  }

  /**
   * Generate enhanced prediction and trading signal
   */
  async generatePrediction(
    stock: Stock,
    data: OHLCV[],
    indexData?: OHLCV[]
  ): Promise<IntegratedPredictionResult> {
    // 1. Core Feature Calculation (Optimized & Cached)
    // This now serves as the single pass for technical indicators used by the ML models
    const features = featureEngineeringService.calculateBasicFeatures(data);

    // 2. Get enhanced prediction using the calculated features
    const enhancedPrediction = await enhancedMLService.predictEnhanced(
      features,
      stock,
      data
    );

    // 3. Determine if signal meets quality threshold for trading
    const shouldTrade = enhancedMLService.shouldTakeSignal(enhancedPrediction);

    // 4. Generate the final signal (BUY/SELL/HOLD with target prices)
    const signal = this.generateSignal(
      stock,
      data,
      enhancedPrediction,
      shouldTrade,
      indexData
    );

    // 5. Get model statistics for transparency
    const modelStats = enhancedMLService.getModelStats();

    return {
      signal,
      enhancedMetrics: {
        expectedValue: enhancedPrediction.expectedValue,
        kellyFraction: enhancedPrediction.kellyFraction,
        recommendedPositionSize: enhancedPrediction.recommendedPositionSize,
        driftRisk: enhancedPrediction.driftRisk,
        marketRegime: enhancedPrediction.marketRegime,
        volatility: enhancedPrediction.volatility,
      },
      modelStats: {
        rfHitRate: modelStats.performance.get('RF')?.hitRate || 0,
        xgbHitRate: modelStats.performance.get('XGB')?.hitRate || 0,
        lstmHitRate: modelStats.performance.get('LSTM')?.hitRate || 0,
        ensembleWeights: modelStats.weights,
      },
    };
  }

  /**
   * Generate trading signal from enhanced prediction
   */
  private generateSignal(
    stock: Stock,
    data: OHLCV[],
    enhancedPrediction: EnhancedPrediction,
    shouldTrade: boolean,
    indexData?: OHLCV[]
  ): Signal {
    const currentPrice = data[data.length - 1].close;
    
    // Leverage existing analysis logic for secondary validation and metadata
    // Using minimal mode if possible to save resources
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market, indexData, { minimal: true });

    // Determine signal type based on ML prediction and quality gate
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (shouldTrade) {
      if (enhancedPrediction.prediction > 1.0) type = 'BUY';
      else if (enhancedPrediction.prediction < -1.0) type = 'SELL';
    }

    // Dynamic Target/Stop based on ATR and Kelly confidence
    const atr = baseAnalysis.atr || currentPrice * PRICE_CALCULATION.DEFAULT_ATR_RATIO;
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type !== 'HOLD') {
      const isBuy = type === 'BUY';
      const kellyMultiplier = 1 + enhancedPrediction.kellyFraction;
      const movePercent = Math.abs(enhancedPrediction.prediction) / 100;
      
      const priceMove = Math.max(
        currentPrice * movePercent,
        atr * RISK_MANAGEMENT.DEFAULT_ATR_MULTIPLIER * kellyMultiplier
      );
      
      targetPrice = isBuy ? currentPrice + priceMove : currentPrice - priceMove;
      stopLoss = isBuy ? currentPrice - priceMove * RISK_MANAGEMENT.STOP_LOSS_RATIO : currentPrice + priceMove * RISK_MANAGEMENT.STOP_LOSS_RATIO;
    } else {
      // HOLD fallback targets
      const predictedMove = currentPrice * (enhancedPrediction.prediction / 100);
      targetPrice = currentPrice + predictedMove;
    }

    // Professional touch: Round to valid tick sizes for Japanese stocks
    if (stock.market === 'japan') {
      targetPrice = roundToTickSize(targetPrice, 'japan');
      stopLoss = roundToTickSize(stopLoss, 'japan');
    }

    // Build the final signal object
    return {
      symbol: stock.symbol,
      type,
      confidence: enhancedPrediction.confidence,
      accuracy: baseAnalysis.accuracy,
      atr: baseAnalysis.atr,
      targetPrice,
      stopLoss,
      reason: this.generateReason(type, enhancedPrediction, baseAnalysis.optimizedParams),
      predictedChange: enhancedPrediction.prediction,
      predictionDate: new Date().toISOString().split('T')[0],
      marketContext: baseAnalysis.marketContext,
      optimizedParams: baseAnalysis.optimizedParams,
      predictionError: baseAnalysis.predictionError,
      volumeResistance: baseAnalysis.volumeResistance,
      expectedValue: enhancedPrediction.expectedValue,
      driftRisk: enhancedPrediction.driftRisk,
      indicatorCount: (enhancedPrediction as any).indicatorCount,
      agreeingIndicators: (enhancedPrediction as any).agreeingIndicators,
    };
  }

  /**
   * Generate detailed reason for signal
   */
  private generateReason(
    type: 'BUY' | 'SELL' | 'HOLD',
    enhancedPrediction: EnhancedPrediction,
    optimizedParams?: { rsiPeriod: number; smaPeriod: number }
  ): string {
    const parts: string[] = [];

    // Signal strength indicator
    if (enhancedPrediction.confidence >= 80) {
      parts.push('【強気】');
    } else if (enhancedPrediction.confidence >= 70) {
      parts.push('【やや強気】');
    } else {
      parts.push('【注視】');
    }

    // Optimized parameters
    if (optimizedParams) {
      parts.push(`最適化設定(RSI:${optimizedParams.rsiPeriod}, SMA:${optimizedParams.smaPeriod})`);
    }

    // Base signal reason
    if (type === 'BUY') {
      parts.push('上昇トレンドを検出。');
    } else if (type === 'SELL') {
      parts.push('下落圧力を検出。');
    } else {
      parts.push('中立的なシグナル。様子見を推奨。');
    }

    // Market regime context
    const regimeText = this.getRegimeText(
      enhancedPrediction.marketRegime.regime,
      enhancedPrediction.marketRegime.volatility
    );
    if (regimeText) {
      parts.push(regimeText);
    }

    // Expected value context
    if (enhancedPrediction.expectedValue > 1.0) {
      parts.push(`期待値: ${enhancedPrediction.expectedValue.toFixed(2)} (高水準)`);
    }

    // Kelly criterion position sizing
    if (enhancedPrediction.kellyFraction > 0) {
      parts.push(
        `推奨ポジション: ${enhancedPrediction.kellyFraction.toFixed(2)} (Kelly基準)`
      );
    }

    // Drift warning
    if (enhancedPrediction.driftRisk === 'HIGH') {
      parts.push('⚠️ モデルドリフト検出: 慎重な判断を推奨');
    } else if (enhancedPrediction.driftRisk === 'MEDIUM') {
      parts.push('注意: モデル精度がやや低下');
    }

    return parts.join(' ');
  }

  /**
   * Get human-readable regime text
   */
  private getRegimeText(regime: string, volatility: string): string {
    const regimeMap: Record<string, string> = {
      TRENDING: 'トレンド相場',
      RANGING: 'レンジ相場',
      UNKNOWN: '',
    };

    const volMap: Record<string, string> = {
      HIGH: '高ボラティリティ',
      MEDIUM: '中ボラティリティ',
      LOW: '低ボラティリティ',
    };

    const regimeText = regimeMap[regime] || '';
    const volText = volMap[volatility] || '';

    if (regimeText && volText) {
      return `${regimeText} (${volText})`;
    }
    return regimeText || volText;
  }

  /**
   * Update model performance after actual result is known
   */
  async updateWithActualResult(
    symbol: string,
    prediction: number,
    actualChange: number
  ): Promise<void> {
    // Update all three models
    enhancedMLService.updatePerformance('RF', prediction, actualChange);
    enhancedMLService.updatePerformance('XGB', prediction, actualChange);
    enhancedMLService.updatePerformance('LSTM', prediction, actualChange);

    // Check if retraining is needed
    const stats = enhancedMLService.getModelStats();
    if (stats.drift.driftDetected) {
      // devLog(`Drift detected for ${symbol}. Consider retraining models.`);
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): {
    hitRates: { rf: number; xgb: number; lstm: number };
    sharpeRatios: { rf: number; xgb: number; lstm: number };
    averageErrors: { rf: number; xgb: number; lstm: number };
    driftStatus: {
      driftDetected: boolean;
      daysSinceRetrain: number;
      psi: number;
    };
  } {
    const stats = enhancedMLService.getModelStats();

    return {
      hitRates: {
        rf: stats.performance.get('RF')?.hitRate || 0,
        xgb: stats.performance.get('XGB')?.hitRate || 0,
        lstm: stats.performance.get('LSTM')?.hitRate || 0,
      },
      sharpeRatios: {
        rf: stats.performance.get('RF')?.sharpeRatio || 0,
        xgb: stats.performance.get('XGB')?.sharpeRatio || 0,
        lstm: stats.performance.get('LSTM')?.sharpeRatio || 0,
      },
      averageErrors: {
        rf: stats.performance.get('RF')?.avgError || 0,
        xgb: stats.performance.get('XGB')?.avgError || 0,
        lstm: stats.performance.get('LSTM')?.avgError || 0,
      },
      driftStatus: {
        driftDetected: stats.drift.driftDetected,
        daysSinceRetrain: stats.drift.daysSinceRetrain,
        psi: stats.drift.psi,
      },
    };
  }

  /**
   * Trigger manual model retraining
   */
  async retrainModels(): Promise<void> {
    await enhancedMLService.triggerRetrain();
  }
}

export const integratedPredictionService = new IntegratedPredictionService();
