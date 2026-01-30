/**
 * ParameterOptimizer.ts
 *
 * パラメータ最適化エンジン
 * グリッドサーチ、遺伝的アルゴリズム、Walk-forward最適化を提供します。
 */

import { EventEmitter } from 'events';
import { OHLCV, BacktestResult } from '@/app/types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { RSI_CONFIG, SMA_CONFIG, BACKTEST_CONFIG } from '../constants';

// ============================================================================
// Types
// ============================================================================

export interface ParameterSpace {
  rsiPeriod: { min: number; max: number; step: number };
  smaPeriod: { min: number; max: number; step: number };
  stopLoss: { min: number; max: number; step: number };
  takeProfit: { min: number; max: number; step: number };
}

export interface OptimizationConfig {
  method: 'grid_search' | 'genetic' | 'random_search' | 'bayesian';
  objective: 'sharpe' | 'total_return' | 'win_rate' | 'profit_factor' | 'calmar' | 'custom';
  maxIterations: number;
  validationSplit: number; // 0-1, for walk-forward
  trainSize: number; // Number of data points for training
  testSize: number; // Number of data points for testing
  useWalkForward: boolean;
  walkForwardWindows: number;
  earlyStopping: boolean;
  earlyStoppingPatience: number;
  constraints: {
    minTrades: number;
    maxDrawdown: number;
    minWinRate: number;
  };
}

export interface ParameterSet {
  rsiPeriod: number;
  smaPeriod: number;
  stopLoss: number;
  takeProfit: number;
}

export interface OptimizationResult {
  bestParams: ParameterSet;
  bestScore: number;
  allResults: Array<{
    params: ParameterSet;
    score: number;
    backtestResult: BacktestResult;
  }>;
  walkForwardResults?: WalkForwardResult[];
  optimizationTime: number;
  iterations: number;
  converged: boolean;
}

export interface WalkForwardResult {
  window: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  trainScore: number;
  testScore: number;
  trainParams: ParameterSet;
  overfitRatio: number;
}

export interface GeneticConfig {
  populationSize: number;
  generations: number;
  crossoverRate: number;
  mutationRate: number;
  elitismCount: number;
  tournamentSize: number;
}

export interface Individual {
  params: ParameterSet;
  fitness: number;
  backtestResult?: BacktestResult;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  method: 'grid_search',
  objective: 'sharpe',
  maxIterations: 1000,
  validationSplit: 0.3,
  trainSize: 252,
  testSize: 63,
  useWalkForward: false,
  walkForwardWindows: 5,
  earlyStopping: true,
  earlyStoppingPatience: 50,
  constraints: {
    minTrades: 10,
    maxDrawdown: 30,
    minWinRate: 30,
  },
};

export const DEFAULT_GENETIC_CONFIG: GeneticConfig = {
  populationSize: 50,
  generations: 100,
  crossoverRate: 0.8,
  mutationRate: 0.1,
  elitismCount: 5,
  tournamentSize: 3,
};

export const DEFAULT_PARAMETER_SPACE: ParameterSpace = {
  rsiPeriod: { min: 7, max: 21, step: 2 },
  smaPeriod: { min: 10, max: 50, step: 5 },
  stopLoss: { min: 0.02, max: 0.1, step: 0.01 },
  takeProfit: { min: 0.03, max: 0.15, step: 0.01 },
};

// ============================================================================
// Parameter Optimizer
// ============================================================================

export class ParameterOptimizer extends EventEmitter {
  private config: OptimizationConfig;
  private geneticConfig: GeneticConfig;
  private parameterSpace: ParameterSpace;

  constructor(
    config: Partial<OptimizationConfig> = {},
    geneticConfig: Partial<GeneticConfig> = {},
    parameterSpace: Partial<ParameterSpace> = {}
  ) {
    super();
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    this.geneticConfig = { ...DEFAULT_GENETIC_CONFIG, ...geneticConfig };
    this.parameterSpace = { ...DEFAULT_PARAMETER_SPACE, ...parameterSpace };
  }

