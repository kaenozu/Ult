/**
 * Walk-Forward Analysis Service
 * 
 * このモジュールは、ウォークフォワード分析を実行する機能を提供します。
 * モードフォワード分析は、過剰適合を防ぎ、戦略の堅牢性を評価するために使用されます。
 */

import { OHLCV, Stock, BacktestResult } from '@/app/types';
import { backtestService, BacktestConfig } from '@/app/lib/backtest-service';
import { multipleTradingStrategiesService, StrategyInput } from './multiple-trading-strategies-service';

export interface WalkForwardAnalysisConfig {
  inSamplePeriod: number;    // 学習期間（日数）
  outOfSamplePeriod: number; // 検証期間（日数）
  minOptimizationMetric: 'sharpeRatio' | 'maxDrawdown' | 'totalReturn' | 'winRate'; // 最適化指標
  rebalanceFrequency: number; // 再調整頻度（日数）
  minPerformanceThreshold: {
    sharpeRatio: number;
    maxDrawdown: number;
    totalReturn: number;
    winRate: number;
  };
}

export interface WalkForwardResult {
  periodResults: Array<{
    period: number;
    inSample: BacktestResult;
    outOfSample: BacktestResult;
    performanceDegradation: number; // 性能劣化率
    robustnessScore: number; // 堅牢性スコア
    isValid: boolean; // 有効性フラグ
  }>;
  overallMetrics: {
    avgSharpeRatio: number;
    avgMaxDrawdown: number;
    avgTotalReturn: number;
    avgWinRate: number;
    avgPerformanceDegradation: number;
    overallRobustnessScore: number;
  };
  strategyParameters: Record<string, unknown>[]; // 各期間の最適パラメータ
  recommendations: string[];
}

class WalkForwardAnalysisService {
  /**
   * ウォークフォワード分析を実行
   */
  async executeWalkForwardAnalysis(
    stock: Stock,
    historicalData: OHLCV[],
    backtestConfig: BacktestConfig,
    wfConfig: WalkForwardAnalysisConfig
  ): Promise<WalkForwardResult> {
    const results: WalkForwardResult['periodResults'] = [];
    const strategyParams: Record<string, unknown>[] = [];
    
    // データを期間に分割
    const periods = this.divideIntoPeriods(historicalData, wfConfig);
    
    for (let i = 0; i < periods.length; i++) {
      const { inSample, outOfSample } = periods[i];
      
      if (inSample.length < 50 || outOfSample.length < 20) {
        // データが少なすぎる場合はスキップ
        continue;
      }
      
      // 学習期間で最適化
      const optimizedParams = await this.optimizeParameters(
        stock,
        inSample,
        backtestConfig,
        wfConfig
      );
      
      strategyParams.push(optimizedParams);
      
      // 学習期間のバックテスト
      const inSampleResult = await backtestService.runBacktest(
        stock,
        inSample,
        { ...backtestConfig, ...optimizedParams },
        () => {} // 進行状況コールバック
      );
      
      // 検証期間のバックテスト（最適化されたパラメータを使用）
      const outOfSampleResult = await backtestService.runBacktest(
        stock,
        outOfSample,
        { ...backtestConfig, ...optimizedParams },
        () => {}
      );
      
      // 性能劣化率を計算
      const performanceDegradation = this.calculatePerformanceDegradation(
        inSampleResult,
        outOfSampleResult
      );
      
      // 堅牢性スコアを計算
      const robustnessScore = this.calculateRobustnessScore(
        inSampleResult,
        outOfSampleResult,
        wfConfig
      );
      
      // 有効性を評価
      const isValid = this.evaluateValidity(outOfSampleResult, wfConfig);
      
      results.push({
        period: i + 1,
        inSample: inSampleResult,
        outOfSample: outOfSampleResult,
        performanceDegradation,
        robustnessScore,
        isValid
      });
    }
    
    // 全体メトリクスを計算
    const overallMetrics = this.calculateOverallMetrics(results, wfConfig);
    
    // おすすめを生成
    const recommendations = this.generateRecommendations(results, overallMetrics, wfConfig);
    
    return {
      periodResults: results,
      overallMetrics,
      strategyParameters: strategyParams,
      recommendations
    };
  }

