/**
 * ML予測モデルサービス
 * 
 * このモジュールは、TensorFlow.jsを使用した実際の機械学習モデルによる予測を実行する機能を提供します。
 * LSTM、GRU、FeedForwardニューラルネットワークを使用します。
 */

import { PredictionFeatures } from './feature-calculation-service';
import { ModelPrediction } from '../../types';
import { PREDICTION } from '../constants';
import { 
  LSTMModel, 
  GRUModel, 
  FeedForwardModel,
  featuresToArray,
  ModelMetrics,
  ModelTrainingData
} from './tensorflow-model-service';

 * ML予測モデルサービス
 */
export class MLModelService {
  private readonly weights = PREDICTION.MODEL_WEIGHTS;

  // TensorFlow.js models
  private lstmModel: LSTMModel | null = null;
  private gruModel: GRUModel | null = null;
  private ffModel: FeedForwardModel | null = null;

  // Flag to use TensorFlow.js models (set to true after training)
  private useTensorFlowModels = false;

   * すべてのモデルによる予測を実行（同期版 - ルールベース）
   */
  predict(features: PredictionFeatures): ModelPrediction {
    // Rule-based predictions (backward compatible)
    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.lstmPredict(features);

    const ensemblePrediction = rf * this.weights.RF + xgb * this.weights.XGB + lstm * this.weights.LSTM;
    const confidence = this.calculateConfidence(features, ensemblePrediction);

    return { 
      rfPrediction: rf, 
      xgbPrediction: xgb, 
      lstmPrediction: lstm, 
      ensemblePrediction, 
      confidence 
    };
  }

   * TensorFlow.jsモデルを使用した予測（非同期版）
   */
  async predictAsync(features: PredictionFeatures): Promise<ModelPrediction> {
    if (this.useTensorFlowModels && this.lstmModel && this.gruModel && this.ffModel) {
      return this.predictWithTensorFlow(features);
    }
    
    // Fallback to rule-based predictions
    return this.predict(features);
  }

