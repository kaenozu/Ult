/**
 * MonteCarloSimulator.ts
 *
 * モンテカルロシミュレーター
 * 1000回以上のランダム化により、戦略の確率的パフォーマンスを評価します。
 * 信頼区間、確率分布、リスク評価を提供します。
 */

import { EventEmitter } from 'events';
import { BacktestResult, BacktestConfig, PerformanceMetrics } from './AdvancedBacktestEngine';
import { BacktestTrade } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface MonteCarloConfig {
  // シミュレーション回数
  numSimulations: number;

  // 乱数シード（再現性のため）
  randomSeed?: number;

  // シミュレーション方法
  method: 'trade_shuffling' | 'resampling' | 'bootstrap';
  
  // Alternative method name for compatibility
  resampleMethod?: 'bootstrap' | 'trade_shuffling' | 'resampling';

  // コンフィデンスレベル
  confidenceLevel: 0.90 | 0.95 | 0.99;

  // 評価指標
  metrics: MonteCarloMetrics[];

  // 並列実行
  parallelRuns: number;

  // 詳細ログ
  verbose: boolean;
}

export type MonteCarloMetrics = keyof PerformanceMetrics;

export interface MonteCarloResult {
  // 元のバックテスト結果
  originalResult: BacktestResult;

  // シミュレーション結果
  simulations: BacktestResult[];

  // 確率統計
  probabilities: MonteCarloProbabilities;

  // 信頼区間
  confidenceIntervals: MonteCarloConfidenceIntervals;

  // 分布統計
  distributionStats: Map<MonteCarloMetrics, DistributionStatistics>;

  // リスク評価
  riskAssessment: MonteCarloRiskAssessment;

  // パフォーマンスランキング
  rankings: MonteCarloRankings;

  // シミュレーション設定
  config: MonteCarloConfig;
}

export interface MonteCarloProbabilities {
  // 黒字になる確率（%）
  probabilityOfProfit: number;

  // 特定のリターンを超える確率
  returnThresholds: Map<number, number>; // threshold -> probability

  // 最大ドローダウンが閾値を超える確率
  drawdownThresholds: Map<number, number>; // threshold -> probability

  // シャープレシオが閾値を超える確率
  sharpeThresholds: Map<number, number>; // threshold -> probability
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  range: number;
}

export interface MetricConfidenceIntervals {
  returns: ConfidenceInterval;
  sharpe: ConfidenceInterval;
  drawdown: ConfidenceInterval;
}

export interface MonteCarloConfidenceIntervals {
  confidence90: MetricConfidenceIntervals;
  confidence95: MetricConfidenceIntervals;
  confidence99: MetricConfidenceIntervals;
}

export interface DistributionStatistics {
  // 平均値
  mean: number;

  // 中央値
  median: number;

  // 標準偏差
  stdDev: number;

  // 最小値
  min: number;

  // 最大値
  max: number;

  // パーセンタイル
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    p95: number;
  };

  // 歪度
  skewness: number;

  // 尖度
  kurtosis: number;
}

export interface MonteCarloRiskAssessment {
  // VaR (Value at Risk)
  var95: number; // 95% VaR
  var99: number; // 99% VaR

  // CVaR (Conditional Value at Risk)
  cvar95: number; // 95% CVaR
  cvar99: number; // 99% CVaR

  // 破産確率（資金が50%以下になる確率）
  ruinProbability: number;

  // 目標達成確率
  goalProbability: Map<number, number>; // goal -> probability

  // リスクスコア（0-100、100が最も安全）
  riskScore: number;

  // リスクカテゴリ
  riskCategory: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
}

export interface MonteCarloRankings {
  // ベスト10シミュレーション
  top10: BacktestResult[];

  // ワースト10シミュレーション
  bottom10: BacktestResult[];

  // 元の結果のパーセンタイル順位
  originalRanking: number;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_MONTE_CARLO_CONFIG: MonteCarloConfig = {
  numSimulations: 1000,
  method: 'trade_shuffling',
  confidenceLevel: 0.95,
  metrics: ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'winRate'],
  parallelRuns: 1,
  verbose: false,
};

// ============================================================================
// Monte Carlo Simulator
// ============================================================================

export class MonteCarloSimulator extends EventEmitter {
  private config: MonteCarloConfig;
  private randomSeed: number;