  /**
   * パラメータ最適化を実行
   */
  async optimize(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa'
  ): Promise<OptimizationResult> {
    const startTime = performance.now();
    
    console.log(`[ParameterOptimizer] Starting ${this.config.method} optimization for ${symbol}`);
    this.emit('optimization_start', { symbol, method: this.config.method });

    let result: OptimizationResult;

    switch (this.config.method) {
      case 'grid_search':
        result = await this.gridSearch(symbol, data, market);
        break;
      case 'genetic':
        result = await this.geneticAlgorithm(symbol, data, market);
        break;
      case 'random_search':
        result = await this.randomSearch(symbol, data, market);
        break;
      case 'bayesian':
        result = await this.bayesianOptimization(symbol, data, market);
        break;
      default:
        throw new Error(`Unknown optimization method: ${this.config.method}`);
    }

    // Run walk-forward analysis if enabled
    if (this.config.useWalkForward) {
      result.walkForwardResults = await this.walkForwardAnalysis(
        symbol,
        data,
        market,
        result.bestParams
      );
    }

    result.optimizationTime = performance.now() - startTime;
    
    console.log(`[ParameterOptimizer] Optimization completed in ${result.optimizationTime.toFixed(2)}ms`);
    this.emit('optimization_complete', result);

    return result;
  }

  /**
   * グリッドサーチ
   */
  private async gridSearch(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa'
  ): Promise<OptimizationResult> {
    const allResults: OptimizationResult['allResults'] = [];
    let bestScore = -Infinity;
    let bestParams: ParameterSet = {
      rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD,
      smaPeriod: SMA_CONFIG.MEDIUM_PERIOD,
      stopLoss: BACKTEST_CONFIG.BULL_STOP_LOSS,
      takeProfit: BACKTEST_CONFIG.BULL_TAKE_PROFIT,
    };

    // Generate parameter combinations
    const rsiValues = this.generateRange(this.parameterSpace.rsiPeriod);
    const smaValues = this.generateRange(this.parameterSpace.smaPeriod);
    const stopLossValues = this.generateRange(this.parameterSpace.stopLoss);
    const takeProfitValues = this.generateRange(this.parameterSpace.takeProfit);

    let iteration = 0;
    const totalIterations = rsiValues.length * smaValues.length * stopLossValues.length * takeProfitValues.length;

    for (const rsiPeriod of rsiValues) {
      for (const smaPeriod of smaValues) {
        for (const stopLoss of stopLossValues) {
          for (const takeProfit of takeProfitValues) {
            const params: ParameterSet = { rsiPeriod, smaPeriod, stopLoss, takeProfit };
            
            const backtestResult = this.runBacktestWithParams(symbol, data, market, params);
            const score = this.calculateScore(backtestResult);

            allResults.push({ params, score, backtestResult });

            if (score > bestScore && this.meetsConstraints(backtestResult)) {
              bestScore = score;
              bestParams = params;
            }

            iteration++;
            
            if (iteration % 10 === 0) {
              this.emit('progress', {
                current: iteration,
                total: totalIterations,
                bestScore,
                bestParams,
              });
            }

            if (iteration >= this.config.maxIterations) {
              break;
            }
          }
          if (iteration >= this.config.maxIterations) break;
        }
        if (iteration >= this.config.maxIterations) break;
      }
      if (iteration >= this.config.maxIterations) break;
    }

    return {
      bestParams,
      bestScore,
      allResults,
      optimizationTime: 0,
      iterations: iteration,
      converged: true,
    };
  }

