/**
 * HyperparameterOptimizer.ts
 * 
 * ハイパーパラメータの最適化クラス。
 * グリッドサーチ、ランダムサーチ、ベイズ最適化を提供します。
 */

/**
 * ハイパーパラメータ設定
 */
export interface HyperparameterConfig {
  // 技術指標のパラメータ
  rsiPeriod: number;
  smaPeriod: number;
  macdFast: number;
  macdSlow: number;
  bollingerPeriod: number;
  bollingerStdDev: number;
  
  // モデルのパラメータ
  ensembleWeights: {
    RF: number;
    XGB: number;
    LSTM: number;
  };
  confidenceThreshold: number;
  agreementThreshold: number;
}

/**
 * 最適化結果
 */
export interface OptimizationResult {
  bestConfig: HyperparameterConfig;
  bestScore: number;
  allResults: Array<{
    config: HyperparameterConfig;
    score: number;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
  }>;
  iterations: number;
  totalEvaluations: number;
  optimizationMethod: 'GRID_SEARCH' | 'RANDOM_SEARCH' | 'BAYESIAN';
}

/**
 * 評価メトリクス
 */
export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

/**
 * ハイパーパラメータ最適化クラス
 */
export class HyperparameterOptimizer {
  private defaultConfig: HyperparameterConfig = {
    rsiPeriod: 14,
    smaPeriod: 20,
    macdFast: 12,
    macdSlow: 26,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
    ensembleWeights: {
      RF: 0.35,
      XGB: 0.35,
      LSTM: 0.30,
    },
    confidenceThreshold: 0.65,
    agreementThreshold: 0.7,
  };

  /**
   * グリッドサーチでハイパーパラメータを最適化
   * 
   * @param paramRanges - パラメータの探索範囲
   * @param evaluateFunc - 評価関数
   * @param maxEvaluations - 最大評価回数
   * @returns 最適化結果
   */
  async gridSearch(
    paramRanges: Partial<Record<keyof HyperparameterConfig, number[]>>,
    evaluateFunc: (config: HyperparameterConfig) => Promise<EvaluationMetrics>,
    maxEvaluations: number = 100
  ): Promise<OptimizationResult> {
    const results: OptimizationResult['allResults'] = [];
    let evaluations = 0;
    
    // グリッドを生成
    const configs = this.generateGridConfigs(paramRanges);
    
    // 評価回数を制限
    const configsToEvaluate = configs.slice(0, maxEvaluations);
    
    for (const config of configsToEvaluate) {
      const metrics = await evaluateFunc(config);
      const score = this.calculateScore(metrics);
      
      results.push({
        config,
        score,
        metrics,
      });
      
      evaluations++;
    }
    
    // 最良の結果を見つける
    results.sort((a, b) => b.score - a.score);
    const bestResult = results[0];
    
    return {
      bestConfig: bestResult.config,
      bestScore: bestResult.score,
      allResults: results,
      iterations: 1,
      totalEvaluations: evaluations,
      optimizationMethod: 'GRID_SEARCH',
    };
  }

  /**
   * ランダムサーチでハイパーパラメータを最適化
   * 
   * @param paramRanges - パラメータの探索範囲
   * @param evaluateFunc - 評価関数
   * @param iterations - 試行回数
   * @returns 最適化結果
   */
  async randomSearch(
    paramRanges: Partial<Record<keyof HyperparameterConfig, number[]>>,
    evaluateFunc: (config: HyperparameterConfig) => Promise<EvaluationMetrics>,
    iterations: number = 50
  ): Promise<OptimizationResult> {
    const results: OptimizationResult['allResults'] = [];
    
    for (let i = 0; i < iterations; i++) {
      const config = this.generateRandomConfig(paramRanges);
      const metrics = await evaluateFunc(config);
      const score = this.calculateScore(metrics);
      
      results.push({
        config,
        score,
        metrics,
      });
    }
    
    // 最良の結果を見つける
    results.sort((a, b) => b.score - a.score);
    const bestResult = results[0];
    
    return {
      bestConfig: bestResult.config,
      bestScore: bestResult.score,
      allResults: results,
      iterations,
      totalEvaluations: iterations,
      optimizationMethod: 'RANDOM_SEARCH',
    };
  }

  /**
   * ベイズ最適化（簡易版）
   * 
   * @param paramRanges - パラメータの探索範囲
   * @param evaluateFunc - 評価関数
   * @param iterations - 試行回数
   * @returns 最適化結果
   */
  async bayesianOptimization(
    paramRanges: Partial<Record<keyof HyperparameterConfig, number[]>>,
    evaluateFunc: (config: HyperparameterConfig) => Promise<EvaluationMetrics>,
    iterations: number = 30
  ): Promise<OptimizationResult> {
    const results: OptimizationResult['allResults'] = [];
    
    // 初期ランダムサンプリング
    const initialSamples = Math.min(5, iterations);
    for (let i = 0; i < initialSamples; i++) {
      const config = this.generateRandomConfig(paramRanges);
      const metrics = await evaluateFunc(config);
      const score = this.calculateScore(metrics);
      
      results.push({
        config,
        score,
        metrics,
      });
    }
    
    // 残りの試行で最適な領域を探索
    for (let i = initialSamples; i < iterations; i++) {
      // 最良の結果周辺を探索
      const bestConfigs = results
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(r => r.config);
      
      const config = this.generateConfigNearBest(bestConfigs, paramRanges);
      const metrics = await evaluateFunc(config);
      const score = this.calculateScore(metrics);
      
      results.push({
        config,
        score,
        metrics,
      });
    }
    
    // 最良の結果を見つける
    results.sort((a, b) => b.score - a.score);
    const bestResult = results[0];
    
    return {
      bestConfig: bestResult.config,
      bestScore: bestResult.score,
      allResults: results,
      iterations,
      totalEvaluations: iterations,
      optimizationMethod: 'BAYESIAN',
    };
  }

