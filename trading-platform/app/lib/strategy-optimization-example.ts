/**
 * strategy-optimization-example.ts
 *
 * 戦略最適化の統合例
 *
 * このファイルは、パラメータ最適化、戦略カタログ、過剰適合検知を
 * 組み合わせて使用する方法を示します。
 */

import { ParameterOptimizer, createDefaultOptimizationConfig, ParameterSpace } from './optimization/ParameterOptimizer';
import { MomentumStrategy, MeanReversionStrategy, strategyCatalog } from './strategy/StrategyCatalog';
import { overfittingDetector, compareToBuyAndHold } from './validation/OverfittingDetector';
import { OHLCV } from '@/app/types';
import { BacktestConfig, BacktestResult, Strategy } from './backtest/AdvancedBacktestEngine';

// ============================================================================
// Example 1: 単一戦略の最適化
// ============================================================================

/**
 * Momentum戦略のパラメータを最適化する例
 */
import { logger } from '@/app/core/logger';
export async function optimizeMomentumStrategy(
  data: OHLCV[],
  backtestConfig: BacktestConfig
): Promise<void> {

  // パラメータ空間を定義
  const parameterSpace: ParameterSpace[] = [
    { name: 'fastMA', type: 'int', min: 10, max: 30 },
    { name: 'slowMA', type: 'int', min: 40, max: 60 },
    { name: 'rsiPeriod', type: 'int', min: 10, max: 20 },
    { name: 'rsiOverbought', type: 'int', min: 65, max: 80 },
    { name: 'rsiOversold', type: 'int', min: 20, max: 35 },
    { name: 'atrMultiplier', type: 'float', min: 1.5, max: 3.0 },
  ];

  // 最適化設定
  const optimizationConfig = {
    ...createDefaultOptimizationConfig(),
    method: 'bayesian' as const,
    maxIterations: 50,
    objective: 'sharpe' as const,
  };

  // オプティマイザーを作成
  const optimizer = new ParameterOptimizer(parameterSpace, optimizationConfig);

  // 戦略エグゼキュータ（実際のバックテストエンジンを使用）
  const strategyExecutor = async (
    params: Record<string, number | string>,
    data: OHLCV[],
    config: BacktestConfig
  ): Promise<BacktestResult> => {
    const strategy = MomentumStrategy.createStrategy(params);
    // ここで実際のバックテストエンジンを呼び出す
    // return await backtestEngine.run(strategy, data, config);
    
    // デモ用のモックリザルト
    return createMockResult(data, config);
  };

  // 最適化を実行
  const result = await optimizer.optimize(data, strategyExecutor, backtestConfig);

}

// ============================================================================
// Example 2: 複数戦略の比較
// ============================================================================

/**
 * 複数の戦略を比較評価する例
 */
