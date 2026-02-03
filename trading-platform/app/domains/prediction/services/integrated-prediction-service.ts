/**
 * Integrated Prediction Service
 * 
 * Combines the enhanced ML service with existing prediction pipeline.
 * This service orchestrates feature calculation, prediction, and signal generation.
 */

import { Stock, OHLCV, Signal, TechnicalIndicator } from '@/app/types';
import { FeatureCalculationService } from './feature-calculation-service';
import { enhancedMLService } from './enhanced-ml-service';
import { analyzeStock } from '../../lib/analysis';
import { mlPredictionService } from '../../lib/mlPrediction';
import { BACKTEST_CONFIG, PRICE_CALCULATION, RISK_MANAGEMENT } from '../../lib/constants';

export interface IntegratedPredictionResult {
  signal: Signal;
  enhancedMetrics: {
    expectedValue: number;
    kellyFraction: number;
    recommendedPositionSize: number;
    driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    marketRegime: string;
    volatility: string;
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
  private featureService: FeatureCalculationService;

  constructor() {
    this.featureService = new FeatureCalculationService();
  }

  /**
   * Generate enhanced prediction and trading signal
   */
  async generatePrediction(
    stock: Stock,
    data: OHLCV[],
    indexData?: OHLCV[]
  ): Promise<IntegratedPredictionResult> {
    // 1. Calculate technical indicators first
    const indicators = mlPredictionService.calculateIndicators(data);
    
     // 2. Calculate features from data (indicators computed internally)
     const features = this.featureService.calculateFeatures(data);

    // 3. Get enhanced prediction
    const enhancedPrediction = await enhancedMLService.predictEnhanced(
      features,
      stock,
      data
    );

    // 4. Check if signal meets quality threshold
    const shouldTrade = enhancedMLService.shouldTakeSignal(enhancedPrediction);

    // 5. Generate signal
    const signal = this.generateSignal(
      stock,
      data,
      enhancedPrediction,
      shouldTrade,
      indexData
    );

    // 6. Get model statistics
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
    enhancedPrediction: {
      prediction: number;
      confidence: number;
      expectedValue: number;
      kellyFraction: number;
      recommendedPositionSize: number;
      driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
      marketRegime: string;
      volatility: string;
    },
    shouldTrade: boolean,
    indexData?: OHLCV[]
  ): Signal {
    const currentPrice = data[data.length - 1].close;
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market);

    // Determine signal type
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (shouldTrade && enhancedPrediction.prediction > 1.0) {
      type = 'BUY';
    } else if (shouldTrade && enhancedPrediction.prediction < -1.0) {
      type = 'SELL';
    }

    // Calculate target and stop loss based on prediction and Kelly criterion
    const atr = baseAnalysis.atr || currentPrice * PRICE_CALCULATION.DEFAULT_ATR_RATIO;
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type === 'BUY') {
      // Use Kelly fraction to adjust target/stop distance
      const kellyMultiplier = 1 + enhancedPrediction.kellyFraction;
      const priceMove = Math.max(
        currentPrice * (Math.abs(enhancedPrediction.prediction) / 100),
        atr * RISK_MANAGEMENT.DEFAULT_ATR_MULTIPLIER * kellyMultiplier
      );
      targetPrice = currentPrice + priceMove;
      stopLoss = currentPrice - priceMove * RISK_MANAGEMENT.STOP_LOSS_RATIO;
    } else if (type === 'SELL') {
      const kellyMultiplier = 1 + enhancedPrediction.kellyFraction;
      const priceMove = Math.max(
        currentPrice * (Math.abs(enhancedPrediction.prediction) / 100),
        atr * RISK_MANAGEMENT.DEFAULT_ATR_MULTIPLIER * kellyMultiplier
      );
      targetPrice = currentPrice - priceMove;
      stopLoss = currentPrice + priceMove * RISK_MANAGEMENT.STOP_LOSS_RATIO;
    }

    // Generate reason with enhanced metrics
    const reason = this.generateReason(
      type,
      enhancedPrediction,
      baseAnalysis.optimizedParams
    );

    // Build market context
    const marketContext = indexData
      ? {
          indexSymbol: stock.market === 'japan' ? '日経平均' : 'NASDAQ',
          correlation: 0,
          indexTrend: 'NEUTRAL' as 'UP' | 'DOWN' | 'NEUTRAL',
        }
      : undefined;

    return {
      symbol: stock.symbol,
      type,
      confidence: enhancedPrediction.confidence,
      accuracy: baseAnalysis.accuracy,
      atr: baseAnalysis.atr,
      targetPrice,
      stopLoss,
      reason,
      predictedChange: parseFloat(enhancedPrediction.prediction.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
      marketContext,
      optimizedParams: baseAnalysis.optimizedParams,
      predictionError: baseAnalysis.predictionError,
      volumeResistance: baseAnalysis.volumeResistance,
    };
  }

  /**
   * Generate detailed reason for signal
   */
  private generateReason(
    type: 'BUY' | 'SELL' | 'HOLD',
    enhancedPrediction: {
      prediction: number;
      confidence: number;
      expectedValue: number;
      kellyFraction: number;
      driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
      marketRegime: string;
      volatility: string;
    },
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
      enhancedPrediction.marketRegime,
      enhancedPrediction.volatility
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
      console.log(`Drift detected for ${symbol}. Consider retraining models.`);
      // In production, this could trigger automatic retraining
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
    console.log('Models retrained successfully');
  }
}

export const integratedPredictionService = new IntegratedPredictionService();