  /**
   * 遺伝的アルゴリズム
   */
  private async geneticAlgorithm(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa'
  ): Promise<OptimizationResult> {
    const allResults: OptimizationResult['allResults'] = [];
    let population = this.initializePopulation();

    // Evaluate initial population
    for (const individual of population) {
      individual.backtestResult = this.runBacktestWithParams(symbol, data, market, individual.params);
      individual.fitness = this.calculateScore(individual.backtestResult);
      
      allResults.push({
        params: individual.params,
        score: individual.fitness,
        backtestResult: individual.backtestResult,
      });
    }

    let bestIndividual = population.reduce((best, ind) => 
      ind.fitness > best.fitness ? ind : best
    );

    let generationsWithoutImprovement = 0;

    for (let generation = 0; generation < this.geneticConfig.generations; generation++) {
      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      // Check for improvement
      if (population[0].fitness > bestIndividual.fitness) {
        bestIndividual = population[0];
        generationsWithoutImprovement = 0;
      } else {
        generationsWithoutImprovement++;
      }

      // Early stopping
      if (this.config.earlyStopping && generationsWithoutImprovement >= this.config.earlyStoppingPatience) {
        console.log(`[ParameterOptimizer] Early stopping at generation ${generation}`);
        break;
      }

      this.emit('progress', {
        current: generation + 1,
        total: this.geneticConfig.generations,
        bestScore: bestIndividual.fitness,
        bestParams: bestIndividual.params,
      });

      // Create new generation
      const newPopulation: Individual[] = [];

      // Elitism
      newPopulation.push(...population.slice(0, this.geneticConfig.elitismCount));

      // Generate offspring
      while (newPopulation.length < this.geneticConfig.populationSize) {
        const parent1 = this.tournamentSelection(population);
        const parent2 = this.tournamentSelection(population);

        if (Math.random() < this.geneticConfig.crossoverRate) {
          const [child1, child2] = this.crossover(parent1, parent2);
          newPopulation.push(this.mutate(child1));
          if (newPopulation.length < this.geneticConfig.populationSize) {
            newPopulation.push(this.mutate(child2));
          }
        } else {
          newPopulation.push(parent1, parent2);
        }
      }

      // Evaluate new population
      for (const individual of newPopulation.slice(this.geneticConfig.elitismCount)) {
        individual.backtestResult = this.runBacktestWithParams(symbol, data, market, individual.params);
        individual.fitness = this.calculateScore(individual.backtestResult);
        
        allResults.push({
          params: individual.params,
          score: individual.fitness,
          backtestResult: individual.backtestResult,
        });
      }

      population = newPopulation;
    }

    return {
      bestParams: bestIndividual.params,
      bestScore: bestIndividual.fitness,
      allResults,
      optimizationTime: 0,
      iterations: allResults.length,
      converged: generationsWithoutImprovement < this.config.earlyStoppingPatience,
    };
  }

  /**
   * ランダムサーチ
   */
  private async randomSearch(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa'
  ): Promise<OptimizationResult> {
    const allResults: OptimizationResult['allResults'] = [];
    let bestScore = -Infinity;
    let bestParams: ParameterSet = {
      rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD,
      smaPeriod: SMA_CONFIG.MEDIUM_PERIOD,
      stopLoss: BACKTEST_CONFIG.BULL_STOP_LOSS,
      takeProfit: BACKTEST_CONFIG.BULL_TAKE_PROFIT,
    };

    for (let i = 0; i < this.config.maxIterations; i++) {
      const params: ParameterSet = {
        rsiPeriod: this.randomInt(this.parameterSpace.rsiPeriod.min, this.parameterSpace.rsiPeriod.max),
        smaPeriod: this.randomInt(this.parameterSpace.smaPeriod.min, this.parameterSpace.smaPeriod.max),
        stopLoss: this.randomFloat(this.parameterSpace.stopLoss.min, this.parameterSpace.stopLoss.max),
        takeProfit: this.randomFloat(this.parameterSpace.takeProfit.min, this.parameterSpace.takeProfit.max),
      };

      const backtestResult = this.runBacktestWithParams(symbol, data, market, params);
      const score = this.calculateScore(backtestResult);

      allResults.push({ params, score, backtestResult });

      if (score > bestScore && this.meetsConstraints(backtestResult)) {
        bestScore = score;
        bestParams = params;
      }

      if (i % 10 === 0) {
        this.emit('progress', {
          current: i + 1,
          total: this.config.maxIterations,
          bestScore,
          bestParams,
        });
      }
    }

    return {
      bestParams,
      bestScore,
      allResults,
      optimizationTime: 0,
      iterations: this.config.maxIterations,
      converged: true,
    };
  }

