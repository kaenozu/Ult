/**
 * 信頼度評価サービス
 * 
 * このモジュールは、予測結果の信頼度を計算する責務を担当します。
 * (#525: サービス層責務分離 - 信頼度計算責務の分離)
 */

import { PredictionFeatures } from './feature-calculation-service';

/**
 * 信頼度評価ルール
 */
export interface ConfidenceRule {
  name: string;
  condition: (features: PredictionFeatures, prediction: number) => boolean;
  bonus: number;
}

/**
 * 信頼度評価設定
 */
export interface ConfidenceConfig {
  baseConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  rules: ConfidenceRule[];
}

/**
 * デフォルトの信頼度評価設定
 */
const DEFAULT_CONFIG: ConfidenceConfig = {
  baseConfidence: 50,
  minConfidence: 50,
  maxConfidence: 95,
  rules: [
    {
      name: 'RSI_EXTREME',
      condition: (f) => f.rsi < 15 || f.rsi > 85,
      bonus: 10,
    },
    {
      name: 'MOMENTUM_STRONG',
      condition: (f) => Math.abs(f.priceMomentum) > 2.0,
      bonus: 8,
    },
    {
      name: 'PREDICTION_STRONG',
      condition: (_, prediction) => Math.abs(prediction) > 2.0,
      bonus: 5,
    },
  ],
};

/**
 * 信頼度評価サービス
 */
export class ConfidenceEvaluator {
  private config: ConfidenceConfig;

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 信頼度を計算
   */
  evaluate(features: PredictionFeatures, prediction: number): number {
    let confidence = this.config.baseConfidence;

    // 各ルールを適用
    for (const rule of this.config.rules) {
      if (rule.condition(features, prediction)) {
        confidence += rule.bonus;
      }
    }

    // 範囲内に制限
    return Math.min(
      Math.max(confidence, this.config.minConfidence),
      this.config.maxConfidence
    );
  }

  /**
   * カスタムルールを追加
   */
  addRule(rule: ConfidenceRule): void {
    this.config.rules.push(rule);
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ConfidenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 評価の詳細を取得
   */
  evaluateWithDetails(
    features: PredictionFeatures,
    prediction: number
  ): { confidence: number; appliedRules: string[] } {
    let confidence = this.config.baseConfidence;
    const appliedRules: string[] = [];

    for (const rule of this.config.rules) {
      if (rule.condition(features, prediction)) {
        confidence += rule.bonus;
        appliedRules.push(rule.name);
      }
    }

    confidence = Math.min(
      Math.max(confidence, this.config.minConfidence),
      this.config.maxConfidence
    );

    return { confidence, appliedRules };
  }
}

export const confidenceEvaluator = new ConfidenceEvaluator();
