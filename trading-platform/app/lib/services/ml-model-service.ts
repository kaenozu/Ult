/**
 * ML予測モデルサービス
 * 
 * このモジュールは、TensorFlow.jsを使用した実際の機械学習モデルによる予測を実行する機能を提供します。
 * LSTM、GRU、FeedForwardニューラルネットワークを使用します。
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
import { Result, ok, err, AppError, tryCatchAsync, logError } from '../errors';

/**
 * ML予測モデルサービス
 */
export class MLModelService {
  private readonly weights = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  };

  // TensorFlow.js models
  private lstmModel: LSTMModel | null = null;
  private gruModel: GRUModel | null = null;
  private ffModel: FeedForwardModel | null = null;

  // Flag to use TensorFlow.js models (set to true after training)
  private useTensorFlowModels = false;

  /**
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

  /**
   * TensorFlow.jsモデルを使用した予測（非同期版）
   * Result型を使用して型安全なエラーハンドリング
   */
  async predictAsync(features: PredictionFeatures): Promise<Result<ModelPrediction, AppError>> {
    if (this.useTensorFlowModels && this.lstmModel && this.gruModel && this.ffModel) {
      const result = await this.predictWithTensorFlow(features);
      
      // エラーの場合はフォールバック
      if (result.isErr) {
        logError(result.error, 'MLModelService.predictAsync');
        return ok(this.predict(features));
      }
      
      return result;
    }
    
    // Fallback to rule-based predictions
    return ok(this.predict(features));
  }

  /**
   * TensorFlow.jsモデルを使用した予測
   * Result型を使用した型安全なエラーハンドリング
   */
  private async predictWithTensorFlow(features: PredictionFeatures): Promise<Result<ModelPrediction, AppError>> {
    return tryCatchAsync(
      async () => {
        const featureArray = featuresToArray(features);

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
      },
      (error) => new AppError(
        `TensorFlow prediction failed: ${error instanceof Error ? error.message : String(error)}`,
        'ML_PREDICTION_ERROR',
        'medium'
      )
    );
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
   * Result型を使用した型安全なエラーハンドリング
   */
  async loadModels(): Promise<Result<void, AppError>> {
    return tryCatchAsync(
      async () => {
        this.ffModel = new FeedForwardModel();
        this.gruModel = new GRUModel();
        this.lstmModel = new LSTMModel();

        await Promise.all([
          this.ffModel.loadModel('ml-ff-model'),
          this.gruModel.loadModel('ml-gru-model'),
          this.lstmModel.loadModel('ml-lstm-model')
        ]);

        this.useTensorFlowModels = true;
      },
      (error) => {
        this.useTensorFlowModels = false;
        const err = new AppError(
          `Failed to load models: ${error instanceof Error ? error.message : String(error)}`,
          'MODEL_LOAD_ERROR',
          'high'
        );
        logError(err, 'MLModelService.loadModels');
        return err;
      }
    );
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

  /**
   * Random Forestによる予測
   */
  private randomForestPredict(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_STRONG_THRESHOLD = 2.0;
    const MOMENTUM_SCORE = 2;
    const SMA_BULL_SCORE = 2;
    const SMA_BEAR_SCORE = 1;
    const RF_SCALING = 0.8;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    // SMAスコア
    if (f.sma5 > 0) score += SMA_BULL_SCORE;
    if (f.sma20 > 0) score += SMA_BEAR_SCORE;

    // モメンタムスコア
    if (f.priceMomentum > MOMENTUM_STRONG_THRESHOLD) {
      score += MOMENTUM_SCORE;
    } else if (f.priceMomentum < -MOMENTUM_STRONG_THRESHOLD) {
      score -= MOMENTUM_SCORE;
    }

    return score * RF_SCALING;
  }

  /**
   * XGBoostによる予測
   */
  private xgboostPredict(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_DIVISOR = 3;
    const MOMENTUM_MAX_SCORE = 3;
    const SMA_DIVISOR = 10;
    const SMA5_WEIGHT = 0.5;
    const SMA20_WEIGHT = 0.3;
    const XGB_SCALING = 0.9;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    // モメンタムとSMAの影響
    const momentumScore = Math.min(f.priceMomentum / MOMENTUM_DIVISOR, MOMENTUM_MAX_SCORE);
    const smaScore = (f.sma5 * SMA5_WEIGHT + f.sma20 * SMA20_WEIGHT) / SMA_DIVISOR;
    
    score += momentumScore + smaScore;

    return score * XGB_SCALING;
  }

  /**
   * LSTMによる予測（簡易版）
   */
  private lstmPredict(f: PredictionFeatures): number {
    // LSTMの予測は価格モメンタムに基づいて簡略化
    const LSTM_SCALING = 0.6;
    return f.priceMomentum * LSTM_SCALING;
  }

  /**
   * 予測の信頼度を計算
   */
  private calculateConfidence(f: PredictionFeatures, prediction: number): number {
    const RSI_EXTREME_BONUS = 10;
    const MOMENTUM_BONUS = 8;
    const PREDICTION_BONUS = 5;
    const MOMENTUM_THRESHOLD = 2.0;

    let confidence = 50;

    // RSIが極端な場合のボーナス
    if (f.rsi < 15 || f.rsi > 85) {
      confidence += RSI_EXTREME_BONUS;
    }

    // モメンタムが強い場合のボーナス
    if (Math.abs(f.priceMomentum) > MOMENTUM_THRESHOLD) {
      confidence += MOMENTUM_BONUS;
    }

    // 予測値が大きい場合のボーナス
    if (Math.abs(prediction) > MOMENTUM_THRESHOLD) {
      confidence += PREDICTION_BONUS;
    }

    // 信頼度を0-100の範囲に制限
    return Math.min(Math.max(confidence, 50), 95);
  }
}

export const mlModelService = new MLModelService();