  /**
   * ベイズ最適化（簡易実装）
   */
  private async bayesianOptimization(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa'
  ): Promise<OptimizationResult> {
    // Simplified implementation: use random search with exploitation
    const allResults: OptimizationResult['allResults'] = [];
    let bestScore = -Infinity;
    let bestParams: ParameterSet = {
      rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD,
      smaPeriod: SMA_CONFIG.MEDIUM_PERIOD,
      stopLoss: BACKTEST_CONFIG.BULL_STOP_LOSS,
      takeProfit: BACKTEST_CONFIG.BULL_TAKE_PROFIT,
    };

    // Initial random exploration
    const explorationPhase = Math.floor(this.config.maxIterations * 0.3);
    
    for (let i = 0; i < this.config.maxIterations; i++) {
      let params: ParameterSet;

      if (i < explorationPhase) {
        // Exploration: random sampling
        params = {
          rsiPeriod: this.randomInt(this.parameterSpace.rsiPeriod.min, this.parameterSpace.rsiPeriod.max),
          smaPeriod: this.randomInt(this.parameterSpace.smaPeriod.min, this.parameterSpace.smaPeriod.max),
          stopLoss: this.randomFloat(this.parameterSpace.stopLoss.min, this.parameterSpace.stopLoss.max),
          takeProfit: this.randomFloat(this.parameterSpace.takeProfit.min, this.parameterSpace.takeProfit.max),
        };
      } else {
        // Exploitation: sample around best found parameters
        params = {
          rsiPeriod: this.clamp(
            Math.round(bestParams.rsiPeriod + this.randomGaussian() * 2),
            this.parameterSpace.rsiPeriod.min,
            this.parameterSpace.rsiPeriod.max
          ),
          smaPeriod: this.clamp(
            Math.round(bestParams.smaPeriod + this.randomGaussian() * 5),
            this.parameterSpace.smaPeriod.min,
            this.parameterSpace.smaPeriod.max
          ),
          stopLoss: this.clamp(
            bestParams.stopLoss + this.randomGaussian() * 0.01,
            this.parameterSpace.stopLoss.min,
            this.parameterSpace.stopLoss.max
          ),
          takeProfit: this.clamp(
            bestParams.takeProfit + this.randomGaussian() * 0.02,
            this.parameterSpace.takeProfit.min,
            this.parameterSpace.takeProfit.max
          ),
        };
      }

      const backtestResult = this.runBacktestWithParams(symbol, data, market, params);
      const score = this.calculateScore(backtestResult);

      allResults.push({ params, score, backtestResult });

      if (score > bestScore && this.meetsConstraints(backtestResult)) {
        bestScore = score;
        bestParams = params;
      }

      if (i % 10 === 0) {
        this.emit('progress', {
          current: i + 1,
          total: this.config.maxIterations,
          bestScore,
          bestParams,
        });
      }
    }

    return {
      bestParams,
      bestScore,
      allResults,
      optimizationTime: 0,
      iterations: this.config.maxIterations,
      converged: true,
    };
  }

  /**
   * Walk-forward分析
   */
  private async walkForwardAnalysis(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa',
    params: ParameterSet
  ): Promise<WalkForwardResult[]> {
    const results: WalkForwardResult[] = [];
    const windowSize = this.config.trainSize + this.config.testSize;
    
    for (let i = 0; i < this.config.walkForwardWindows; i++) {
      const startIndex = i * this.config.testSize;
      
      if (startIndex + windowSize > data.length) break;

      const trainData = data.slice(startIndex, startIndex + this.config.trainSize);
      const testData = data.slice(
        startIndex + this.config.trainSize,
        startIndex + windowSize
      );

      // Optimize on training data
      const trainResult = this.runBacktestWithParams(symbol, trainData, market, params);
      const trainScore = this.calculateScore(trainResult);

      // Test on out-of-sample data
      const testResult = this.runBacktestWithParams(symbol, testData, market, params);
      const testScore = this.calculateScore(testResult);

      const overfitRatio = trainScore > 0 ? (trainScore - testScore) / trainScore : 0;

      results.push({
        window: i + 1,
        trainStart: trainData[0].date,
        trainEnd: trainData[trainData.length - 1].date,
        testStart: testData[0].date,
        testEnd: testData[testData.length - 1].date,
        trainScore,
        testScore,
        trainParams: params,
        overfitRatio: parseFloat(overfitRatio.toFixed(2)),
      });
    }

    return results;
  }

