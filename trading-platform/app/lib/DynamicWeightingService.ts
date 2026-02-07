import { MarketRegime } from './MarketRegimeService';

export interface Weights {
  ai: number;
  technical: number;
  correlation: number;
  supplyDemand: number;
}

export interface ComponentPerformance {
  ai: { hitRate: number };
  technical: { hitRate: number };
  correlation: { hitRate: number };
  supplyDemand: { hitRate: number };
}

/**
 * 自己最適化インテリジェンス・コア
 * 実績（的中率）と文脈（相場環境）の両面から分析モデルの重みを動的に最適化します。
 */
export class DynamicWeightingService {
  /**
   * 重みの最適化を実行する
   * @param base - ベースとなる重み
   * @param performance - 各コンポーネントの実績的中率
   * @param regime - 現在の相場環境 (Optional)
   */
  optimize(base: Weights, performance: ComponentPerformance, regime?: MarketRegime): Weights {
    // 1. 的中率に基づく基本スコアの算出
    const hasData = Object.values(performance).some(p => p.hitRate > 0);
    const scores = {
      ai: (hasData ? Math.max(0.1, performance.ai.hitRate / 100) : 1) * base.ai,
      technical: (hasData ? Math.max(0.1, performance.technical.hitRate / 100) : 1) * base.technical,
      correlation: (hasData ? Math.max(0.1, performance.correlation.hitRate / 100) : 1) * base.correlation,
      supplyDemand: (hasData ? Math.max(0.1, performance.supplyDemand.hitRate / 100) : 1) * base.supplyDemand,
    };

    // 2. 相場環境(Regime)によるバイアスの適用 (TOBEの核心)
    if (regime) {
      switch (regime) {
        case 'CRASH':
          // 暴落時はトレンドやAIを捨て、需給の壁とボラティリティのみを信じる
          scores.supplyDemand *= 3.0;
          scores.ai *= 0.2;
          scores.technical *= 0.5;
          break;
        case 'BULL':
          // 上昇トレンド時はAI予測とトレンド追随(Technical)を優先
          scores.ai *= 1.5;
          scores.technical *= 1.2;
          break;
        case 'RANGING':
          // レンジ相場はテクニカル(RSI等の逆張り)を優先
          scores.technical *= 2.0;
          scores.ai *= 0.8;
          break;
        case 'VOLATILE':
          // 乱高下時は相関関係を重視
          scores.correlation *= 2.0;
          break;
      }
    }

    // 3. スコアの合計で正規化して新しい重みを算出
    const totalScore = scores.ai + scores.technical + scores.correlation + scores.supplyDemand;

    return {
      ai: scores.ai / totalScore,
      technical: scores.technical / totalScore,
      correlation: scores.correlation / totalScore,
      supplyDemand: scores.supplyDemand / totalScore,
    };
  }
}