/**
 * StrategyComposer.ts
 * 
 * Multi-strategy composition and portfolio management
 * 
 * Features:
 * - Combine multiple strategies with optimal weights
 * - Correlation management
 * - Dynamic rebalancing
 * - Diversification analysis
 */

import type { OHLCV } from '@/app/types';
import type {
  Strategy,
  StrategyPortfolio,
  StrategyPerformance,
  CorrelationMatrix,
  PortfolioPerformance,
  StrategySignal,
  BacktestConfig
} from './types';

// ============================================================================
// Strategy Composer
// ============================================================================

export class StrategyComposer {
  private portfolio: StrategyPortfolio;

  constructor(portfolio: StrategyPortfolio) {
    this.portfolio = portfolio;
    this.normalizeWeights();
  }

  /**
   * Normalize strategy weights to sum to 1
   */
  private normalizeWeights(): void {
    const totalWeight = this.portfolio.strategies
      .filter(s => s.enabled)
      .reduce((sum, s) => sum + s.weight, 0);
    
    if (totalWeight > 0) {
      this.portfolio.strategies.forEach(s => {
        if (s.enabled) {
          s.weight = s.weight / totalWeight;
        }
      });
    }
  }

  /**
   * Generate composite signal from all strategies
   */
  async generateCompositeSignal(
    currentData: OHLCV,
    historicalData: OHLCV[]
  ): Promise<StrategySignal> {
    const signals = await Promise.all(
      this.portfolio.strategies
        .filter(s => s.enabled)
        .map(async s => ({
          signal: await s.strategy.generateSignal(currentData, historicalData),
          weight: s.weight
        }))
    );

    // Aggregate signals weighted by strategy weights
    let buyScore = 0;
    let sellScore = 0;
    let totalConfidence = 0;
    const reasons: string[] = [];

    for (const { signal, weight } of signals) {
      const weightedStrength = signal.strength * weight;
      
      if (signal.signal === 'BUY') {
        buyScore += weightedStrength * signal.confidence;
      } else if (signal.signal === 'SELL') {
        sellScore += weightedStrength * signal.confidence;
      }
      
      totalConfidence += signal.confidence * weight;
      if (signal.signal !== 'HOLD') {
        reasons.push(`${signal.signal} (${(weight * 100).toFixed(0)}%): ${signal.reason}`);
      }
    }

    // Determine final signal
    let finalSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let finalStrength = 0;
    
    if (buyScore > sellScore && buyScore > 0.3) {
      finalSignal = 'BUY';
      finalStrength = buyScore;
    } else if (sellScore > buyScore && sellScore > 0.3) {
      finalSignal = 'SELL';
      finalStrength = sellScore;
    }

    return {
      timestamp: currentData.timestamp,
      signal: finalSignal,
      strength: finalStrength,
      confidence: totalConfidence,
      reason: reasons.length > 0 
        ? `Portfolio signal: ${reasons.join('; ')}`
        : 'No strong signals from strategies',
      metadata: {
        buyScore,
        sellScore,
        numActiveStrategies: signals.length
      }
    };
  }

  /**
   * Backtest the entire portfolio
   */
  async backtestPortfolio(
    data: OHLCV[],
    config: BacktestConfig
  ): Promise<PortfolioPerformance> {
    // Backtest each strategy
    const strategyPerformances = await Promise.all(
      this.portfolio.strategies
        .filter(s => s.enabled)
        .map(async s => ({
          name: s.strategy.config.name,
          weight: s.weight,
          performance: await s.strategy.backtest(data, config)
        }))
    );

    // Calculate portfolio metrics
    const portfolioReturn = strategyPerformances.reduce(
      (sum, sp) => sum + sp.performance.totalReturn * sp.weight,
      0
    );

    const portfolioAnnualizedReturn = strategyPerformances.reduce(
      (sum, sp) => sum + sp.performance.annualizedReturn * sp.weight,
      0
    );

    // Portfolio volatility considering correlations
    const correlationMatrix = await this.calculateCorrelationMatrix(data);
    const portfolioVolatility = this.calculatePortfolioVolatility(
      strategyPerformances.map(sp => ({ 
        volatility: sp.performance.volatility, 
        weight: sp.weight 
      })),
      correlationMatrix
    );

    // Portfolio drawdown (worst case across strategies)
    const portfolioMaxDrawdown = Math.max(
      ...strategyPerformances.map(sp => sp.performance.maxDrawdown)
    );

    // Portfolio Sharpe ratio
    const portfolioSharpeRatio = portfolioVolatility > 0
      ? (portfolioAnnualizedReturn - 2) / portfolioVolatility
      : 0;

    // Find best single strategy
    const bestStrategy = strategyPerformances.reduce((best, current) =>
      current.performance.sharpeRatio > best.performance.sharpeRatio ? current : best
    );

    // Calculate diversification benefit
    const naiveVolatility = strategyPerformances.reduce(
      (sum, sp) => sum + sp.performance.volatility * sp.weight,
      0
    );
    const diversificationRatio = naiveVolatility > 0 
      ? portfolioVolatility / naiveVolatility 
      : 1;
    const correlationBenefit = (1 - diversificationRatio) * 100;

    // Improvement over best single strategy
    const improvementOverBest = portfolioSharpeRatio - bestStrategy.performance.sharpeRatio;

    return {
      portfolioName: this.portfolio.name,
      strategies: strategyPerformances.map(sp => ({
        name: sp.name,
        weight: sp.weight,
        contribution: sp.performance.totalReturn * sp.weight
      })),
      totalReturn: portfolioReturn,
      annualizedReturn: portfolioAnnualizedReturn,
      sharpeRatio: portfolioSharpeRatio,
      maxDrawdown: portfolioMaxDrawdown,
      diversificationRatio,
      correlationBenefit,
      improvementOverBest
    };
  }