export async function compareStrategies(
  data: OHLCV[],
  backtestConfig: BacktestConfig
): Promise<void> {

  const strategies = [
    MomentumStrategy,
    MeanReversionStrategy,
  ];

  const results: Array<{
    name: string;
    result: BacktestResult;
  }> = [];

  // 各戦略を実行
  for (const strategyTemplate of strategies) {
    const strategy = strategyTemplate.createStrategy(strategyTemplate.defaultParams);
    
    // ここで実際のバックテストエンジンを呼び出す
    const result = createMockResult(data, backtestConfig);
    
    results.push({
      name: strategyTemplate.name,
      result,
    });
  }

  // 結果を比較
  
  results.forEach(({ name, result }) => {
    logger.info(
      name.padEnd(30) +
      `${result.metrics.totalReturn.toFixed(2)}%`.padEnd(15) +
      result.metrics.sharpeRatio.toFixed(2).padEnd(10) +
      `${result.metrics.maxDrawdown.toFixed(2)}%`
    );
  });

  // Buy & Holdと比較
  const buyAndHoldResult = createBuyAndHoldResult(data, backtestConfig);
    logger.info(
      'Buy & Hold'.padEnd(30) +
      `${buyAndHoldResult.metrics.totalReturn.toFixed(2)}%`.padEnd(15) +
      buyAndHoldResult.metrics.sharpeRatio.toFixed(2).padEnd(10) +
      `${buyAndHoldResult.metrics.maxDrawdown.toFixed(2)}%`
    );

  // 統計的優位性を検定
  results.forEach(({ name, result }) => {
    const comparison = compareToBuyAndHold(result, buyAndHoldResult);
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
  backtestConfig: BacktestConfig
): Promise<void> {

  // データを分割
  const trainSize = Math.floor(data.length * 0.6);
  const valSize = Math.floor(data.length * 0.2);
  
  const trainData = data.slice(0, trainSize);
  const valData = data.slice(trainSize, trainSize + valSize);
  const testData = data.slice(trainSize + valSize);


  // 各データセットでバックテスト
  const trainResult = createMockResult(trainData, backtestConfig);
  const valResult = createMockResult(valData, backtestConfig);
  const testResult = createMockResult(testData, backtestConfig);

  // 過剰適合分析
  const analysis = await overfittingDetector.analyzeOverfitting(
    trainResult,
    valResult,
    testResult
  );



  if (analysis.warnings.length > 0) {
  }

  if (analysis.recommendations.length > 0) {
  }
}

// ============================================================================
// Example 4: Walk-Forward検証
// ============================================================================

/**
 * Walk-Forward検証を実行する例
 */
export async function walkForwardValidation(
  data: OHLCV[],
  backtestConfig: BacktestConfig
): Promise<void> {

  const parameterSpace: ParameterSpace[] = [
    { name: 'fastMA', type: 'int', min: 10, max: 30 },
    { name: 'slowMA', type: 'int', min: 40, max: 60 },
  ];

  const optimizationConfig = {
    ...createDefaultOptimizationConfig(),
    method: 'grid' as const,
    maxIterations: 20,
  };

  const optimizer = new ParameterOptimizer(parameterSpace, optimizationConfig);

  const strategyExecutor = async (
    params: Record<string, number | string>,
    data: OHLCV[],
    config: BacktestConfig
  ): Promise<BacktestResult> => {
    return createMockResult(data, config);
  };

  const result = await optimizer.walkForwardValidation(
    data,
    strategyExecutor,
    backtestConfig,
    5 // 5期間
  );


  result.results.forEach((periodResult, i) => {
  });
}

// ============================================================================
// Example 5: パラメータ感応度分析
// ============================================================================

/**
 * パラメータ感応度を分析する例
 */
export async function analyzeSensitivity(
  data: OHLCV[],
  backtestConfig: BacktestConfig
): Promise<void> {

  const baseParams = {
    fastMA: 20,
    slowMA: 50,
    rsiPeriod: 14,
    atrMultiplier: 2.0,
  };

  const strategyExecutor = async (
    params: Record<string, number | string>,
    data: OHLCV[],
    config: BacktestConfig
  ): Promise<BacktestResult> => {
    return createMockResult(data, config);
  };

  const sensitivity = await overfittingDetector.analyzeSensitivity(
    baseParams,
    data,
    strategyExecutor,
    backtestConfig,
    0.2 // ±20%の変動
  );


  sensitivity.forEach(result => {
    logger.info(
      result.parameter.padEnd(20) +
      result.baseScore.toFixed(2).padEnd(15) +
      result.sensitivity.toFixed(4)
    );
  });

}

// ============================================================================
// Helper Functions
// ============================================================================

function createMockResult(data: OHLCV[], config: BacktestConfig): BacktestResult {
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
    startDate: data[0].timestamp,
    endDate: data[data.length - 1].timestamp,
    duration: data.length,
  };
}

function createBuyAndHoldResult(data: OHLCV[], config: BacktestConfig): BacktestResult {
  const startPrice = data[0].close;
  const endPrice = data[data.length - 1].close;
  const totalReturn = ((endPrice - startPrice) / startPrice) * 100;
  
  return {
    trades: [],
    equityCurve: data.map(d => config.initialCapital * (d.close / startPrice)),
    metrics: {
      totalReturn,
      annualizedReturn: totalReturn * (365 / data.length),
      volatility: 18,
      sharpeRatio: totalReturn / 18,
      sortinoRatio: totalReturn / 15,
      maxDrawdown: 20,
      maxDrawdownDuration: 60,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageTrade: 0,
      totalTrades: 1,
      winningTrades: 0,
      losingTrades: 0,
      calmarRatio: totalReturn / 20,
      omegaRatio: 1.0,
    },
    config,
    startDate: data[0].timestamp,
    endDate: data[data.length - 1].timestamp,
    duration: data.length,
  };
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
    timestamp: new Date(2023, 0, i + 1).toISOString(),
    open: 100 + Math.sin(i / 30) * 10,
    high: 100 + Math.sin(i / 30) * 10 + 2,
    low: 100 + Math.sin(i / 30) * 10 - 2,
    close: 100 + Math.sin(i / 30) * 10 + (Math.random() - 0.5),
    volume: Math.floor(Math.random() * 1000000),
  }));

  const backtestConfig: BacktestConfig = {
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
    await walkForwardValidation(data, backtestConfig);
    await analyzeSensitivity(data, backtestConfig);
  } catch (error) {
    logger.error('エラーが発生しました:', error);
  }

}

// コマンドラインから実行する場合
if (require.main === module) {
  runAllExamples().catch(console.error);
}
