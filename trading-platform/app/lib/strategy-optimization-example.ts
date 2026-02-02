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
export async function optimizeMomentumStrategy(
  data: OHLCV[],
  backtestConfig: BacktestConfig
): Promise<void> {
  console.log('=== Example 1: Momentum戦略の最適化 ===\n');

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
  console.log('最適化を開始...');
  const result = await optimizer.optimize(data, strategyExecutor, backtestConfig);

  console.log('\n最適化結果:');
  console.log(`最良パラメータ: ${JSON.stringify(result.bestParams, null, 2)}`);
  console.log(`最良スコア (Sharpe Ratio): ${result.bestScore.toFixed(2)}`);
  console.log(`検証スコア: ${result.validationScore.toFixed(2)}`);
  console.log(`テストスコア: ${result.testScore?.toFixed(2) || 'N/A'}`);
  console.log(`計算時間: ${(result.computationTime / 1000).toFixed(2)}秒`);
  console.log(`過剰適合警告: ${result.overfittingWarning ? 'あり' : 'なし'}`);
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
  console.log('\n=== Example 2: 複数戦略の比較 ===\n');

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
    console.log(`${strategyTemplate.name} を実行中...`);
    const strategy = strategyTemplate.createStrategy(strategyTemplate.defaultParams);
    
    // ここで実際のバックテストエンジンを呼び出す
    const result = createMockResult(data, backtestConfig);
    
    results.push({
      name: strategyTemplate.name,
      result,
    });
  }

  // 結果を比較
  console.log('\n戦略比較:');
  console.log('─'.repeat(80));
  console.log('戦略名'.padEnd(30) + 'Total Return'.padEnd(15) + 'Sharpe'.padEnd(10) + 'Max DD');
  console.log('─'.repeat(80));
  
  results.forEach(({ name, result }) => {
    console.log(
      name.padEnd(30) +
      `${result.metrics.totalReturn.toFixed(2)}%`.padEnd(15) +
      result.metrics.sharpeRatio.toFixed(2).padEnd(10) +
      `${result.metrics.maxDrawdown.toFixed(2)}%`
    );
  });

  // Buy & Holdと比較
  const buyAndHoldResult = createBuyAndHoldResult(data, backtestConfig);
  console.log('─'.repeat(80));
  console.log(
    'Buy & Hold'.padEnd(30) +
    `${buyAndHoldResult.metrics.totalReturn.toFixed(2)}%`.padEnd(15) +
    buyAndHoldResult.metrics.sharpeRatio.toFixed(2).padEnd(10) +
    `${buyAndHoldResult.metrics.maxDrawdown.toFixed(2)}%`
  );

  // 統計的優位性を検定
  console.log('\n統計的優位性検定:');
  results.forEach(({ name, result }) => {
    const comparison = compareToBuyAndHold(result, buyAndHoldResult);
    console.log(`${name}: ${comparison.outperforms ? '✓ 統計的に優位' : '✗ 優位性なし'}`);
    console.log(`  - Return Advantage: ${comparison.advantage.returnAdvantage.toFixed(2)}%`);
    console.log(`  - Sharpe Advantage: ${comparison.advantage.sharpeAdvantage.toFixed(2)}`);
    console.log(`  - Significance: ${(comparison.significance * 100).toFixed(1)}%`);
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
  console.log('\n=== Example 3: 過剰適合の検出 ===\n');

  // データを分割
  const trainSize = Math.floor(data.length * 0.6);
  const valSize = Math.floor(data.length * 0.2);
  
  const trainData = data.slice(0, trainSize);
  const valData = data.slice(trainSize, trainSize + valSize);
  const testData = data.slice(trainSize + valSize);

  console.log('データ分割:');
  console.log(`  Train: ${trainData.length} days`);
  console.log(`  Validation: ${valData.length} days`);
  console.log(`  Test: ${testData.length} days`);

  // 各データセットでバックテスト
  const trainResult = createMockResult(trainData, backtestConfig);
  const valResult = createMockResult(valData, backtestConfig);
  const testResult = createMockResult(testData, backtestConfig);

  // 過剰適合分析
  console.log('\n過剰適合分析を実行中...');
  const analysis = await overfittingDetector.analyzeOverfitting(
    trainResult,
    valResult,
    testResult
  );

  console.log('\n分析結果:');
  console.log(`過剰適合: ${analysis.isOverfit ? 'あり' : 'なし'}`);
  console.log(`確信度: ${(analysis.confidence * 100).toFixed(1)}%`);

  console.log('\nメトリクス:');
  console.log(`  Train-Test Gap: ${(analysis.metrics.trainTestGap * 100).toFixed(1)}%`);
  console.log(`  統計的優位性 (p-value): ${analysis.metrics.statisticalSignificance.toFixed(3)}`);
  console.log(`  ホワイトノイズ検定: ${analysis.metrics.whiteNoiseTest ? 'Pass' : 'Fail'}`);
  console.log(`  情報比率: ${analysis.metrics.informationRatio.toFixed(2)}`);
  console.log(`  安定性スコア: ${analysis.metrics.stabilityScore.toFixed(2)}`);

  if (analysis.warnings.length > 0) {
    console.log('\n警告:');
    analysis.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
  }

  if (analysis.recommendations.length > 0) {
    console.log('\n推奨事項:');
    analysis.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
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
  console.log('\n=== Example 4: Walk-Forward検証 ===\n');

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

  console.log('Walk-Forward検証を実行中...');
  const result = await optimizer.walkForwardValidation(
    data,
    strategyExecutor,
    backtestConfig,
    5 // 5期間
  );

  console.log('\nWalk-Forward結果:');
  console.log(`期間数: ${result.results.length}`);
  console.log(`平均Sharpe Ratio: ${result.averageScore.toFixed(2)}`);
  console.log(`安定性: ${result.stability.toFixed(2)}`);

  console.log('\n各期間の結果:');
  result.results.forEach((periodResult, i) => {
    console.log(`  期間 ${i + 1}: Sharpe ${periodResult.metrics.sharpeRatio.toFixed(2)}, Return ${periodResult.metrics.totalReturn.toFixed(2)}%`);
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
  console.log('\n=== Example 5: パラメータ感応度分析 ===\n');

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

  console.log('パラメータ感応度分析を実行中...');
  const sensitivity = await overfittingDetector.analyzeSensitivity(
    baseParams,
    data,
    strategyExecutor,
    backtestConfig,
    0.2 // ±20%の変動
  );

  console.log('\n感応度分析結果（高い順）:');
  console.log('─'.repeat(60));
  console.log('パラメータ'.padEnd(20) + 'ベーススコア'.padEnd(15) + '感応度');
  console.log('─'.repeat(60));

  sensitivity.forEach(result => {
    console.log(
      result.parameter.padEnd(20) +
      result.baseScore.toFixed(2).padEnd(15) +
      result.sensitivity.toFixed(4)
    );
  });

  console.log('\n💡 感応度が高いパラメータは慎重に調整してください');
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

  console.log('戦略最適化の統合例');
  console.log('='.repeat(80));

  try {
    await optimizeMomentumStrategy(data, backtestConfig);
    await compareStrategies(data, backtestConfig);
    await detectOverfitting(data, backtestConfig);
    await walkForwardValidation(data, backtestConfig);
    await analyzeSensitivity(data, backtestConfig);
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('すべての例を完了しました！');
}

// コマンドラインから実行する場合
if (require.main === module) {
  runAllExamples().catch(console.error);
}
