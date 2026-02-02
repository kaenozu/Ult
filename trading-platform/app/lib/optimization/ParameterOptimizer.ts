/**
 * ParameterOptimizer.ts
 * 
 * パラメータ最適化エンジン - 戦略パラメータの最適化を行う
 * 
 * 【機能】
 * - ベイズ最適化（Optuna相当）
 * - 遺伝的アルゴリズム
 * - 粒子群最適化
 * - グリッドサーチ（並列化）
 * - Walk-Forward検証
 * - 時系列クロスバリデーション
 */

import { OHLCV } from '@/app/types';
import { BacktestResult, BacktestConfig } from '../backtest/AdvancedBacktestEngine';

// ============================================================================
// Types
// ============================================================================

export interface ParameterSpace {
  name: string;
  type: 'int' | 'float' | 'categorical';
  min?: number;
  max?: number;
  values?: (string | number)[];
  step?: number;
}

export interface OptimizationConfig {
  method: 'bayesian' | 'genetic' | 'pso' | 'grid';
  maxIterations: number;
  parallelWorkers?: number;
  validationSplit: number; // 0-1
  walkForwardPeriods?: number; // Walk-Forward期間数
  objective: 'sharpe' | 'return' | 'calmar' | 'sortino' | 'custom';
  customObjective?: (result: BacktestResult) => number;
  earlyStopping?: {
    patience: number;
    minImprovement: number;
  };
}

export interface OptimizationResult {
  bestParams: Record<string, number | string>;
  bestScore: number;
  allTrials: Trial[];
  convergenceHistory: number[];
  validationScore: number;
  testScore?: number;
  computationTime: number; // milliseconds
  overfittingWarning: boolean;
}

export interface Trial {
  id: number;
  params: Record<string, number | string>;
  score: number;
  validationScore?: number;
  testScore?: number;
  backtestResult: BacktestResult;
  timestamp: number;
}

// ============================================================================
// ParameterOptimizer Class
// ============================================================================

export class ParameterOptimizer {
  private parameterSpace: ParameterSpace[];
  private config: OptimizationConfig;
  private trials: Trial[] = [];
  private bestTrial: Trial | null = null;

  constructor(
    parameterSpace: ParameterSpace[],
    config: OptimizationConfig
  ) {
    this.parameterSpace = parameterSpace;
    this.config = config;
  }

  /**
   * パラメータ最適化を実行
   */
  async optimize(
    data: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    // データを分割（Train/Validation/Test）
    const { trainData, validationData, testData } = this.splitData(data);
    
    // 最適化手法に応じて実行
    let allTrials: Trial[];
    
    switch (this.config.method) {
      case 'bayesian':
        allTrials = await this.bayesianOptimization(trainData, validationData, strategyExecutor, backtestConfig);
        break;
      case 'genetic':
        allTrials = await this.geneticAlgorithm(trainData, validationData, strategyExecutor, backtestConfig);
        break;
      case 'pso':
        allTrials = await this.particleSwarmOptimization(trainData, validationData, strategyExecutor, backtestConfig);
        break;
      case 'grid':
        allTrials = await this.gridSearch(trainData, validationData, strategyExecutor, backtestConfig);
        break;
      default:
        throw new Error(`Unknown optimization method: ${this.config.method}`);
    }
    
    this.trials = allTrials;
    this.bestTrial = this.findBestTrial(allTrials);
    
    // テストデータで最終評価
    let testScore: number | undefined;
    if (testData && testData.length > 0 && this.bestTrial) {
      const testResult = await strategyExecutor(this.bestTrial.params, testData, backtestConfig);
      testScore = this.calculateObjective(testResult);
    }
    
    const computationTime = Date.now() - startTime;
    
    // 過剰適合の警告
    const overfittingWarning = this.detectOverfitting(
      this.bestTrial?.score || 0,
      this.bestTrial?.validationScore || 0,
      testScore
    );
    
    return {
      bestParams: this.bestTrial?.params || {},
      bestScore: this.bestTrial?.score || 0,
      allTrials,
      convergenceHistory: this.getConvergenceHistory(),
      validationScore: this.bestTrial?.validationScore || 0,
      testScore,
      computationTime,
      overfittingWarning,
    };
  }

