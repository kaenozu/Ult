/**
 * OverfittingDetector.ts
 * 
 * Comprehensive overfitting detection for strategy optimization.
 * 
 * Features:
 * - In-sample vs out-of-sample performance comparison
 * - Parameter stability testing
 * - Walk-forward analysis integration
 * - Complexity penalty calculation
 * - Early stopping criteria
 * 
 * Addresses: 過度最適化検出機能 requirement
 */

import { BacktestResult } from './AdvancedBacktestEngine';
import { WalkForwardResult } from '../optimization/types';

// ============================================================================
// Types
// ============================================================================

export interface OverfittingAnalysis {
  overfit: boolean;
  overfittingScore: number; // 0-1, higher means more overfitting
  confidence: number; // 0-1, confidence in the assessment
  indicators: {
    performanceDegradation: number;
    parameterInstability: number;
    complexityPenalty: number;
    walkForwardConsistency: number;
    sharpeRatioDrop: number;
  };
  recommendations: string[];
  warnings: string[];
}

export interface ComparisonMetrics {
  inSample: BacktestResult;
  outOfSample: BacktestResult;
  degradation: {
    totalReturn: number;
    sharpeRatio: number;
    winRate: number;
    maxDrawdown: number;
  };
}

export interface ParameterStability {
  parameter: string;
  sensitivity: number; // How much results change with parameter changes
  optimalRange: [number, number];
  currentValue: number;
  isStable: boolean;
}

export interface ComplexityMetrics {
  numParameters: number;
  numTrades: number;
  avgHoldingPeriod: number;
  turnoverRatio: number;
  complexityScore: number; // 0-1, higher is more complex
}

// ============================================================================
// Overfitting Detector
// ============================================================================

export class OverfittingDetector {
  private readonly DEGRADATION_THRESHOLD = 0.3; // 30% performance drop is suspicious
  private readonly SHARPE_DROP_THRESHOLD = 0.5; // 50% Sharpe drop is concerning
  private readonly MIN_WALK_FORWARD_PASS_RATE = 0.7; // 70% of periods should be positive
  private readonly MAX_COMPLEXITY_SCORE = 0.7; // Above this suggests overfitting

  /**
   * Comprehensive overfitting analysis
   */
  analyze(
    inSampleResult: BacktestResult,
    outOfSampleResult: BacktestResult,
    walkForwardResults?: WalkForwardResult[],
    parameters?: Record<string, number | string>,
    complexity?: ComplexityMetrics
  ): OverfittingAnalysis {
    // Calculate individual indicators
    const performanceDegradation = this.calculatePerformanceDegradation(
      inSampleResult,
      outOfSampleResult
    );

    const parameterInstability = parameters 
      ? this.assessParameterStability(parameters, inSampleResult, outOfSampleResult)
      : 0;

    const complexityPenalty = complexity 
      ? this.calculateComplexityPenalty(complexity)
      : 0;

    const walkForwardConsistency = walkForwardResults 
      ? this.assessWalkForwardConsistency(walkForwardResults)
      : 0;

    const sharpeRatioDrop = this.calculateSharpeRatioDrop(
      inSampleResult,
      outOfSampleResult
    );

    // Calculate overall overfitting score (weighted average)
    let totalWeight = 0;
    let weightedScore = 0;

    // Performance degradation (Always included)
    weightedScore += performanceDegradation * weights.performanceDegradation;
    totalWeight += weights.performanceDegradation;

    // Sharpe ratio drop (Always included)
    weightedScore += sharpeRatioDrop * weights.sharpeRatioDrop;
    totalWeight += weights.sharpeRatioDrop;

    // Parameter instability (Only if parameters provided)
    if (parameters) {
      weightedScore += parameterInstability * weights.parameterInstability;
      totalWeight += weights.parameterInstability;
    }

    // Complexity penalty (Only if complexity provided)
    if (complexity) {
      weightedScore += complexityPenalty * weights.complexityPenalty;
      totalWeight += weights.complexityPenalty;
    }

    // Walk forward consistency (Only if results provided)
    if (walkForwardResults && walkForwardResults.length > 0) {
      weightedScore += (1 - walkForwardConsistency) * weights.walkForwardConsistency;
      totalWeight += weights.walkForwardConsistency;
    }

    const overfittingScore = weightedScore / totalWeight;

    // Determine if overfitted
    const overfit = overfittingScore > 0.5; // Threshold for overfitting

    // Calculate confidence based on available data
    const confidence = this.calculateConfidence(
      inSampleResult,
      outOfSampleResult,
      walkForwardResults,
      parameters,
      complexity
    );

    // Generate recommendations and warnings
    const { recommendations, warnings } = this.generateAdvice(
      overfittingScore,
      {
        performanceDegradation,
        parameterInstability,
        complexityPenalty,
        walkForwardConsistency,
        sharpeRatioDrop
      }
    );

    return {
      overfit,
      overfittingScore,
      confidence,
      indicators: {
        performanceDegradation,
        parameterInstability,
        complexityPenalty,
        walkForwardConsistency,
        sharpeRatioDrop
      },
      recommendations,
      warnings
    };
  }

