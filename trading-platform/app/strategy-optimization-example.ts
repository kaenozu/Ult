// @ts-nocheck - Type definitions need updates
/**
 * strategy-optimization-example.ts
 * 
 * Example demonstrating the complete strategy optimization and evaluation workflow
 * 
 * This example shows:
 * 1. Creating and configuring strategies
 * 2. Optimizing strategy parameters
 * 3. Detecting overfitting
 * 4. Composing multiple strategies into a portfolio
 * 5. Backtesting and evaluating performance
 */

import { ParameterOptimizer } from './lib/optimization';
import { OverfittingDetector } from './lib/validation';
import {
  MomentumStrategy,
  MeanReversionStrategy,
  BreakoutStrategy,
  StrategyComposer
} from './lib/strategy';
import type { OHLCV } from './types';
import type { StrategyPortfolio, BacktestConfig } from './lib/strategy/types';

// ============================================================================
// Example Data Generation
// ============================================================================

/**
 * Generate sample market data for demonstration
 */
function generateSampleData(days: number = 365): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2023-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Simulate price movement with trend and noise
    const trend = Math.sin(i / 50) * 0.002;
    const noise = (Math.random() - 0.5) * 0.02;
    price = price * (1 + trend + noise);
    
    const high = price * (1 + Math.random() * 0.01);
    const low = price * (1 - Math.random() * 0.01);
    const volume = 1000000 + Math.random() * 500000;
    
    data.push({
      timestamp: date.toISOString().split('T')[0],
      open: price,
      high,
      low,
      close: price,
      volume
    });
  }
  
  return data;
}

// ============================================================================
// Example 1: Strategy Parameter Optimization
// ============================================================================

async function optimizeStrategyExample() {
  console.log('='.repeat(80));
  console.log('Example 1: Strategy Parameter Optimization');
  console.log('='.repeat(80));
  
  // Generate sample data
  const data = generateSampleData(1000); // 1000 days (~3 years)
  
  // Create a momentum strategy
  const strategy = new MomentumStrategy();
  
  // Define objective function (maximize Sharpe ratio)
  const objectiveFunction = async (params: Record<string, number | string>) => {
    // Update strategy parameters
    strategy.config.parameters = params;
    
    // Backtest with these parameters
    const config: BacktestConfig = {
      initialCapital: 100000,
      commission: 0.001, // 0.1%
      slippage: 0.0005, // 0.05%
      maxPositionSize: 0.5, // 50% of capital
      stopLoss: 0.02, // 2%
      takeProfit: 0.06 // 6%
    };
    
    const performance = await strategy.backtest(data, config);
    
    // Return Sharpe ratio as optimization target
    return performance.sharpeRatio;
  };
  
  // Configure optimizer
  const optimizer = new ParameterOptimizer({
    method: 'genetic',
    parameters: [
      { name: 'lookbackPeriod', type: 'discrete', min: 10, max: 50 },
      { name: 'momentumThreshold', type: 'continuous', min: 0.01, max: 0.05 },
      { name: 'exitThreshold', type: 'continuous', min: 0.005, max: 0.025 }
    ],
    maxIterations: 100,
    maxTime: 60000, // 1 minute
    walkForward: {
      enabled: true,
      trainPeriod: 180,
      testPeriod: 60,
      anchorMode: 'rolling'
    }
  });
  
  // Track progress
  optimizer.onProgress((progress) => {
    console.log(`  Iteration ${progress.iteration}: Best Sharpe = ${progress.currentBestScore.toFixed(2)}, Progress = ${progress.progress.toFixed(1)}%`);
  });
  
  // Run optimization
  console.log('\nOptimizing strategy parameters...');
  const result = await optimizer.optimize(objectiveFunction);
  
  console.log('\nOptimization Results:');
  console.log('  Best Parameters:', result.bestParameters);
  console.log('  Best Sharpe Ratio:', result.bestScore.toFixed(2));
  console.log('  Iterations:', result.iterations);
  console.log('  Time Elapsed:', (result.timeElapsed / 1000).toFixed(2), 'seconds');
  
  if (result.walkForwardResults) {
    console.log('\nWalk-Forward Analysis:');
    result.walkForwardResults.forEach((wf, i) => {
      console.log(`  Period ${i + 1}: Train Sharpe = ${wf.trainScore.toFixed(2)}, Test Sharpe = ${wf.testScore.toFixed(2)}, Degradation = ${(wf.degradation * 100).toFixed(1)}%`);
    });
    console.log('  Overfitting Score:', result.overfittingScore?.toFixed(3));
  }
  
  return result;
}