  /**
   * ベイズ最適化（Tree-structured Parzen Estimator）
   */
  private async bayesianOptimization(
    trainData: OHLCV[],
    validationData: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig
  ): Promise<Trial[]> {
    const trials: Trial[] = [];
    const nInitial = Math.min(10, Math.floor(this.config.maxIterations * 0.2));
    
    // 初期ランダムサンプリング
    for (let i = 0; i < nInitial; i++) {
      const params = this.sampleRandomParams();
      const trial = await this.evaluateTrial(i, params, trainData, validationData, strategyExecutor, backtestConfig);
      trials.push(trial);
    }
    
    // TPE（Tree-structured Parzen Estimator）によるサンプリング
    for (let i = nInitial; i < this.config.maxIterations; i++) {
      const params = this.sampleTPE(trials);
      const trial = await this.evaluateTrial(i, params, trainData, validationData, strategyExecutor, backtestConfig);
      trials.push(trial);
      
      // Early stopping
      if (this.shouldStopEarly(trials)) {
        console.log(`Early stopping at iteration ${i}`);
        break;
      }
    }
    
    return trials;
  }

  /**
   * 遺伝的アルゴリズム
   */
  private async geneticAlgorithm(
    trainData: OHLCV[],
    validationData: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig
  ): Promise<Trial[]> {
    const populationSize = 20;
    const mutationRate = 0.1;
    const crossoverRate = 0.7;
    const eliteSize = 2;
    
    // 初期集団を生成
    let population: Trial[] = [];
    for (let i = 0; i < populationSize; i++) {
      const params = this.sampleRandomParams();
      const trial = await this.evaluateTrial(i, params, trainData, validationData, strategyExecutor, backtestConfig);
      population.push(trial);
    }
    
    const allTrials: Trial[] = [...population];
    let generation = 1;
    
    while (allTrials.length < this.config.maxIterations) {
      // エリート選択
      population.sort((a, b) => b.validationScore! - a.validationScore!);
      const elite = population.slice(0, eliteSize);
      
      // 新世代を生成
      const newPopulation: Trial[] = [...elite];
      
      while (newPopulation.length < populationSize && allTrials.length < this.config.maxIterations) {
        // 親の選択（トーナメント選択）
        const parent1 = this.tournamentSelection(population);
        const parent2 = this.tournamentSelection(population);
        
        // 交叉
        let childParams: Record<string, number | string>;
        if (Math.random() < crossoverRate) {
          childParams = this.crossover(parent1.params, parent2.params);
        } else {
          childParams = { ...parent1.params };
        }
        
        // 突然変異
        if (Math.random() < mutationRate) {
          childParams = this.mutate(childParams);
        }
        
        // 評価
        const trial = await this.evaluateTrial(
          allTrials.length,
          childParams,
          trainData,
          validationData,
          strategyExecutor,
          backtestConfig
        );
        newPopulation.push(trial);
        allTrials.push(trial);
      }
      
      population = newPopulation;
      generation++;
      
      // Early stopping
      if (this.shouldStopEarly(allTrials)) {
        console.log(`GA early stopping at generation ${generation}`);
        break;
      }
    }
    
    return allTrials;
  }