  /**
   * パラメータでバックテストを実行
   */
  private runBacktestWithParams(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa',
    params: ParameterSet
  ): BacktestResult {
    const trades: Array<{
      symbol: string;
      type: 'BUY' | 'SELL';
      entryPrice: number;
      exitPrice: number;
      entryDate: string;
      exitDate: string;
      profitPercent: number;
      exitReason?: string;
    }> = [];

    let currentPosition: { type: 'BUY' | 'SELL'; price: number; date: string } | null = null;

    const minPeriod = Math.max(params.rsiPeriod, params.smaPeriod) + 10;
    const startDate = data[0]?.date || new Date().toISOString();
    const endDate = data[data.length - 1]?.date || new Date().toISOString();

    if (data.length < minPeriod) {
      return this.createEmptyResult(symbol, startDate, endDate);
    }

    const closes = data.map(d => d.close);
    const rsiValues = technicalIndicatorService.calculateRSI(closes, params.rsiPeriod);
    const smaValues = technicalIndicatorService.calculateSMA(closes, params.smaPeriod);

    for (let i = minPeriod; i < data.length - 1; i++) {
      const nextDay = data[i + 1];
      const currentRSI = rsiValues[i];
      const currentSMA = smaValues[i];
      const currentPrice = closes[i];

      let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (currentPrice > currentSMA && currentRSI < RSI_CONFIG.OVERSOLD + 10) {
        signalType = 'BUY';
      } else if (currentPrice < currentSMA && currentRSI > RSI_CONFIG.OVERBOUGHT) {
        signalType = 'SELL';
      }

      if (!currentPosition) {
        if (signalType === 'BUY' || signalType === 'SELL') {
          currentPosition = {
            type: signalType,
            price: nextDay.open,
            date: nextDay.date,
          };
        }
      } else {
        const change = (nextDay.close - currentPosition.price) / (currentPosition.price || 1);
        let shouldExit = false;
        let exitReason = '';

        if (currentPosition.type === 'BUY') {
          if (signalType === 'SELL') {
            shouldExit = true;
            exitReason = 'Signal Reversal';
          } else if (change > params.takeProfit) {
            shouldExit = true;
            exitReason = 'Take Profit';
          } else if (change < -params.stopLoss) {
            shouldExit = true;
            exitReason = 'Stop Loss';
          }
        } else {
          if (signalType === 'BUY') {
            shouldExit = true;
            exitReason = 'Signal Reversal';
          } else if (change < -params.takeProfit) {
            shouldExit = true;
            exitReason = 'Take Profit';
          } else if (change > params.stopLoss) {
            shouldExit = true;
            exitReason = 'Stop Loss';
          }
        }

        if (shouldExit) {
          const exitPrice = nextDay.close;
          const rawProfit = currentPosition.type === 'BUY'
            ? (exitPrice - currentPosition.price) / (currentPosition.price || 1)
            : (currentPosition.price - exitPrice) / (currentPosition.price || 1);

          trades.push({
            symbol,
            entryDate: currentPosition.date,
            exitDate: nextDay.date,
            entryPrice: currentPosition.price,
            exitPrice,
            profitPercent: parseFloat((rawProfit * 100).toFixed(2)),
            exitReason,
            type: currentPosition.type,
          });

          currentPosition = null;
        }
      }
    }

    return this.calculateStats(trades, symbol, startDate, endDate);
  }

