/**
 * OnlineLearning.ts
 * 
 * オンライン学習の実装クラス。
 * モデルが新しいデータで継続的に学習し、適応します。
 */

import { ExtendedTechnicalFeatures } from './FeatureEngineering';
import { BaseModelPrediction } from './EnsembleModel';

/**
 * 学習サンプル
 */
export interface TrainingSample {
  features: ExtendedTechnicalFeatures;
  label: number; // 実際の結果（-1: 下落, 0: 横ばい, 1: 上昇）
  weight: number; // サンプルの重要度
  timestamp: Date;
}

/**
 * オンライン学習の設定
 */
export interface OnlineLearningConfig {
  learningRate: number;
  batchSize: number;
  maxMemorySize: number;
  forgettingFactor: number; // 古いデータの重み減衰率
  adaptationSpeed: 'SLOW' | 'MEDIUM' | 'FAST';
}

/**
 * モデルの状態
 */
export interface ModelState {
  weights: Map<string, number>;
  bias: number;
  samplesSeen: number;
  lastUpdated: Date;
  version: number;
}

/**
 * 更新結果
 */
export interface UpdateResult {
  samplesProcessed: number;
  lossImprovement: number;
  weightsUpdated: number;
  currentLoss: number;
  previousLoss: number;
}

/**
 * オンライン学習クラス
 */
export class OnlineLearning {
  private modelState: ModelState;
  private config: OnlineLearningConfig;
  private replayBuffer: TrainingSample[] = [];
  private currentLoss: number = 0;

  constructor(config?: Partial<OnlineLearningConfig>) {
    this.config = {
      learningRate: 0.001,
      batchSize: 32,
      maxMemorySize: 1000,
      forgettingFactor: 0.95,
      adaptationSpeed: 'MEDIUM',
      ...config,
    };

    this.modelState = {
      weights: new Map(),
      bias: 0,
      samplesSeen: 0,
      lastUpdated: new Date(),
      version: 1,
    };

    this.adjustConfigBySpeed();
  }

  /**
   * 新しいサンプルで学習
   * 
   * @param sample - 学習サンプル
   * @returns 更新結果
   */
  async learnFromSample(sample: TrainingSample): Promise<UpdateResult> {
    // リプレイバッファに追加
    this.replayBuffer.push(sample);
    
    // バッファサイズを制限
    if (this.replayBuffer.length > this.config.maxMemorySize) {
      this.replayBuffer.shift();
    }
    
    // バッチサイズに達したら学習
    if (this.replayBuffer.length >= this.config.batchSize) {
      return await this.trainOnBatch();
    }
    
    return {
      samplesProcessed: 0,
      lossImprovement: 0,
      weightsUpdated: 0,
      currentLoss: this.currentLoss,
      previousLoss: this.currentLoss,
    };
  }

  /**
   * バッチで学習
   * 
   * @returns 更新結果
   */
  async trainOnBatch(): Promise<UpdateResult> {
    const previousLoss = this.currentLoss;
    
    // バッチから最新のサンプルを取得
    const batch = this.replayBuffer.slice(-this.config.batchSize);
    
    // 時間による重みの減衰を適用
    const weightedBatch = batch.map(sample => ({
      ...sample,
      weight: sample.weight * this.calculateTimeDecay(sample.timestamp),
    }));
    
    // 勾配を計算
    const gradients = this.calculateGradients(weightedBatch);
    
    // 重みを更新
    let weightsUpdated = 0;
    gradients.forEach((gradient, feature) => {
      const currentWeight = this.modelState.weights.get(feature) || 0;
      const newWeight = currentWeight - this.config.learningRate * gradient;
      this.modelState.weights.set(feature, newWeight);
      weightsUpdated++;
    });
    
    // バイアスを更新
    this.modelState.bias -= this.config.learningRate * this.calculateBiasGradient(weightedBatch);
    
    // 損失を再計算
    this.currentLoss = this.calculateLoss(weightedBatch);
    const lossImprovement = previousLoss - this.currentLoss;
    
    // 状態を更新
    this.modelState.samplesSeen += batch.length;
    this.modelState.lastUpdated = new Date();
    this.modelState.version++;
    
    return {
      samplesProcessed: batch.length,
      lossImprovement,
      weightsUpdated,
      currentLoss: this.currentLoss,
      previousLoss,
    };
  }

  /**
   * 予測を実行
   * 
   * @param features - 入力特徴量
   * @returns 予測値
   */
  predict(features: ExtendedTechnicalFeatures): number {
    let prediction = this.modelState.bias;
    
    // 各特徴量の寄与を計算
    const featureVector = this.extractFeatureVector(features);
    
    featureVector.forEach((value, feature) => {
      const weight = this.modelState.weights.get(feature) || 0;
      prediction += weight * value;
    });
    
    return this.sigmoid(prediction);
  }

  /**
   * モデルをリセット
   */
  reset(): void {
    this.modelState = {
      weights: new Map(),
      bias: 0,
      samplesSeen: 0,
      lastUpdated: new Date(),
      version: 1,
    };
    this.replayBuffer = [];
    this.currentLoss = 0;
  }

