/**
 * RealisticBacktestingExample.ts
 * 
 * Comprehensive example demonstrating the realistic backtesting environment
 * with Monte Carlo simulation and overfitting detection.
 * 
 * このファイルは、リアルなバックテスト環境の使用例を示します。
 */

import { OHLCV } from '@/app/types';
import { Strategy, BacktestConfig } from './AdvancedBacktestEngine';
import { 
  RealisticBacktestEngine, 
  RealisticBacktestConfig 
} from './RealisticBacktestEngine';
import { 
  MonteCarloSimulator, 
  MonteCarloConfig 
} from './MonteCarloSimulator';
import { 
  OverfittingDetector, 
  ComplexityMetrics 
} from './OverfittingDetector';
import { WalkForwardAnalysis } from './WalkForwardAnalysis';
import { ParameterOptimizer } from '../optimization/ParameterOptimizer';
import { OptimizationConfig } from '../optimization/types';

// ============================================================================
// Example 1: Basic Realistic Backtest
// ============================================================================

export async function basicRealisticBacktest(
  strategy: Strategy,
  data: OHLCV[],
  symbol: string
): Promise<void> {
  console.log('=== Example 1: Basic Realistic Backtest ===\n');

  // Configure realistic backtest
  const config: Partial<RealisticBacktestConfig> = {
    initialCapital: 100000,
    commission: 0.1,
    slippage: 0.05,
    spread: 0.02,
    
    // Enable realistic features
    useRealisticSlippage: true,
    averageDailyVolume: 1000000,
    marketImpactCoefficient: 0.1,
    
    useTimeOfDaySlippage: true,
    marketOpenSlippageMultiplier: 1.5,
    marketCloseSlippageMultiplier: 1.3,
    
    useVolatilitySlippage: true,
    volatilityWindow: 20,
    volatilitySlippageMultiplier: 2.0,
    
    useTieredCommissions: true,
    commissionTiers: [
      { volumeThreshold: 0, rate: 0.1 },
      { volumeThreshold: 100000, rate: 0.08 },
      { volumeThreshold: 500000, rate: 0.05 },
      { volumeThreshold: 1000000, rate: 0.03 },
    ],
  };

  // Create engine and run backtest
  const engine = new RealisticBacktestEngine(config);
  engine.loadData(symbol, data);
  
  const result = await engine.runBacktest(strategy, symbol);

  // Display results
  console.log('Performance Metrics:');
  console.log(`  Total Return: ${result.metrics.totalReturn.toFixed(2)}%`);
  console.log(`  Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}`);
  console.log(`  Max Drawdown: ${result.metrics.maxDrawdown.toFixed(2)}%`);
  console.log(`  Win Rate: ${result.metrics.winRate.toFixed(2)}%`);
  console.log(`  Total Trades: ${result.metrics.totalTrades}`);

  console.log('\nTransaction Costs:');
  console.log(`  Total Commissions: $${result.transactionCosts.totalCommissions.toFixed(2)}`);
  console.log(`  Total Slippage: $${result.transactionCosts.totalSlippage.toFixed(2)}`);
  console.log(`  Total Market Impact: $${result.transactionCosts.totalMarketImpact.toFixed(2)}`);
  console.log(`  Total Spread: $${result.transactionCosts.totalSpread.toFixed(2)}`);

  console.log('\nExecution Quality:');
  console.log(`  Worst Slippage: ${result.executionQuality.worstSlippage.toFixed(4)}%`);
  console.log(`  Best Slippage: ${result.executionQuality.bestSlippage.toFixed(4)}%`);
  console.log(`  Slippage Std Dev: ${result.executionQuality.slippageStdDev.toFixed(4)}%`);

  console.log('\n');
}

// ============================================================================
// Example 2: Monte Carlo Simulation
// ============================================================================