  /**
   * Calculate performance degradation from in-sample to out-of-sample
   */
  private calculatePerformanceDegradation(
    inSample: BacktestResult,
    outOfSample: BacktestResult
  ): number {
    const inReturn = inSample.metrics.totalReturn;
    const outReturn = outOfSample.metrics.totalReturn;

    // If both are positive, calculate degradation
    if (inReturn > 0 && outReturn > 0) {
      const degradation = (inReturn - outReturn) / inReturn;
      return Math.max(0, Math.min(1, degradation / this.DEGRADATION_THRESHOLD));
    }

    // If in-sample is positive but out-of-sample is negative, severe overfitting
    if (inReturn > 0 && outReturn <= 0) {
      return 1.0;
    }

    // If both are negative, might not be overfitting, just a bad strategy
    if (inReturn <= 0 && outReturn <= 0) {
      return 0.3; // Some concern, but not necessarily overfitting
    }

    return 0.5; // Mixed signals
  }

  /**
   * Calculate Sharpe ratio drop
   */
  private calculateSharpeRatioDrop(
    inSample: BacktestResult,
    outOfSample: BacktestResult
  ): number {
    const inSharpe = inSample.metrics.sharpeRatio;
    const outSharpe = outOfSample.metrics.sharpeRatio;

    if (inSharpe <= 0) return 0; // Can't drop if already negative

    const drop = (inSharpe - outSharpe) / inSharpe;
    return Math.max(0, Math.min(1, drop / this.SHARPE_DROP_THRESHOLD));
  }

  /**
   * Assess parameter stability
   */
  private assessParameterStability(
    parameters: Record<string, number | string>,
    inSample: BacktestResult,
    outOfSample: BacktestResult
  ): number {
    const numParams = Object.keys(parameters).length;
    
    // More parameters = higher risk of overfitting
    const paramCountPenalty = Math.min(1, numParams / 20); // Penalty increases with param count

    // High parameter count with poor out-of-sample suggests instability
    const performanceRatio = outOfSample.metrics.totalReturn / 
      (inSample.metrics.totalReturn || 1);

    if (performanceRatio < 0.5 && numParams > 10) {
      return 0.8; // High instability
    }

    return paramCountPenalty * 0.5; // Moderate concern based on parameter count
  }

