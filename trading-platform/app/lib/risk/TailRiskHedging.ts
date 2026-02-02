/**
 * Tail Risk Hedging Module
 * 
 * TRADING-003: テールリスクヘッジの実装
 * ブラックスワンイベントに対する保護戦略
 * - プットオプションヘッジ
 * - VIX先物ヘッジ
 * - インバースETFヘッジ
 */

import { Position, Portfolio } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface HedgeStrategy {
  type: 'put_option' | 'vix_futures' | 'inverse_etf';
  symbol: string;
  quantity: number;
  cost: number;
  expectedProtection: number; // Expected protection in portfolio %
  breakEvenMove: number; // Market move % where hedge breaks even
}

export interface TailRiskMetrics {
  tailRisk: number; // Estimated tail risk (% loss in 99th percentile)
  skewness: number; // Return distribution skewness
  kurtosis: number; // Return distribution kurtosis
  maxExpectedLoss: number; // Maximum expected loss in tail event
  probabilityOfTailEvent: number; // Probability of extreme loss
}

export interface HedgeRecommendation {
  strategy: HedgeStrategy;
  rationale: string;
  costBenefitRatio: number;
  implementationPriority: 'high' | 'medium' | 'low';
  hedgeRatio: number; // Portion of portfolio to hedge (0-1)
}

export interface HedgePerformance {
  hedgeCost: number;
  protectionProvided: number;
  returnImpact: number; // Impact on portfolio returns (%)
  efficiency: number; // Protection per dollar spent
}

// ============================================================================
// Tail Risk Hedging Engine
// ============================================================================

export class TailRiskHedging {
  private portfolio: Portfolio;
  private returns: number[] = [];
  private volatility: number = 0;
  private correlations: Map<string, number> = new Map();

  constructor(portfolio: Portfolio) {
    this.portfolio = portfolio;
  }

  /**
   * テールリスクメトリクスを計算
   */
  calculateTailRiskMetrics(): TailRiskMetrics {
    if (this.returns.length < 30) {
      return this.getDefaultMetrics();
    }

    const sortedReturns = [...this.returns].sort((a, b) => a - b);
    
    // 99パーセンタイルでのテールリスク
    const tailIndex = Math.floor(sortedReturns.length * 0.01);
    const tailRisk = Math.abs(sortedReturns[tailIndex] || 0);

    // 歪度（Skewness）の計算
    const skewness = this.calculateSkewness();

    // 尖度（Kurtosis）の計算
    const kurtosis = this.calculateKurtosis();

    // 最大期待損失（99.9パーセンタイル）
    const maxLossIndex = Math.max(0, Math.floor(sortedReturns.length * 0.001));
    const maxExpectedLoss = Math.abs(sortedReturns[maxLossIndex] || tailRisk * 1.5);

    // テールイベントの確率（3シグマイベント）
    const probabilityOfTailEvent = this.estimateTailEventProbability();

    return {
      tailRisk,
      skewness,
      kurtosis,
      maxExpectedLoss,
      probabilityOfTailEvent
    };
  }

  /**
   * ヘッジ推奨を生成
   */
  generateHedgeRecommendations(): HedgeRecommendation[] {
    const tailMetrics = this.calculateTailRiskMetrics();
    const recommendations: HedgeRecommendation[] = [];

    // 1. プットオプションヘッジ
    if (tailMetrics.tailRisk > 0.05 || tailMetrics.kurtosis > 3) {
      const putHedge = this.recommendPutOptionHedge(tailMetrics);
      recommendations.push(putHedge);
    }

    // 2. VIX先物ヘッジ
    if (tailMetrics.skewness < -0.5 || tailMetrics.probabilityOfTailEvent > 0.05) {
      const vixHedge = this.recommendVIXFuturesHedge(tailMetrics);
      recommendations.push(vixHedge);
    }

    // 3. インバースETFヘッジ
    if (this.portfolio.totalValue > 100000 && tailMetrics.tailRisk > 0.03) {
      const inverseHedge = this.recommendInverseETFHedge(tailMetrics);
      recommendations.push(inverseHedge);
    }

    // コストベネフィット比で並べ替え
    return recommendations.sort((a, b) => b.costBenefitRatio - a.costBenefitRatio);
  }

