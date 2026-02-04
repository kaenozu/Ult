/**
 * WalkForwardAnalyzer.ts
 *
 * ウォークフォワード分析
 * 時系列ベースの検証により、オーバーフィッティングを防止し
 * 戦略の堅牢性を評価します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types';
import { BacktestResult, BacktestConfig, Strategy, StrategyAction, StrategyContext } from './AdvancedBacktestEngine';

// ============================================================================
// Types
// ============================================================================

export interface WalkForwardConfig {
  // トレーニング期間のサイズ（データポイント数）
  trainingSize: number;

  // テスト期間のサイズ（データポイント数）
  testSize: number;

  // ウィンドウの移動方法
  windowType: 'rolling' | 'expanding';

  // 最小データポイント数
  minDataPoints: number;

  // パラメータ最適化の有無
  optimizeParameters: boolean;

  // パラメータ探索範囲
  parameterRanges?: {
    rsiPeriod?: [number, number];
    smaPeriod?: [number, number];
    stopLoss?: [number, number];
    takeProfit?: [number, number];
  };

  // 評価指標
  optimizationMetric: 'sharpe' | 'totalReturn' | 'profitFactor';

  // 並列実行数
  parallelRuns: number;
}

export interface WalkForwardWindow {
  // ウィンドウインデックス
  index: number;

  // トレーニング期間
  trainStart: number;
  trainEnd: number;

  // テスト期間
  testStart: number;
  testEnd: number;

  // トレーニング結果
  trainResult: BacktestResult | null;

  // テスト結果
  testResult: BacktestResult | null;

  // 最適化されたパラメータ
  optimizedParams: Record<string, number>;

  // パフォーマンス低下率
  performanceDegradation: number;
}

export interface WalkForwardReport {
  // 全てのウォークフォワードウィンドウ
  windows: WalkForwardWindow[];

  // 統計サマリー
  summary: WalkForwardSummary;

  // 堅牢性スコア（0-100）
  robustnessScore: number;

  // パラメータ安定性スコア（0-100）
  parameterStability: number;

  // 推奨事項
  recommendations: string[];

  // 詳細分析
  detailedAnalysis: WalkForwardDetailedAnalysis;
}

export interface WalkForwardSummary {
  // インサンプル（トレーニング）平均
  inSample: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  };

  // アウトオブサンプル（テスト）平均
  outOfSample: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  };

  // 一致率（インサンプルとアウトオブサンプルの相関）
  correlation: number;

  // 成功したウィンドウの割合
  successRate: number;

  // 全ウィンドウ数
  totalWindows: number;

  // 有効なウィンドウ数
  validWindows: number;
}

export interface WalkForwardDetailedAnalysis {
  // 月次パフォーマンス
  monthlyPerformance: Map<string, {
    inSampleReturn: number;
    outOfSampleReturn: number;
    difference: number;
  }>;

  // パラメータ感応度
  parameterSensitivity: Map<string, {
    values: number[];
    stdDev: number;
    coefficientOfVariation: number;
  }>;

  // 市場レジーム別パフォーマンス
  regimePerformance: Map<string, {
    bullish: number;
    bearish: number;
    ranging: number;
  }>;

  // 失敗したウィンドウの分析
  failureAnalysis: {
    count: number;
    reasons: string[];
    commonPatterns: string[];
  };
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_WALK_FORWARD_CONFIG: WalkForwardConfig = {
  trainingSize: 252, // 1年（取引日）
  testSize: 63, // 3ヶ月（取引日）
  windowType: 'rolling',
  minDataPoints: 500,
  optimizeParameters: true,
  optimizationMetric: 'sharpe',
  parallelRuns: 1,
};

// ============================================================================
// Walk Forward Analyzer
// ============================================================================

export class WalkForwardAnalyzer extends EventEmitter {
  private config: WalkForwardConfig;

  constructor(config: Partial<WalkForwardConfig> = {}) {
    super();
    this.config = { ...DEFAULT_WALK_FORWARD_CONFIG, ...config };
  }

  /**
   * ウォークフォワード分析を実行
   */
  async runWalkForwardAnalysis(
    data: OHLCV[],
    strategyFactory: (params: Record<string, number>) => Strategy,
    baseConfig: BacktestConfig
  ): Promise<WalkForwardReport> {
    console.log('[WalkForwardAnalyzer] Starting walk-forward analysis');
    console.log(`  Data points: ${data.length}`);
    console.log(`  Training size: ${this.config.trainingSize}`);
    console.log(`  Test size: ${this.config.testSize}`);
    console.log(`  Window type: ${this.config.windowType}`);

    // 最小データポイントチェック
    if (data.length < this.config.minDataPoints) {
      throw new Error(
        `Insufficient data: ${data.length} points (minimum: ${this.config.minDataPoints})`
      );
    }

    const windows: WalkForwardWindow[] = [];
    let windowIndex = 0;
    let startIndex = 0;

    // ウィンドウをスライドさせて分析
    while (startIndex + this.config.trainingSize + this.config.testSize <= data.length) {
      this.emit('progress', {
        current: windowIndex + 1,
        total: Math.floor(
          (data.length - this.config.trainingSize) / this.config.testSize
        ),
        window: windowIndex,
      });

      const window = await this.processWindow(
        data,
        startIndex,
        strategyFactory,
        baseConfig,
        windowIndex
      );

      windows.push(window);
      windowIndex++;

      // ウィンドウを移動
      if (this.config.windowType === 'rolling') {
        startIndex += this.config.testSize;
      } else {
        // expanding: トレーニング期間を拡大
        startIndex += this.config.testSize;
        this.config.trainingSize += this.config.testSize;
      }
    }

    console.log(`[WalkForwardAnalyzer] Completed ${windows.length} windows`);

    // レポートを生成
    const report = this.generateReport(windows, data);

    this.emit('complete', report);

    return report;
  }

  /**
   * 単一のウィンドウを処理
   */
  private async processWindow(
    data: OHLCV[],
    startIndex: number,
    strategyFactory: (params: Record<string, number>) => Strategy,
    baseConfig: BacktestConfig,
    windowIndex: number
  ): Promise<WalkForwardWindow> {
    const trainStart = startIndex;
    const trainEnd = startIndex + this.config.trainingSize;
    const testStart = trainEnd;
    const testEnd = trainEnd + this.config.testSize;

    // トレーニングデータ
    const trainData = data.slice(trainStart, trainEnd);

    // パラメータ最適化
    let optimizedParams: Record<string, number> = {};
    let trainResult: BacktestResult | null = null;

    if (this.config.optimizeParameters) {
      const optimization = await this.optimizeParameters(
        trainData,
        strategyFactory,
        baseConfig
      );
      optimizedParams = optimization.params;
      trainResult = optimization.result;
    } else {
      optimizedParams = {};
      const strategy = strategyFactory({});
      trainResult = await this.runBacktest(trainData, strategy, baseConfig);
    }

    // テストデータ
    const testData = data.slice(testStart, testEnd);
    const strategy = strategyFactory(optimizedParams);
    const testResult = await this.runBacktest(testData, strategy, baseConfig);

    // パフォーマンス低下率を計算
    const performanceDegradation = this.calculatePerformanceDegradation(
      trainResult!,
      testResult
    );

    return {
      index: windowIndex,
      trainStart,
      trainEnd,
      testStart,
      testEnd,
      trainResult,
      testResult,
      optimizedParams,
      performanceDegradation,
    };
  }

  /**
   * パラメータ最適化
   */
  private async optimizeParameters(
    data: OHLCV[],
    strategyFactory: (params: Record<string, number>) => Strategy,
    baseConfig: BacktestConfig
  ): Promise<{ params: Record<string, number>; result: BacktestResult }> {
    // グリッドサーチで最適パラメータを探索
    const ranges = this.config.parameterRanges || {
      rsiPeriod: [10, 20],
      smaPeriod: [20, 50],
    };

    let bestParams: Record<string, number> = {};
    let bestResult: BacktestResult | null = null;
    let bestScore = -Infinity;

    // 簡易実装：RSI期間のみ最適化
    const rsiRange = ranges.rsiPeriod || [10, 20];
    for (let rsi = rsiRange[0]; rsi <= rsiRange[1]; rsi += 2) {
      const params = { rsiPeriod: rsi };
      const strategy = strategyFactory(params);
      const result = await this.runBacktest(data, strategy, baseConfig);

      const score = this.getOptimizationScore(result);
      if (score > bestScore) {
        bestScore = score;
        bestParams = params;
        bestResult = result;
      }
    }

    return { params: bestParams, result: bestResult! };
  }

  /**
   * 最適化スコアを計算
   */
  private getOptimizationScore(result: BacktestResult): number {
    switch (this.config.optimizationMetric) {
      case 'sharpe':
        return result.metrics.sharpeRatio;
      case 'totalReturn':
        return result.metrics.totalReturn;
      case 'profitFactor':
        return result.metrics.profitFactor;
      default:
        return result.metrics.sharpeRatio;
    }
  }

  /**
   * バックテストを実行
   */
  private async runBacktest(
    data: OHLCV[],
    strategy: Strategy,
    config: BacktestConfig
  ): Promise<BacktestResult> {
    // 簡易実装：既存のバックテストエンジンを使用せず、
    // 直接シミュレーションを実行

    const trades: BacktestTrade[] = [];
    let equity = config.initialCapital;
    const equityCurve: number[] = [equity];
    let position: { side: 'LONG' | 'SHORT' | null; entryPrice: number; quantity: number } | null = null;

    for (let i = 50; i < data.length; i++) {
      const context: StrategyContext = {
        currentPosition: position?.side || null,
        entryPrice: position?.entryPrice || 0,
        equity,
        data: data.slice(0, i + 1),
        indicators: new Map(),
      };

      const action = strategy.onData(data[i], i, context);

      if (action.action === 'BUY' && !position) {
        const quantity = Math.floor((equity * 0.2) / data[i].close);
        position = { side: 'LONG', entryPrice: data[i].close, quantity };
      } else if (action.action === 'SELL' && position?.side === 'LONG') {
        const pnl = (data[i].close - position.entryPrice) * position.quantity;
        equity += pnl;
        trades.push({
          entryPrice: position.entryPrice,
          exitPrice: data[i].close,
          pnl,
          pnlPercent: (pnl / (position.entryPrice * position.quantity)) * 100,
        });
        position = null;
      } else if (action.action === 'CLOSE' && position) {
        const pnl = position.side === 'LONG'
          ? (data[i].close - position.entryPrice) * position.quantity
          : (position.entryPrice - data[i].close) * position.quantity;
        equity += pnl;
        trades.push({
          entryPrice: position.entryPrice,
          exitPrice: data[i].close,
          pnl,
          pnlPercent: (pnl / (position.entryPrice * position.quantity)) * 100,
        });
        position = null;
      }

      equityCurve.push(equity);
    }

    // メトリクスを計算
    const metrics = this.calculateMetrics(equityCurve, trades, config);

    return {
      trades,
      equityCurve,
      metrics,
      config,
      startDate: data[0].date,
      endDate: data[data.length - 1].date,
      duration: data.length,
    } as BacktestResult;
  }

  /**
   * メトリクスを計算
   */
  private calculateMetrics(equityCurve: number[], trades: any[], config: BacktestConfig): any {
    const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);
    const totalReturn = ((equityCurve[equityCurve.length - 1] - config.initialCapital) / config.initialCapital) * 100;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    const sharpeRatio = volatility === 0 ? 0 : (avgReturn * 252) / volatility;

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    return { totalReturn, sharpeRatio, maxDrawdown: 0, winRate, profitFactor };
  }

  /**
   * パフォーマンス低下率を計算
   */
  private calculatePerformanceDegradation(
    trainResult: BacktestResult,
    testResult: BacktestResult
  ): number {
    if (trainResult.metrics.totalReturn === 0) return 0;
    return ((trainResult.metrics.totalReturn - testResult.metrics.totalReturn) /
      Math.abs(trainResult.metrics.totalReturn)) * 100;
  }

  /**
   * ウォークフォワードレポートを生成
   */
  private generateReport(windows: WalkForwardWindow[], data: OHLCV[]): WalkForwardReport {
    // 統計サマリーを計算
    const validWindows = windows.filter(w => w.trainResult && w.testResult);

    const summary = this.calculateSummary(validWindows);

    // 堅牢性スコアを計算
    const robustnessScore = this.calculateRobustnessScore(validWindows);

    // パラメータ安定性スコアを計算
    const parameterStability = this.calculateParameterStability(validWindows);

    // 推奨事項を生成
    const recommendations = this.generateRecommendations(
      robustnessScore,
      parameterStability,
      summary
    );

    // 詳細分析
    const detailedAnalysis = this.performDetailedAnalysis(validWindows, data);

    return {
      windows,
      summary,
      robustnessScore,
      parameterStability,
      recommendations,
      detailedAnalysis,
    };
  }

  /**
   * 統計サマリーを計算
   */
  private calculateSummary(windows: WalkForwardWindow[]): WalkForwardSummary {
    const inSampleReturns = windows.map(w => w.trainResult!.metrics.totalReturn);
    const outOfSampleReturns = windows.map(w => w.testResult!.metrics.totalReturn);

    const correlation = this.calculateCorrelation(inSampleReturns, outOfSampleReturns);

    const successRate = windows.filter(w => w.testResult!.metrics.totalReturn > 0).length / windows.length * 100;

    return {
      inSample: {
        totalReturn: this.average(inSampleReturns),
        sharpeRatio: this.average(windows.map(w => w.trainResult!.metrics.sharpeRatio)),
        maxDrawdown: this.average(windows.map(w => w.trainResult!.metrics.maxDrawdown)),
        winRate: this.average(windows.map(w => w.trainResult!.metrics.winRate)),
        profitFactor: this.average(windows.map(w => w.trainResult!.metrics.profitFactor)),
      },
      outOfSample: {
        totalReturn: this.average(outOfSampleReturns),
        sharpeRatio: this.average(windows.map(w => w.testResult!.metrics.sharpeRatio)),
        maxDrawdown: this.average(windows.map(w => w.testResult!.metrics.maxDrawdown)),
        winRate: this.average(windows.map(w => w.testResult!.metrics.winRate)),
        profitFactor: this.average(windows.map(w => w.testResult!.metrics.profitFactor)),
      },
      correlation,
      successRate,
      totalWindows: windows.length,
      validWindows: windows.length,
    };
  }

  /**
   * 相関係数を計算
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const denominator = Math.sqrt(sumX2 * sumY2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 平均値を計算
   */
  private average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 堅牢性スコアを計算
   */
  private calculateRobustnessScore(windows: WalkForwardWindow[]): number {
    // アウトオブサンプルパフォーマンスの安定性
    const returns = windows.map(w => w.testResult!.metrics.totalReturn);
    const avgReturn = this.average(returns);
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stability = Math.max(0, 1 - (Math.sqrt(variance) / Math.abs(avgReturn || 1)));

    // 成功率
    const successRate = windows.filter(w => w.testResult!.metrics.totalReturn > 0).length / windows.length;

    // インサンプル・アウトオブサンプルの相関
    const inSampleReturns = windows.map(w => w.trainResult!.metrics.totalReturn);
    const outOfSampleReturns = windows.map(w => w.testResult!.metrics.totalReturn);
    const correlation = Math.abs(this.calculateCorrelation(inSampleReturns, outOfSampleReturns));

    // 総合スコア（0-100）
    return Math.round((stability * 40 + successRate * 100 * 30 + correlation * 100 * 30));
  }

  /**
   * パラメータ安定性スコアを計算
   */
  private calculateParameterStability(windows: WalkForwardWindow[]): number {
    // パラメータの変動係数を計算
    const paramNames = Object.keys(windows[0].optimizedParams);
    let totalStability = 0;

    for (const paramName of paramNames) {
      const values = windows.map(w => w.optimizedParams[paramName] || 0);
      const mean = this.average(values);
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
      const cv = mean === 0 ? 1 : stdDev / Math.abs(mean);
      totalStability += Math.max(0, 1 - cv);
    }

    return paramNames.length > 0
      ? Math.round((totalStability / paramNames.length) * 100)
      : 50;
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(
    robustnessScore: number,
    parameterStability: number,
    summary: WalkForwardSummary
  ): string[] {
    const recommendations: string[] = [];

    if (robustnessScore >= 80) {
      recommendations.push('戦略は非常に堅牢です。実践での使用が推奨されます。');
    } else if (robustnessScore >= 60) {
      recommendations.push('戦略は良好ですが、追加の検証が推奨されます。');
    } else if (robustnessScore >= 40) {
      recommendations.push('戦略の安定性に懸念があります。パラメータ調整を検討してください。');
    } else {
      recommendations.push('戦略は実践使用に適しません。再設計を推奨します。');
    }

    if (parameterStability < 50) {
      recommendations.push('パラメータが不安定です。過度な最適化の可能性があります。');
    }

    if (summary.outOfSample.totalReturn < summary.inSample.totalReturn * 0.5) {
      recommendations.push('アウトオブサンプルパフォーマンスが著しく低下しています。');
    }

    if (summary.correlation < 0.3) {
      recommendations.push('インサンプルとアウトオブサンプルの相関が低いです。');
    }

    return recommendations;
  }

  /**
   * 詳細分析を実行
   */
  private performDetailedAnalysis(
    windows: WalkForwardWindow[],
    data: OHLCV[]
  ): WalkForwardDetailedAnalysis {
    // 月次パフォーマンス
    const monthlyPerformance = new Map();

    // パラメータ感応度
    const parameterSensitivity = new Map();
    const paramNames = Object.keys(windows[0]?.optimizedParams || {});

    for (const paramName of paramNames) {
      const values = windows.map(w => w.optimizedParams[paramName] || 0);
      const mean = this.average(values);
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
      const cv = mean === 0 ? 1 : stdDev / Math.abs(mean);

      parameterSensitivity.set(paramName, { values, stdDev, coefficientOfVariation: cv });
    }

    // 失敗分析
    const failedWindows = windows.filter(w => (w.testResult?.metrics.totalReturn || 0) < 0);

    return {
      monthlyPerformance,
      parameterSensitivity,
      regimePerformance: new Map(),
      failureAnalysis: {
        count: failedWindows.length,
        reasons: ['Negative out-of-sample return'],
        commonPatterns: [],
      },
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<WalkForwardConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): WalkForwardConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

import { createSingleton } from '@/app/lib/utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<WalkForwardConfig>) => new WalkForwardAnalyzer(config)
);

export const getGlobalWalkForwardAnalyzer = getInstance;
export const resetGlobalWalkForwardAnalyzer = resetInstance;

export default WalkForwardAnalyzer;