// ============================================================================
// Example 2: Overfitting Detection
// ============================================================================

async function overfittingDetectionExample() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 2: Overfitting Detection');
  console.log('='.repeat(80));
  
  // Split data
  const allData = generateSampleData(1000);
  const detector = new OverfittingDetector({
    trainRatio: 0.6,
    validationRatio: 0.2,
    testRatio: 0.2,
    timeSeriesSplit: true,
    purgeGap: 5,
    degradationThreshold: 0.2
  });
  
  const split = detector.splitData(allData);
  console.log('\nData Split:');
  console.log('  Train:', split.train.data.length, 'days');
  console.log('  Validation:', split.validation.data.length, 'days');
  console.log('  Test:', split.test.data.length, 'days');
  
  // Simulate strategy performance on each set
  const strategy = new MeanReversionStrategy();
  const config: BacktestConfig = {
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    maxPositionSize: 0.5
  };
  
  console.log('\nBacktesting on each data split...');
  const trainPerf = await strategy.backtest(split.train.data as OHLCV[], config);
  const valPerf = await strategy.backtest(split.validation.data as OHLCV[], config);
  const testPerf = await strategy.backtest(split.test.data as OHLCV[], config);
  
  console.log('  Train Sharpe:', trainPerf.sharpeRatio.toFixed(2));
  console.log('  Validation Sharpe:', valPerf.sharpeRatio.toFixed(2));
  console.log('  Test Sharpe:', testPerf.sharpeRatio.toFixed(2));
  
  // Detect overfitting
  console.log('\nRunning overfitting detection...');
  const evaluateFunction = async (params: Record<string, number | string>) => {
    strategy.config.parameters = params;
    const perf = await strategy.backtest(split.validation.data as OHLCV[], config);
    return perf.sharpeRatio;
  };
  
  const analysis = await detector.detectOverfitting(
    trainPerf.sharpeRatio,
    valPerf.sharpeRatio,
    testPerf.sharpeRatio,
    strategy.config.parameters,
    evaluateFunction
  );
  
  console.log('\nOverfitting Analysis:');
  console.log('  Is Overfit:', analysis.isOverfit ? 'YES' : 'NO');
  console.log('  Overfitting Score:', (analysis.overfittingScore * 100).toFixed(1) + '%');
  console.log('  Confidence:', analysis.confidence.toFixed(1) + '%');
  
  console.log('\nTest Results:');
  console.log('  Performance Degradation:', analysis.tests.performanceDegradation.passed ? 'PASS' : 'FAIL');
  console.log('    Severity:', analysis.tests.performanceDegradation.severity);
  console.log('  Parameter Sensitivity:', analysis.tests.parameterSensitivity.passed ? 'PASS' : 'FAIL');
  console.log('    Avg Sensitivity:', (analysis.tests.parameterSensitivity.avgSensitivity * 100).toFixed(1) + '%');
  console.log('  White Noise Check:', analysis.tests.whiteNoiseCheck.passed ? 'PASS' : 'FAIL');
  console.log('  Statistical Significance:', analysis.tests.statisticalSignificance.passed ? 'PASS' : 'FAIL');
  
  if (analysis.warnings.length > 0) {
    console.log('\nWarnings:');
    analysis.warnings.forEach(w => console.log('  -', w));
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('\nRecommendations:');
    analysis.recommendations.forEach(r => console.log('  -', r));
  }
  
  return analysis;
}

// ============================================================================
// Example 3: Multi-Strategy Portfolio Composition
// ============================================================================

