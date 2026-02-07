export interface TradeStats {
  hitRate: number; // 0-100
  avgProfit: number;
  avgLoss: number;
  totalTrades: number;
}

export interface EVConfig {
  commission: number;
  slippage: number;
}

export interface EVResult {
  expectedValue: number;
  isPositive: boolean;
  confidenceScore: number; // 0-100 (サンプル数に基づく信頼度)
  recommendation: 'PROCEED' | 'CAUTION' | 'AVOID';
}

/**
 * 期待値 (Expected Value) 算出エンジン
 * 統計的データに基づき、1トレードあたりの期待収益を算出します。
 */
export class ExpectedValueService {
  /**
   * 期待値を計算する
   */
  calculate(stats: TradeStats, config: EVConfig = { commission: 0, slippage: 0 }): EVResult {
    const winRate = stats.hitRate / 100;
    const lossRate = 1 - winRate;
    
    // 基本期待値 = (勝率 * 平均利益) - (敗率 * 平均損失)
    const rawEV = (winRate * stats.avgProfit) - (lossRate * stats.avgLoss);
    
    // 諸経費を差し引く
    const totalCost = config.commission + config.slippage;
    const finalEV = rawEV - totalCost;

    // 信頼度スコアの計算 (サンプル数 30以上で高信頼とする簡易ロジック)
    const confidenceScore = Math.min(100, (stats.totalTrades / 30) * 100);

    let recommendation: EVResult['recommendation'] = 'AVOID';
    if (finalEV > 0) {
      recommendation = confidenceScore > 50 ? 'PROCEED' : 'CAUTION';
    }

    return {
      expectedValue: finalEV,
      isPositive: finalEV > 0,
      confidenceScore,
      recommendation
    };
  }
}

export const expectedValueService = new ExpectedValueService();
