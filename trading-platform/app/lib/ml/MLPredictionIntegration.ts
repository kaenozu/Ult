/**
 * ML Prediction Service Integration
 * 
 * Integrates the ML model pipeline with the existing prediction system.
 * Provides a high-level API for predictions with the new ML models.
 */

import { OHLCV, Stock, Signal } from '@/app/types';
import { featureEngineeringService, ensembleStrategy, predictionQualityMonitor } from '../ml';
import { MLFeatures, EnsemblePrediction } from '../ml/types';

export class MLPredictionIntegration {
  private isModelLoaded = false;

  /**
   * Initialize and load ML models
   */
  async initialize(): Promise<void> {
    try {
      await ensembleStrategy.loadModels();
      this.isModelLoaded = true;
      console.log('ML models loaded successfully');
    } catch (error) {
      console.error('Failed to load ML models:', error);
      this.isModelLoaded = false;
      throw new Error('ML models not available. Please train models first.');
    }
  }

  /**
   * Get ML-enhanced prediction for a stock
   */
  async predictWithML(
    stock: Stock,
    ohlcvData: OHLCV[],
    indexData?: OHLCV[]
  ): Promise<Signal> {
    if (!this.isModelLoaded) {
      throw new Error('ML models not loaded. Call initialize() first.');
    }

    // Extract features
    const features = featureEngineeringService.extractFeatures(ohlcvData, 200);
    
    if (features.length === 0) {
      throw new Error('Insufficient data for ML prediction');
    }

    // Normalize features
    const { normalized } = featureEngineeringService.normalizeFeatures(features);

    // Prepare sequence for prediction (last 20 time steps)
    const sequence = normalized.slice(-20);

    // Get ensemble prediction
    const prediction = await ensembleStrategy.predictEnsemble(sequence);

    // Record prediction for monitoring
    const predictionId = predictionQualityMonitor.recordPrediction(
      stock.symbol,
      {
        prediction: prediction.ensembleResult.prediction,
        confidence: prediction.ensembleResult.confidence,
        uncertainty: 0.1,
        predictionInterval: { lower: 0, upper: 0 },
        contributingFeatures: [],
      },
      'ensemble-v1'
    );

    // Convert to Signal format
    const signal = this.convertToSignal(stock, prediction, ohlcvData, features);

    // Store prediction ID for later actual value update (using type assertion)
    (signal as unknown as { predictionId: string }).predictionId = predictionId;

    return signal;
  }

  /**
   * Update prediction with actual outcome
   */
  updatePredictionActual(predictionId: string, actualValue: number): void {
    predictionQualityMonitor.updateActual(predictionId, actualValue);
  }

  /**
   * Get model performance report
   */
  getPerformanceReport(): {
    accuracy: number;
    mae: number;
    rmse: number;
    drift: { isDrifting: boolean; recommendation: string };
  } {
    return predictionQualityMonitor.generateReport('ensemble-v1');
  }

  /**
   * Check if ML models are available
   */
  isAvailable(): boolean {
    return this.isModelLoaded;
  }

  // Private helper methods

  private convertToSignal(
    stock: Stock,
    prediction: EnsemblePrediction,
    ohlcvData: OHLCV[],
    features: MLFeatures[]
  ): Signal {
    const currentPrice = ohlcvData[ohlcvData.length - 1].close;
    const predictedChange = prediction.ensembleResult.prediction;
    const confidence = prediction.ensembleResult.confidence;

    // Determine signal type
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (predictedChange > 1.5 && confidence >= 60) {
      type = 'BUY';
    } else if (predictedChange < -1.5 && confidence >= 60) {
      type = 'SELL';
    }

    // Calculate target and stop loss based on prediction and volatility
    const lastFeature = features[features.length - 1];
    const atr = (currentPrice * lastFeature.atrPercent) / 100;
    
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type === 'BUY') {
      const targetMove = Math.max(currentPrice * Math.abs(predictedChange) / 100, atr * 2);
      targetPrice = currentPrice + targetMove;
      stopLoss = currentPrice - atr * 1.5;
    } else if (type === 'SELL') {
      const targetMove = Math.max(currentPrice * Math.abs(predictedChange) / 100, atr * 2);
      targetPrice = currentPrice - targetMove;
      stopLoss = currentPrice + atr * 1.5;
    }

    // Generate reason
    const reason = this.generateReason(type, prediction, lastFeature);

    return {
      symbol: stock.symbol,
      type,
      confidence: Math.round(confidence),
      targetPrice,
      stopLoss,
      reason,
      predictedChange: parseFloat(predictedChange.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
    };
  }

  private generateReason(
    type: 'BUY' | 'SELL' | 'HOLD',
    prediction: EnsemblePrediction,
    features: MLFeatures
  ): string {
    const weights = prediction.ensembleResult.weights;
    const dominantModel = 
      weights.lstm > weights.transformer && weights.lstm > weights.gb ? 'LSTM' :
      weights.transformer > weights.gb ? 'Transformer' : 'Gradient Boosting';

    const indicators = [];
    
    if (features.rsi < 30) {
      indicators.push('RSI過売り');
    } else if (features.rsi > 70) {
      indicators.push('RSI過買い');
    }

    if (features.macdSignal > 0) {
      indicators.push('MACD上昇');
    } else if (features.macdSignal < 0) {
      indicators.push('MACD下降');
    }

    if (features.priceMomentum > 5) {
      indicators.push('強い上昇モメンタム');
    } else if (features.priceMomentum < -5) {
      indicators.push('強い下降モメンタム');
    }

    const indicatorStr = indicators.length > 0 ? ` (${indicators.join(', ')})` : '';

    if (type === 'BUY') {
      return `【AIシグナル】${dominantModel}モデル主導で上昇予測${indicatorStr}。アンサンブル信頼度${prediction.ensembleResult.confidence.toFixed(1)}%`;
    } else if (type === 'SELL') {
      return `【AIシグナル】${dominantModel}モデル主導で下降予測${indicatorStr}。アンサンブル信頼度${prediction.ensembleResult.confidence.toFixed(1)}%`;
    } else {
      return `【AIシグナル】明確な方向性なし。様子見を推奨${indicatorStr}`;
    }
  }
}

export const mlPredictionIntegration = new MLPredictionIntegration();
