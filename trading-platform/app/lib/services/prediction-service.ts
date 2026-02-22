/**
 * 予測サービス
 * 
 * このモジュールは、MLモデルによる予測のオーケストレーションを担当します。
 * (#525: サービス層責務分離 - 予測オーケストレーション責務の分離)
 */

import { PredictionFeatures } from './feature-engineering-service';
import { ModelPrediction } from '../../types';
import { ModelRegistry, ModelType, modelRegistry } from './model-registry';
import { ConfidenceEvaluator, confidenceEvaluator } from './confidence-evaluator';

/**
 * 予測サービス設定
 */
export interface PredictionServiceConfig {
  modelRegistry: ModelRegistry;
  confidenceEvaluator: ConfidenceEvaluator;
}

/**
 * 個別モデル予測インターフェース
 */
export interface IndividualModelPredictor {
  predict(features: PredictionFeatures): number;
}

/**
 * 予測サービス
 */
export class PredictionService {
  private modelRegistry: ModelRegistry;
  private confidenceEvaluator: ConfidenceEvaluator;
  private modelPredictors: Map<ModelType, IndividualModelPredictor>;

  constructor(config: Partial<PredictionServiceConfig> = {}) {
    this.modelRegistry = config.modelRegistry || modelRegistry;
    this.confidenceEvaluator = config.confidenceEvaluator || confidenceEvaluator;
    this.modelPredictors = new Map();
    this.initializePredictors();
  }

  /**
   * モデル予測器を初期化
   */
  private initializePredictors(): void {
    this.modelPredictors.set('RF', new RandomForestPredictor(this.modelRegistry));
    this.modelPredictors.set('XGB', new XGBoostPredictor(this.modelRegistry));
    this.modelPredictors.set('LSTM', new LSTMPredictor(this.modelRegistry));
  }

  /**
   * すべてのモデルによる予測を実行
   */
  predict(features: PredictionFeatures): ModelPrediction {
    const rf = this.predictWithModel('RF', features);
    const xgb = this.predictWithModel('XGB', features);
    const lstm = this.predictWithModel('LSTM', features);

    const predictions: Record<ModelType, number> = { RF: rf, XGB: xgb, LSTM: lstm };
    const ensemblePrediction = this.modelRegistry.calculateEnsemble(predictions);
    const confidence = this.confidenceEvaluator.evaluate(features, ensemblePrediction);

    return {
      rfPrediction: rf,
      xgbPrediction: xgb,
      lstmPrediction: lstm,
      ensemblePrediction,
      confidence,
    };
  }

  /**
   * 特定モデルによる予測を実行
   */
  private predictWithModel(type: ModelType, features: PredictionFeatures): number {
    const predictor = this.modelPredictors.get(type);
    if (!predictor) {
      throw new Error(`Unknown model type: ${type}`);
    }
    return predictor.predict(features);
  }

  /**
   * モデル予測器を登録
   */
  registerPredictor(type: ModelType, predictor: IndividualModelPredictor): void {
    this.modelPredictors.set(type, predictor);
  }
}

/**
 * Random Forest予測器
 */
class RandomForestPredictor implements IndividualModelPredictor {
  constructor(private registry: ModelRegistry) {}

  predict(f: PredictionFeatures): number {
    const model = this.registry.getModel('RF');
    const params = model?.parameters;
    const thresholds = params?.thresholds || {};
    const weights = params?.weights || {};

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < (thresholds.rsiExtreme || 20)) {
      score += weights.rsiExtremeScore || 3;
    } else if (f.rsi > (thresholds.rsiOverbought || 80)) {
      score -= weights.rsiExtremeScore || 3;
    }

    // SMAスコア
    if (f.sma5 > 0) score += weights.smaBullScore || 2;
    if (f.sma20 > 0) score += weights.smaBearScore || 1;

    // モメンタムスコア
    if (f.priceMomentum > (thresholds.momentumStrong || 2.0)) {
      score += weights.momentumScore || 2;
    } else if (f.priceMomentum < -(thresholds.momentumStrong || 2.0)) {
      score -= weights.momentumScore || 2;
    }

    return score * (params?.scaling || 0.8);
  }
}

/**
 * XGBoost予測器
 */
class XGBoostPredictor implements IndividualModelPredictor {
  constructor(private registry: ModelRegistry) {}

  predict(f: PredictionFeatures): number {
    const model = this.registry.getModel('XGB');
    const params = model?.parameters;
    const thresholds = params?.thresholds || {};
    const weights = params?.weights || {};

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < (thresholds.rsiExtreme || 20)) {
      score += 3;
    } else if (f.rsi > (thresholds.rsiOverbought || 80)) {
      score -= 3;
    }

    // モメンタムとSMAの影響
    const momentumScore = Math.min(f.priceMomentum / 3, 3);
    const smaScore = (f.sma5 * (weights.sma5Weight || 0.5) + f.sma20 * (weights.sma20Weight || 0.3)) / 10;

    score += momentumScore + smaScore;

    return score * (params?.scaling || 0.9);
  }
}

/**
 * LSTM予測器
 */
class LSTMPredictor implements IndividualModelPredictor {
  constructor(private registry: ModelRegistry) {}

  predict(f: PredictionFeatures): number {
    const model = this.registry.getModel('LSTM');
    const scaling = model?.parameters?.scaling || 0.6;
    return f.priceMomentum * scaling;
  }
}

export const predictionService = new PredictionService();