  constructor(config: Partial<MonteCarloConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MONTE_CARLO_CONFIG, ...config };
    this.randomSeed = config.randomSeed || Date.now();
  }

  /**
   * モンテカルロシミュレーションを実行
   */
  async runSimulation(originalResult: BacktestResult): Promise<MonteCarloResult> {

    this.emit('start', { numSimulations: this.config.numSimulations });

    const simulations: BacktestResult[] = [];

    // シミュレーションを実行
    for (let i = 0; i < this.config.numSimulations; i++) {
      if (this.config.verbose) {
      }

      const simulation = await this.runSingleSimulation(originalResult, i);
      simulations.push(simulation);

      // 進捗を発行
      if ((i + 1) % Math.ceil(this.config.numSimulations / 10) === 0) {
        this.emit('progress', {
          current: i + 1,
          total: this.config.numSimulations,
          percent: Math.round(((i + 1) / this.config.numSimulations) * 100),
        });
      }
    }


    // 統計を計算
    const probabilities = this.calculateProbabilities(originalResult, simulations);
    const confidenceIntervals = this.calculateConfidenceIntervals(simulations);
    const distributionStats = this.calculateDistributionStats(simulations);
    const riskAssessment = this.calculateRiskAssessment(simulations);
    const rankings = this.calculateRankings(originalResult, simulations);

    const result: MonteCarloResult = {
      originalResult,
      simulations,
      probabilities,
      confidenceIntervals,
      distributionStats,
      riskAssessment,
      rankings,
      config: this.config,
    };

    this.emit('complete', result);

    return result;
  }

  /**
   * 単一のシミュレーションを実行
   */
  private async runSingleSimulation(
    originalResult: BacktestResult,
    seedOffset: number
  ): Promise<BacktestResult> {
    // 乱数生成器を初期化
    const rng = this.seededRandom(this.randomSeed + seedOffset);

    // トレードをランダム化
    const shuffledTrades = this.shuffleTrades([...originalResult.trades], rng);

    // 新しいエクイティカーブを構築
    const equityCurve = this.reconstructEquityCurve(
      shuffledTrades,
      originalResult.config.initialCapital
    );

    // メトリクスを再計算
    const metrics = this.calculateMetricsFromEquity(
      equityCurve,
      shuffledTrades,
      originalResult.config
    );

    return {
      ...originalResult,
      trades: shuffledTrades,
      equityCurve,
      metrics,
    };
  }

  /**
   * トレードをシャッフル（トレードシャッフル法）
   */
  private shuffleTrades(trades: BacktestTrade[], rng: () => number): BacktestTrade[] {
    // Fisher-Yates shuffle
    for (let i = trades.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [trades[i], trades[j]] = [trades[j], trades[i]];
    }
    return trades;
  }

  /**
   * シード付き乱数生成器
   */
  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  /**
   * エクイティカーブを再構築
   */
  private reconstructEquityCurve(trades: BacktestTrade[], initialCapital: number): number[] {
    const equityCurve: number[] = [initialCapital];
    let equity = initialCapital;

    for (const trade of trades) {
      equity += trade.pnl;
      equityCurve.push(equity);
    }

    return equityCurve;
  }

  /**
   * エクイティカーブからメトリクスを計算
   */
  private calculateMetricsFromEquity(
    equityCurve: number[],
    trades: BacktestTrade[],
    config: BacktestConfig
  ): PerformanceMetrics {
    const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);

    const totalReturn = ((equityCurve[equityCurve.length - 1] - config.initialCapital) / config.initialCapital) * 100;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    const sharpeRatio = volatility === 0 ? 0 : (avgReturn * 252) / volatility;

    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);

    const winningTrades = trades.filter(t => (t.pnl ?? 0) > 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(trades.filter(t => (t.pnl ?? 0) <= 0).reduce((sum, t) => sum + (t.pnl ?? 0), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      volatility,
      calmarRatio: maxDrawdown === 0 ? 0 : totalReturn / maxDrawdown,
      sortinoRatio: 0,
      annualizedReturn: totalReturn,
      omegaRatio: 0,
      maxDrawdownDuration: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageTrade: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / trades.length : 0,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: trades.length - winningTrades.length,
    };
  }

  /**
   * 最大ドローダウンを計算
   */
  private calculateMaxDrawdown(equityCurve: number[]): number {
    let maxDrawdown = 0;
    let peak = equityCurve[0];

    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  /**
   * 確率を計算
   */
  private calculateProbabilities(
    originalResult: BacktestResult,
    simulations: BacktestResult[]
  ): MonteCarloProbabilities {
    const profitableSimulations = simulations.filter(s => s.metrics.totalReturn > 0).length;
    const probabilityOfProfit = (profitableSimulations / simulations.length) * 100;

    // リターン閾値ごとの確率
    const returnThresholds = new Map<number, number>();
    const thresholds = [-20, -10, 0, 10, 20, 50, 100];
    for (const threshold of thresholds) {
      const count = simulations.filter(s => s.metrics.totalReturn > threshold).length;
      returnThresholds.set(threshold, (count / simulations.length) * 100);
    }

    // ドローダウン閾値ごとの確率
    const drawdownThresholds = new Map<number, number>();
    const ddThresholds = [10, 20, 30, 40, 50];
    for (const threshold of ddThresholds) {
      const count = simulations.filter(s => s.metrics.maxDrawdown > threshold).length;
      drawdownThresholds.set(threshold, (count / simulations.length) * 100);
    }

    // シャープレシオ閾値ごとの確率
    const sharpeThresholds = new Map<number, number>();
    const sharpeLevels = [0, 0.5, 1.0, 1.5, 2.0];
    for (const level of sharpeLevels) {
      const count = simulations.filter(s => s.metrics.sharpeRatio > level).length;
      sharpeThresholds.set(level, (count / simulations.length) * 100);
    }

    return {
      probabilityOfProfit,
      returnThresholds,
      drawdownThresholds,
      sharpeThresholds,
    };
  }

  /**
   * 信頼区間を計算
   */
  private calculateConfidenceIntervals(simulations: BacktestResult[]): MonteCarloConfidenceIntervals {
    const getInterval = (values: number[], level: number): ConfidenceInterval => {
      const sorted = [...values].sort((a, b) => a - b);
      const alpha = (1 - level) / 2;
      const lowerIndex = Math.floor(sorted.length * alpha);
      const upperIndex = Math.ceil(sorted.length * (1 - alpha));
      const lower = sorted[lowerIndex];
      const upper = sorted[upperIndex];
      return { lower, upper, range: upper - lower };
    };

    const returns = simulations.map(s => s.metrics.totalReturn);
    const sharpe = simulations.map(s => s.metrics.sharpeRatio);
    const drawdown = simulations.map(s => s.metrics.maxDrawdown);

    return {
      confidence90: {
        returns: getInterval(returns, 0.90),
        sharpe: getInterval(sharpe, 0.90),
        drawdown: getInterval(drawdown, 0.90),
      },
      confidence95: {
        returns: getInterval(returns, 0.95),
        sharpe: getInterval(sharpe, 0.95),
        drawdown: getInterval(drawdown, 0.95),
      },
      confidence99: {
        returns: getInterval(returns, 0.99),
        sharpe: getInterval(sharpe, 0.99),
        drawdown: getInterval(drawdown, 0.99),
      },
    };
  }

  /**
   * 分布統計を計算
   */
  private calculateDistributionStats(simulations: BacktestResult[]): Map<MonteCarloMetrics, DistributionStatistics> {
    const stats = new Map<MonteCarloMetrics, DistributionStatistics>();

    const calculateStats = (values: number[]): DistributionStatistics => {
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;

      const mean = sorted.reduce((a, b) => a + b, 0) / n;
      const median = sorted[Math.floor(n / 2)];

      const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);

      const min = sorted[0];
      const max = sorted[n - 1];

      // パーセンタイル
      const percentiles = {
        p5: sorted[Math.floor(n * 0.05)],
        p10: sorted[Math.floor(n * 0.10)],
        p25: sorted[Math.floor(n * 0.25)],
        p75: sorted[Math.floor(n * 0.75)],
        p90: sorted[Math.floor(n * 0.90)],
        p95: sorted[Math.floor(n * 0.95)],
      };

      // 歪度と尖度
      const skewness = this.calculateSkewness(sorted);
      const kurtosis = this.calculateKurtosis(sorted);

      return { mean, median, stdDev, min, max, percentiles, skewness, kurtosis };
    };

    // 各メトリクスの統計を計算
    for (const metric of this.config.metrics) {
      const values = simulations.map(s => s.metrics[metric]);
      stats.set(metric, calculateStats(values));
    }

    return stats;
  }

  /**
   * 歪度を計算
   */
  private calculateSkewness(values: number[]): number {
    const n = values.length;
    if (n < 3) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    return values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n;
  }

  /**
   * 尖度を計算
   */
  private calculateKurtosis(values: number[]): number {
    const n = values.length;
    if (n < 4) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    return values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n - 3;
  }

  /**
   * リスク評価を計算
   */
  private calculateRiskAssessment(simulations: BacktestResult[]): MonteCarloRiskAssessment {
    const finalCapitals = simulations.map(s => {
      return s.config.initialCapital * (1 + s.metrics.totalReturn / 100);
    });

    const sortedReturns = simulations.map(s => s.metrics.totalReturn).sort((a, b) => a - b);
    const sortedDrawdowns = simulations.map(s => s.metrics.maxDrawdown).sort((a, b) => a - b);

    // VaR
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var99Index = Math.floor(sortedReturns.length * 0.01);
    const var95 = sortedReturns[var95Index];
    const var99 = sortedReturns[var99Index];

    // CVaR（平均超過損失）
    const cvar95 = sortedReturns.slice(0, var95Index).reduce((a, b) => a + b, 0) / var95Index;
    const cvar99 = sortedReturns.slice(0, var99Index).reduce((a, b) => a + b, 0) / var99Index;

    // 破産確率（資金が50%以下になる確率）
    const ruinProbability = (simulations.filter(s => {
      const finalCapital = s.config.initialCapital * (1 + s.metrics.totalReturn / 100);
      return finalCapital < s.config.initialCapital * 0.5;
    }).length / simulations.length) * 100;

    // 目標達成確率
    const goalProbability = new Map<number, number>();
    const goals = [10, 20, 50, 100];
    for (const goal of goals) {
      const count = simulations.filter(s => s.metrics.totalReturn > goal).length;
      goalProbability.set(goal, (count / simulations.length) * 100);
    }

    // リスクスコア（0-100）
    const avgReturn = sortedReturns.reduce((a, b) => a + b, 0) / sortedReturns.length;
    const avgDrawdown = sortedDrawdowns.reduce((a, b) => a + b, 0) / sortedDrawdowns.length;

    let riskScore = 50; // ベース
    riskScore += (avgReturn / 2); // リターンが高いほど安全
    riskScore -= (avgDrawdown / 2); // ドローダウンが大きいほど危険
    riskScore = Math.max(0, Math.min(100, riskScore));

    // リスクカテゴリ
    let riskCategory: MonteCarloRiskAssessment['riskCategory'];
    if (riskScore >= 80) riskCategory = 'very_low';
    else if (riskScore >= 60) riskCategory = 'low';
    else if (riskScore >= 40) riskCategory = 'medium';
    else if (riskScore >= 20) riskCategory = 'high';
    else riskCategory = 'very_high';

    return {
      var95,
      var99,
      cvar95,
      cvar99,
      ruinProbability,
      goalProbability,
      riskScore,
      riskCategory,
    };
  }

  /**
   * ランキングを計算
   */
  private calculateRankings(
    originalResult: BacktestResult,
    simulations: BacktestResult[]
  ): MonteCarloRankings {
    const sortedByReturn = [...simulations].sort((a, b) => b.metrics.totalReturn - a.metrics.totalReturn);

    const top10 = sortedByReturn.slice(0, 10);
    const bottom10 = sortedByReturn.slice(-10).reverse();

    // 元の結果の順位
    const originalRanking = sortedByReturn.filter(
      s => s.metrics.totalReturn >= originalResult.metrics.totalReturn
    ).length;

    return {
      top10,
      bottom10,
      originalRanking,
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<MonteCarloConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): MonteCarloConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * モンテカルlo結果を要約
 */
export function summarizeMonteCarloResult(result: MonteCarloResult): string {
  const lines: string[] = [];

  lines.push('=== Monte Carlo Simulation Summary ===');
  lines.push(`Simulations: ${result.simulations.length}`);
  lines.push('');

  lines.push('Probability of Profit:');
  lines.push(`  ${result.probabilities.probabilityOfProfit.toFixed(1)}%`);
  lines.push('');

  lines.push('95% Confidence Intervals:');
  lines.push(`  Total Return: ${result.confidenceIntervals.confidence95.returns.lower.toFixed(1)}% to ${result.confidenceIntervals.confidence95.returns.upper.toFixed(1)}%`);
  lines.push(`  Sharpe Ratio: ${result.confidenceIntervals.confidence95.sharpe.lower.toFixed(2)} to ${result.confidenceIntervals.confidence95.sharpe.upper.toFixed(2)}`);
  lines.push(`  Max Drawdown: ${result.confidenceIntervals.confidence95.drawdown.lower.toFixed(1)}% to ${result.confidenceIntervals.confidence95.drawdown.upper.toFixed(1)}%`);
  lines.push('');

  lines.push('Risk Assessment:');
  lines.push(`  Risk Score: ${result.riskAssessment.riskScore.toFixed(0)}/100 (${result.riskAssessment.riskCategory})`);
  lines.push(`  95% VaR: ${result.riskAssessment.var95.toFixed(1)}%`);
  lines.push(`  Ruin Probability: ${result.riskAssessment.ruinProbability.toFixed(1)}%`);
  lines.push('');

  lines.push('Original Result Ranking:');
  lines.push(`  Percentile: ${((1 - result.rankings.originalRanking / result.simulations.length) * 100).toFixed(1)}%`);

  return lines.join('\n');
}

// ============================================================================
// Singleton Export
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<MonteCarloConfig>) => new MonteCarloSimulator(config)
);

export const getGlobalMonteCarloSimulator = getInstance;
export const resetGlobalMonteCarloSimulator = resetInstance;

export default MonteCarloSimulator;