  /**
   * 粒子群最適化（PSO）
   */
  private async particleSwarmOptimization(
    trainData: OHLCV[],
    validationData: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig
  ): Promise<Trial[]> {
    const swarmSize = 20;
    const w = 0.7; // 慣性重み
    const c1 = 1.5; // 認知パラメータ
    const c2 = 1.5; // 社会パラメータ
    
    // 粒子を初期化
    const particles: {
      position: Record<string, number>;
      velocity: Record<string, number>;
      bestPosition: Record<string, number>;
      bestScore: number;
      trial?: Trial;
    }[] = [];
    
    // 数値パラメータのみを扱う（categoricalは固定）
    const numericParams = this.parameterSpace.filter(p => p.type !== 'categorical');
    
    for (let i = 0; i < swarmSize; i++) {
      const position: Record<string, number> = {};
      const velocity: Record<string, number> = {};
      
      numericParams.forEach(param => {
        if (param.min !== undefined && param.max !== undefined) {
          position[param.name] = param.min + Math.random() * (param.max - param.min);
          velocity[param.name] = (Math.random() - 0.5) * (param.max - param.min) * 0.1;
        }
      });
      
      particles.push({
        position,
        velocity,
        bestPosition: { ...position },
        bestScore: -Infinity,
      });
    }
    
    let globalBestPosition: Record<string, number> = {};
    let globalBestScore = -Infinity;
    const allTrials: Trial[] = [];
    
    // PSO反復
    for (let iter = 0; iter < Math.floor(this.config.maxIterations / swarmSize); iter++) {
      // 各粒子を評価
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const params = this.convertPositionToParams(particle.position);
        
        const trial = await this.evaluateTrial(
          allTrials.length,
          params,
          trainData,
          validationData,
          strategyExecutor,
          backtestConfig
        );
        allTrials.push(trial);
        particle.trial = trial;
        
        const score = trial.validationScore || trial.score;
        
        // 個体最良位置の更新
        if (score > particle.bestScore) {
          particle.bestScore = score;
          particle.bestPosition = { ...particle.position };
        }
        
        // 大域最良位置の更新
        if (score > globalBestScore) {
          globalBestScore = score;
          globalBestPosition = { ...particle.position };
        }
      }
      
      // 粒子の速度と位置を更新
      particles.forEach(particle => {
        numericParams.forEach(param => {
          if (param.min !== undefined && param.max !== undefined) {
            const r1 = Math.random();
            const r2 = Math.random();
            
            // 速度の更新
            particle.velocity[param.name] =
              w * particle.velocity[param.name] +
              c1 * r1 * (particle.bestPosition[param.name] - particle.position[param.name]) +
              c2 * r2 * (globalBestPosition[param.name] - particle.position[param.name]);
            
            // 位置の更新
            particle.position[param.name] += particle.velocity[param.name];
            
            // 境界条件
            particle.position[param.name] = Math.max(
              param.min,
              Math.min(param.max, particle.position[param.name])
            );
          }
        });
      });
      
      // Early stopping
      if (this.shouldStopEarly(allTrials)) {
        console.log(`PSO early stopping at iteration ${iter}`);
        break;
      }
    }
    