export async function monteCarloSimulation(
  strategy: Strategy,
  data: OHLCV[],
  symbol: string
): Promise<void> {
  console.log('=== Example 2: Monte Carlo Simulation ===\n');

  // Configure Monte Carlo simulation
  const mcConfig: Partial<MonteCarloConfig> = {
    numSimulations: 100,
    confidenceLevel: 0.95,
    resampleMethod: 'bootstrap',
    randomSeed: 12345, // For reproducibility
  };

  const backtestConfig: BacktestConfig = {
    initialCapital: 100000,
    commission: 0.1,
    slippage: 0.05,
    spread: 0.01,
    maxPositionSize: 20,
    maxDrawdown: 50,
    allowShort: false,
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 2,
  };

  // Run simulation
  const simulator = new MonteCarloSimulator(mcConfig);
  const result = await simulator.runSimulation(
    strategy,
    data,
    backtestConfig,
    symbol
  );

  // Display results
  console.log('Monte Carlo Results:');
  console.log(`  Simulations: ${result.simulations.length}`);
  console.log(`  Probability of Success: ${(result.probabilityOfSuccess * 100).toFixed(2)}%`);
  console.log(`  Robustness Score: ${(result.robustnessScore * 100).toFixed(2)}%`);

  console.log('\nReturn Statistics:');
  console.log(`  Mean Return: ${result.statistics.mean.totalReturn.toFixed(2)}%`);
  console.log(`  Median Return: ${result.statistics.median.totalReturn.toFixed(2)}%`);
  console.log(`  Std Dev: ${result.statistics.stdDev.totalReturn.toFixed(2)}%`);

  console.log('\nConfidence Intervals (95%):');
  console.log(`  Return: [${result.statistics.confidenceIntervals.totalReturn.lower.toFixed(2)}%, ${result.statistics.confidenceIntervals.totalReturn.upper.toFixed(2)}%]`);
  console.log(`  Sharpe: [${result.statistics.confidenceIntervals.sharpeRatio.lower.toFixed(2)}, ${result.statistics.confidenceIntervals.sharpeRatio.upper.toFixed(2)}]`);

  console.log('\nPercentiles:');
  console.log(`  5th: ${result.statistics.percentiles.p5.totalReturn.toFixed(2)}%`);
  console.log(`  25th: ${result.statistics.percentiles.p25.totalReturn.toFixed(2)}%`);
  console.log(`  50th: ${result.statistics.percentiles.p50.totalReturn.toFixed(2)}%`);
  console.log(`  75th: ${result.statistics.percentiles.p75.totalReturn.toFixed(2)}%`);
  console.log(`  95th: ${result.statistics.percentiles.p95.totalReturn.toFixed(2)}%`);

  console.log('\nBest/Worst Cases:');
  console.log(`  Best Return: ${result.bestCase.metrics.totalReturn.toFixed(2)}%`);
  console.log(`  Worst Return: ${result.worstCase.metrics.totalReturn.toFixed(2)}%`);

  console.log('\n');
}

// ============================================================================
// Example 3: Overfitting Detection
// ============================================================================

export async function overfittingDetection(
  strategy: Strategy,
  trainData: OHLCV[],
  testData: OHLCV[],
  symbol: string,
  parameters: Record<string, number | string>
): Promise<void> {
  console.log('=== Example 3: Overfitting Detection ===\n');

  const config: Partial<RealisticBacktestConfig> = {
    initialCapital: 100000,
    commission: 0.1,
    slippage: 0.05,
    spread: 0.01,
    useRealisticSlippage: true,
  };

  // Run in-sample backtest
  console.log('Running in-sample backtest...');
  const engine = new RealisticBacktestEngine(config);
  engine.loadData(symbol, trainData);
  const inSampleResult = await engine.runBacktest(strategy, symbol);

  // Run out-of-sample backtest
  console.log('Running out-of-sample backtest...');
  engine.loadData(symbol, testData);
  const outOfSampleResult = await engine.runBacktest(strategy, symbol);

  // Calculate complexity metrics
  const complexity = OverfittingDetector.calculateComplexity(
    inSampleResult,
    Object.keys(parameters).length
  );

  // Analyze overfitting
  const detector = new OverfittingDetector();
  const analysis = detector.analyze(
    inSampleResult,
    outOfSampleResult,
    undefined,
    parameters,
    complexity
  );

  // Display results
  console.log('Overfitting Analysis:');
  console.log(`  Overfitted: ${analysis.overfit ? 'YES' : 'NO'}`);
  console.log(`  Overfitting Score: ${(analysis.overfittingScore * 100).toFixed(2)}%`);
  console.log(`  Confidence: ${(analysis.confidence * 100).toFixed(2)}%`);

  console.log('\nIndicators:');
  console.log(`  Performance Degradation: ${(analysis.indicators.performanceDegradation * 100).toFixed(2)}%`);
  console.log(`  Parameter Instability: ${(analysis.indicators.parameterInstability * 100).toFixed(2)}%`);
  console.log(`  Complexity Penalty: ${(analysis.indicators.complexityPenalty * 100).toFixed(2)}%`);
  console.log(`  Walk-Forward Consistency: ${(analysis.indicators.walkForwardConsistency * 100).toFixed(2)}%`);
  console.log(`  Sharpe Ratio Drop: ${(analysis.indicators.sharpeRatioDrop * 100).toFixed(2)}%`);

  if (analysis.warnings.length > 0) {
    console.log('\nWarnings:');
    analysis.warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }

  if (analysis.recommendations.length > 0) {
    console.log('\nRecommendations:');
    analysis.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }

  console.log('\n');
}