  /**
   * Calculate complexity penalty
   */
  private calculateComplexityPenalty(complexity: ComplexityMetrics): number {
    let score = 0;

    // Too many parameters
    if (complexity.numParameters > 15) {
      score += 0.3;
    } else if (complexity.numParameters > 10) {
      score += 0.15;
    }

    // Excessive trading (overoptimized for training data)
    if (complexity.turnoverRatio > 5.0) {
      score += 0.3;
    } else if (complexity.turnoverRatio > 3.0) {
      score += 0.15;
    }

    // Very short holding periods suggest overfitting to noise
    if (complexity.avgHoldingPeriod < 2) {
      score += 0.2;
    }

    // Use provided complexity score if available
    if (complexity.complexityScore > this.MAX_COMPLEXITY_SCORE) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Assess walk-forward consistency
   */
  private assessWalkForwardConsistency(results: WalkForwardResult[]): number {
    if (results.length === 0) return 0;

    // Calculate pass rate (periods with positive out-of-sample performance)
    const passCount = results.filter(r => r.testScore > 0).length;
    const passRate = passCount / results.length;

    // Calculate consistency of performance
    const testScores = results.map(r => r.testScore);
    const avgScore = testScores.reduce((sum, s) => sum + s, 0) / testScores.length;
    const variance = testScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / testScores.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgScore !== 0 ? stdDev / Math.abs(avgScore) : 1;

    // Lower CV and higher pass rate = more consistent
    const consistencyScore = passRate * (1 - Math.min(1, coefficientOfVariation));

    return Math.max(0, Math.min(1, consistencyScore));
  }

  /**
   * Calculate confidence in overfitting assessment
   */
  private calculateConfidence(
    inSample: BacktestResult,
    outOfSample: BacktestResult,
    walkForwardResults?: WalkForwardResult[],
    parameters?: Record<string, number | string>,
    complexity?: ComplexityMetrics
  ): number {
    let confidence = 0;
    let factors = 0;

    // Base confidence from having in/out sample data
    confidence += 0.3;
    factors++;

    // Additional confidence from walk-forward results
    if (walkForwardResults && walkForwardResults.length >= 5) {
      confidence += 0.4;
      factors++;
    } else if (walkForwardResults && walkForwardResults.length >= 3) {
      confidence += 0.2;
      factors++;
    }

    // Confidence from parameter analysis
    if (parameters && Object.keys(parameters).length > 0) {
      confidence += 0.15;
      factors++;
    }

    // Confidence from complexity metrics
    if (complexity) {
      confidence += 0.15;
      factors++;
    }

    // Confidence increases with more trades (more statistical significance)
    const totalTrades = inSample.metrics.totalTrades + outOfSample.metrics.totalTrades;
    if (totalTrades > 100) {
      confidence += 0.1;
    } else if (totalTrades > 50) {
      confidence += 0.05;
    }

    return Math.min(1, confidence);
  }

  /**
   * Generate recommendations and warnings
   */
  private generateAdvice(
    overfittingScore: number,
    indicators: OverfittingAnalysis['indicators']
  ): { recommendations: string[]; warnings: string[] } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Overall overfitting
    if (overfittingScore > 0.7) {
      warnings.push('Severe overfitting detected. Strategy is likely not robust.');
      recommendations.push('Simplify strategy: reduce number of parameters');
      recommendations.push('Increase out-of-sample period');
      recommendations.push('Consider using regularization in optimization');
    } else if (overfittingScore > 0.5) {
      warnings.push('Moderate overfitting detected. Use caution when deploying strategy.');
      recommendations.push('Validate with additional out-of-sample data');
      recommendations.push('Consider walk-forward optimization');
    }

    // Performance degradation
    if (indicators.performanceDegradation > 0.5) {
      warnings.push('Significant performance degradation in out-of-sample period');
      recommendations.push('Re-optimize with more conservative parameter ranges');
      recommendations.push('Focus on strategies that perform consistently across periods');
    }

    // Parameter instability
    if (indicators.parameterInstability > 0.6) {
      warnings.push('Parameter instability detected');
      recommendations.push('Reduce number of optimized parameters');
      recommendations.push('Use wider parameter ranges to find more robust values');
    }

    // Complexity
    if (indicators.complexityPenalty > 0.6) {
      warnings.push('Strategy is too complex');
      recommendations.push('Simplify strategy logic');
      recommendations.push('Reduce trading frequency');
      recommendations.push('Increase minimum holding period');
    }

    // Walk-forward consistency
    if (indicators.walkForwardConsistency < 0.5) {
      warnings.push('Poor walk-forward consistency');
      recommendations.push('Strategy may not adapt well to changing market conditions');
      recommendations.push('Consider adaptive or machine learning-based approaches');
    }

    // Sharpe drop
    if (indicators.sharpeRatioDrop > 0.6) {
      warnings.push('Significant drop in risk-adjusted returns');
      recommendations.push('Review risk management rules');
      recommendations.push('Consider position sizing adjustments');
    }

    // If no major issues
    if (overfittingScore < 0.3) {
      recommendations.push('Strategy shows good generalization');
      recommendations.push('Continue monitoring performance on new data');
      recommendations.push('Consider gradual capital allocation increase');
    }

    return { recommendations, warnings };
  }

