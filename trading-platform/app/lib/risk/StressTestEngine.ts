/**
 * Stress Test Engine
 * 
 * TRADING-003: ストレステストエンジンの開発
 * 極端な市場シナリオのシミュレーション、最悪ケース分析、Monte Carlo シミュレーション
 */

import { Position, Portfolio } from '@/app/types';
import {
  StressScenario,
  StressTestResult,
  MonteCarloConfig,
  MonteCarloResult
} from '@/app/types/risk';

export class StressTestEngine {
  private portfolio: Portfolio;
  private historicalReturns: Map<string, number[]> = new Map();
  private historicalVolatility: Map<string, number> = new Map();

  constructor(portfolio: Portfolio) {
    this.portfolio = portfolio;
  }

  /**
   * ストレステストを実行
   */
  runStressTest(scenario: StressScenario): StressTestResult {
    const positionImpacts = this.portfolio.positions.map(position => {
      const impact = this.calculatePositionImpact(position, scenario);
      const positionValue = position.currentPrice * position.quantity;
      const impactPercent = (impact / positionValue) * 100;

      return {
        symbol: position.symbol,
        impact,
        impactPercent
      };
    });

    const portfolioImpact = positionImpacts.reduce(
      (sum, impact) => sum + impact.impact,
      0
    );
    const portfolioImpactPercent = (portfolioImpact / this.portfolio.totalValue) * 100;

    // シナリオ下でのリスク指標を計算
    const adjustedReturns = this.adjustReturnsForScenario(scenario);
    const var95 = this.calculateVaR(adjustedReturns, 0.95);
    const cvar95 = this.calculateCVaR(adjustedReturns, 0.95);
    const maxDrawdown = this.calculateMaxDrawdown(adjustedReturns);

    return {
      scenario,
      portfolioImpact,
      portfolioImpactPercent,
      maxDrawdown,
      var95,
      cvar95,
      positionImpacts
    };
  }

  /**
   * 複数のストレスシナリオを実行
   */
  runMultipleScenarios(): StressTestResult[] {
    const scenarios = this.getDefaultScenarios();
    return scenarios.map(scenario => this.runStressTest(scenario));
  }

  /**
   * Monte Carlo シミュレーションを実行
   */
  runMonteCarloSimulation(config: MonteCarloConfig): MonteCarloResult {
    const results: number[] = [];

    for (let i = 0; i < config.numSimulations; i++) {
      const simulatedReturn = this.simulatePortfolioReturn(config.timeHorizon);
      results.push(simulatedReturn);
    }

    results.sort((a, b) => a - b);

    const expectedReturn = this.calculateMean(results);
    const standardDeviation = this.calculateStdDev(results);
    const var95 = this.calculateVaR(results, config.confidenceLevel);
    const cvar95 = this.calculateCVaR(results, config.confidenceLevel);

    const probabilityOfProfit = results.filter(r => r > 0).length / results.length;
    const worstCase = results[0];
    const bestCase = results[results.length - 1];

    return {
      expectedReturn,
      standardDeviation,
      var95,
      cvar95,
      probabilityOfProfit,
      worstCase,
      bestCase,
      percentiles: {
        p5: results[Math.floor(results.length * 0.05)],
        p10: results[Math.floor(results.length * 0.10)],
        p25: results[Math.floor(results.length * 0.25)],
        p50: results[Math.floor(results.length * 0.50)],
        p75: results[Math.floor(results.length * 0.75)],
        p90: results[Math.floor(results.length * 0.90)],
        p95: results[Math.floor(results.length * 0.95)]
      }
    };
  }

  /**
   * 最悪ケース分析
   */
  analyzeWorstCase(): {
    worstDayLoss: number;
    worstWeekLoss: number;
    worstMonthLoss: number;
    probabilityOfRuin: number;
  } {
    const dailyReturns = this.calculatePortfolioReturns();

    const worstDayLoss = Math.min(...dailyReturns) * this.portfolio.totalValue;

    // 週次損失を計算
    const weeklyLosses = this.calculateRollingLosses(dailyReturns, 5);
    const worstWeekLoss = Math.min(...weeklyLosses) * this.portfolio.totalValue;

    // 月次損失を計算
    const monthlyLosses = this.calculateRollingLosses(dailyReturns, 20);
    const worstMonthLoss = Math.min(...monthlyLosses) * this.portfolio.totalValue;

    // 破産確率を推定
    const probabilityOfRuin = this.estimateProbabilityOfRuin(dailyReturns);

    return {
      worstDayLoss,
      worstWeekLoss,
      worstMonthLoss,
      probabilityOfRuin
    };
  }

