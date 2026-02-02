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



}

// ============================================================================
// Example 2: Monte Carlo Simulation
// ============================================================================

export async function monteCarloSimulation(
  strategy: Strategy,
  data: OHLCV[],
  symbol: string
): Promise<void> {

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

  const config: Partial<RealisticBacktestConfig> = {
    initialCapital: 100000,
    commission: 0.1,
    slippage: 0.05,
    spread: 0.01,
    useRealisticSlippage: true,
  };

  // Run in-sample backtest
  const engine = new RealisticBacktestEngine(config);
  engine.loadData(symbol, trainData);
  const inSampleResult = await engine.runBacktest(strategy, symbol);

  // Run out-of-sample backtest
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


  if (analysis.warnings.length > 0) {
    analysis.warnings.forEach((warning, i) => {
    });
  }

  if (analysis.recommendations.length > 0) {
    analysis.recommendations.forEach((rec, i) => {
    });
  }

}

// ============================================================================
// Example 4: Complete Workflow with Walk-Forward and Monte Carlo
// ============================================================================

export async function completeWorkflow(
  strategy: Strategy,
  data: OHLCV[],
  symbol: string
): Promise<void> {

  // Step 1: Split data into train/test
  const splitIndex = Math.floor(data.length * 0.7);
  const trainData = data.slice(0, splitIndex);
  const testData = data.slice(splitIndex);


  // Step 2: Run walk-forward analysis
  const wfa = new WalkForwardAnalysis();
  
  const wfResults = await wfa.runWalkForward(data, {
    trainWindowSize: 120,
    testWindowSize: 30,
    stepSize: 30,
    minTrainingSamples: 100,
    retrainFrequency: 1,
  });


  // Step 3: Run realistic backtest on full training data
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


  // Step 4: Run on test data
  engine.loadData(symbol, testData);
  const testResult = await engine.runBacktest(strategy, symbol);


  // Step 5: Check for overfitting
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


  // Step 6: Run Monte Carlo simulation
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


  // Step 7: Final decision
  const passWalkForward = wfResults.overallMetrics.winRate > 70;
  const notOverfitted = !overfitAnalysis.overfit;
  const robustEnough = mcResult.robustnessScore > 0.6;
  const probSuccess = mcResult.probabilityOfSuccess > 0.6;


  const overallPass = passWalkForward && notOverfitted && robustEnough && probSuccess;

  if (!overallPass) {
    overfitAnalysis.recommendations.slice(0, 3).forEach((rec, i) => {
    });
  }

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

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

export default runAllExamples;
