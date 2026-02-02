/**
 * RealisticBacktestOrchestrator.ts
 *
 * リアルなバックテスト統合オーケストレーター
 * スリッページモデル、ウォークフォワード分析、モンテカルロシミュレーションを統合し、
 * 包括的なバックテスト検証を提供します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types';
import { BacktestResult, Strategy, BacktestConfig } from './AdvancedBacktestEngine';
import { SlippageModel, SlippageConfig, estimateLiquidityScore } from './SlippageModel';
import { WalkForwardAnalyzer, WalkForwardConfig, WalkForwardReport } from './WalkForwardAnalyzer';
import { MonteCarloSimulator, MonteCarloConfig, MonteCarloResult } from './MonteCarloSimulator';

// ============================================================================
// Types
// ============================================================================

export interface RealisticBacktestConfig {
  // 基本バックテスト設定
  backtest: BacktestConfig;

  // スリッページ設定
  slippage: SlippageConfig;

  // ウォークフォワード設定
  walkForward: WalkForwardConfig;

  // モンテカルロ設定
  monteCarlo: MonteCarloConfig;

  // 実行オプション
  options: {
    // ウォークフォワード分析を実行
    runWalkForward: boolean;

    // モンテカルロシミュレーションを実行
    runMonteCarlo: boolean;

    // リアルなスリッページを使用
    useRealisticSlippage: boolean;

    // 詳細ログ
    verbose: boolean;
  };
}

export interface RealisticBacktestReport {
  // 基本バックテスト結果
  backtestResult: BacktestResult;

  // ウォークフォワードレポート（オプション）
  walkForwardReport?: WalkForwardReport;

  // モンテカルロ結果（オプション）
  monteCarloResult?: MonteCarloResult;

  // 総合評価
  overallAssessment: OverallAssessment;

  // 実行時間
  executionTime: {
    backtest: number;
    walkForward?: number;
    monteCarlo?: number;
    total: number;
  };

  // 設定
  config: RealisticBacktestConfig;
}

export interface OverallAssessment {
  // 総合スコア（0-100）
  overallScore: number;

  // グレード
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

  // 推奨事項
  recommendations: string[];

  // 詳細スコア
  detailedScores: {
    profitability: number;
    stability: number;
    riskManagement: number;
    robustness: number;
    statisticalSignificance: number;
  };

  // 警告フラグ
  warnings: string[];

  // 信頼度
  confidence: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_REALISTIC_CONFIG: RealisticBacktestConfig = {
  backtest: {
    initialCapital: 1000000,
    commission: 0.1,
    slippage: 0.05,
    spread: 0.01,
    maxPositionSize: 20,
    maxDrawdown: 50,
    allowShort: false,
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 2,
  },
  slippage: {
    baseSlippage: 0.05,
    spread: 0.01,
    useTimeOfDaySlippage: true,
    useVolatilitySlippage: true,
    useOrderSizeImpact: true,
    marketImpactModel: 'square_root',
    panicSlippage: 0.1,
  },
  walkForward: {
    trainingSize: 252,
    testSize: 63,
    windowType: 'rolling',
    minDataPoints: 500,
    optimizeParameters: true,
    optimizationMetric: 'sharpe',
    parallelRuns: 1,
  },
  monteCarlo: {
    numSimulations: 1000,
    method: 'trade_shuffling',
    confidenceLevel: 0.95,
    metrics: ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'winRate'],
    parallelRuns: 1,
    verbose: false,
  },
  options: {
    runWalkForward: true,
    runMonteCarlo: true,
    useRealisticSlippage: true,
    verbose: false,
  },
};

// ============================================================================
// Realistic Backtest Orchestrator
// ============================================================================

export class RealisticBacktestOrchestrator extends EventEmitter {
  private config: RealisticBacktestConfig;

  constructor(config: Partial<RealisticBacktestConfig> = {}) {
    super();
    this.config = this.mergeConfig(config);
  }

  /**
   * 包括的なリアルなバックテストを実行
   */
  async runRealisticBacktest(
    data: OHLCV[],
    strategy: Strategy,
    symbol: string
  ): Promise<RealisticBacktestReport> {
    const startTime = Date.now();
    console.log('[RealisticBacktestOrchestrator] Starting comprehensive backtest');
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Data points: ${data.length}`);

    this.emit('start', { symbol, dataPoints: data.length });

    // 流動性スコアを推定してスリッページ設定を調整
    if (this.config.options.useRealisticSlippage) {
      const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
      const avgPrice = data.reduce((sum, d) => sum + d.close, 0) / data.length;
      const liquidityScore = estimateLiquidityScore(avgVolume, avgPrice);

      console.log(`[RealisticBacktestOrchestrator] Estimated liquidity score: ${liquidityScore.toFixed(2)}`);

      const slippageModel = new SlippageModel(this.config.slippage);
      slippageModel.adjustForLiquidity(liquidityScore);
      this.config.slippage = slippageModel.getConfig();
    }

    // 1. 基本バックテストを実行
    const backtestStartTime = Date.now();
    const backtestResult = await this.runBacktest(data, strategy, symbol);
    const backtestTime = Date.now() - backtestStartTime;

    console.log(`[RealisticBacktestOrchestrator] Basic backtest complete (${backtestTime}ms)`);
    console.log(`  Total Return: ${backtestResult.metrics.totalReturn.toFixed(2)}%`);
    console.log(`  Sharpe Ratio: ${backtestResult.metrics.sharpeRatio.toFixed(2)}`);
    console.log(`  Max Drawdown: ${backtestResult.metrics.maxDrawdown.toFixed(2)}%`);

    this.emit('backtest_complete', backtestResult);

    // 2. ウォークフォワード分析
    let walkForwardReport: WalkForwardReport | undefined;
    let walkForwardTime: number | undefined;

    if (this.config.options.runWalkForward && data.length >= this.config.walkForward.minDataPoints) {
      console.log('[RealisticBacktestOrchestrator] Running walk-forward analysis...');

      const wfStartTime = Date.now();
      walkForwardReport = await this.runWalkForwardAnalysis(data, strategy, symbol);
      walkForwardTime = Date.now() - wfStartTime;

      console.log(`[RealisticBacktestOrchestrator] Walk-forward analysis complete (${walkForwardTime}ms)`);
      console.log(`  Robustness Score: ${walkForwardReport.robustnessScore}`);
      console.log(`  Parameter Stability: ${walkForwardReport.parameterStability}`);

      this.emit('walkforward_complete', walkForwardReport);
    } else if (this.config.options.runWalkForward) {
      console.warn('[RealisticBacktestOrchestrator] Insufficient data for walk-forward analysis');
    }

    // 3. モンテカルロシミュレーション
    let monteCarloResult: MonteCarloResult | undefined;
    let monteCarloTime: number | undefined;

    if (this.config.options.runMonteCarlo) {
      console.log('[RealisticBacktestOrchestrator] Running Monte Carlo simulation...');

      const mcStartTime = Date.now();
      monteCarloResult = await this.runMonteCarloSimulation(backtestResult);
      monteCarloTime = Date.now() - mcStartTime;

      console.log(`[RealisticBacktestOrchestrator] Monte Carlo simulation complete (${monteCarloTime}ms)`);
      console.log(`  Probability of Profit: ${monteCarloResult.probabilities.probabilityOfProfit.toFixed(1)}%`);
      console.log(`  Risk Score: ${monteCarloResult.riskAssessment.riskScore.toFixed(0)}`);

      this.emit('montecarlo_complete', monteCarloResult);
    }

    // 4. 総合評価を生成
    const overallAssessment = this.generateOverallAssessment(
      backtestResult,
      walkForwardReport,
      monteCarloResult
    );

    const totalTime = Date.now() - startTime;

    const report: RealisticBacktestReport = {
      backtestResult,
      walkForwardReport,
      monteCarloResult,
      overallAssessment,
      executionTime: {
        backtest: backtestTime,
        walkForward: walkForwardTime,
        monteCarlo: monteCarloTime,
        total: totalTime,
      },
      config: this.config,
    };

    console.log('[RealisticBacktestOrchestrator] Comprehensive backtest complete');
    console.log(`  Total execution time: ${totalTime}ms`);
    console.log(`  Overall Score: ${overallAssessment.overallScore}/100`);
    console.log(`  Grade: ${overallAssessment.grade}`);
    console.log(`  Confidence: ${overallAssessment.confidence}`);

    this.emit('complete', report);

    return report;
  }

  /**
   * 基本バックテストを実行
   */
  private async runBacktest(
    data: OHLCV[],
    strategy: Strategy,
    symbol: string
  ): Promise<BacktestResult> {
    // AdvancedBacktestEngineを使用してバックテストを実行
    // ここでは簡易実装
    const { AdvancedBacktestEngine } = await import('./AdvancedBacktestEngine');

    const engine = new AdvancedBacktestEngine({
      ...this.config.backtest,
      useRealisticSlippage: this.config.options.useRealisticSlippage,
      averageDailyVolume: data.reduce((sum, d) => sum + d.volume, 0) / data.length,
    });

    engine.loadData(symbol, data);
    const result = await engine.runBacktest(strategy, symbol);

    return result;
  }

  /**
   * ウォークフォワード分析を実行
   */
  private async runWalkForwardAnalysis(
    data: OHLCV[],
    strategy: Strategy,
    symbol: string
  ): Promise<WalkForwardReport> {
    const analyzer = new WalkForwardAnalyzer(this.config.walkForward);

    const strategyFactory = (params: Record<string, number>) => ({
      ...strategy,
      name: `${strategy.name} (${JSON.stringify(params)})`,
    });

    return await analyzer.runWalkForwardAnalysis(data, strategyFactory, this.config.backtest);
  }

  /**
   * モンテカルロシミュレーションを実行
   */
  private async runMonteCarloSimulation(
    backtestResult: BacktestResult
  ): Promise<MonteCarloResult> {
    const simulator = new MonteCarloSimulator(this.config.monteCarlo);
    return await simulator.runSimulation(backtestResult);
  }

  /**
   * 総合評価を生成
   */
  private generateOverallAssessment(
    backtestResult: BacktestResult,
    walkForwardReport?: WalkForwardReport,
    monteCarloResult?: MonteCarloResult
  ): OverallAssessment {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 詳細スコアを計算
    const profitability = this.calculateProfitabilityScore(backtestResult, monteCarloResult);
    const stability = this.calculateStabilityScore(backtestResult, walkForwardReport, monteCarloResult);
    const riskManagement = this.calculateRiskManagementScore(backtestResult, monteCarloResult);
    const robustness = this.calculateRobustnessScore(walkForwardReport, monteCarloResult);
    const statisticalSignificance = this.calculateStatisticalSignificance(backtestResult, monteCarloResult);

    // 総合スコア（加重平均）
    const overallScore = Math.round(
      profitability * 0.25 +
      stability * 0.20 +
      riskManagement * 0.25 +
      robustness * 0.20 +
      statisticalSignificance * 0.10
    );

    // グレードを決定
    let grade: OverallAssessment['grade'];
    if (overallScore >= 95) grade = 'A+';
    else if (overallScore >= 85) grade = 'A';
    else if (overallScore >= 70) grade = 'B';
    else if (overallScore >= 55) grade = 'C';
    else if (overallScore >= 40) grade = 'D';
    else grade = 'F';

    // 信頼度を決定
    let confidence: OverallAssessment['confidence'];
    const wfConfidence = walkForwardReport?.robustnessScore || 50;
    const mcConfidence = monteCarloResult?.probabilities.probabilityOfProfit || 50;

    if (wfConfidence >= 80 && mcConfidence >= 80) confidence = 'very_high';
    else if (wfConfidence >= 60 && mcConfidence >= 60) confidence = 'high';
    else if (wfConfidence >= 40 && mcConfidence >= 40) confidence = 'medium';
    else if (wfConfidence >= 20 && mcConfidence >= 20) confidence = 'low';
    else confidence = 'very_low';

    // 警告を生成
    if (profitability < 50) warnings.push('低収益性：収益性の改善が必要です。');
    if (stability < 50) warnings.push('不安定なパフォーマンス：結果の一貫性がありません。');
    if (riskManagement < 50) warnings.push('リスク管理不十分：ドローダウンが大きすぎます。');
    if (robustness < 50) warnings.push('堅牢性不足：オーバーフィッティングの可能性があります。');
    if (backtestResult.metrics.maxDrawdown > 30) {
      warnings.push('最大ドローダウンが30%を超えています。');
    }
    if (backtestResult.metrics.winRate < 40) {
      warnings.push('勝率が40%を下回っています。');
    }

    // 推奨事項を生成
    if (grade === 'A+' || grade === 'A') {
      recommendations.push('優秀な戦略です。実践での使用を推奨します。');
    } else if (grade === 'B') {
      recommendations.push('良好な戦略ですが、追加の検証と最適化を推奨します。');
    } else if (grade === 'C') {
      recommendations.push('平均的な戦略です。大幅な改善が必要です。');
    } else {
      recommendations.push('戦略の再設計を強く推奨します。');
    }

    if (walkForwardReport?.robustnessScore && walkForwardReport.robustnessScore < 50) {
      recommendations.push('ウォークフォワード分析で堅牢性が低い結果となりました。パラメータ調整を検討してください。');
    }

    if (monteCarloResult?.riskAssessment.riskCategory === 'high' || monteCarloResult?.riskAssessment.riskCategory === 'very_high') {
      recommendations.push('モンテカルロシミュレーションで高リスクと判定されました。ポジションサイズを縮小してください。');
    }

    return {
      overallScore,
      grade,
      recommendations,
      detailedScores: {
        profitability,
        stability,
        riskManagement,
        robustness,
        statisticalSignificance,
      },
      warnings,
      confidence,
    };
  }

  /**
   * 収益性スコアを計算（0-100）
   */
  private calculateProfitabilityScore(
    backtestResult: BacktestResult,
    monteCarloResult?: MonteCarloResult
  ): number {
    let score = 0;

    // 総リターン
    if (backtestResult.metrics.totalReturn > 50) score += 30;
    else if (backtestResult.metrics.totalReturn > 20) score += 20;
    else if (backtestResult.metrics.totalReturn > 0) score += 10;

    // シャープレシオ
    if (backtestResult.metrics.sharpeRatio > 2) score += 30;
    else if (backtestResult.metrics.sharpeRatio > 1) score += 20;
    else if (backtestResult.metrics.sharpeRatio > 0.5) score += 10;

    // プロフィットファクター
    if (backtestResult.metrics.profitFactor > 2) score += 20;
    else if (backtestResult.metrics.profitFactor > 1.5) score += 15;
    else if (backtestResult.metrics.profitFactor > 1) score += 10;

    // 勝率
    if (backtestResult.metrics.winRate > 60) score += 20;
    else if (backtestResult.metrics.winRate > 50) score += 15;
    else if (backtestResult.metrics.winRate > 40) score += 10;

    // モンテカルロ結果（あれば）
    if (monteCarloResult) {
      const profitProb = monteCarloResult.probabilities.probabilityOfProfit;
      if (profitProb > 80) score += 10;
      else if (profitProb > 60) score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * 安定性スコアを計算（0-100）
   */
  private calculateStabilityScore(
    backtestResult: BacktestResult,
    walkForwardReport?: WalkForwardReport,
    monteCarloResult?: MonteCarloResult
  ): number {
    let score = 0;

    // ソルティノレシオ
    if (backtestResult.metrics.sortinoRatio > 2) score += 30;
    else if (backtestResult.metrics.sortinoRatio > 1) score += 20;
    else if (backtestResult.metrics.sortinoRatio > 0.5) score += 10;

    // 最大ドローダウン
    if (backtestResult.metrics.maxDrawdown < 10) score += 30;
    else if (backtestResult.metrics.maxDrawdown < 20) score += 20;
    else if (backtestResult.metrics.maxDrawdown < 30) score += 10;

    // カルマーレシオ
    if (backtestResult.metrics.calmarRatio > 2) score += 20;
    else if (backtestResult.metrics.calmarRatio > 1) score += 15;
    else if (backtestResult.metrics.calmarRatio > 0.5) score += 10;

    // ウォークフォワード安定性
    if (walkForwardReport && walkForwardReport.summary.correlation > 0.7) {
      score += 20;
    } else if (walkForwardReport && walkForwardReport.summary.correlation > 0.5) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * リスク管理スコアを計算（0-100）
   */
  private calculateRiskManagementScore(
    backtestResult: BacktestResult,
    monteCarloResult?: MonteCarloResult
  ): number {
    let score = 0;

    // 最大ドローダウン期間
    if (backtestResult.metrics.maxDrawdownDuration < 30) score += 30;
    else if (backtestResult.metrics.maxDrawdownDuration < 60) score += 20;
    else if (backtestResult.metrics.maxDrawdownDuration < 90) score += 10;

    // ペイオフ比（平均利益/平均損失の絶対値）
    const payoffRatio = backtestResult.metrics.averageLoss !== 0
      ? Math.abs(backtestResult.metrics.averageWin / backtestResult.metrics.averageLoss)
      : 0;
    if (payoffRatio > 2) score += 30;
    else if (payoffRatio > 1.5) score += 20;
    else if (payoffRatio > 1) score += 10;

    // モンテカルロ VaR
    if (monteCarloResult) {
      if (monteCarloResult.riskAssessment.var95 > -10) score += 40;
      else if (monteCarloResult.riskAssessment.var95 > -20) score += 30;
      else if (monteCarloResult.riskAssessment.var95 > -30) score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * 堅牢性スコアを計算（0-100）
   */
  private calculateRobustnessScore(
    walkForwardReport?: WalkForwardReport,
    monteCarloResult?: MonteCarloResult
  ): number {
    let score = 0;

    if (walkForwardReport) {
      score += walkForwardReport.robustnessScore * 0.5;
      score += walkForwardReport.parameterStability * 0.3;
    }

    if (monteCarloResult) {
      const confidence95Range =
        monteCarloResult.confidenceIntervals.confidence95.returns.range;
      if (confidence95Range < 20) score += 20;
      else if (confidence95Range < 40) score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * 統計的有意性スコアを計算（0-100）
   */
  private calculateStatisticalSignificance(
    backtestResult: BacktestResult,
    monteCarloResult?: MonteCarloResult
  ): number {
    let score = 0;

    // 取引数
    if (backtestResult.metrics.totalTrades > 100) score += 40;
    else if (backtestResult.metrics.totalTrades > 50) score += 30;
    else if (backtestResult.metrics.totalTrades > 30) score += 20;
    else if (backtestResult.metrics.totalTrades > 10) score += 10;

    // データ期間
    if (backtestResult.duration > 252) score += 30; // 1年以上
    else if (backtestResult.duration > 126) score += 20; // 6ヶ月以上
    else if (backtestResult.duration > 63) score += 10; // 3ヶ月以上

    // シャープレシオの信頼性
    if (backtestResult.metrics.sharpeRatio > 2 && backtestResult.metrics.totalTrades > 50) {
      score += 30;
    } else if (backtestResult.metrics.sharpeRatio > 1 && backtestResult.metrics.totalTrades > 30) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * 設定をマージ
   */
  private mergeConfig(config: Partial<RealisticBacktestConfig>): RealisticBacktestConfig {
    return {
      backtest: { ...DEFAULT_REALISTIC_CONFIG.backtest, ...config.backtest },
      slippage: { ...DEFAULT_REALISTIC_CONFIG.slippage, ...config.slippage },
      walkForward: { ...DEFAULT_REALISTIC_CONFIG.walkForward, ...config.walkForward },
      monteCarlo: { ...DEFAULT_REALISTIC_CONFIG.monteCarlo, ...config.monteCarlo },
      options: { ...DEFAULT_REALISTIC_CONFIG.options, ...config.options },
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<RealisticBacktestConfig>): void {
    this.config = this.mergeConfig(config);
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): RealisticBacktestConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<RealisticBacktestConfig>) => new RealisticBacktestOrchestrator(config)
);

export const getGlobalRealisticBacktestOrchestrator = getInstance;
export const resetGlobalRealisticBacktestOrchestrator = resetInstance;

export default RealisticBacktestOrchestrator;