  /**
   * プットオプションヘッジを推奨
   */
  private recommendPutOptionHedge(metrics: TailRiskMetrics): HedgeRecommendation {
    // ヘッジ比率を計算（テールリスクに基づく）
    const hedgeRatio = Math.min(0.3, metrics.tailRisk * 4); // 最大30%

    // プットオプションのコスト推定（市場価格の2-5%）
    const optionCost = this.portfolio.totalValue * hedgeRatio * 0.03;

    // 期待される保護（テールイベントでの損失軽減）
    const expectedProtection = metrics.maxExpectedLoss * hedgeRatio;

    // ブレークイーブン（オプションコストを回収するための市場変動）
    const breakEvenMove = (optionCost / this.portfolio.totalValue) * 100;

    const strategy: HedgeStrategy = {
      type: 'put_option',
      symbol: 'SPY_PUT', // S&P 500 プットオプション
      quantity: Math.floor(this.portfolio.totalValue * hedgeRatio / 100), // 仮の計算
      cost: optionCost,
      expectedProtection: expectedProtection * 100,
      breakEvenMove
    };

    const costBenefitRatio = expectedProtection / optionCost;

    return {
      strategy,
      rationale: `テールリスク ${(metrics.tailRisk * 100).toFixed(2)}% と尖度 ${metrics.kurtosis.toFixed(2)} により、プットオプションヘッジを推奨。市場が ${breakEvenMove.toFixed(1)}% 以上下落した場合に有効。`,
      costBenefitRatio,
      implementationPriority: metrics.tailRisk > 0.08 ? 'high' : 'medium',
      hedgeRatio
    };
  }

  /**
   * VIX先物ヘッジを推奨
   */
  private recommendVIXFuturesHedge(metrics: TailRiskMetrics): HedgeRecommendation {
    // VIXヘッジ比率（負の歪度が大きいほど高い）
    const hedgeRatio = Math.min(0.15, Math.abs(metrics.skewness) * 0.1);

    // VIX先物のコスト（ロールコストとプレミアム）
    const vixCost = this.portfolio.totalValue * hedgeRatio * 0.05;

    // 期待される保護
    const expectedProtection = metrics.maxExpectedLoss * hedgeRatio * 1.5; // VIXは市場暴落時に急騰

    const breakEvenMove = 15; // VIXが15%以上上昇で利益

    const strategy: HedgeStrategy = {
      type: 'vix_futures',
      symbol: 'VIX',
      quantity: Math.floor(this.portfolio.totalValue * hedgeRatio / 1000), // 1契約あたり1000倍数
      cost: vixCost,
      expectedProtection: expectedProtection * 100,
      breakEvenMove
    };

    const costBenefitRatio = expectedProtection / vixCost;

    return {
      strategy,
      rationale: `負の歪度 ${metrics.skewness.toFixed(2)} により、VIXヘッジを推奨。ボラティリティ急騰時に効果的。コンタンゴによるロールコストに注意。`,
      costBenefitRatio,
      implementationPriority: Math.abs(metrics.skewness) > 1.0 ? 'high' : 'medium',
      hedgeRatio
    };
  }

  /**
   * インバースETFヘッジを推奨
   */
  private recommendInverseETFHedge(metrics: TailRiskMetrics): HedgeRecommendation {
    // インバースETFヘッジ比率
    const hedgeRatio = Math.min(0.2, metrics.tailRisk * 3);

    // インバースETFのコスト（管理費用と追跡誤差）
    const inverseCost = this.portfolio.totalValue * hedgeRatio * 0.01;

    // 期待される保護
    const expectedProtection = metrics.maxExpectedLoss * hedgeRatio * 0.8; // 完全な逆相関ではない

    const breakEvenMove = 1; // 市場が1%下落で効果発揮

    const strategy: HedgeStrategy = {
      type: 'inverse_etf',
      symbol: 'SH', // ProShares Short S&P500
      quantity: Math.floor((this.portfolio.totalValue * hedgeRatio) / 50), // 仮の価格50ドル
      cost: inverseCost,
      expectedProtection: expectedProtection * 100,
      breakEvenMove
    };

    const costBenefitRatio = expectedProtection / inverseCost;

    return {
      strategy,
      rationale: `テールリスク ${(metrics.tailRisk * 100).toFixed(2)}% に対し、インバースETFによる短期ヘッジを推奨。長期保有には不向き（減価リスク）。`,
      costBenefitRatio,
      implementationPriority: metrics.tailRisk > 0.1 ? 'high' : 'low',
      hedgeRatio
    };
  }

