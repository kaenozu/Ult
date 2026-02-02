/**
 * モデルレジストリ
 * 
 * このモジュールは、MLモデルの管理と設定を担当します。
 * (#525: サービス層責務分離 - モデル管理責務の分離)
 */

/**
 * モデルタイプ
 */
export type ModelType = 'RF' | 'XGB' | 'LSTM';

/**
 * モデル設定
 */
export interface ModelConfig {
  type: ModelType;
  weight: number;
  parameters: ModelParameters;
}

/**
 * モデルパラメータ
 */
export interface ModelParameters {
  scaling: number;
  thresholds?: Record<string, number>;
  weights?: Record<string, number>;
}

/**
 * デフォルトのモデルパラメータ
 */
const DEFAULT_PARAMETERS: Record<ModelType, ModelParameters> = {
  RF: {
    scaling: 0.8,
    thresholds: {
      rsiExtreme: 20,
      rsiOverbought: 80,
      momentumStrong: 2.0,
    },
    weights: {
      rsiExtremeScore: 3,
      momentumScore: 2,
      smaBullScore: 2,
      smaBearScore: 1,
    },
  },
  XGB: {
    scaling: 0.9,
    thresholds: {
      rsiExtreme: 20,
      rsiOverbought: 80,
    },
    weights: {
      sma5Weight: 0.5,
      sma20Weight: 0.3,
    },
  },
  LSTM: {
    scaling: 0.6,
  },
};

/**
 * モデルレジストリ
 */
export class ModelRegistry {
  private models: Map<ModelType, ModelConfig> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * デフォルトモデルの初期化
   */
  private initializeDefaultModels(): void {
    this.registerModel({
      type: 'RF',
      weight: 0.35,
      parameters: DEFAULT_PARAMETERS.RF,
    });

    this.registerModel({
      type: 'XGB',
      weight: 0.35,
      parameters: DEFAULT_PARAMETERS.XGB,
    });

    this.registerModel({
      type: 'LSTM',
      weight: 0.30,
      parameters: DEFAULT_PARAMETERS.LSTM,
    });
  }

  /**
   * モデルを登録
   */
  registerModel(config: ModelConfig): void {
    this.models.set(config.type, config);
  }

  /**
   * モデル設定を取得
   */
  getModel(type: ModelType): ModelConfig | undefined {
    return this.models.get(type);
  }

  /**
   * すべてのモデルを取得
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * モデル重みの合計を検証（正規化）
   */
  validateWeights(): boolean {
    const total = this.getAllModels().reduce((sum, m) => sum + m.weight, 0);
    return Math.abs(total - 1.0) < 0.001;
  }

  /**
   * モデル重みを正規化
   */
  normalizeWeights(): void {
    const total = this.getAllModels().reduce((sum, m) => sum + m.weight, 0);
    if (total === 0) return;

    for (const model of this.models.values()) {
      model.weight = model.weight / total;
    }
  }

  /**
   * アンサンブル予測を計算
   */
  calculateEnsemble(predictions: Record<ModelType, number>): number {
    let ensemble = 0;
    let totalWeight = 0;

    for (const [type, prediction] of Object.entries(predictions)) {
      const model = this.models.get(type as ModelType);
      if (model) {
        ensemble += prediction * model.weight;
        totalWeight += model.weight;
      }
    }

    return totalWeight > 0 ? ensemble / totalWeight : 0;
  }
}

export const modelRegistry = new ModelRegistry();