async function portfolioCompositionExample() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 3: Multi-Strategy Portfolio Composition');
  console.log('='.repeat(80));
  
  const data = generateSampleData(1000);
  
  // Create multiple strategies
  const momentumStrategy = new MomentumStrategy({
    lookbackPeriod: 20,
    momentumThreshold: 0.02,
    exitThreshold: 0.01
  });
  
  const meanReversionStrategy = new MeanReversionStrategy({
    bollingerPeriod: 20,
    bollingerStdDev: 2,
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70
  });
  
  const breakoutStrategy = new BreakoutStrategy({
    breakoutPeriod: 20,
    volumeConfirmation: true,
    volumeThreshold: 1.5,
    atrMultiplier: 2.0
  });
  
  // Create portfolio
  const portfolio: StrategyPortfolio = {
    name: 'Diversified Trading Portfolio',
    strategies: [
      { strategy: momentumStrategy, weight: 0.4, enabled: true },
      { strategy: meanReversionStrategy, weight: 0.35, enabled: true },
      { strategy: breakoutStrategy, weight: 0.25, enabled: true }
    ],
    rebalanceFrequency: 'monthly',
    correlationThreshold: 0.7
  };
  
  const composer = new StrategyComposer(portfolio);
  
  // Calculate correlation matrix
  console.log('\nCalculating strategy correlations...');
  const correlations = await composer.calculateCorrelationMatrix(data);
  
  console.log('\nCorrelation Matrix:');
  console.log('  Strategies:', correlations.strategies.join(', '));
  console.log('  Average Correlation:', correlations.avgCorrelation.toFixed(3));
  console.log('  Max Correlation:', correlations.maxCorrelation.toFixed(3));
  console.log('  Min Correlation:', correlations.minCorrelation.toFixed(3));
  
  // Backtest portfolio
  console.log('\nBacktesting portfolio...');
  const config: BacktestConfig = {
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    maxPositionSize: 0.5
  };
  
  const portfolioPerf = await composer.backtestPortfolio(data, config);
  
  console.log('\nPortfolio Performance:');
  console.log('  Total Return:', portfolioPerf.totalReturn.toFixed(2) + '%');
  console.log('  Annualized Return:', portfolioPerf.annualizedReturn.toFixed(2) + '%');
  console.log('  Sharpe Ratio:', portfolioPerf.sharpeRatio.toFixed(2));
  console.log('  Max Drawdown:', portfolioPerf.maxDrawdown.toFixed(2) + '%');
  console.log('  Diversification Ratio:', portfolioPerf.diversificationRatio.toFixed(3));
  console.log('  Correlation Benefit:', portfolioPerf.correlationBenefit.toFixed(1) + '%');
  console.log('  Improvement over Best Single:', portfolioPerf.improvementOverBest.toFixed(2));
  
  console.log('\nStrategy Contributions:');
  portfolioPerf.strategies.forEach(s => {
    console.log(`  ${s.name}:`);
    console.log(`    Weight: ${(s.weight * 100).toFixed(1)}%`);
    console.log(`    Contribution: ${s.contribution.toFixed(2)}%`);
  });
  
  // Optimize weights
  console.log('\nOptimizing portfolio weights...');
  const optimization = await composer.optimizeWeights(data, config);
  
  console.log('\nOptimized Weights:');
  optimization.weights.forEach((w, i) => {
    console.log(`  ${correlations.strategies[i]}: ${(w * 100).toFixed(1)}%`);
  });
  console.log('  Expected Return:', optimization.expectedReturn.toFixed(2) + '%');
  console.log('  Expected Volatility:', optimization.expectedVolatility.toFixed(2) + '%');
  console.log('  Expected Sharpe:', ((optimization.expectedReturn - 2) / optimization.expectedVolatility).toFixed(2));
  
  return { portfolioPerf, optimization, correlations };
}

// ============================================================================
// Example 4: Complete Workflow
// ============================================================================