  /**
   * データを期間に分割
   */
  private divideIntoPeriods(data: OHLCV[], config: WalkForwardAnalysisConfig): Array<{inSample: OHLCV[], outOfSample: OHLCV[]}> {
    const periods: Array<{inSample: OHLCV[], outOfSample: OHLCV[]}> = [];
    
    // 最初の学習期間を設定
    let currentIndex = 0;
    const totalLength = data.length;
    
    while (currentIndex + config.inSamplePeriod + config.outOfSamplePeriod <= totalLength) {
      const inSampleStart = currentIndex;
      const inSampleEnd = currentIndex + config.inSamplePeriod;
      const outOfSampleStart = inSampleEnd;
      const outOfSampleEnd = outOfSampleStart + config.outOfSamplePeriod;
      
      const inSample = data.slice(inSampleStart, inSampleEnd);
      const outOfSample = data.slice(outOfSampleStart, outOfSampleEnd);
      
      periods.push({ inSample, outOfSample });
      
      // 次の期間に移動（再調整頻度に基づく）
      currentIndex += config.outOfSamplePeriod + config.rebalanceFrequency;
    }
    
    return periods;
  }

  /**
   * パラメータを最適化
   */
  private async optimizeParameters(
    stock: Stock,
    inSampleData: OHLCV[],
    backtestConfig: BacktestConfig,
    wfConfig: WalkForwardAnalysisConfig
  ): Promise<any> {
    // 最適化のためのパラメータ範囲を定義
    const paramRanges = {
      rsiPeriod: [7, 14, 21, 28],
      smaPeriod: [10, 20, 30, 50],
      atrMultiplier: [1.5, 2.0, 2.5, 3.0],
      bollingerStdDev: [1.5, 2.0, 2.5, 3.0],
      riskPercentage: [0.5, 1.0, 1.5, 2.0]
    };
    
    let bestParams = {};
    let bestMetric = -Infinity;
    
    // グリッドサーチで最適パラメータを探索
    for (const rsiPeriod of paramRanges.rsiPeriod) {
      for (const smaPeriod of paramRanges.smaPeriod) {
        for (const atrMultiplier of paramRanges.atrMultiplier) {
          for (const bollingerStdDev of paramRanges.bollingerStdDev) {
            for (const riskPercentage of paramRanges.riskPercentage) {
              // パラメータを設定
              const currentParams = {
                rsiPeriod,
                smaPeriod,
                atrMultiplier,
                bollingerStdDev,
                riskPercentage
              };
              
              try {
                // バックテストを実行
                const result = await backtestService.runBacktest(
                  stock,
                  inSampleData,
                  { ...backtestConfig, ...currentParams },
                  () => {}
                );
                
                // 評価指標を計算
                const metric = this.calculateOptimizationMetric(result, wfConfig.minOptimizationMetric);
                
                if (metric > bestMetric) {
                  bestMetric = metric;
                  bestParams = currentParams;
                }
              } catch (error) {
                // エラーが発生した場合は次のパラメータに進む
                continue;
              }
            }
          }
        }
      }
    }
    
    return bestParams;
  }

  /**
   * 最適化指標を計算
   */
  private calculateOptimizationMetric(result: BacktestResult, metric: string): number {
    switch (metric) {
      case 'sharpeRatio':
        return result.sharpeRatio || 0;
      case 'maxDrawdown':
        return -result.maxDrawdown; // ドれが小さいほど良いので符号を反転
      case 'totalReturn':
        return result.totalReturn;
      case 'winRate':
        return result.winRate;
      default:
        return result.sharpeRatio || 0;
    }
  }

  /**
   * 性能劣化率を計算
   */
  private calculatePerformanceDegradation(inSample: BacktestResult, outOfSample: BacktestResult): number {
    // シャープレシオの劣化率を計算
    const inSampleSharpe = inSample.sharpeRatio || 0;
    const outOfSampleSharpe = outOfSample.sharpeRatio || 0;
    
    if (inSampleSharpe === 0) {
      return outOfSampleSharpe > 0 ? -1 : Infinity; // 学習期間で0なら、検証期間が正なら-1、負なら無限
    }
    
    return (inSampleSharpe - outOfSampleSharpe) / Math.abs(inSampleSharpe);
  }

  /**
   * 堅牢性スコアを計算
   */
  private calculateRobustnessScore(inSample: BacktestResult, outOfSample: BacktestResult, config: WalkForwardAnalysisConfig): number {
    // 複数の指標を組み合わせた堅牢性スコア
    const sharpeRatioScore = Math.max(0, Math.min(1, (outOfSample.sharpeRatio || 0) + 1)); // -1~+∞を0~1に正規化
    const drawdownScore = Math.max(0, 1 - (outOfSample.maxDrawdown / config.minPerformanceThreshold.maxDrawdown));
    const returnScore = Math.max(0, Math.min(1, (outOfSample.totalReturn / config.minPerformanceThreshold.totalReturn) + 0.5)); // 50%を基準に正規化
    const winRateScore = Math.max(0, Math.min(1, outOfSample.winRate / config.minPerformanceThreshold.winRate));
    
    // 平均を取る（重みは等しい）
    return (sharpeRatioScore + drawdownScore + returnScore + winRateScore) / 4;
  }

