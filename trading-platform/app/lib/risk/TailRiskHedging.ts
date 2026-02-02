/**
 * TailRiskHedging.ts
 *
 * TRADING-028: テイルリスクヘッジ戦略
 * オプション戦略、逆相関資産、ポートフォリオ保護のための
 * 高度なヘッジシステム
 */

import { Position, Portfolio } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface HedgeStrategy {
  id: string;
  name: string;
  type: 'options' | 'inverse_etf' | 'futures' | 'correlation';
  description: string;
  cost: number; // ヘッジコスト（ドル）
  protectionLevel: number; // 保護レベル (%)
  effectiveness: number; // 効果性スコア (0-100)
  recommendation: 'highly_recommended' | 'recommended' | 'optional' | 'not_recommended';
}

export interface OptionsHedge {
  type: 'protective_put' | 'collar' | 'put_spread' | 'call_spread' | 'iron_condor' | 'butterfly';
  underlying: string;
  strike: number;
  expiration: Date;
  premium: number;
  contracts: number;
  protectionPercent: number;
  maxLoss: number;
  breakEven: number;
}

export interface InverseAssetHedge {
  symbol: string;
  name: string;
  correlation: number; // ポートフォリオとの相関（負の値）
  allocation: number; // 推奨配分 (%)
  liquidity: number; // 流動性スコア (0-100)
  expenseRatio: number; // 経費率 (%)
}

export interface FuturesHedge {
  symbol: string;
  contractSize: number;
  contracts: number;
  margin: number;
  hedgeRatio: number;
  expiration: Date;
}

export interface TailRiskMetrics {
  skewness: number; // 歪度
  kurtosis: number; // 尖度
  tailRisk: number; // テイルリスクスコア (0-1)
  expectedShortfall: number; // 期待ショート額
  maxDrawdownRisk: number; // 最大ドローダウンリスク
  blackSwanProbability: number; // ブラックスワン確率
}

export interface HedgeRecommendation {
  strategy: HedgeStrategy;
  options?: OptionsHedge[];
  inverseAssets?: InverseAssetHedge[];
  futures?: FuturesHedge[];
  reasoning: string[];
  riskReduction: number; // リスク削減率 (%)
  costBenefitRatio: number; // コストベネフィット比率
  implementationSteps: string[];
}

export interface HedgePortfolio {
  currentHedges: Position[];
  hedgeCost: number;
  hedgeCoverage: number; // カバレッジ率 (%)
  hedgeEffectiveness: number; // 効果性 (0-100)
  netPortfolioValue: number;
}

// ============================================================================
// TailRiskHedging Class
// ============================================================================

export class TailRiskHedging {
  private portfolio: Portfolio;
  private availableOptions: Map<string, OptionsHedge[]> = new Map();
  private availableInverseAssets: InverseAssetHedge[] = [];
  private availableFutures: FuturesHedge[] = [];

  constructor(portfolio: Portfolio) {
    this.portfolio = portfolio;
    this.initializeAvailableHedges();
  }

  /**
   * 包括的なヘッジ推奨を生成
   */
  generateHedgeRecommendations(): HedgeRecommendation[] {
    const recommendations: HedgeRecommendation[] = [];

    // テイルリスクを計算
    const tailRisk = this.calculateTailRiskMetrics();

    // 保護プット戦略
    const protectivePut = this.recommendProtectivePut(tailRisk);
    if (protectivePut) {
      recommendations.push(protectivePut);
    }

    // コラー戦略
    const collar = this.recommendCollar(tailRisk);
    if (collar) {
      recommendations.push(collar);
    }

    // プットスプレッド戦略
    const putSpread = this.recommendPutSpread(tailRisk);
    if (putSpread) {
      recommendations.push(putSpread);
    }

    // 逆相関ETF
    const inverseETF = this.recommendInverseETF(tailRisk);
    if (inverseETF) {
      recommendations.push(inverseETF);
    }

    // 先物ヘッジ
    const futuresHedge = this.recommendFuturesHedge(tailRisk);
    if (futuresHedge) {
      recommendations.push(futuresHedge);
    }

    // 効果性順にソート
    return recommendations.sort((a, b) => b.riskReduction - a.riskReduction);
  }