    return allTrials;
  }

  /**
   * グリッドサーチ（並列化）
   */
  private async gridSearch(
    trainData: OHLCV[],
    validationData: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig
  ): Promise<Trial[]> {
    // グリッドポイントを生成
    const gridPoints = this.generateGridPoints();
    console.log(`Grid search: ${gridPoints.length} parameter combinations`);
    
    const trials: Trial[] = [];
    const batchSize = this.config.parallelWorkers || 4;
    
    // バッチ処理で並列実行
    for (let i = 0; i < gridPoints.length; i += batchSize) {
      const batch = gridPoints.slice(i, Math.min(i + batchSize, gridPoints.length));
      
      const batchTrials = await Promise.all(
        batch.map((params, idx) =>
          this.evaluateTrial(i + idx, params, trainData, validationData, strategyExecutor, backtestConfig)
        )
      );
      
      trials.push(...batchTrials);
      
      console.log(`Grid search progress: ${trials.length}/${gridPoints.length}`);
      
      if (trials.length >= this.config.maxIterations) {
        break;
      }
    }
    
    return trials;
  }

  /**
   * Walk-Forward検証
   */
  async walkForwardValidation(
    data: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig,
    periods: number = 5
  ): Promise<{
    results: BacktestResult[];
    averageScore: number;
    stability: number;
  }> {
    const windowSize = Math.floor(data.length / periods);
    const results: BacktestResult[] = [];
    
    for (let i = 0; i < periods; i++) {
      // Train period
      const trainStart = i * windowSize;
      const trainEnd = trainStart + windowSize;
      const trainData = data.slice(trainStart, trainEnd);
      
      // Test period (次の期間)
      const testEnd = Math.min(trainEnd + windowSize, data.length);
      const testData = data.slice(trainEnd, testEnd);
      
      if (testData.length === 0) break;
      
      // このウィンドウで最適化
      const optimizationResult = await this.optimize(trainData, strategyExecutor, backtestConfig);
      
      // テストデータで評価
      const testResult = await strategyExecutor(optimizationResult.bestParams, testData, backtestConfig);
      results.push(testResult);
    }
    
    // 平均スコアと安定性を計算
    const scores = results.map(r => this.calculateObjective(r));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) / scores.length;
    const stability = Math.sqrt(variance);
    
    return {
      results,
      averageScore,
      stability,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * データを Train/Validation/Test に分割
   */
  private splitData(data: OHLCV[]): {
    trainData: OHLCV[];
    validationData: OHLCV[];
    testData: OHLCV[];
  } {
    const trainSize = Math.floor(data.length * (1 - this.config.validationSplit - 0.15));
    const valSize = Math.floor(data.length * this.config.validationSplit);
    
    return {
      trainData: data.slice(0, trainSize),
      validationData: data.slice(trainSize, trainSize + valSize),
      testData: data.slice(trainSize + valSize),
    };
  }

  /**
   * ランダムなパラメータをサンプリング
   */
  private sampleRandomParams(): Record<string, number | string> {
    const params: Record<string, number | string> = {};
    
    this.parameterSpace.forEach(param => {
      if (param.type === 'int' && param.min !== undefined && param.max !== undefined) {
        params[param.name] = Math.floor(Math.random() * (param.max - param.min + 1)) + param.min;
      } else if (param.type === 'float' && param.min !== undefined && param.max !== undefined) {
        params[param.name] = Math.random() * (param.max - param.min) + param.min;
      } else if (param.type === 'categorical' && param.values) {
        params[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
      }
    });
    
    return params;
  }

  /**
   * TPEによるサンプリング
   */
  private sampleTPE(trials: Trial[]): Record<string, number | string> {
    // 簡易版TPE: 上位25%と下位75%に分けてガウス分布でサンプリング
    if (trials.length < 10) {
      return this.sampleRandomParams();
    }
    
    const sortedTrials = [...trials].sort((a, b) => (b.validationScore || b.score) - (a.validationScore || a.score));
    const gamma = 0.25;
    const nGood = Math.max(1, Math.floor(trials.length * gamma));
    const goodTrials = sortedTrials.slice(0, nGood);
    
    const params: Record<string, number | string> = {};
    
    this.parameterSpace.forEach(param => {
      if (param.type === 'categorical') {
        // Categorical: ランダム選択
        if (param.values) {
          params[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
        }
      } else if (param.min !== undefined && param.max !== undefined) {
        // Numerical: ガウス分布でサンプリング
        const goodValues = goodTrials.map(t => t.params[param.name] as number);
        const mean = goodValues.reduce((a, b) => a + b, 0) / goodValues.length;
        const std = Math.sqrt(
          goodValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / goodValues.length
        );
        
        let value = this.sampleGaussian(mean, std);
        value = Math.max(param.min, Math.min(param.max, value));
        
        if (param.type === 'int') {
          params[param.name] = Math.round(value);
        } else {
          params[param.name] = value;
        }
      }
    });
    
    return params;
  }

  /**
   * ガウス分布からサンプリング（Box-Muller法）
   */
  private sampleGaussian(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z0;
  }

  /**
   * トーナメント選択
   */
  private tournamentSelection(population: Trial[], tournamentSize: number = 3): Trial {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      tournament.push(population[Math.floor(Math.random() * population.length)]);
    }
    return tournament.reduce((best, current) =>
      (current.validationScore || current.score) > (best.validationScore || best.score) ? current : best
    );
  }

  /**
   * 交叉
   */
  private crossover(
    params1: Record<string, number | string>,
    params2: Record<string, number | string>
  ): Record<string, number | string> {
    const child: Record<string, number | string> = {};
    
    Object.keys(params1).forEach(key => {
      child[key] = Math.random() < 0.5 ? params1[key] : params2[key];
    });
    
    return child;
  }

  /**
   * 突然変異
   */
  private mutate(params: Record<string, number | string>): Record<string, number | string> {
    const mutated = { ...params };
    const paramToMutate = this.parameterSpace[Math.floor(Math.random() * this.parameterSpace.length)];
    
    if (paramToMutate.type === 'int' && paramToMutate.min !== undefined && paramToMutate.max !== undefined) {
      mutated[paramToMutate.name] = Math.floor(Math.random() * (paramToMutate.max - paramToMutate.min + 1)) + paramToMutate.min;
    } else if (paramToMutate.type === 'float' && paramToMutate.min !== undefined && paramToMutate.max !== undefined) {
      mutated[paramToMutate.name] = Math.random() * (paramToMutate.max - paramToMutate.min) + paramToMutate.min;
    } else if (paramToMutate.type === 'categorical' && paramToMutate.values) {
      mutated[paramToMutate.name] = paramToMutate.values[Math.floor(Math.random() * paramToMutate.values.length)];
    }
    
    return mutated;
  }

  /**
   * PSO用: 位置をパラメータに変換
   */
  private convertPositionToParams(position: Record<string, number>): Record<string, number | string> {
    const params: Record<string, number | string> = {};
    
    this.parameterSpace.forEach(param => {
      if (param.type === 'categorical' && param.values) {
        // Categoricalはランダム選択
        params[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
      } else if (position[param.name] !== undefined) {
        if (param.type === 'int') {
          params[param.name] = Math.round(position[param.name]);
        } else {
          params[param.name] = position[param.name];
        }
      }
    });
    
    return params;
  }

  /**
   * グリッドポイントを生成
   */
  private generateGridPoints(): Array<Record<string, number | string>> {
    const gridSize = 5; // 各パラメータのグリッドサイズ
    const points: Array<Record<string, number | string>> = [{}];
    
    this.parameterSpace.forEach(param => {
      const newPoints: Array<Record<string, number | string>> = [];
      
      let values: (number | string)[] = [];
      if (param.type === 'categorical' && param.values) {
        values = param.values;
      } else if (param.type === 'int' && param.min !== undefined && param.max !== undefined) {
        const step = Math.ceil((param.max - param.min) / (gridSize - 1));
        for (let i = param.min; i <= param.max; i += step) {
          values.push(i);
        }
      } else if (param.type === 'float' && param.min !== undefined && param.max !== undefined) {
        const step = (param.max - param.min) / (gridSize - 1);
        for (let i = param.min; i <= param.max; i += step) {
          values.push(i);
        }
      }
      
      points.forEach(point => {
        values.forEach(value => {
          newPoints.push({ ...point, [param.name]: value });
        });
      });
      
      points.length = 0;
      points.push(...newPoints);
    });
    
    return points;
  }

  /**
   * トライアルを評価
   */
  private async evaluateTrial(
    id: number,
    params: Record<string, number | string>,
    trainData: OHLCV[],
    validationData: OHLCV[],
    strategyExecutor: (params: Record<string, number | string>, data: OHLCV[], config: BacktestConfig) => Promise<BacktestResult>,
    backtestConfig: BacktestConfig
  ): Promise<Trial> {
    // Trainデータで評価
    const trainResult = await strategyExecutor(params, trainData, backtestConfig);
    const trainScore = this.calculateObjective(trainResult);
    
    // Validationデータで評価
    let validationScore: number | undefined;
    if (validationData.length > 0) {
      const validationResult = await strategyExecutor(params, validationData, backtestConfig);
      validationScore = this.calculateObjective(validationResult);
    }
    
    return {
      id,
      params,
      score: trainScore,
      validationScore,
      backtestResult: trainResult,
      timestamp: Date.now(),
    };
  }

  /**
   * 目的関数を計算
   */
  private calculateObjective(result: BacktestResult): number {
    switch (this.config.objective) {
      case 'sharpe':
        return result.metrics.sharpeRatio;
      case 'return':
        return result.metrics.totalReturn;
      case 'calmar':
        return result.metrics.calmarRatio;
      case 'sortino':
        return result.metrics.sortinoRatio;
      case 'custom':
        return this.config.customObjective ? this.config.customObjective(result) : 0;
      default:
        return result.metrics.sharpeRatio;
    }
  }

  /**
   * 最良のトライアルを見つける
   */
  private findBestTrial(trials: Trial[]): Trial | null {
    if (trials.length === 0) return null;
    
    return trials.reduce((best, current) => {
      const bestScore = best.validationScore !== undefined ? best.validationScore : best.score;
      const currentScore = current.validationScore !== undefined ? current.validationScore : current.score;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * 収束履歴を取得
   */
  private getConvergenceHistory(): number[] {
    const history: number[] = [];
    let bestSoFar = -Infinity;
    
    this.trials.forEach(trial => {
      const score = trial.validationScore !== undefined ? trial.validationScore : trial.score;
      bestSoFar = Math.max(bestSoFar, score);
      history.push(bestSoFar);
    });
    
    return history;
  }

  /**
   * Early stoppingの判定
   */
  private shouldStopEarly(trials: Trial[]): boolean {
    if (!this.config.earlyStopping) return false;
    
    const { patience, minImprovement } = this.config.earlyStopping;
    
    if (trials.length < patience) return false;
    
    const recentTrials = trials.slice(-patience);
    const recentBest = this.findBestTrial(recentTrials);
    const previousBest = this.findBestTrial(trials.slice(0, -patience));
    
    if (!recentBest || !previousBest) return false;
    
    const improvement = (recentBest.validationScore || recentBest.score) - (previousBest.validationScore || previousBest.score);
    
    return improvement < minImprovement;
  }

  /**
   * 過剰適合を検知
   */
  private detectOverfitting(
    trainScore: number,
    validationScore: number,
    testScore?: number
  ): boolean {
    const threshold = 0.15; // 15%以上の性能低下で警告
    
    const trainValGap = (trainScore - validationScore) / Math.abs(trainScore);
    
    if (trainValGap > threshold) {
      return true;
    }
    
    if (testScore !== undefined) {
      const trainTestGap = (trainScore - testScore) / Math.abs(trainScore);
      return trainTestGap > threshold;
    }
    
    return false;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * デフォルトのパラメータスペースを作成
 */
export function createDefaultParameterSpace(): ParameterSpace[] {
  return [
    { name: 'rsiPeriod', type: 'int', min: 7, max: 21 },
    { name: 'rsiOverbought', type: 'int', min: 65, max: 80 },
    { name: 'rsiOversold', type: 'int', min: 20, max: 35 },
    { name: 'smaPeriod', type: 'int', min: 10, max: 50 },
    { name: 'stopLossPercent', type: 'float', min: 0.01, max: 0.05 },
    { name: 'takeProfitPercent', type: 'float', min: 0.02, max: 0.10 },
    { name: 'positionSize', type: 'float', min: 0.1, max: 1.0 },
  ];
}

/**
 * デフォルトの最適化設定を作成
 */
export function createDefaultOptimizationConfig(): OptimizationConfig {
  return {
    method: 'bayesian',
    maxIterations: 100,
    parallelWorkers: 4,
    validationSplit: 0.2,
    walkForwardPeriods: 5,
    objective: 'sharpe',
    earlyStopping: {
      patience: 20,
      minImprovement: 0.001,
    },
  };
}
