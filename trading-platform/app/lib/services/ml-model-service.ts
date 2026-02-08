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
import { PredictionCalculator } from './implementations/prediction-calculator';
import { logger } from '@/app/core/logger';

export interface MLServiceConfig {
  weights: {
    RF: number;
    XGB: number;
    LSTM: number;
  };
  useTensorFlowModels: boolean;
}

/**
 * ML予測モデルサービス
 */
export class MLModelService {
  private readonly weights: MLServiceConfig['weights'];
  private useTensorFlowModels: boolean;

  // TensorFlow.js models
  private lstmModel: LSTMModel | null = null;
  private gruModel: GRUModel | null = null;
  private ffModel: FeedForwardModel | null = null;

  constructor(
    private calculator: PredictionCalculator = new PredictionCalculator(),
    _placeholder?: any,
    config: Partial<MLServiceConfig> = {}
  ) {
    this.weights = config.weights || PREDICTION.MODEL_WEIGHTS;
    this.useTensorFlowModels = config.useTensorFlowModels || false;
  }

  /**
   * すべてのモデルによる予測を実行（同期版 - ルールベース）
   */
  predict(features: PredictionFeatures): ModelPrediction {
    // Use injected calculator for predictions
    const rf = this.calculator.calculateRandomForest(features);
    const xgb = this.calculator.calculateXGBoost(features);
    const lstm = this.calculator.calculateLSTM(features);

    const ensemblePrediction = rf * this.weights.RF + xgb * this.weights.XGB + lstm * this.weights.LSTM;
    const confidence = this.calculator.calculateConfidence(features, ensemblePrediction);

    return { 
      rfPrediction: rf, 
      xgbPrediction: xgb, 
      lstmPrediction: lstm, 
      ensemblePrediction, 
      confidence 
    };
  }

  /**
   * TensorFlow.jsモデルを使用した予測（非同期版）
   */
  async predictAsync(features: PredictionFeatures): Promise<ModelPrediction> {
    if (this.useTensorFlowModels && this.lstmModel && this.gruModel && this.ffModel) {
      return this.predictWithTensorFlow(features);
    }
    
    // Fallback to rule-based predictions
    return this.predict(features);
  }

  /**
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
        logger.error('TensorFlow prediction error:', error);
      }
      return this.predict(features);
    }
  }

  /**
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

  /**
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

  /**
   * モデルを保存する
   */
  async saveModels(): Promise<void> {
    if (this.ffModel) await this.ffModel.saveModel('ml-ff-model');
    if (this.gruModel) await this.gruModel.saveModel('ml-gru-model');
    if (this.lstmModel) await this.lstmModel.saveModel('ml-lstm-model');
  }

  /**
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
        logger.error('Failed to load models:', error);
      }
      this.useTensorFlowModels = false;
    }
  }

  /**
   * TensorFlow.jsモデルが使用可能かチェック
   */
  isTensorFlowEnabled(): boolean {
    return this.useTensorFlowModels;
  }

  /**
   * モデルのメトリクスを取得
   */
  getModelMetrics(): { ff?: ModelMetrics; gru?: ModelMetrics; lstm?: ModelMetrics } {
    return {
      ff: this.ffModel?.getMetrics(),
      gru: this.gruModel?.getMetrics(),
      lstm: this.lstmModel?.getMetrics()
    };
  }
}

export const mlModelService = new MLModelService();