  /**
   * 履歴データを更新
   */
  updateHistoricalData(symbol: string, returns: number[]): void {
    this.historicalReturns.set(symbol, returns);
    this.historicalVolatility.set(symbol, this.calculateStdDev(returns));
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
   * ポジションへの影響を計算
   */
  private calculatePositionImpact(
    position: Position,
    scenario: StressScenario
  ): number {
    const positionValue = position.currentPrice * position.quantity;
    const volatility = this.historicalVolatility.get(position.symbol) || 0.02;

    // シナリオに基づいて影響を計算
    const marketImpact = scenario.marketShock / 100;
    const volatilityImpact = volatility * scenario.volatilityMultiplier;

    const totalImpact = marketImpact + volatilityImpact;

    return positionValue * totalImpact;
  }

  /**
   * シナリオに基づいて収益率を調整
   */
  private adjustReturnsForScenario(scenario: StressScenario): number[] {
    const portfolioReturns = this.calculatePortfolioReturns();

    return portfolioReturns.map(r => {
      const shockAdjustment = scenario.marketShock / 100;
      const volatilityAdjustment = r * scenario.volatilityMultiplier;
      return r + shockAdjustment + volatilityAdjustment;
    });
  }

  /**
   * ポートフォリオ収益率を計算
   */
  private calculatePortfolioReturns(): number[] {
    if (this.portfolio.positions.length === 0) {
      return [];
    }

    const totalValue = this.portfolio.totalValue;
    const weights = this.portfolio.positions.map(
      pos => (pos.currentPrice * pos.quantity) / totalValue
    );

    // 各資産の収益率を取得
    const allReturns = this.portfolio.positions.map(pos =>
      this.historicalReturns.get(pos.symbol) || []
    );

    if (allReturns.some(returns => returns.length === 0)) {
      return [];
    }

    const numPeriods = Math.min(...allReturns.map(r => r.length));
    const portfolioReturns: number[] = [];

    for (let i = 0; i < numPeriods; i++) {
      let periodReturn = 0;
      for (let j = 0; j < this.portfolio.positions.length; j++) {
        periodReturn += allReturns[j][i] * weights[j];
      }
      portfolioReturns.push(periodReturn);
    }

    return portfolioReturns;
  }

  /**
   * ポートフォリオリターンをシミュレート
   */
  private simulatePortfolioReturn(days: number): number {
    let cumulativeReturn = 0;

    for (let i = 0; i < days; i++) {
      const dailyReturn = this.simulateDailyReturn();
      cumulativeReturn += dailyReturn;
    }

    return cumulativeReturn * this.portfolio.totalValue;
  }

  /**
   * 日次リターンをシミュレート
   */
  private simulateDailyReturn(): number {
    const portfolioReturns = this.calculatePortfolioReturns();
    if (portfolioReturns.length === 0) {
      return 0;
    }

    const mean = this.calculateMean(portfolioReturns);
    const stdDev = this.calculateStdDev(portfolioReturns);

    // Box-Muller変換で正規分布に従う乱数を生成
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return mean + z * stdDev;
  }

  /**
   * VaR (Value at Risk) を計算
   */
  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);

    return -sorted[index] * this.portfolio.totalValue;
  }

  /**
   * CVaR (Conditional VaR) を計算
   */
  private calculateCVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, varIndex);

    if (tailReturns.length === 0) return 0;

    const avgTailReturn = this.calculateMean(tailReturns);
    return -avgTailReturn * this.portfolio.totalValue;
  }

  /**
   * 最大ドローダウンを計算
   */
  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const r of returns) {
      cumulative += r;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = (peak - cumulative) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * ローリング損失を計算
   */
  private calculateRollingLosses(returns: number[], window: number): number[] {
    const losses: number[] = [];

    for (let i = 0; i <= returns.length - window; i++) {
      const windowReturns = returns.slice(i, i + window);
      const windowReturn = windowReturns.reduce((sum, r) => sum + r, 0);
      losses.push(windowReturn);
    }

    return losses;
  }

  /**
   * 破産確率を推定
   */
  private estimateProbabilityOfRuin(returns: number[]): number {
    if (returns.length === 0) return 0;

    const mean = this.calculateMean(returns);
    const stdDev = this.calculateStdDev(returns);

    // 簡易的な推定：平均がマイナスで標準偏差が大きい場合、破産確率が高い
    if (mean <= 0) {
      return Math.min(1, Math.abs(mean) / stdDev);
    }

    // 平均がプラスの場合、標準偏差と比較
    return Math.max(0, Math.min(1, (stdDev - mean) / (stdDev + mean)));
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
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * デフォルトのストレスシナリオを取得
   */
  private getDefaultScenarios(): StressScenario[] {
    return [
      {
        name: 'Market Crash',
        description: '2008年金融危機レベルの市場暴落',
        marketShock: -20,
        volatilityMultiplier: 3.0,
        correlationChange: 0.3
      },
      {
        name: 'Flash Crash',
        description: '瞬間的な急落（フラッシュクラッシュ）',
        marketShock: -10,
        volatilityMultiplier: 5.0,
        correlationChange: 0.5
      },
      {
        name: 'Moderate Correction',
        description: '中程度の市場調整',
        marketShock: -10,
        volatilityMultiplier: 1.5,
        correlationChange: 0.1
      },
      {
        name: 'Volatility Spike',
        description: 'ボラティリティの急上昇',
        marketShock: -5,
        volatilityMultiplier: 4.0,
        correlationChange: 0.2
      },
      {
        name: 'Black Swan',
        description: '想定外の極端なイベント',
        marketShock: -30,
        volatilityMultiplier: 10.0,
        correlationChange: 0.8
      }
    ];
  }
}

export const createStressTestEngine = (portfolio: Portfolio): StressTestEngine => {
  return new StressTestEngine(portfolio);
};