  /**
   * テイルリスクメトリクスを計算
   */
  calculateTailRiskMetrics(): TailRiskMetrics {
    const returns = this.getPortfolioReturns();

    if (returns.length < 30) {
      return {
        skewness: 0,
        kurtosis: 3,
        tailRisk: 0.5,
        expectedShortfall: this.portfolio.totalValue * 0.1,
        maxDrawdownRisk: 0.2,
        blackSwanProbability: 0.01,
      };
    }

    // 歪度を計算
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;

    // 尖度を計算
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length;

    // テイルリスクスコア
    const negativeReturns = returns.filter(r => r < 0);
    const tailRisk = negativeReturns.length > 0
      ? Math.abs(negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length) / stdDev
      : 0;

    // 期待ショート額 (95% CVaR)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(returns.length * 0.05);
    const tailReturns = sortedReturns.slice(0, varIndex);
    const expectedShortfall = tailReturns.length > 0
      ? Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length) * this.portfolio.totalValue
      : this.portfolio.totalValue * 0.05;

    // 最大ドローダウンリスク
    const maxDrawdownRisk = Math.abs(sortedReturns[0]) * 3;

    // ブラックスワン確率（歪度と尖度から推定）
    const blackSwanProbability = Math.max(0.001, Math.min(0.1,
      (Math.abs(skewness) + Math.max(0, kurtosis - 3)) / 100
    ));