  /**
   * Calculate correlation matrix between strategies
   */
  async calculateCorrelationMatrix(data: OHLCV[]): Promise<CorrelationMatrix> {
    const strategies = this.portfolio.strategies.filter(s => s.enabled);
    const strategyNames = strategies.map(s => s.strategy.config.name);
    const n = strategies.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    // Generate signals for all strategies across all data points
    const allSignals: number[][] = await Promise.all(
      strategies.map(async ({ strategy }) => {
        const signals: number[] = [];
        for (let i = 50; i < data.length; i++) {
          const historicalData = data.slice(0, i + 1);
          const signal = await strategy.generateSignal(data[i], historicalData);
          // Convert signal to numeric: BUY=1, SELL=-1, HOLD=0
          const numericSignal = signal.signal === 'BUY' ? signal.strength : 
                               signal.signal === 'SELL' ? -signal.strength : 0;
          signals.push(numericSignal);
        }
        return signals;
      })
    );

    // Calculate correlation coefficients
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          matrix[i][j] = this.calculateCorrelation(allSignals[i], allSignals[j]);
        }
      }
    }

    // Calculate aggregate statistics
    let totalCorr = 0;
    let count = 0;
    let maxCorr = -Infinity;
    let minCorr = Infinity;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = matrix[i][j];
        totalCorr += corr;
        count++;
        if (corr > maxCorr) maxCorr = corr;
        if (corr < minCorr) minCorr = corr;
      }
    }

    return {
      strategies: strategyNames,
      matrix,
      avgCorrelation: count > 0 ? totalCorr / count : 0,
      maxCorrelation: maxCorr !== -Infinity ? maxCorr : 0,
      minCorrelation: minCorr !== Infinity ? minCorr : 0
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

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
   * Calculate portfolio volatility considering correlations
   */
  private calculatePortfolioVolatility(
    strategies: Array<{ volatility: number; weight: number }>,
    correlationMatrix: CorrelationMatrix
  ): number {
    const n = strategies.length;
    let portfolioVariance = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const wi = strategies[i].weight;
        const wj = strategies[j].weight;
        const voli = strategies[i].volatility;
        const volj = strategies[j].volatility;
        const corr = correlationMatrix.matrix[i][j];
        
        portfolioVariance += wi * wj * voli * volj * corr;
      }
    }

    return Math.sqrt(Math.max(0, portfolioVariance));
  }

  /**
   * Optimize strategy weights using mean-variance optimization
   */
  async optimizeWeights(
    data: OHLCV[],
    config: BacktestConfig,
    targetReturn?: number
  ): Promise<{ weights: number[]; expectedReturn: number; expectedVolatility: number }> {
    const strategies = this.portfolio.strategies.filter(s => s.enabled);
    const n = strategies.length;

    // Backtest each strategy to get returns and volatilities
    const performances = await Promise.all(
      strategies.map(s => s.strategy.backtest(data, config))
    );

    const returns = performances.map(p => p.annualizedReturn / 100);
    const volatilities = performances.map(p => p.volatility / 100);

    // Calculate correlation matrix
    const correlationMatrix = await this.calculateCorrelationMatrix(data);

    // Simple optimization: maximize Sharpe ratio
    // In production, use proper quadratic programming
    let bestWeights = strategies.map(() => 1 / n);
    let bestSharpe = -Infinity;

    // Grid search (simplified)
    for (let iter = 0; iter < 1000; iter++) {
      // Generate random weights
      const weights = Array(n).fill(0).map(() => Math.random());
      const sum = weights.reduce((s, w) => s + w, 0);
      weights.forEach((w, i) => weights[i] = w / sum);

      // Calculate portfolio return and volatility
      const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
      const portfolioVol = this.calculatePortfolioVolatility(
        weights.map((w, i) => ({ weight: w, volatility: volatilities[i] * 100 })),
        correlationMatrix
      ) / 100;

      const sharpe = portfolioVol > 0 ? (portfolioReturn - 0.02) / portfolioVol : 0;

      // Check correlation constraint
      const maxCorr = this.calculateMaxPairwiseCorrelation(weights, correlationMatrix);
      if (maxCorr <= this.portfolio.correlationThreshold && sharpe > bestSharpe) {
        bestSharpe = sharpe;
        bestWeights = [...weights];
      }
    }

    // Calculate final portfolio metrics
    const expectedReturn = bestWeights.reduce((sum, w, i) => sum + w * returns[i], 0);
    const expectedVolatility = this.calculatePortfolioVolatility(
      bestWeights.map((w, i) => ({ weight: w, volatility: volatilities[i] * 100 })),
      correlationMatrix
    ) / 100;

    return {
      weights: bestWeights,
      expectedReturn: expectedReturn * 100,
      expectedVolatility: expectedVolatility * 100
    };
  }

  /**
   * Calculate maximum pairwise correlation for given weights
   */
  private calculateMaxPairwiseCorrelation(
    weights: number[],
    correlationMatrix: CorrelationMatrix
  ): number {
    let maxCorr = -Infinity;
    const threshold = 0.05; // Only consider strategies with >5% weight

    for (let i = 0; i < weights.length; i++) {
      if (weights[i] < threshold) continue;
      for (let j = i + 1; j < weights.length; j++) {
        if (weights[j] < threshold) continue;
        const corr = Math.abs(correlationMatrix.matrix[i][j]);
        if (corr > maxCorr) maxCorr = corr;
      }
    }

    return maxCorr === -Infinity ? 0 : maxCorr;
  }

  /**
   * Update strategy weights
   */
  updateWeights(weights: number[]): void {
    const enabledStrategies = this.portfolio.strategies.filter(s => s.enabled);
    if (weights.length !== enabledStrategies.length) {
      throw new Error('Number of weights must match number of enabled strategies');
    }

    let index = 0;
    for (const strategy of this.portfolio.strategies) {
      if (strategy.enabled) {
        strategy.weight = weights[index];
        index++;
      }
    }

    this.normalizeWeights();
  }

  /**
   * Rebalance portfolio based on current market conditions
   */
  async rebalance(
    data: OHLCV[],
    config: BacktestConfig
  ): Promise<{ oldWeights: number[]; newWeights: number[]; improvement: number }> {
    const enabledStrategies = this.portfolio.strategies.filter(s => s.enabled);
    const oldWeights = enabledStrategies.map(s => s.weight);

    // Optimize weights
    const optimization = await this.optimizeWeights(data, config);
    const newWeights = optimization.weights;

    // Calculate improvement
    const oldPerformance = await this.backtestPortfolio(data, config);
    this.updateWeights(newWeights);
    const newPerformance = await this.backtestPortfolio(data, config);
    
    const improvement = newPerformance.sharpeRatio - oldPerformance.sharpeRatio;

    return {
      oldWeights,
      newWeights,
      improvement
    };
  }

  /**
   * Get portfolio summary
   */
  getSummary(): {
    name: string;
    numStrategies: number;
    numEnabled: number;
    weights: Array<{ name: string; weight: number; enabled: boolean }>;
    rebalanceFrequency: string;
  } {
    return {
      name: this.portfolio.name,
      numStrategies: this.portfolio.strategies.length,
      numEnabled: this.portfolio.strategies.filter(s => s.enabled).length,
      weights: this.portfolio.strategies.map(s => ({
        name: s.strategy.config.name,
        weight: s.weight,
        enabled: s.enabled
      })),
      rebalanceFrequency: this.portfolio.rebalanceFrequency
    };
  }
}

export default StrategyComposer;
