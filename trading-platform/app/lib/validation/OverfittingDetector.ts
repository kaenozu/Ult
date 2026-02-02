/**
 * OverfittingDetector.ts
 * 
 * 過剰適合検知 - 戦略の過剰適合を検出し、警告を出す
 * 
 * 【機能】
 * - Train-Validation-Test分離の厳格化
 * - パラメータ感応度分析
 * - ホワイトノイズ検定
 * - 統計的優位性検定
 */

import { OHLCV } from '@/app/types';
import { BacktestResult, BacktestConfig } from '../backtest/AdvancedBacktestEngine';

// ============================================================================
// Types
// ============================================================================

export interface OverfittingAnalysisResult {
  isOverfit: boolean;
  confidence: number; // 0-1
  warnings: string[];
  metrics: {
    trainTestGap: number;
    parameterSensitivity: number;
    whiteNoiseTest: boolean;
    statisticalSignificance: number; // p-value
    informationRatio: number;
    stabilityScore: number;
    testScore?: number; // Optional test score
  };
  recommendations: string[];
}

export interface SensitivityAnalysisResult {
  parameter: string;
  baseScore: number;
  variations: Array<{
    value: number | string;
    score: number;
    percentChange: number;
  }>;
  sensitivity: number; // 感応度スコア 0-1
}

export interface WhiteNoiseTestResult {
  isSignificant: boolean;
  pValue: number;
  testStatistic: number;
  description: string;
}

// ============================================================================
// OverfittingDetector Class
// ============================================================================

export class OverfittingDetector {
  /**
   * 包括的な過剰適合分析を実行
   */
  async analyzeOverfitting(
    trainResult: BacktestResult,
    validationResult: BacktestResult,
    testResult?: BacktestResult,
    params?: Record<string, number | string>
  ): Promise<OverfittingAnalysisResult> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 1. Train-Validation-Test Gap分析
    const trainTestGap = this.calculatePerformanceGap(trainResult, validationResult, testResult);
    if (trainTestGap > 0.15) {
      warnings.push(`Train-Test性能差が${(trainTestGap * 100).toFixed(1)}%と大きい（閾値: 15%）`);
      recommendations.push('データ期間を延ばす、またはパラメータ空間を縮小してください');
    }

    // 2. 統計的優位性検定
    const statisticalSignificance = this.performStatisticalSignificanceTest(
      validationResult.trades,
      testResult?.trades
    );
    if (statisticalSignificance > 0.05) {
      warnings.push(`統計的優位性が不十分（p-value: ${statisticalSignificance.toFixed(3)}）`);
      recommendations.push('より多くの取引サンプルを確保するか、戦略を見直してください');
    }

    // 3. ホワイトノイズ検定
    const whiteNoiseTest = this.performWhiteNoiseTest(validationResult.equityCurve);
    if (!whiteNoiseTest.isSignificant) {
      warnings.push('リターンがホワイトノイズと区別できません');
      recommendations.push('戦略の予測力を強化してください');
    }

    // 4. 情報比率（Information Ratio）
    const informationRatio = this.calculateInformationRatio(
      validationResult.metrics,
      testResult?.metrics
    );
    if (informationRatio < 0.5) {
      warnings.push(`情報比率が低い（${informationRatio.toFixed(2)}）`);
      recommendations.push('リスク調整後リターンを改善してください');
    }

    // 5. 安定性スコア
    const stabilityScore = this.calculateStabilityScore(validationResult, testResult);
    if (stabilityScore < 0.7) {
      warnings.push(`安定性スコアが低い（${stabilityScore.toFixed(2)}）`);
      recommendations.push('戦略パラメータの頑健性を向上させてください');
    }

    // パラメータ感応度（オプション）
    let parameterSensitivity = 0;
    if (params) {
      // 実際の感応度分析は別途実行が必要
      parameterSensitivity = 0.5; // プレースホルダー
    }

    // Calculate test score if test result exists
    let testScore: number | undefined;
    if (testResult) {
      testScore = this.calculateObjective(testResult);
    }

    const isOverfit =
      trainTestGap > 0.15 ||
      statisticalSignificance > 0.05 ||
      !whiteNoiseTest.isSignificant ||
      stabilityScore < 0.7;