  /**
   * スコアを計算
   */
  private calculateScore(result: BacktestResult): number {
    switch (this.config.objective) {
      case 'sharpe':
        return result.sharpeRatio || 0;
      case 'total_return':
        return result.totalReturn;
      case 'win_rate':
        return result.winRate;
      case 'profit_factor':
        return result.profitFactor || 0;
      case 'calmar':
        return result.calmarRatio || 0;
      default:
        // Composite score
        const sharpeWeight = 0.3;
        const returnWeight = 0.3;
        const winRateWeight = 0.2;
        const profitFactorWeight = 0.2;
        
        return (
          (result.sharpeRatio || 0) * sharpeWeight +
          (result.totalReturn / 100) * returnWeight +
          (result.winRate / 100) * winRateWeight +
          (result.profitFactor || 0) * profitFactorWeight
        );
    }
  }

  /**
   * 制約を満たすかチェック
   */
  private meetsConstraints(result: BacktestResult): boolean {
    return (
      result.totalTrades >= this.config.constraints.minTrades &&
      result.maxDrawdown <= this.config.constraints.maxDrawdown &&
      result.winRate >= this.config.constraints.minWinRate
    );
  }

  /**
   * 統計情報を計算
   */
  private calculateStats(
    trades: Array<{
      symbol: string;
      type: 'BUY' | 'SELL';
      entryPrice: number;
      exitPrice: number;
      entryDate: string;
      exitDate: string;
      profitPercent: number;
      exitReason?: string;
    }>,
    symbol: string,
    startDate: string,
    endDate: string
  ): BacktestResult {
    const winningTrades = trades.filter(t => t.profitPercent > 0).length;
    const losingTrades = trades.filter(t => t.profitPercent <= 0).length;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const totalReturn = trades.reduce((sum, t) => sum + t.profitPercent, 0);

    const winningTradesData = trades.filter(t => t.profitPercent > 0);
    const losingTradesData = trades.filter(t => t.profitPercent <= 0);

    const avgProfit = winningTradesData.length > 0
      ? winningTradesData.reduce((sum, t) => sum + t.profitPercent, 0) / winningTradesData.length
      : 0;
    const avgLoss = losingTradesData.length > 0
      ? losingTradesData.reduce((sum, t) => sum + t.profitPercent, 0) / losingTradesData.length
      : 0;

    const grossProfit = winningTradesData.reduce((sum, t) => sum + t.profitPercent, 0);
    const grossLoss = Math.abs(losingTradesData.reduce((sum, t) => sum + t.profitPercent, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let equity = 100;

    for (const trade of trades) {
      equity *= (1 + trade.profitPercent / 100);
      if (equity > peak) peak = equity;
      const drawdown = (peak - equity) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Sharpe ratio
    const returns = trades.map(t => t.profitPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const variance = returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Calmar ratio
    const start = new Date(startDate);
    const end = new Date(endDate);
    const years = Math.max(0.1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const annualizedReturn = (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

    return {
      symbol,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: parseFloat(winRate.toFixed(1)),
      totalReturn: parseFloat(totalReturn.toFixed(1)),
      avgProfit: parseFloat(avgProfit.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      calmarRatio: parseFloat(calmarRatio.toFixed(2)),
      trades: [...trades].reverse(),
      startDate,
      endDate,
    };
  }

  /**
   * 空の結果を生成
   */
  private createEmptyResult(symbol: string, startDate: string, endDate: string): BacktestResult {
    return {
      symbol,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalReturn: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      calmarRatio: 0,
      trades: [],
      startDate,
      endDate,
    };
  }

  // ============================================================================
    // Genetic Algorithm Helpers
  // ============================================================================

  private initializePopulation(): Individual[] {
    const population: Individual[] = [];
    
    for (let i = 0; i < this.geneticConfig.populationSize; i++) {
      population.push({
        params: {
          rsiPeriod: this.randomInt(this.parameterSpace.rsiPeriod.min, this.parameterSpace.rsiPeriod.max),
          smaPeriod: this.randomInt(this.parameterSpace.smaPeriod.min, this.parameterSpace.smaPeriod.max),
          stopLoss: this.randomFloat(this.parameterSpace.stopLoss.min, this.parameterSpace.stopLoss.max),
          takeProfit: this.randomFloat(this.parameterSpace.takeProfit.min, this.parameterSpace.takeProfit.max),
        },
        fitness: 0,
      });
    }
    
    return population;
  }

  private tournamentSelection(population: Individual[]): Individual {
    let best = population[Math.floor(Math.random() * population.length)];
    
    for (let i = 1; i < this.geneticConfig.tournamentSize; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      if (candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    
    return best;
  }

  private crossover(parent1: Individual, parent2: Individual): [Individual, Individual] {
    const child1: Individual = {
      params: { ...parent1.params },
      fitness: 0,
    };
    const child2: Individual = {
      params: { ...parent2.params },
      fitness: 0,
    };

    // Uniform crossover
    if (Math.random() < 0.5) {
      child1.params.rsiPeriod = parent2.params.rsiPeriod;
      child2.params.rsiPeriod = parent1.params.rsiPeriod;
    }
    if (Math.random() < 0.5) {
      child1.params.smaPeriod = parent2.params.smaPeriod;
      child2.params.smaPeriod = parent1.params.smaPeriod;
    }
    if (Math.random() < 0.5) {
      child1.params.stopLoss = parent2.params.stopLoss;
      child2.params.stopLoss = parent1.params.stopLoss;
    }
    if (Math.random() < 0.5) {
      child1.params.takeProfit = parent2.params.takeProfit;
      child2.params.takeProfit = parent1.params.takeProfit;
    }

    return [child1, child2];
  }

  private mutate(individual: Individual): Individual {
    const mutated: Individual = {
      params: { ...individual.params },
      fitness: 0,
    };

    if (Math.random() < this.geneticConfig.mutationRate) {
      mutated.params.rsiPeriod = this.clamp(
        mutated.params.rsiPeriod + Math.round(this.randomGaussian() * 2),
        this.parameterSpace.rsiPeriod.min,
        this.parameterSpace.rsiPeriod.max
      );
    }
    if (Math.random() < this.geneticConfig.mutationRate) {
      mutated.params.smaPeriod = this.clamp(
        mutated.params.smaPeriod + Math.round(this.randomGaussian() * 5),
        this.parameterSpace.smaPeriod.min,
        this.parameterSpace.smaPeriod.max
      );
    }
    if (Math.random() < this.geneticConfig.mutationRate) {
      mutated.params.stopLoss = this.clamp(
        mutated.params.stopLoss + this.randomGaussian() * 0.01,
        this.parameterSpace.stopLoss.min,
        this.parameterSpace.stopLoss.max
      );
    }
    if (Math.random() < this.geneticConfig.mutationRate) {
      mutated.params.takeProfit = this.clamp(
        mutated.params.takeProfit + this.randomGaussian() * 0.02,
        this.parameterSpace.takeProfit.min,
        this.parameterSpace.takeProfit.max
      );
    }

    return mutated;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateRange(range: { min: number; max: number; step: number }): number[] {
    const values: number[] = [];
    for (let v = range.min; v <= range.max; v += range.step) {
      values.push(range.step < 1 ? parseFloat(v.toFixed(2)) : v);
    }
    return values;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }

  private randomGaussian(): number {
    // Box-Muller transform
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalParameterOptimizer: ParameterOptimizer | null = null;

export function getGlobalParameterOptimizer(
  config?: Partial<OptimizationConfig>
): ParameterOptimizer {
  if (!globalParameterOptimizer) {
    globalParameterOptimizer = new ParameterOptimizer(config);
  }
  return globalParameterOptimizer;
}

export function resetGlobalParameterOptimizer(): void {
  globalParameterOptimizer = null;
}

export default ParameterOptimizer;
