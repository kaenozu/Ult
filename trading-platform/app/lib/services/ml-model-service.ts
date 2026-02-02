/**
 * ML予測モデルサービス
 * 
 * このモジュールは、TensorFlow.jsを使用した実際の機械学習モデルによる予測を実行する機能を提供します。
 * LSTM、GRU、FeedForwardニューラルネットワークを使用します。
 * 
 * Refactored with dependency injection for better testability.
 */

import { PredictionFeatures } from './feature-calculation-service';
import { ModelPrediction } from '../../types';
import { 
  LSTMModel, 
  GRUModel, 
  FeedForwardModel,
  featuresToArray,
  ModelMetrics,
  ModelTrainingData
} from './tensorflow-model-service';
import {
  ITensorFlowModel,
  IPredictionCalculator,
  IFeatureNormalizer,
  ITensorFlowPredictionStrategy,
  MLModelConfig
} from './interfaces/ml-model-interfaces';
import { PredictionCalculator } from './implementations/prediction-calculator';
import { FeatureNormalizer } from './implementations/feature-normalizer';
import { TensorFlowPredictionStrategy } from './implementations/tensorflow-prediction-strategy';

/**
 * ML予測モデルサービス (Refactored with DI)
 */
export class MLModelService {
  private readonly weights = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  };

  // TensorFlow.js models
  private lstmModel: ITensorFlowModel | null = null;
  private gruModel: ITensorFlowModel | null = null;
  private ffModel: ITensorFlowModel | null = null;

  // Injected dependencies
  private predictionCalculator: IPredictionCalculator;
  private featureNormalizer: IFeatureNormalizer;
  private tensorFlowStrategy: ITensorFlowPredictionStrategy;

  /**
   * Constructor with dependency injection
   * 
   * @param calculator - Optional prediction calculator (uses default if not provided)
   * @param normalizer - Optional feature normalizer (uses default if not provided)
   * @param config - Optional configuration
   */
  constructor(
    calculator?: IPredictionCalculator,
    normalizer?: IFeatureNormalizer,
    config?: MLModelConfig
  ) {
    // Use provided or default implementations
    this.predictionCalculator = calculator ?? new PredictionCalculator();
    this.featureNormalizer = normalizer ?? new FeatureNormalizer();
    
    // Initialize TensorFlow strategy
    const finalConfig: MLModelConfig = {
      weights: config?.weights ?? this.weights,
      useTensorFlowModels: config?.useTensorFlowModels ?? false,
      modelNames: config?.modelNames ?? {
        ff: 'ml-ff-model',
        gru: 'ml-gru-model',
        lstm: 'ml-lstm-model'
      }
    };
    
    this.tensorFlowStrategy = new TensorFlowPredictionStrategy(
      null,
      null,
      null,
      this.featureNormalizer,
      finalConfig
    );
  }

  /**
   * すべてのモデルによる予測を実行（同期版 - ルールベース）
   */
  predict(features: PredictionFeatures): ModelPrediction {
    // Use injected calculator for pure function predictions
    const rf = this.predictionCalculator.calculateRandomForest(features);
    const xgb = this.predictionCalculator.calculateXGBoost(features);
    const lstm = this.predictionCalculator.calculateLSTM(features);

    const ensemblePrediction = this.predictionCalculator.calculateEnsemble(
      rf,
      xgb,
      lstm,
      this.weights
    );
    const confidence = this.predictionCalculator.calculateConfidence(
      features,
      ensemblePrediction
    );

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
    if (this.tensorFlowStrategy.isTensorFlowEnabled()) {
      try {
        return await this.tensorFlowStrategy.predictWithTensorFlow(features);
      } catch (error) {
        // Fallback to rule-based on error
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.error('TensorFlow prediction failed, falling back to rule-based:', error);
        }
      }
    }
    
    // Fallback to rule-based predictions
    return this.predict(features);
  }

  /**
   * TensorFlow.jsモデルを使用した予測
   * @deprecated Use predictAsync instead
   */
  private async predictWithTensorFlow(features: PredictionFeatures): Promise<ModelPrediction> {
    return this.tensorFlowStrategy.predictWithTensorFlow(features);
  }

  /**
   * TensorFlow.jsモデルの信頼度を計算
   * @deprecated Moved to TensorFlowPredictionStrategy
   */
  private calculateTensorFlowConfidence(
    ff: number,
    gru: number,
    lstm: number,
    ensemble: number
  ): number {
    return this.tensorFlowStrategy.calculateTensorFlowConfidence(ff, gru, lstm, ensemble);
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

    // Update TensorFlow strategy with trained models
    this.tensorFlowStrategy.setModels(this.ffModel, this.gruModel, this.lstmModel);
    this.tensorFlowStrategy.setTensorFlowEnabled(true);

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

      // Update TensorFlow strategy with loaded models
      this.tensorFlowStrategy.setModels(this.ffModel, this.gruModel, this.lstmModel);
      this.tensorFlowStrategy.setTensorFlowEnabled(true);
    } catch (error) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('Failed to load models:', error);
      }
      this.tensorFlowStrategy.setTensorFlowEnabled(false);
    }
  }

  /**
   * TensorFlow.jsモデルが使用可能かチェック
   */
  isTensorFlowEnabled(): boolean {
    return this.tensorFlowStrategy.isTensorFlowEnabled();
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

  /**
   * Random Forestによる予測
   * @deprecated Moved to PredictionCalculator.calculateRandomForest
   */
  private randomForestPredict(f: PredictionFeatures): number {
    return this.predictionCalculator.calculateRandomForest(f);
  }

  /**
   * XGBoostによる予測
   * @deprecated Moved to PredictionCalculator.calculateXGBoost
   */
  private xgboostPredict(f: PredictionFeatures): number {
    return this.predictionCalculator.calculateXGBoost(f);
  }

  /**
   * LSTMによる予測（簡易版）
   * @deprecated Moved to PredictionCalculator.calculateLSTM
   */
  private lstmPredict(f: PredictionFeatures): number {
    return this.predictionCalculator.calculateLSTM(f);
  }

  /**
   * 予測の信頼度を計算
   * @deprecated Moved to PredictionCalculator.calculateConfidence
   */
  private calculateConfidence(f: PredictionFeatures, prediction: number): number {
    return this.predictionCalculator.calculateConfidence(f, prediction);
  }
}

export const mlModelService = new MLModelService();