// ============================================================================
// Example 4: Complete Workflow with Walk-Forward and Monte Carlo
// ============================================================================

export async function completeWorkflow(
  strategy: Strategy,
  data: OHLCV[],
  symbol: string
): Promise<void> {
  console.log('=== Example 4: Complete Realistic Backtesting Workflow ===\n');

  // Step 1: Split data into train/test
  const splitIndex = Math.floor(data.length * 0.7);
  const trainData = data.slice(0, splitIndex);
  const testData = data.slice(splitIndex);

  console.log(`Data split: ${trainData.length} train, ${testData.length} test`);

  // Step 2: Run walk-forward analysis
  console.log('\n1. Running Walk-Forward Analysis...');
  const wfa = new WalkForwardAnalysis();
  
  const wfResults = await wfa.runWalkForward(data, {
    trainWindowSize: 120,
    testWindowSize: 30,
    stepSize: 30,
    minTrainingSamples: 100,
    retrainFrequency: 1,
  });

  console.log(`  Completed ${wfResults.results.length} walk-forward periods`);
  console.log(`  Average Return: ${wfResults.overallMetrics.averageReturn.toFixed(2)}%`);
  console.log(`  Average Sharpe: ${wfResults.overallMetrics.averageSharpe.toFixed(2)}`);
  console.log(`  Win Rate: ${wfResults.overallMetrics.winRate.toFixed(2)}%`);

  // Step 3: Run realistic backtest on full training data
  console.log('\n2. Running Realistic Backtest on Training Data...');
  const config: Partial<RealisticBacktestConfig> = {
    initialCapital: 100000,
    useRealisticSlippage: true,
    useTimeOfDaySlippage: true,
    useVolatilitySlippage: true,
    useTieredCommissions: true,
  };

  const engine = new RealisticBacktestEngine(config);
  engine.loadData(symbol, trainData);
  const trainResult = await engine.runBacktest(strategy, symbol);

  console.log(`  Total Return: ${trainResult.metrics.totalReturn.toFixed(2)}%`);
  console.log(`  Sharpe Ratio: ${trainResult.metrics.sharpeRatio.toFixed(2)}`);

  // Step 4: Run on test data
  console.log('\n3. Running on Test Data...');
  engine.loadData(symbol, testData);
  const testResult = await engine.runBacktest(strategy, symbol);

  console.log(`  Total Return: ${testResult.metrics.totalReturn.toFixed(2)}%`);
  console.log(`  Sharpe Ratio: ${testResult.metrics.sharpeRatio.toFixed(2)}`);

  // Step 5: Check for overfitting
  console.log('\n4. Checking for Overfitting...');
  const detector = new OverfittingDetector();
  const complexity = OverfittingDetector.calculateComplexity(trainResult, 5);
  
  const overfitAnalysis = detector.analyze(
    trainResult,
    testResult,
    wfResults.results.map(r => ({
      period: r.windowId,
      trainStart: r.trainStartDate.toISOString(),
      trainEnd: r.trainEndDate.toISOString(),
      testStart: r.testStartDate.toISOString(),
      testEnd: r.testEndDate.toISOString(),
      trainScore: r.trainMetrics.accuracy,
      testScore: r.testMetrics.returns,
      parameters: {},
      degradation: 0
    })),
    undefined,
    complexity
  );

  console.log(`  Overfitting Score: ${(overfitAnalysis.overfittingScore * 100).toFixed(2)}%`);
  console.log(`  Is Overfitted: ${overfitAnalysis.overfit ? 'YES' : 'NO'}`);

  // Step 6: Run Monte Carlo simulation
  console.log('\n5. Running Monte Carlo Simulation...');
  const simulator = new MonteCarloSimulator({
    numSimulations: 100,
    confidenceLevel: 0.95,
    resampleMethod: 'bootstrap',
  });

  const backtestConfig: BacktestConfig = {
    initialCapital: 100000,
    commission: 0.1,
    slippage: 0.05,
    spread: 0.01,
    maxPositionSize: 20,
    maxDrawdown: 50,
    allowShort: false,
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 2,
  };

  const mcResult = await simulator.runSimulation(
    strategy,
    testData,
    backtestConfig,
    symbol
  );

  console.log(`  Probability of Success: ${(mcResult.probabilityOfSuccess * 100).toFixed(2)}%`);
  console.log(`  Robustness Score: ${(mcResult.robustnessScore * 100).toFixed(2)}%`);
  console.log(`  95% CI: [${mcResult.statistics.confidenceIntervals.totalReturn.lower.toFixed(2)}%, ${mcResult.statistics.confidenceIntervals.totalReturn.upper.toFixed(2)}%]`);

  // Step 7: Final decision
  console.log('\n6. Final Assessment:');
  const passWalkForward = wfResults.overallMetrics.winRate > 70;
  const notOverfitted = !overfitAnalysis.overfit;
  const robustEnough = mcResult.robustnessScore > 0.6;
  const probSuccess = mcResult.probabilityOfSuccess > 0.6;

  console.log(`  ✓ Walk-Forward Pass Rate: ${passWalkForward ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Overfitting Check: ${notOverfitted ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Robustness Score: ${robustEnough ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Success Probability: ${probSuccess ? 'PASS' : 'FAIL'}`);

  const overallPass = passWalkForward && notOverfitted && robustEnough && probSuccess;
  console.log(`\n  Overall Verdict: ${overallPass ? '✓ STRATEGY APPROVED' : '✗ NEEDS IMPROVEMENT'}`);

  if (!overallPass) {
    console.log('\n  Top Recommendations:');
    overfitAnalysis.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`    ${i + 1}. ${rec}`);
    });
  }

  console.log('\n');
}