  /**
   * 有効性を評価
   */
  private evaluateValidity(outOfSample: BacktestResult, config: WalkForwardAnalysisConfig): boolean {
    // 各種指標が閾値以上であることを確認
    const meetsSharpeThreshold = (outOfSample.sharpeRatio || 0) >= config.minPerformanceThreshold.sharpeRatio;
    const meetsDrawdownThreshold = outOfSample.maxDrawdown <= config.minPerformanceThreshold.maxDrawdown;
    const meetsReturnThreshold = outOfSample.totalReturn >= config.minPerformanceThreshold.totalReturn;
    const meetsWinRateThreshold = outOfSample.winRate >= config.minPerformanceThreshold.winRate;
    
    return meetsSharpeThreshold && meetsDrawdownThreshold && meetsReturnThreshold && meetsWinRateThreshold;
  }

  /**
   * 全体メトリクスを計算
   */
  private calculateOverallMetrics(results: WalkForwardResult['periodResults'], config: WalkForwardAnalysisConfig): WalkForwardResult['overallMetrics'] {
    if (results.length === 0) {
      return {
        avgSharpeRatio: 0,
        avgMaxDrawdown: 0,
        avgTotalReturn: 0,
        avgWinRate: 0,
        avgPerformanceDegradation: 0,
        overallRobustnessScore: 0
      };
    }
    
    const validResults = results.filter(r => r.isValid);
    
    if (validResults.length === 0) {
      // 有効な結果がない場合、全体を0として返す
      return {
        avgSharpeRatio: 0,
        avgMaxDrawdown: 0,
        avgTotalReturn: 0,
        avgWinRate: 0,
        avgPerformanceDegradation: 0,
        overallRobustnessScore: 0
      };
    }
    
    // 有効な結果のみで平均を計算
    const avgSharpeRatio = validResults.reduce((sum, r) => sum + (r.outOfSample.sharpeRatio || 0), 0) / validResults.length;
    const avgMaxDrawdown = validResults.reduce((sum, r) => sum + r.outOfSample.maxDrawdown, 0) / validResults.length;
    const avgTotalReturn = validResults.reduce((sum, r) => sum + r.outOfSample.totalReturn, 0) / validResults.length;
    const avgWinRate = validResults.reduce((sum, r) => sum + r.outOfSample.winRate, 0) / validResults.length;
    const avgPerformanceDegradation = results.reduce((sum, r) => sum + r.performanceDegradation, 0) / results.length;
    const overallRobustnessScore = validResults.reduce((sum, r) => sum + r.robustnessScore, 0) / validResults.length;
    
    return {
      avgSharpeRatio,
      avgMaxDrawdown,
      avgTotalReturn,
      avgWinRate,
      avgPerformanceDegradation,
      overallRobustnessScore
    };
  }

  /**
   * おすすめを生成
   */
  private generateRecommendations(results: WalkForwardResult['periodResults'], metrics: WalkForwardResult['overallMetrics'], config: WalkForwardAnalysisConfig): string[] {
    const recommendations: string[] = [];
    
    // 堅牢性が低い場合
    if (metrics.overallRobustnessScore < 0.6) {
      recommendations.push('Strategy shows low robustness. Consider simplifying the strategy or increasing the out-of-sample period.');
    }
    
    // 性能劣化が大きい場合
    if (metrics.avgPerformanceDegradation > 0.3) {
      recommendations.push('Significant performance degradation detected. The strategy may be overfitted to in-sample data.');
    }
    
    // シャープレシオが低い場合
    if (metrics.avgSharpeRatio < 0.5) {
      recommendations.push('Low Sharpe ratio indicates poor risk-adjusted returns. Consider improving the strategy or reducing risk.');
    }
    
    // 最大ドローダウンが大きい場合
    if (metrics.avgMaxDrawdown > 0.2) { // 20%以上
      recommendations.push('High maximum drawdown detected. Consider implementing stricter risk controls.');
    }
    
    // 有効な期間が少ない場合
    const validPeriods = results.filter(r => r.isValid).length;
    const totalPeriods = results.length;
    if (validPeriods / totalPeriods < 0.7) { // 70%未満
      recommendations.push('Low percentage of valid periods. The strategy may not be robust across different market conditions.');
    }
    
    // 推奨パラメータの安定性
    if (results.length > 1) {
      // パラメータの変動が大きい場合
      // （実際には各期間のパラメータを比較するロジックが必要）
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Strategy shows consistent performance across walk-forward periods. Consider deploying with current parameters.');
    }
    
    return recommendations;
  }
}

export const walkForwardAnalysisService = new WalkForwardAnalysisService();