    return {
      skewness,
      kurtosis,
      tailRisk: Math.min(1, tailRisk),
      expectedShortfall,
      maxDrawdownRisk,
      blackSwanProbability,
    };
  }

  /**
   * 保護プット推奨
   */
  private recommendProtectivePut(tailRisk: TailRiskMetrics): HedgeRecommendation | null {
    if (this.portfolio.positions.length === 0) {
      return null;
    }

    const options: OptionsHedge[] = [];
    const reasoning: string[] = [];
    let totalCost = 0;
    let totalProtection = 0;

    for (const position of this.portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;

      // ATMプットを推奨
      const strike = position.currentPrice * 0.95; // 5% OTM
      const premium = position.currentPrice * 0.02; // 推定プレミアム（2%）
      const contracts = Math.ceil(position.quantity / 100);

      const option: OptionsHedge = {
        type: 'protective_put',
        underlying: position.symbol,
        strike,
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日
        premium,
        contracts,
        protectionPercent: 5,
        maxLoss: premium,
        breakEven: position.currentPrice - premium,
      };

      options.push(option);
      totalCost += premium * contracts * 100;
      totalProtection += positionValue * 0.05;
    }

    const riskReduction = Math.min(50, tailRisk.tailRisk * 100);
    const costBenefitRatio = totalProtection / totalCost;

    reasoning.push(
      `テイルリスクスコア: ${(tailRisk.tailRisk * 100).toFixed(1)}%`,
      `保護レベル: 5%ダウンサイド`,
      `コスト: $${totalCost.toFixed(2)}`,
      `想定保護額: $${totalProtection.toFixed(2)}`
    );

    if (tailRisk.tailRisk > 0.3) {
      reasoning.push('高いテイルリスク - 保護強く推奨');
    }

    const strategy: HedgeStrategy = {
      id: 'protective-put',
      name: 'Protective Put Strategy',
      type: 'options',
      description: '各ポジションにプットオプションを購入してダウンサイドリスクをヘッジ',
      cost: totalCost,
      protectionLevel: 5,
      effectiveness: 85,
      recommendation: tailRisk.tailRisk > 0.3 ? 'highly_recommended' : 'recommended',
    };

    return {
      strategy,
      options,
      reasoning,
      riskReduction,
      costBenefitRatio,
      implementationSteps: [
        '1. 各ポジションに対して95ストライクのプットオプションを購入',
        '2. 満期は30日',
        '3. 必要コントラクト数を計算して注文',
      ],
    };
  }

  /**
   * コラー戦略推奨
   */
  private recommendCollar(tailRisk: TailRiskMetrics): HedgeRecommendation | null {
    if (this.portfolio.positions.length === 0) {
      return null;
    }

    const options: OptionsHedge[] = [];
    const reasoning: string[] = [];
    let totalCost = 0;
    let totalProtection = 0;

    for (const position of this.portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;

      // コラー: プットを買い、コールを売る
      const putStrike = position.currentPrice * 0.95;
      const callStrike = position.currentPrice * 1.05;
      const putPremium = position.currentPrice * 0.02;
      const callPremium = position.currentPrice * 0.015; // コールプレミアムでプットコストを一部相殺
      const netPremium = putPremium - callPremium;
      const contracts = Math.ceil(position.quantity / 100);

      const putOption: OptionsHedge = {
        type: 'collar',
        underlying: position.symbol,
        strike: putStrike,
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        premium: netPremium,
        contracts,
        protectionPercent: 5,
        maxLoss: netPremium,
        breakEven: position.currentPrice - netPremium,
      };

      options.push(putOption);
      totalCost += netPremium * contracts * 100;
      totalProtection += positionValue * 0.05;
    }

    const riskReduction = Math.min(45, tailRisk.tailRisk * 90);
    const costBenefitRatio = totalProtection / Math.max(0.01, totalCost);

    reasoning.push(
      'プット購入とコール売却の組み合わせ',
      `正味コスト: $${totalCost.toFixed(2)} (保護プットより低コスト)`,
      `アップサイドは5%で制限`,
      `想定保護額: $${totalProtection.toFixed(2)}`
    );

    const strategy: HedgeStrategy = {
      id: 'collar',
      name: 'Collar Strategy',
      type: 'options',
      description: 'プット購入とコール売却を組み合わせてヘッジコストを削減',
      cost: totalCost,
      protectionLevel: 5,
      effectiveness: 75,
      recommendation: tailRisk.tailRisk > 0.25 ? 'recommended' : 'optional',
    };

    return {
      strategy,
      options,
      reasoning,
      riskReduction,
      costBenefitRatio,
      implementationSteps: [
        '1. 各ポジションに対して95プットを購入',
        '2. 同時に105コールを売却',
        '3. 満期は30日',
        '4. 正味コストが最小になるようにストライクを調整',
      ],
    };
  }

  /**
   * プットスプレッド推奨
   */
  private recommendPutSpread(tailRisk: TailRiskMetrics): HedgeRecommendation | null {
    if (this.portfolio.positions.length === 0) {
      return null;
    }

    const options: OptionsHedge[] = [];
    const reasoning: string[] = [];
    let totalCost = 0;
    let totalProtection = 0;

    for (const position of this.portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;

      // ベアプットスプレッド: 高いストライクのプットを買い、低いストライクのプットを売る
      const longStrike = position.currentPrice * 0.95;
      const shortStrike = position.currentPrice * 0.90;
      const longPremium = position.currentPrice * 0.02;
      const shortPremium = position.currentPrice * 0.01;
      const netPremium = longPremium - shortPremium;
      const contracts = Math.ceil(position.quantity / 100);

      const option: OptionsHedge = {
        type: 'put_spread',
        underlying: position.symbol,
        strike: longStrike,
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        premium: netPremium,
        contracts,
        protectionPercent: 5,
        maxLoss: netPremium,
        breakEven: position.currentPrice - netPremium,
      };

      options.push(option);
      totalCost += netPremium * contracts * 100;
      totalProtection += positionValue * 0.05;
    }

    const riskReduction = Math.min(40, tailRisk.tailRisk * 80);
    const costBenefitRatio = totalProtection / Math.max(0.01, totalCost);

    reasoning.push(
      'ベアプットスプレッドによる部分的保護',
      `コスト: $${totalCost.toFixed(2)} (最も安価)`,
      `保護範囲: 95-90%`,
      `想定保護額: $${totalProtection.toFixed(2)}`
    );

    const strategy: HedgeStrategy = {
      id: 'put-spread',
      name: 'Bear Put Spread',
      type: 'options',
      description: 'プットスプレッドでヘッジコストを最小化',
      cost: totalCost,
      protectionLevel: 5,
      effectiveness: 65,
      recommendation: 'optional',
    };

    return {
      strategy,
      options,
      reasoning,
      riskReduction,
      costBenefitRatio,
      implementationSteps: [
        '1. 95プットを購入',
        '2. 90プットを売却',
        '3. 満期は30日',
        '4. ネットデビットが最小になるように構成',
      ],
    };
  }

  /**
   * 逆相関ETF推奨
   */
  private recommendInverseETF(tailRisk: TailRiskMetrics): HedgeRecommendation | null {
    const inverseAssets = this.getAvailableInverseAssets();
    const reasoning: string[] = [];
    let totalAllocation = 0;
    let totalCost = 0;

    // ポートフォリオのベータを推定
    const portfolioBeta = this.estimatePortfolioBeta();

    // 推奨配分を計算
    const recommendedAllocation = Math.min(10, tailRisk.tailRisk * 20); // 最大10%

    const selectedAssets = inverseAssets.slice(0, 2); // 上位2つを選択

    for (const asset of selectedAssets) {
      asset.allocation = recommendedAllocation / selectedAssets.length;
      totalAllocation += asset.allocation;
      totalCost += this.portfolio.totalValue * (asset.allocation / 100) * (asset.expenseRatio / 100);
    }

    const riskReduction = Math.min(35, portfolioBeta * recommendedAllocation * 3);
    const costBenefitRatio = riskReduction / Math.max(0.01, totalCost);

    reasoning.push(
      `ポートフォリオベータ: ${portfolioBeta.toFixed(2)}`,
      `推奨配分: ${totalAllocation.toFixed(1)}%`,
      `年間コスト: $${totalCost.toFixed(2)}`,
      'オプションのような時間減衰なし',
      '継続的な保護を提供'
    );

    const strategy: HedgeStrategy = {
      id: 'inverse-etf',
      name: 'Inverse ETF Hedge',
      type: 'inverse_etf',
      description: '逆相関ETFで市場下落に備える',
      cost: totalCost,
      protectionLevel: totalAllocation,
      effectiveness: 70,
      recommendation: tailRisk.blackSwanProbability > 0.02 ? 'recommended' : 'optional',
    };

    return {
      strategy,
      inverseAssets: selectedAssets,
      reasoning,
      riskReduction,
      costBenefitRatio,
      implementationSteps: [
        '1. 逆相関ETFを調査',
        '2. ポートフォリオの5-10%を配分',
        '3. 定期的にリバランス',
        '4. 経費率を考慮',
      ],
    };
  }

  /**
   * 先物ヘッジ推奨
   */
  private recommendFuturesHedge(tailRisk: TailRiskMetrics): HedgeRecommendation | null {
    // 大規模ポートフォリオの場合のみ推奨
    if (this.portfolio.totalValue < 100000) {
      return null;
    }

    const reasoning: string[] = [];
    const portfolioBeta = this.estimatePortfolioBeta();

    // S&P 500先物でヘッジ
    const spxValue = this.portfolio.totalValue * portfolioBeta;
    const contractSize = 250; // E-mini S&P 500
    const contracts = Math.floor(spxValue / (contractSize * 5000)); // 仮の指数価格
    const margin = contracts * 5000; // 仮の証拠金

    const futures: FuturesHedge = {
      symbol: 'ES', // E-mini S&P 500
      contractSize,
      contracts,
      margin,
      hedgeRatio: portfolioBeta,
      expiration: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 四半期先物
    };

    const riskReduction = Math.min(50, portfolioBeta * 50);
    const costBenefitRatio = riskReduction / (margin * 0.01); // 資本効率を考慮

    reasoning.push(
      '先物契約による効率的なヘッジ',
      `必要コントラクト: ${contracts}`,
      `証拠金: $${margin.toFixed(2)}`,
      `ヘッジ比率: ${portfolioBeta.toFixed(2)}`,
      '高流動性、低コスト'
    );

    const strategy: HedgeStrategy = {
      id: 'futures-hedge',
      name: 'Futures Hedge',
      type: 'futures',
      description: '指数先物でポートフォリオをヘッジ',
      cost: margin * 0.01, // 資本コスト
      protectionLevel: 20,
      effectiveness: 90,
      recommendation: tailRisk.tailRisk > 0.4 ? 'highly_recommended' : 'recommended',
    };

    return {
      strategy,
      futures: [futures],
      reasoning,
      riskReduction,
      costBenefitRatio,
      implementationSteps: [
        '1. ポートフォリオのベータを計算',
        '2. 必要先物コントラクト数を決定',
        '3. 証拠金を確保',
        '4. ショートポジションを確立',
        '5. 定期的にロールオーバー',
      ],
    };
  }

  /**
   * 現在のヘッジポートフォリオを取得
   */
  getCurrentHedgePortfolio(): HedgePortfolio {
    // ヘッジポジションをフィルタリング
    const currentHedges = this.portfolio.positions.filter(p =>
      p.symbol.includes('PUT') ||
      p.symbol.includes('CALL') ||
      p.symbol.includes('INV') ||
      p.symbol.includes('FUT')
    );

    let hedgeCost = 0;
    let hedgeCoverage = 0;

    for (const hedge of currentHedges) {
      hedgeCost += hedge.avgPrice * hedge.quantity;
      hedgeCoverage += (hedge.currentPrice * hedge.quantity);
    }

    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;
    const hedgeEffectiveness = Math.min(100, (hedgeCoverage / portfolioValue) * 150);
    const netPortfolioValue = portfolioValue - hedgeCost;

    return {
      currentHedges,
      hedgeCost,
      hedgeCoverage: (hedgeCoverage / portfolioValue) * 100,
      hedgeEffectiveness,
      netPortfolioValue,
    };
  }

  /**
   * 利用可能な逆相関資産を取得
   */
  private getAvailableInverseAssets(): InverseAssetHedge[] {
    // 実際の実装ではデータベースやAPIから取得
    return [
      {
        symbol: 'SH',
        name: 'ProShares Short S&P500',
        correlation: -0.95,
        allocation: 0,
        liquidity: 95,
        expenseRatio: 0.89,
      },
      {
        symbol: 'SDS',
        name: 'ProShares UltraShort S&P500',
        correlation: -0.90,
        allocation: 0,
        liquidity: 90,
        expenseRatio: 0.90,
      },
      {
        symbol: 'SPXU',
        name: 'ProShares UltraPro Short S&P500',
        correlation: -0.85,
        allocation: 0,
        liquidity: 85,
        expenseRatio: 0.91,
      },
    ];
  }

  /**
   * ポートフォリオベータを推定
   */
  private estimatePortfolioBeta(): number {
    // 簡略化されたベータ推定
    // 実際の実装では回帰分析が必要
    let weightedBeta = 0;
    const totalValue = this.portfolio.totalValue + this.portfolio.cash;

    if (totalValue === 0) return 1;

    for (const position of this.portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;
      const weight = positionValue / totalValue;

      // 産業別に推定ベータを割り当て
      let beta = 1;
      if (position.symbol.match(/^(AAPL|MSFT|GOOGL|META)$/)) {
        beta = 1.2; // テック
      } else if (position.symbol.match(/^(JPM|BAC|WFC)$/)) {
        beta = 1.1; // 金融
      } else if (position.symbol.match(/^(JNJ|PFE|UNH)$/)) {
        beta = 0.8; // ヘルスケア
      } else if (position.symbol.match(/^(XOM|CVX)$/)) {
        beta = 0.9; // エネルギー
      }

      weightedBeta += weight * beta;
    }

    return weightedBeta;
  }

  /**
   * ポートフォリオリターンを取得
   */
  private getPortfolioReturns(): number[] {
    // 簡略化のためダミーデータを返す
    // 実際の実装では履歴データから計算
    const returns: number[] = [];
    for (let i = 0; i < 100; i++) {
      returns.push((Math.random() - 0.5) * 0.02);
    }
    return returns;
  }

  /**
   * 利用可能なヘッジを初期化
   */
  private initializeAvailableHedges(): void {
    // 逆相関資産
    this.availableInverseAssets = this.getAvailableInverseAssets();
  }

  /**
   * ポートフォリオを更新
   */
  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTailRiskHedging(portfolio: Portfolio): TailRiskHedging {
  return new TailRiskHedging(portfolio);
}

export default TailRiskHedging;