// ============================================================================
// Example Strategy: Simple Moving Average Crossover
// ============================================================================

export function createSMAStrategy(
  shortPeriod: number = 10,
  longPeriod: number = 30
): Strategy {
  return {
    name: `SMA(${shortPeriod}/${longPeriod}) Crossover`,
    description: `Buy when SMA${shortPeriod} crosses above SMA${longPeriod}, sell when crosses below`,
    
    onData: (data, index, context) => {
      if (index < longPeriod) {
        return { action: 'HOLD' };
      }

      const recentData = context.data.slice(Math.max(0, index - longPeriod), index + 1);
      
      // Calculate SMAs
      const shortData = recentData.slice(-shortPeriod);
      const shortSMA = shortData.reduce((sum, d) => sum + d.close, 0) / shortPeriod;
      
      const longSMA = recentData.reduce((sum, d) => sum + d.close, 0) / longPeriod;

      // Previous SMAs
      const prevRecentData = context.data.slice(Math.max(0, index - longPeriod - 1), index);
      const prevShortData = prevRecentData.slice(-shortPeriod);
      const prevShortSMA = prevShortData.reduce((sum, d) => sum + d.close, 0) / shortPeriod;
      const prevLongSMA = prevRecentData.reduce((sum, d) => sum + d.close, 0) / longPeriod;

      // Detect crossover
      const bullishCross = prevShortSMA <= prevLongSMA && shortSMA > longSMA;
      const bearishCross = prevShortSMA >= prevLongSMA && shortSMA < longSMA;

      if (bullishCross && !context.currentPosition) {
        return {
          action: 'BUY',
          quantity: 100,
          stopLoss: data.close * 0.98,
          takeProfit: data.close * 1.04,
        };
      }

      if (bearishCross && context.currentPosition) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  };
}

// ============================================================================
// Main Execution
// ============================================================================

export async function runAllExamples(data: OHLCV[], symbol: string = 'TEST'): Promise<void> {
  const strategy = createSMAStrategy(10, 30);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Realistic Backtesting Environment - Comprehensive Examples   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    await basicRealisticBacktest(strategy, data, symbol);
    await monteCarloSimulation(strategy, data, symbol);
    
    const splitIndex = Math.floor(data.length * 0.7);
    await overfittingDetection(
      strategy,
      data.slice(0, splitIndex),
      data.slice(splitIndex),
      symbol,
      { shortPeriod: 10, longPeriod: 30 }
    );
    
    await completeWorkflow(strategy, data, symbol);

    console.log('✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

export default runAllExamples;
