/**
 * ML予測モデルサービス
 * 
 * このモジュールは、RF、XGB、LSTMの各モデルによる予測を実行する機能を提供します。
 * 
 * @deprecated このサービスは責務が分離されました。
 *   新しい実装では以下を使用してください：
 *   - PredictionService: 予測オーケストレーション
 *   - ModelRegistry: モデル管理
 *   - ConfidenceEvaluator: 信頼度評価
 *   
 *   関連Issue: #525 サービス層責務分離
 */

import { PredictionFeatures } from './feature-calculation-service';
import { ModelPrediction } from '../../types';
import { PredictionService, predictionService } from './prediction-service';

/**
 * ML予測モデルサービス（後方互換性のためのラッパー）
 * @deprecated PredictionServiceを直接使用してください
 */
export class MLModelService {
  private predictionService: PredictionService;

  constructor(predictionService?: PredictionService) {
    this.predictionService = predictionService || new PredictionService();
  }

  /**
   * すべてのモデルによる予測を実行
   * @deprecated PredictionService.predictを使用してください
   */
  predict(features: PredictionFeatures): ModelPrediction {
    return this.predictionService.predict(features);
  }
}

/**
 * @deprecated PredictionServiceを直接使用してください
 */
export const mlModelService = new MLModelService(predictionService);

// 新しいサービスをエクスポート
export { PredictionService, predictionService } from './prediction-service';
export { ModelRegistry, modelRegistry } from './model-registry';
export { ConfidenceEvaluator, confidenceEvaluator } from './confidence-evaluator';