   * TensorFlow.jsモデルを使用した予測
   */
  private async predictWithTensorFlow(features: PredictionFeatures): Promise<ModelPrediction> {
    const featureArray = featuresToArray(features);

    try {
      // Get predictions from all models
      const ffPrediction = await this.ffModel!.predict(featureArray);
      const gruPrediction = await this.gruModel!.predict(featureArray);
      const lstmPrediction = await this.lstmModel!.predict(featureArray);

      // Calculate ensemble prediction
      const ensemblePrediction = 
        ffPrediction * this.weights.RF + 
        gruPrediction * this.weights.XGB + 
        lstmPrediction * this.weights.LSTM;

      // Calculate confidence based on model metrics and agreement
      const confidence = this.calculateTensorFlowConfidence(
        ffPrediction,
        gruPrediction,
        lstmPrediction,
        ensemblePrediction
      );

      return {
        rfPrediction: ffPrediction,
        xgbPrediction: gruPrediction,
        lstmPrediction: lstmPrediction,
        ensemblePrediction,
        confidence
      };
    } catch (error) {
      // Log error but fallback to rule-based prediction
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('TensorFlow prediction error:', error);
      }
      return this.predict(features);
    }
  }

   * TensorFlow.jsモデルの信頼度を計算
   */
  private calculateTensorFlowConfidence(
    ff: number,
    gru: number,
    lstm: number,
    _ensemble: number
  ): number {
    // Calculate agreement between models
    const predictions = [ff, gru, lstm];
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length;
    const stdDev = Math.sqrt(variance);

    // Low variance = high agreement = high confidence
    const agreementScore = Math.max(0, 1 - stdDev / Math.abs(mean || 1));

    // Get model metrics
    const ffMetrics = this.ffModel!.getMetrics();
    const gruMetrics = this.gruModel!.getMetrics();
    const lstmMetrics = this.lstmModel!.getMetrics();

    // Average accuracy
    const avgAccuracy = (ffMetrics.accuracy + gruMetrics.accuracy + lstmMetrics.accuracy) / 3;

    // Combine agreement and accuracy
    const baseConfidence = 50;
    const agreementBonus = agreementScore * 25;
    const accuracyBonus = (avgAccuracy / 100) * 25;

    const confidence = baseConfidence + agreementBonus + accuracyBonus;

    return Math.min(Math.max(confidence, 50), 95);
  }

   * モデルを訓練する
   */
  async trainModels(trainingData: ModelTrainingData, epochs = 50): Promise<{
    ff: ModelMetrics;
    gru: ModelMetrics;
    lstm: ModelMetrics;
  }> {
    // Initialize models if not exists
    if (!this.ffModel) this.ffModel = new FeedForwardModel();
    if (!this.gruModel) this.gruModel = new GRUModel();
    if (!this.lstmModel) this.lstmModel = new LSTMModel();

    // Train all models
    const [ffMetrics, gruMetrics, lstmMetrics] = await Promise.all([
      this.ffModel.train(trainingData, epochs),
      this.gruModel.train(trainingData, epochs),
      this.lstmModel.train(trainingData, epochs)
    ]);

    // Enable TensorFlow models
    this.useTensorFlowModels = true;

    return {
      ff: ffMetrics,
      gru: gruMetrics,
      lstm: lstmMetrics
    };
  }

   * モデルを保存する
   */
  async saveModels(): Promise<void> {
    if (this.ffModel) await this.ffModel.saveModel('ml-ff-model');
    if (this.gruModel) await this.gruModel.saveModel('ml-gru-model');
    if (this.lstmModel) await this.lstmModel.saveModel('ml-lstm-model');
  }

   * モデルを読み込む
   */
  async loadModels(): Promise<void> {
    try {
      this.ffModel = new FeedForwardModel();
      this.gruModel = new GRUModel();
      this.lstmModel = new LSTMModel();

      await Promise.all([
        this.ffModel.loadModel('ml-ff-model'),
        this.gruModel.loadModel('ml-gru-model'),
        this.lstmModel.loadModel('ml-lstm-model')
      ]);

      this.useTensorFlowModels = true;
    } catch (error) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('Failed to load models:', error);
      }
      this.useTensorFlowModels = false;
    }
  }

   * TensorFlow.jsモデルが使用可能かチェック
   */
  isTensorFlowEnabled(): boolean {
    return this.useTensorFlowModels;
  }

   * モデルのメトリクスを取得
   */
  getModelMetrics(): { ff?: ModelMetrics; gru?: ModelMetrics; lstm?: ModelMetrics } {
    return {
      ff: this.ffModel?.getMetrics(),
      gru: this.gruModel?.getMetrics(),
      lstm: this.lstmModel?.getMetrics()
    };
  }

   * Random Forestによる予測
   */
  private randomForestPredict(f: PredictionFeatures): number {
    const { THRESHOLDS, SCALING } = PREDICTION;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < THRESHOLDS.RSI_OVERSOLD) {
      score += THRESHOLDS.RSI_EXTREME;
    } else if (f.rsi > THRESHOLDS.RSI_OVERBOUGHT) {
      score -= THRESHOLDS.RSI_EXTREME;
    }

    // SMAスコア
    if (f.sma5 > 0) score += THRESHOLDS.SMA_BULL_SCORE;
    if (f.sma20 > 0) score += THRESHOLDS.SMA_BEAR_SCORE;

    // モメンタムスコア
    if (f.priceMomentum > THRESHOLDS.MOMENTUM_STRONG) {
      score += THRESHOLDS.MOMENTUM_SCORE;
    } else if (f.priceMomentum < -THRESHOLDS.MOMENTUM_STRONG) {
      score -= THRESHOLDS.MOMENTUM_SCORE;
    }

    return score * SCALING.RF;
  }

   * XGBoostによる予測
   */
  private xgboostPredict(f: PredictionFeatures): number {
    const { THRESHOLDS, SCALING, XGB_PARAMS } = PREDICTION;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < THRESHOLDS.RSI_OVERSOLD) {
      score += THRESHOLDS.RSI_EXTREME;
    } else if (f.rsi > THRESHOLDS.RSI_OVERBOUGHT) {
      score -= THRESHOLDS.RSI_EXTREME;
    }

    // モメンタムとSMAの影響
    const momentumScore = Math.min(
      f.priceMomentum / XGB_PARAMS.MOMENTUM_DIVISOR, 
      XGB_PARAMS.MOMENTUM_MAX_SCORE
    );
    const smaScore = (
      f.sma5 * XGB_PARAMS.SMA5_WEIGHT + 
      f.sma20 * XGB_PARAMS.SMA20_WEIGHT
    ) / XGB_PARAMS.SMA_DIVISOR;
    
    score += momentumScore + smaScore;

    return score * SCALING.XGB;
  }

   * LSTMによる予測（簡易版）
   */
  private lstmPredict(f: PredictionFeatures): number {
    // LSTMの予測は価格モメンタムに基づいて簡略化
    return f.priceMomentum * PREDICTION.SCALING.LSTM;
  }

   * 予測の信頼度を計算
   */
  private calculateConfidence(f: PredictionFeatures, prediction: number): number {
    const { THRESHOLDS, CONFIDENCE } = PREDICTION;

    let confidence = CONFIDENCE.BASE;

    // RSIが極端な場合のボーナス
    if (f.rsi < THRESHOLDS.RSI_EXTREME_LOW || f.rsi > THRESHOLDS.RSI_EXTREME_HIGH) {
      confidence += CONFIDENCE.RSI_EXTREME_BONUS;
    }

    // モメンタムが強い場合のボーナス
    if (Math.abs(f.priceMomentum) > THRESHOLDS.MOMENTUM_STRONG) {
      confidence += CONFIDENCE.MOMENTUM_BONUS;
    }

    // 予測値が大きい場合のボーナス
    if (Math.abs(prediction) > THRESHOLDS.MOMENTUM_STRONG) {
      confidence += CONFIDENCE.PREDICTION_BONUS;
    }

    // 信頼度を0-100の範囲に制限
    return Math.min(Math.max(confidence, THRESHOLDS.CONFIDENCE_MIN), THRESHOLDS.CONFIDENCE_MAX);
  }
}

export const mlModelService = new MLModelService();