  /**
   * モデルの状態を取得
   */
  getModelState(): ModelState {
    return {
      ...this.modelState,
      weights: new Map(this.modelState.weights),
    };
  }

  /**
   * 学習率を調整
   */
  setLearningRate(rate: number): void {
    if (rate <= 0 || rate > 1) {
      throw new Error('Learning rate must be between 0 and 1');
    }
    this.config.learningRate = rate;
  }

  /**
   * リプレイバッファのサイズを取得
   */
  getBufferSize(): number {
    return this.replayBuffer.length;
  }

  /**
   * 現在の損失を取得
   */
  getCurrentLoss(): number {
    return this.currentLoss;
  }

  /**
   * 勾配を計算
   */
  private calculateGradients(batch: TrainingSample[]): Map<string, number> {
    const gradients = new Map<string, number>();
    
    for (const sample of batch) {
      const featureVector = this.extractFeatureVector(sample.features);
      const prediction = this.predict(sample.features);
      const error = (prediction - this.normalizeLabel(sample.label)) * sample.weight;
      
      featureVector.forEach((value, feature) => {
        const currentGradient = gradients.get(feature) || 0;
        gradients.set(feature, currentGradient + error * value);
      });
    }
    
    // 平均化
    gradients.forEach((gradient, feature) => {
      gradients.set(feature, gradient / batch.length);
    });
    
    return gradients;
  }

  /**
   * バイアスの勾配を計算
   */
  private calculateBiasGradient(batch: TrainingSample[]): number {
    let gradient = 0;
    
    for (const sample of batch) {
      const prediction = this.predict(sample.features);
      const error = (prediction - this.normalizeLabel(sample.label)) * sample.weight;
      gradient += error;
    }
    
    return gradient / batch.length;
  }

  /**
   * 損失を計算（平均二乗誤差）
   */
  private calculateLoss(batch: TrainingSample[]): number {
    let loss = 0;
    
    for (const sample of batch) {
      const prediction = this.predict(sample.features);
      const target = this.normalizeLabel(sample.label);
      loss += Math.pow(prediction - target, 2) * sample.weight;
    }
    
    return loss / batch.length;
  }

  /**
   * 特徴量ベクトルを抽出
   */
  private extractFeatureVector(features: ExtendedTechnicalFeatures): Map<string, number> {
    const vector = new Map<string, number>();
    
    // 数値特徴量
    vector.set('rsi', features.rsi / 100);
    vector.set('momentum', features.momentum / 10);
    vector.set('rateOfChange', features.rateOfChange / 10);
    vector.set('volatility', features.volatility / 50);
    vector.set('volumeRatio', Math.min(features.volumeRatio, 3) / 3);
    vector.set('macdSignal', features.macdSignal / 5);
    vector.set('sma5', features.sma5 / 10);
    vector.set('sma20', features.sma20 / 10);
    
    // カテゴリカル特徴量をワンホットエンコーディング
    vector.set('momentum_strong_up', features.momentumTrend === 'STRONG_UP' ? 1 : 0);
    vector.set('momentum_up', features.momentumTrend === 'UP' ? 1 : 0);
    vector.set('momentum_down', features.momentumTrend === 'DOWN' ? 1 : 0);
    vector.set('momentum_strong_down', features.momentumTrend === 'STRONG_DOWN' ? 1 : 0);
    
    vector.set('volatility_low', features.volatilityRegime === 'LOW' ? 1 : 0);
    vector.set('volatility_high', features.volatilityRegime === 'HIGH' ? 1 : 0);
    
    // マクロ指標（利用可能な場合）
    if (features.macroIndicators?.vix) {
      vector.set('vix', features.macroIndicators.vix / 40);
    }
    
    // ニュース感情（利用可能な場合）
    if (features.sentiment) {
      vector.set('sentiment', features.sentiment.overall);
    }
    
    return vector;
  }

  /**
   * シグモイド関数
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * ラベルを正規化（-1, 0, 1 -> 0, 0.5, 1）
   */
  private normalizeLabel(label: number): number {
    return (label + 1) / 2;
  }

  /**
   * 時間による減衰係数を計算
   */
  private calculateTimeDecay(timestamp: Date): number {
    const now = new Date();
    const daysPassed = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return Math.pow(this.config.forgettingFactor, daysPassed);
  }

  /**
   * 適応速度に基づいて設定を調整
   */
  private adjustConfigBySpeed(): void {
    switch (this.config.adaptationSpeed) {
      case 'FAST':
        this.config.learningRate = 0.01;
        this.config.forgettingFactor = 0.90;
        break;
      case 'MEDIUM':
        this.config.learningRate = 0.001;
        this.config.forgettingFactor = 0.95;
        break;
      case 'SLOW':
        this.config.learningRate = 0.0001;
        this.config.forgettingFactor = 0.98;
        break;
    }
  }
}

export const onlineLearning = new OnlineLearning();