  /**
   * ヘッジのパフォーマンスを評価
   */
  evaluateHedgePerformance(
    hedge: HedgeStrategy,
    actualMarketMove: number
  ): HedgePerformance {
    let protectionProvided = 0;

    switch (hedge.type) {
      case 'put_option':
        // プットオプションは行使価格以下で価値を持つ
        if (actualMarketMove < -hedge.breakEvenMove) {
          protectionProvided = Math.abs(actualMarketMove + hedge.breakEvenMove) * 
                              this.portfolio.totalValue / 100;
        }
        break;

      case 'vix_futures':
        // VIXは市場下落時に上昇（通常2-3倍）
        if (actualMarketMove < -5) {
          const vixGain = Math.abs(actualMarketMove) * 2.5;
          protectionProvided = vixGain * hedge.quantity * 10; // 簡略化
        }
        break;

      case 'inverse_etf':
        // インバースETFは市場と逆方向
        if (actualMarketMove < 0) {
          protectionProvided = Math.abs(actualMarketMove) * 
                              hedge.quantity * 50 * 0.95; // 追跡誤差考慮
        }
        break;
    }

    const returnImpact = ((protectionProvided - hedge.cost) / this.portfolio.totalValue) * 100;
    const efficiency = protectionProvided / hedge.cost;

    return {
      hedgeCost: hedge.cost,
      protectionProvided,
      returnImpact,
      efficiency
    };
  }

  /**
   * 最適なヘッジポートフォリオを構築
   */
  buildOptimalHedgePortfolio(
    maxHedgeCost: number
  ): HedgeStrategy[] {
    const recommendations = this.generateHedgeRecommendations();
    const selectedHedges: HedgeStrategy[] = [];
    let totalCost = 0;

    // 貪欲法：コストベネフィット比が高い順に選択
    for (const rec of recommendations) {
      if (totalCost + rec.strategy.cost <= maxHedgeCost) {
        selectedHedges.push(rec.strategy);
        totalCost += rec.strategy.cost;
      }
    }

    return selectedHedges;
  }

  /**
   * リターンデータを更新
   */
  updateReturns(returns: number[]): void {
    this.returns = returns;
    if (returns.length > 0) {
      this.volatility = this.calculateStdDev(returns);
    }
  }

  /**
   * ポートフォリオを更新
   */
  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * 歪度を計算
   */
  private calculateSkewness(): number {
    if (this.returns.length < 3) return 0;

    const mean = this.calculateMean(this.returns);
    const stdDev = this.calculateStdDev(this.returns);

    if (stdDev === 0) return 0;

    const n = this.returns.length;
    const skewSum = this.returns.reduce((sum, r) => {
      return sum + Math.pow((r - mean) / stdDev, 3);
    }, 0);

    return (n / ((n - 1) * (n - 2))) * skewSum;
  }

  /**
   * 尖度を計算
   */
  private calculateKurtosis(): number {
    if (this.returns.length < 4) return 0;

    const mean = this.calculateMean(this.returns);
    const stdDev = this.calculateStdDev(this.returns);

    if (stdDev === 0) return 0;

    const n = this.returns.length;
    const kurtSum = this.returns.reduce((sum, r) => {
      return sum + Math.pow((r - mean) / stdDev, 4);
    }, 0);

    // Excess kurtosis (normal distribution has kurtosis of 3)
    return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum - 
           (3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3)));
  }

  /**
   * テールイベントの確率を推定
   */
  private estimateTailEventProbability(): number {
    if (this.returns.length < 20) return 0.01;

    const mean = this.calculateMean(this.returns);
    const stdDev = this.calculateStdDev(this.returns);

    if (stdDev === 0) return 0;

    // 3シグマイベント（正規分布で約0.3%の確率）の発生頻度を測定
    // 3標準偏差以下の極端な負のリターンをカウント
    const threeSigmaThreshold = mean - 3 * stdDev;
    const tailEvents = this.returns.filter(r => r < threeSigmaThreshold).length;

    return tailEvents / this.returns.length;
  }

  /**
   * 平均を計算
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * 標準偏差を計算
   */
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);

    return Math.sqrt(variance);
  }

  /**
   * デフォルトメトリクスを取得
   */
  private getDefaultMetrics(): TailRiskMetrics {
    return {
      tailRisk: 0.05,
      skewness: 0,
      kurtosis: 0,
      maxExpectedLoss: 0.1,
      probabilityOfTailEvent: 0.01
    };
  }
}

export const createTailRiskHedging = (portfolio: Portfolio): TailRiskHedging => {
  return new TailRiskHedging(portfolio);
};