  /**
   * クロスバリデーションでモデルの汎化性能を評価
   * 
   * @param config - ハイパーパラメータ設定
   * @param dataFolds - データの分割
   * @param evaluateFunc - 評価関数
   * @returns クロスバリデーション結果
   */
  async crossValidate(
    config: HyperparameterConfig,
    dataFolds: number,
    evaluateFunc: (config: HyperparameterConfig, foldIndex: number) => Promise<EvaluationMetrics>
  ): Promise<{
    meanAccuracy: number;
    stdAccuracy: number;
    meanF1Score: number;
    foldResults: EvaluationMetrics[];
  }> {
    const foldResults: EvaluationMetrics[] = [];
    
    for (let i = 0; i < dataFolds; i++) {
      const metrics = await evaluateFunc(config, i);
      foldResults.push(metrics);
    }
    
    const accuracies = foldResults.map(r => r.accuracy);
    const f1Scores = foldResults.map(r => r.f1Score);
    
    const meanAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const meanF1Score = f1Scores.reduce((sum, f1) => sum + f1, 0) / f1Scores.length;
    
    const varianceAccuracy = accuracies.reduce((sum, acc) => sum + Math.pow(acc - meanAccuracy, 2), 0) / accuracies.length;
    const stdAccuracy = Math.sqrt(varianceAccuracy);
    
    return {
      meanAccuracy,
      stdAccuracy,
      meanF1Score,
      foldResults,
    };
  }

  /**
   * グリッド設定を生成
   */
  private generateGridConfigs(
    paramRanges: Partial<Record<keyof HyperparameterConfig, number[]>>
  ): HyperparameterConfig[] {
    const configs: HyperparameterConfig[] = [];
    const baseConfig = { ...this.defaultConfig };
    
    // 簡略化: 各パラメータの全組み合わせを生成
    const entries = Object.entries(paramRanges);
    
    if (entries.length === 0) {
      return [baseConfig];
    }
    
    // 再帰的にグリッドを生成
    const generateRecursive = (
      index: number,
      currentConfig: HyperparameterConfig
    ): void => {
      if (index >= entries.length) {
        configs.push({ ...currentConfig });
        return;
      }
      
      const [key, values] = entries[index];
      for (const value of values) {
        const newConfig = { ...currentConfig };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newConfig as any)[key] = value;
        generateRecursive(index + 1, newConfig);
      }
    };
    
    generateRecursive(0, baseConfig);
    
    return configs;
  }

  /**
   * ランダムな設定を生成
   */
  private generateRandomConfig(
    paramRanges: Partial<Record<keyof HyperparameterConfig, number[]>>
  ): HyperparameterConfig {
    const config = { ...this.defaultConfig };
    
    for (const [key, values] of Object.entries(paramRanges)) {
      if (values && values.length > 0) {
        const randomValue = values[Math.floor(Math.random() * values.length)];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any)[key] = randomValue;
      }
    }
    
    return config;
  }

  /**
   * 最良設定の近傍を探索
   */
  private generateConfigNearBest(
    bestConfigs: HyperparameterConfig[],
    paramRanges: Partial<Record<keyof HyperparameterConfig, number[]>>
  ): HyperparameterConfig {
    // 最良設定の平均を取る
    const config = { ...this.defaultConfig };
    
    // ランダムに摂動を加える
    for (const [key, values] of Object.entries(paramRanges)) {
      if (values && values.length > 0) {
        // 最良設定から近い値を選ぶ
        const randomValue = values[Math.floor(Math.random() * Math.min(values.length, 3))];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any)[key] = randomValue;
      }
    }
    
    return config;
  }

  /**
   * メトリクスからスコアを計算
   */
  private calculateScore(metrics: EvaluationMetrics): number {
    // F1スコアを主要メトリクスとして使用
    return metrics.f1Score * 0.5 + metrics.accuracy * 0.3 + metrics.precision * 0.1 + metrics.recall * 0.1;
  }

  /**
   * デフォルト設定を取得
   */
  getDefaultConfig(): HyperparameterConfig {
    return { ...this.defaultConfig };
  }

  /**
   * 設定を検証
   */
  validateConfig(config: HyperparameterConfig): boolean {
    // 基本的な検証
    if (config.rsiPeriod < 2 || config.rsiPeriod > 50) return false;
    if (config.smaPeriod < 5 || config.smaPeriod > 200) return false;
    if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) return false;
    
    // 重みの合計が1であることを確認
    const weightSum = config.ensembleWeights.RF + config.ensembleWeights.XGB + config.ensembleWeights.LSTM;
    if (Math.abs(weightSum - 1) > 0.01) return false;
    
    return true;
  }
}

export const hyperparameterOptimizer = new HyperparameterOptimizer();