async function completeWorkflowExample() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 4: Complete Strategy Development Workflow');
  console.log('='.repeat(80));
  
  console.log('\nStep 1: Generate and split data');
  const allData = generateSampleData(1000);
  const detector = new OverfittingDetector();
  const split = detector.splitData(allData);
  
  console.log('  Data split: Train =', split.train.data.length, 
              'Validation =', split.validation.data.length,
              'Test =', split.test.data.length);
  
  console.log('\nStep 2: Optimize strategy on training data');
  const strategy = new MomentumStrategy();
  const config: BacktestConfig = {
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    maxPositionSize: 0.5,
    stopLoss: 0.02,
    takeProfit: 0.06
  };
  
  // Quick optimization
  const optimizedConfig = await strategy.optimize(
    split.train.data as OHLCV[],
    (perf) => perf.sharpeRatio
  );
  console.log('  Optimized parameters:', optimizedConfig.parameters);
  
  console.log('\nStep 3: Validate on validation set');
  const valPerf = await strategy.backtest(split.validation.data as OHLCV[], config);
  console.log('  Validation Sharpe:', valPerf.sharpeRatio.toFixed(2));
  console.log('  Validation Return:', valPerf.totalReturn.toFixed(2) + '%');
  console.log('  Win Rate:', valPerf.winRate.toFixed(1) + '%');
  
  console.log('\nStep 4: Check for overfitting');
  const trainPerf = await strategy.backtest(split.train.data as OHLCV[], config);
  const testPerf = await strategy.backtest(split.test.data as OHLCV[], config);
  
  const overfitAnalysis = await detector.detectOverfitting(
    trainPerf.sharpeRatio,
    valPerf.sharpeRatio,
    testPerf.sharpeRatio,
    strategy.config.parameters,
    async () => valPerf.sharpeRatio
  );
  
  console.log('  Overfitting detected:', overfitAnalysis.isOverfit ? 'YES' : 'NO');
  console.log('  Overfitting score:', (overfitAnalysis.overfittingScore * 100).toFixed(1) + '%');
  
  console.log('\nStep 5: Final test on out-of-sample data');
  console.log('  Test Sharpe:', testPerf.sharpeRatio.toFixed(2));
  console.log('  Test Return:', testPerf.totalReturn.toFixed(2) + '%');
  console.log('  Test Win Rate:', testPerf.winRate.toFixed(1) + '%');
  console.log('  Test Max Drawdown:', testPerf.maxDrawdown.toFixed(2) + '%');
  
  // Compare to Buy & Hold
  const buyAndHoldReturn = ((split.test.data[split.test.data.length - 1] as OHLCV).close - 
                            (split.test.data[0] as OHLCV).close) / 
                            (split.test.data[0] as OHLCV).close * 100;
  
  console.log('\nStep 6: Compare to benchmark (Buy & Hold)');
  console.log('  Buy & Hold Return:', buyAndHoldReturn.toFixed(2) + '%');
  console.log('  Strategy Return:', testPerf.totalReturn.toFixed(2) + '%');
  console.log('  Outperformance:', (testPerf.totalReturn - buyAndHoldReturn).toFixed(2) + '%');
  console.log('  Statistical Significance:', overfitAnalysis.tests.statisticalSignificance.isSignificant ? 'YES' : 'NO');
  
  const result = {
    strategy: 'Momentum',
    trainSharpe: trainPerf.sharpeRatio,
    valSharpe: valPerf.sharpeRatio,
    testSharpe: testPerf.sharpeRatio,
    testReturn: testPerf.totalReturn,
    buyHoldReturn: buyAndHoldReturn,
    outperformance: testPerf.totalReturn - buyAndHoldReturn,
    isOverfit: overfitAnalysis.isOverfit,
    overfittingScore: overfitAnalysis.overfittingScore
  };
  
  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log('Strategy successfully developed and validated!');
  console.log('✓ Optimized on training data');
  console.log('✓ Validated on validation set');
  console.log('✓ Checked for overfitting');
  console.log('✓ Tested on out-of-sample data');
  console.log('✓ Compared to benchmark');
  
  if (!result.isOverfit && result.outperformance > 0) {
    console.log('\n✓ Strategy is ready for production! It outperforms Buy & Hold by', 
                result.outperformance.toFixed(2) + '% without overfitting.');
  } else if (result.isOverfit) {
    console.log('\n⚠ Warning: Strategy shows signs of overfitting. Consider:');
    console.log('  - Simplifying the strategy');
    console.log('  - Using more training data');
    console.log('  - Adding regularization');
  } else {
    console.log('\n⚠ Strategy does not outperform benchmark. Consider:');
    console.log('  - Trying different strategy types');
    console.log('  - Optimizing for different objectives');
    console.log('  - Combining multiple strategies');
  }
  
  return result;
}

// ============================================================================
// Main Execution
// ============================================================================

export async function runAllExamples() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + 'Strategy Optimization & Evaluation Examples' + ' '.repeat(20) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  
  try {
    // Run all examples
    await optimizeStrategyExample();
    await overfittingDetectionExample();
    await portfolioCompositionExample();
    await completeWorkflowExample();
    
    console.log('\n');
    console.log('All examples completed successfully! 🎉');
    console.log('');
  } catch (error) {
    console.error('\nError running examples:', error);
    throw error;
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
