/**
 * strategy-optimization-example.ts
 *
 * 戦略最適化の統合例
 *
 * このファイルは、パラメータ最適化、戦略カタログ、過剰適合検知を
 * 組み合わせて使用する方法を示します。
 */

import { ParameterOptimizer, createDefaultOptimizationConfig } from './optimization/ParameterOptimizer';
import { OptimizationParameter, OptimizationConfig } from './optimization/types';
import { MomentumStrategy, MeanReversionStrategy } from './strategy/StrategyCatalog';
import { OverfittingDetector } from './validation/OverfittingDetector';
import { OHLCV } from '@/app/types';
import { BacktestResult } from './backtest/AdvancedBacktestEngine';
import { logger } from '@/app/core/logger';

// ============================================================================
// Example 1: 単一戦略の最適化
// ============================================================================

/**
 * Momentum戦略のパラメータを最適化する例
 */
export async function optimizeMomentumStrategy(
  data: OHLCV[],
  _backtestConfig: any
): Promise<void> {

  // パラメータ空間を定義
  const parameters: OptimizationParameter[] = [
    { name: 'lookbackPeriod', type: 'discrete', min: 10, max: 50 },
    { name: 'momentumThreshold', type: 'continuous', min: 0.01, max: 0.05 },
    { name: 'exitThreshold', type: 'continuous', min: 0.005, max: 0.025 },
  ];

  // 最適化設定
  const optimizationConfig: OptimizationConfig = {
    ...createDefaultOptimizationConfig(parameters),
    method: 'bayesian',
    maxIterations: 50,
  };

  // オプティマイザーを作成
  const optimizer = new ParameterOptimizer(optimizationConfig);

  // 目的関数
  const objectiveFunction = async (_params: Record<string, number | string>): Promise<number> => {
    return Math.random(); // デモ用のランダムスコア
  };

  // 最適化を実行
  const result = await optimizer.optimize(objectiveFunction);
  logger.info('Optimization result:', result.bestParameters);
}

// ============================================================================
// Example 2: 複数戦略の比較
// ============================================================================

/**
 * 複数の戦略を比較評価する例
 */
export async function compareStrategies(
  data: OHLCV[],
  backtestConfig: any
): Promise<void> {

  const strategies = [
    { name: 'Momentum', template: MomentumStrategy },
    { name: 'Mean Reversion', template: MeanReversionStrategy },
  ];

  const results: Array<{
    name: string;
    result: BacktestResult;
  }> = [];

  // 各戦略を実行
  for (const item of strategies) {
    const result = createMockResult(data, backtestConfig);
    results.push({
      name: item.name,
      result,
    });
  }

  // 結果を比較
  results.forEach(({ name, result }) => {
    logger.info(
      `${name.padEnd(30)} | Return: ${result.metrics.totalReturn.toFixed(2)}% | Sharpe: ${result.metrics.sharpeRatio.toFixed(2)}`
    );
  });
}

// ============================================================================
// Example 3: 過剰適合の検出
// ============================================================================

/**
 * 戦略の過剰適合を検出する例
 */
export async function detectOverfitting(
  data: OHLCV[],
  backtestConfig: any
): Promise<void> {
  const detector = new OverfittingDetector();

  // 各データセットでバックテスト（シミュレーション）
  const trainResult = createMockResult(data.slice(0, 200), backtestConfig);
  const valResult = createMockResult(data.slice(200, 300), backtestConfig);
  const testResult = createMockResult(data.slice(300), backtestConfig);

  // 過剰適合分析 (簡略化されたデモ)
  const parameters = { lookbackPeriod: 20 };
  const evaluateFunction = async () => Math.random();

  const analysis = await detector.detectOverfitting(
    trainResult.metrics.sharpeRatio,
    valResult.metrics.sharpeRatio,
    testResult.metrics.sharpeRatio,
    parameters,
    evaluateFunction
  );

  logger.info('Overfitting analysis score:', analysis.overfittingScore);
}

// ============================================================================
// Helper Functions
// ============================================================================

function createMockResult(data: OHLCV[], config: any): BacktestResult {
  const totalReturn = Math.random() * 40 - 10;
  const sharpeRatio = Math.random() * 3;
  
  return {
    trades: [],
    equityCurve: Array(data.length).fill(0).map((_, i) => 
      config.initialCapital * (1 + totalReturn / 100 * i / data.length)
    ),
    metrics: {
      totalReturn,
      annualizedReturn: totalReturn * 2,
      volatility: 15,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 1.2,
      maxDrawdown: 10,
      maxDrawdownDuration: 30,
      winRate: 55,
      profitFactor: 1.5,
      averageWin: 2,
      averageLoss: -1.5,
      largestWin: 10,
      largestLoss: -8,
      averageTrade: 0.5,
      totalTrades: 50,
      winningTrades: 28,
      losingTrades: 22,
      calmarRatio: totalReturn / 10,
      omegaRatio: 1.3,
    },
    config,
    startDate: data[0].date,
    endDate: data[data.length - 1].date,
    duration: data.length,
  } as any;
}

// ============================================================================
// Main Example Runner
// ============================================================================

/**
 * すべての例を実行
 */
export async function runAllExamples(): Promise<void> {
  // モックデータ生成
  const data: OHLCV[] = Array(365).fill(0).map((_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    open: 100 + Math.sin(i / 30) * 10,
    high: 100 + Math.sin(i / 30) * 10 + 2,
    low: 100 + Math.sin(i / 30) * 10 - 2,
    close: 100 + Math.sin(i / 30) * 10 + (Math.random() - 0.5),
    volume: Math.floor(Math.random() * 1000000),
  }));

  const backtestConfig = {
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.001,
    spread: 0.001,
    maxPositionSize: 1.0,
    maxDrawdown: 0.2,
    allowShort: false,
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 0.02,
  };

  try {
    await optimizeMomentumStrategy(data, backtestConfig);
    await compareStrategies(data, backtestConfig);
    await detectOverfitting(data, backtestConfig);
  } catch (error) {
    logger.error('エラーが発生しました:', error instanceof Error ? error : new Error(String(error)));
  }
}