    const confidence = this.calculateOverfitConfidence(
      trainTestGap,
      statisticalSignificance,
      whiteNoiseTest.isSignificant,
      stabilityScore
    );

    return {
      isOverfit,
      confidence,
      warnings,
      recommendations,
      metrics: {
        trainTestGap,
        parameterSensitivity,
        whiteNoiseTest: whiteNoiseTest.isSignificant,
        statisticalSignificance,
        informationRatio,
        stabilityScore,
        testScore,
      },
    };
  }

  /**
   * パラメータ感応度分析
   */
  async analyzeSensitivity(
    baseParams: Record<string, number | string>,
    data: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig,
    variationPercentage: number = 0.1 // 10%の変動
  ): Promise<SensitivityAnalysisResult[]> {
    const results: SensitivityAnalysisResult[] = [];

    // ベースラインスコア
    const baseResult = await strategyExecutor(baseParams, data, backtestConfig);
    const baseScore = baseResult.metrics.sharpeRatio;

    // 各パラメータについて感応度を分析
    for (const [paramName, baseValue] of Object.entries(baseParams)) {
      if (typeof baseValue !== 'number') continue;

      const variations: Array<{
        value: number | string;
        score: number;
        percentChange: number;
      }> = [];

      // ±10%, ±20%の変動をテスト
      const testValues = [
        baseValue * (1 - variationPercentage * 2),
        baseValue * (1 - variationPercentage),
        baseValue,
        baseValue * (1 + variationPercentage),
        baseValue * (1 + variationPercentage * 2),
      ];

      for (const testValue of testValues) {
        const testParams = { ...baseParams, [paramName]: testValue };
        const testResult = await strategyExecutor(testParams, data, backtestConfig);
        const score = testResult.metrics.sharpeRatio;

        variations.push({
          value: testValue,
          score,
          percentChange: ((score - baseScore) / Math.abs(baseScore)) * 100,
        });
      }

      // 感応度を計算（スコアの標準偏差）
      const scores = variations.map(v => v.score);
      const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / scores.length;
      const sensitivity = Math.sqrt(variance) / Math.abs(baseScore);

      results.push({
        parameter: paramName,
        baseScore,
        variations,
        sensitivity,
      });
    }

    // 感応度の高い順にソート
    results.sort((a, b) => b.sensitivity - a.sensitivity);

    return results;
  }

  /**
   * Walk-Forward Analysis
   */
  async performWalkForwardAnalysis(
    data: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig,
    windowSize: number,
    stepSize: number
  ): Promise<{
    windows: BacktestResult[];
    averageMetrics: {
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
    };
    consistency: number;
  }> {
    const windows: BacktestResult[] = [];

    for (let i = 0; i + windowSize <= data.length; i += stepSize) {
      const windowData = data.slice(i, i + windowSize);
      
      // この期間でバックテスト実行（パラメータは固定）
      const result = await strategyExecutor({}, windowData, backtestConfig);
      windows.push(result);
    }

    // 平均メトリクスを計算
    const sharpeRatios = windows.map(w => w.metrics.sharpeRatio);
    const maxDrawdowns = windows.map(w => w.metrics.maxDrawdown);
    const winRates = windows.map(w => w.metrics.winRate);

    const averageMetrics = {
      sharpeRatio: sharpeRatios.reduce((a, b) => a + b, 0) / sharpeRatios.length,
      maxDrawdown: maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length,
      winRate: winRates.reduce((a, b) => a + b, 0) / winRates.length,
    };

    // 一貫性スコア（シャープレシオの変動係数の逆数）
    const meanSharpe = averageMetrics.sharpeRatio;
    const stdSharpe = Math.sqrt(
      sharpeRatios.reduce((sum, s) => sum + Math.pow(s - meanSharpe, 2), 0) / sharpeRatios.length
    );
    const consistency = meanSharpe / (stdSharpe + 0.001); // ゼロ除算回避

    return {
      windows,
      averageMetrics,
      consistency,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 目的関数を計算（Sharpe Ratioを使用）
   */
  private calculateObjective(result: BacktestResult): number {
    return result.metrics.sharpeRatio;
  }

  /**
   * Train-Test性能差を計算
   */
  private calculatePerformanceGap(
    trainResult: BacktestResult,
    validationResult: BacktestResult,
    testResult?: BacktestResult
  ): number {
    const trainScore = trainResult.metrics.sharpeRatio;
    const valScore = validationResult.metrics.sharpeRatio;

    let gap = Math.abs(trainScore - valScore) / Math.abs(trainScore);

    if (testResult) {
      const testScore = testResult.metrics.sharpeRatio;
      const trainTestGap = Math.abs(trainScore - testScore) / Math.abs(trainScore);
      gap = Math.max(gap, trainTestGap);
    }

    return gap;
  }

  /**
   * 統計的優位性検定（t検定）
   */
  private performStatisticalSignificanceTest(
    validationTrades: Array<{ pnl: number }>,
    testTrades?: Array<{ pnl: number }>
  ): number {
    const trades = testTrades && testTrades.length > 0 ? testTrades : validationTrades;

    if (trades.length < 30) {
      return 1.0; // サンプルサイズ不足
    }

    const returns = trades.map(t => t.pnl);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const std = Math.sqrt(variance);

    // t統計量
    const tStatistic = (mean / std) * Math.sqrt(returns.length);

    // 自由度 n-1
    const df = returns.length - 1;

    // p値を近似計算（簡易版）
    const pValue = this.approximateTTestPValue(tStatistic, df);

    return pValue;
  }

  /**
   * t検定のp値を近似計算
   */
  private approximateTTestPValue(t: number, df: number): number {
    // 簡易版：正規分布で近似
    const z = Math.abs(t);
    const pValue = 2 * (1 - this.normalCDF(z));
    return Math.max(0, Math.min(1, pValue));
  }

  /**
   * 標準正規分布の累積分布関数
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const probability =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - probability : probability;
  }

  /**
   * ホワイトノイズ検定（Ljung-Box検定の簡易版）
   */
  private performWhiteNoiseTest(equityCurve: number[]): WhiteNoiseTestResult {
    if (equityCurve.length < 30) {
      return {
        isSignificant: false,
        pValue: 1.0,
        testStatistic: 0,
        description: 'サンプルサイズ不足',
      };
    }

    // リターンを計算
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }

    // 自己相関を計算（lag=1）
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    let numerator = 0;
    let denominator = 0;

    for (let i = 1; i < returns.length; i++) {
      numerator += (returns[i] - mean) * (returns[i - 1] - mean);
    }

    for (let i = 0; i < returns.length; i++) {
      denominator += Math.pow(returns[i] - mean, 2);
    }

    const autocorr = numerator / denominator;

    // Ljung-Box Q統計量（lag=1のみ）
    const n = returns.length;
    const Q = n * (n + 2) * Math.pow(autocorr, 2) / (n - 1);

    // 自由度1のカイ二乗分布でp値を近似
    const pValue = 1 - this.chiSquareCDF(Q, 1);

    return {
      isSignificant: pValue < 0.05, // 有意水準5%
      pValue,
      testStatistic: Q,
      description: pValue < 0.05 ? 'リターンに有意なパターンあり' : 'ホワイトノイズと区別できない',
    };
  }

  /**
   * カイ二乗分布の累積分布関数（簡易近似）
   */
  private chiSquareCDF(x: number, df: number): number {
    if (x <= 0) return 0;
    if (df === 1) {
      return 2 * this.normalCDF(Math.sqrt(x)) - 1;
    }
    // 簡易近似（正確ではない）
    return Math.min(1, x / (df * 2));
  }

  /**
   * 情報比率を計算
   */
  private calculateInformationRatio(
    validationMetrics: { annualizedReturn: number; volatility: number },
    testMetrics?: { annualizedReturn: number; volatility: number }
  ): number {
    const metrics = testMetrics || validationMetrics;
    
    // ベンチマークを0と仮定（絶対リターン）
    const excessReturn = metrics.annualizedReturn;
    const trackingError = metrics.volatility;

    if (trackingError === 0) return 0;

    return excessReturn / trackingError;
  }

  /**
   * 安定性スコアを計算
   */
  private calculateStabilityScore(
    validationResult: BacktestResult,
    testResult?: BacktestResult
  ): number {
    const valMetrics = validationResult.metrics;
    const testMetrics = testResult?.metrics;

    if (!testMetrics) {
      // Validationのみの場合、ドローダウンとボラティリティから推定
      return Math.max(0, 1 - valMetrics.maxDrawdown / 100 - valMetrics.volatility / 100);
    }

    // Validation-Test間のメトリクス一貫性
    const sharpeConsistency = 1 - Math.abs(valMetrics.sharpeRatio - testMetrics.sharpeRatio) / Math.abs(valMetrics.sharpeRatio + 0.01);
    const returnConsistency = 1 - Math.abs(valMetrics.totalReturn - testMetrics.totalReturn) / Math.abs(valMetrics.totalReturn + 0.01);
    const winRateConsistency = 1 - Math.abs(valMetrics.winRate - testMetrics.winRate) / 100;

    return (sharpeConsistency + returnConsistency + winRateConsistency) / 3;
  }

  /**
   * 過剰適合の確信度を計算
   */
  private calculateOverfitConfidence(
    trainTestGap: number,
    pValue: number,
    whiteNoiseSignificant: boolean,
    stabilityScore: number
  ): number {
    let confidence = 0;

    // Train-Test Gap寄与
    confidence += Math.min(1, trainTestGap / 0.15) * 0.3;

    // 統計的優位性寄与
    confidence += Math.min(1, pValue / 0.05) * 0.3;

    // ホワイトノイズ検定寄与
    if (!whiteNoiseSignificant) {
      confidence += 0.2;
    }

    // 安定性スコア寄与
    confidence += (1 - stabilityScore) * 0.2;

    return Math.min(1, confidence);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Buy & Hold戦略との統計的比較
 */
export function compareToBuyAndHold(
  strategyResult: BacktestResult,
  buyAndHoldResult: BacktestResult
): {
  outperforms: boolean;
  significance: number;
  advantage: {
    returnAdvantage: number;
    sharpeAdvantage: number;
    drawdownAdvantage: number;
  };
} {
  const returnAdvantage = strategyResult.metrics.totalReturn - buyAndHoldResult.metrics.totalReturn;
  const sharpeAdvantage = strategyResult.metrics.sharpeRatio - buyAndHoldResult.metrics.sharpeRatio;
  const drawdownAdvantage = buyAndHoldResult.metrics.maxDrawdown - strategyResult.metrics.maxDrawdown; // 正の値が良い

  // t検定で統計的優位性を評価（簡易版）
  const strategyReturns = strategyResult.trades.map(t => t.pnlPercent);
  const strategyMean = strategyReturns.reduce((a, b) => a + b, 0) / strategyReturns.length;
  const strategyStd = Math.sqrt(
    strategyReturns.reduce((sum, r) => sum + Math.pow(r - strategyMean, 2), 0) / strategyReturns.length
  );

  const tStatistic = (returnAdvantage / strategyStd) * Math.sqrt(strategyReturns.length);
  const pValue = 2 * (1 - normalCDF(Math.abs(tStatistic)));

  return {
    outperforms: returnAdvantage > 0 && sharpeAdvantage > 0 && pValue < 0.05,
    significance: 1 - pValue,
    advantage: {
      returnAdvantage,
      sharpeAdvantage,
      drawdownAdvantage,
    },
  };
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const probability =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - probability : probability;
}

/**
 * モンテカルロシミュレーションによる信頼区間推定
 */
export function monteCarloConfidenceInterval(
  trades: Array<{ pnl: number }>,
  nSimulations: number = 1000,
  confidenceLevel: number = 0.95
): {
  lower: number;
  upper: number;
  mean: number;
} {
  const returns = trades.map(t => t.pnl);
  const simulations: number[] = [];

  for (let i = 0; i < nSimulations; i++) {
    // ブートストラップサンプリング
    let sum = 0;
    for (let j = 0; j < returns.length; j++) {
      const idx = Math.floor(Math.random() * returns.length);
      sum += returns[idx];
    }
    simulations.push(sum);
  }

  simulations.sort((a, b) => a - b);

  const lowerIdx = Math.floor((1 - confidenceLevel) / 2 * nSimulations);
  const upperIdx = Math.floor((1 + confidenceLevel) / 2 * nSimulations);

  return {
    lower: simulations[lowerIdx],
    upper: simulations[upperIdx],
    mean: simulations.reduce((a, b) => a + b, 0) / simulations.length,
  };
}

export const overfittingDetector = new OverfittingDetector();