  /**
   * Test if strategy should stop optimization early
   */
  shouldStopOptimization(
    iterationResults: BacktestResult[],
    currentBestScore: number,
    iterationsSinceImprovement: number
  ): { shouldStop: boolean; reason: string } {
    // Stop if no improvement for many iterations
    if (iterationsSinceImprovement > 50) {
      return { shouldStop: true, reason: 'No improvement for 50 iterations' };
    }

    // Stop if results are degrading
    if (iterationResults.length > 10) {
      const recent = iterationResults.slice(-10);
      const avgRecentScore = recent.reduce((sum, r) => sum + r.metrics.sharpeRatio, 0) / recent.length;
      
      if (avgRecentScore < currentBestScore * 0.5) {
        return { shouldStop: true, reason: 'Recent results significantly worse than best' };
      }
    }

    // Stop if results are too good (suspicious)
    if (currentBestScore > 5.0) { // Sharpe > 5 is suspicious
      return { shouldStop: true, reason: 'Results suspiciously good - likely overfitted' };
    }

    return { shouldStop: false, reason: '' };
  }

  /**
   * Compare multiple strategies and identify potential overfitting
   */
  compareStrategies(
    strategies: Array<{
      name: string;
      inSample: BacktestResult;
      outOfSample: BacktestResult;
    }>
  ): Array<{
    name: string;
    rank: number;
    overfittingScore: number;
    recommendForProduction: boolean;
  }> {
    const analyzed = strategies.map(s => ({
      name: s.name,
      analysis: this.analyze(s.inSample, s.outOfSample),
      outOfSampleReturn: s.outOfSample.metrics.totalReturn,
      outOfSampleSharpe: s.outOfSample.metrics.sharpeRatio
    }));

    // Sort by combination of out-of-sample performance and overfitting score
    const scored = analyzed.map(a => ({
      name: a.name,
      score: a.outOfSampleSharpe * (1 - a.analysis.overfittingScore),
      overfittingScore: a.analysis.overfittingScore,
      recommendForProduction: !a.analysis.overfit && a.outOfSampleSharpe > 1.0
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.map((s, i) => ({
      name: s.name,
      rank: i + 1,
      overfittingScore: s.overfittingScore,
      recommendForProduction: s.recommendForProduction
    }));
  }

  /**
   * Calculate complexity metrics from backtest result
   */
  static calculateComplexity(
    result: BacktestResult,
    numParameters: number
  ): ComplexityMetrics {
    const trades = result.trades;
    const duration = result.duration || 1;

    // Calculate average holding period
    const holdingPeriods = trades
      .filter(t => t.exitDate)
      .map(t => {
        const entry = new Date(t.entryDate).getTime();
        const exit = new Date(t.exitDate!).getTime();
        return (exit - entry) / (1000 * 60 * 60 * 24); // Days
      });

    const avgHoldingPeriod = holdingPeriods.length > 0
      ? holdingPeriods.reduce((sum, p) => sum + p, 0) / holdingPeriods.length
      : 0;

    // Calculate turnover ratio
    const totalTradeValue = trades.reduce(
      (sum, t) => sum + t.entryPrice * t.quantity,
      0
    );
    const turnoverRatio = totalTradeValue / (result.config.initialCapital * (duration / 365));

    // Calculate complexity score
    const paramComplexity = Math.min(1, numParameters / 20);
    const tradeComplexity = Math.min(1, trades.length / 500);
    const turnoverComplexity = Math.min(1, turnoverRatio / 5);
    const holdingComplexity = avgHoldingPeriod < 5 ? 0.5 : 0;

    const complexityScore = (
      paramComplexity * 0.3 +
      tradeComplexity * 0.2 +
      turnoverComplexity * 0.3 +
      holdingComplexity * 0.2
    );

    return {
      numParameters,
      numTrades: trades.length,
      avgHoldingPeriod,
      turnoverRatio,
      complexityScore
    };
  }
}

export default OverfittingDetector;
