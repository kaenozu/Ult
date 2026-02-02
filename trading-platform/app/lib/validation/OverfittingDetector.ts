/**
 * OverfittingDetector.ts
 * 
 * Advanced overfitting detection and validation system
 * 
 * Features:
 * - Train-Validation-Test split enforcement
 * - Parameter sensitivity analysis
 * - White noise check
 * - Statistical significance testing
 * - Performance degradation analysis
 */

import type {
  ValidationConfig,
  DataSplit,
  OverfittingAnalysis,
  PerformanceDegradationTest,
  ParameterSensitivityTest,
  WhiteNoiseTest,
  StatisticalSignificanceTest,
  ParameterStability
} from './types';

// ============================================================================
// Overfitting Detector
// ============================================================================

export class OverfittingDetector {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      trainRatio: 0.6,
      validationRatio: 0.2,
      testRatio: 0.2,
      timeSeriesSplit: true,
      purgeGap: 0,
      degradationThreshold: 0.2,
      stabilityThreshold: 0.7,
      whiteNoiseThreshold: 0.05,
      ...config
    };

    // Validate ratios sum to 1
    const sum = this.config.trainRatio + this.config.validationRatio + this.config.testRatio;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error('Train, validation, and test ratios must sum to 1.0');
    }
  }

  /**
   * Split data into train, validation, and test sets
   */
  splitData<T>(data: T[]): DataSplit {
    const totalSize = data.length;
    
    if (this.config.timeSeriesSplit) {
      // Time series split: maintain temporal order
      const trainEnd = Math.floor(totalSize * this.config.trainRatio);
      const validationEnd = Math.floor(totalSize * (this.config.trainRatio + this.config.validationRatio));
      
      return {
        train: {
          startIndex: 0,
          endIndex: trainEnd,
          data: data.slice(0, trainEnd)
        },
        validation: {
          startIndex: trainEnd + (this.config.purgeGap || 0),
          endIndex: validationEnd,
          data: data.slice(trainEnd + (this.config.purgeGap || 0), validationEnd)
        },
        test: {
          startIndex: validationEnd + (this.config.purgeGap || 0),
          endIndex: totalSize,
          data: data.slice(validationEnd + (this.config.purgeGap || 0))
        }
      };
    } else {
      // Random split (for non-time-series data)
      const shuffled = this.shuffleArray([...data]);
      const trainEnd = Math.floor(totalSize * this.config.trainRatio);
      const validationEnd = Math.floor(totalSize * (this.config.trainRatio + this.config.validationRatio));
      
      return {
        train: {
          startIndex: 0,
          endIndex: trainEnd,
          data: shuffled.slice(0, trainEnd)
        },
        validation: {
          startIndex: trainEnd,
          endIndex: validationEnd,
          data: shuffled.slice(trainEnd, validationEnd)
        },
        test: {
          startIndex: validationEnd,
          endIndex: totalSize,
          data: shuffled.slice(validationEnd)
        }
      };
    }
  }

  /**
   * Comprehensive overfitting detection
   */
  async detectOverfitting(
    trainScore: number,
    validationScore: number,
    testScore: number,
    parameters: Record<string, number | string>,
    evaluateFunction: (params: Record<string, number | string>) => Promise<number>
  ): Promise<OverfittingAnalysis> {
    // Run all tests
    const degradationTest = this.testPerformanceDegradation(trainScore, validationScore, testScore);
    const sensitivityTest = await this.testParameterSensitivity(parameters, evaluateFunction);
    const whiteNoiseTest = this.testWhiteNoise([trainScore, validationScore, testScore]);
    const significanceTest = this.testStatisticalSignificance(trainScore, validationScore, testScore);

    // Determine if overfitting exists
    const isOverfit = !degradationTest.passed || !sensitivityTest.passed || !significanceTest.passed;
    
    // Calculate overall overfitting score
    const overfittingScore = this.calculateOverfittingScore({
      degradationTest,
      sensitivityTest,
      whiteNoiseTest,
      significanceTest
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      degradationTest,
      sensitivityTest,
      whiteNoiseTest,
      significanceTest
    });

    const warnings = this.generateWarnings({
      degradationTest,
      sensitivityTest,
      whiteNoiseTest,
      significanceTest
    });

    return {
      isOverfit,
      overfittingScore,
      confidence: significanceTest.confidenceLevel,
      tests: {
        performanceDegradation: degradationTest,
        parameterSensitivity: sensitivityTest,
        whiteNoiseCheck: whiteNoiseTest,
        statisticalSignificance: significanceTest
      },
      recommendations,
      warnings
    };
  }

  /**
   * Test for performance degradation between train/validation/test
   */
  private testPerformanceDegradation(
    trainScore: number,
    validationScore: number,
    testScore: number
  ): PerformanceDegradationTest {
    const trainToValidationDegradation = (trainScore - validationScore) / trainScore;
    const trainToTestDegradation = (trainScore - testScore) / trainScore;

    const maxDegradation = Math.max(trainToValidationDegradation, trainToTestDegradation);
    
    let severity: 'none' | 'low' | 'medium' | 'high' | 'severe' = 'none';
    if (maxDegradation > 0.5) severity = 'severe';
    else if (maxDegradation > 0.35) severity = 'high';
    else if (maxDegradation > 0.2) severity = 'medium';
    else if (maxDegradation > 0.1) severity = 'low';

    const passed = maxDegradation <= this.config.degradationThreshold;

    let message = '';
    if (passed) {
      message = `Performance degradation is acceptable (${(maxDegradation * 100).toFixed(1)}%)`;
    } else {
      message = `Significant performance degradation detected (${(maxDegradation * 100).toFixed(1)}%). Model may be overfit.`;
    }

    return {
      passed,
      trainScore,
      validationScore,
      testScore,
      trainToValidationDegradation,
      trainToTestDegradation,
      severity,
      message
    };
  }

  /**
   * Test parameter sensitivity
   */
  private async testParameterSensitivity(
    parameters: Record<string, number | string>,
    evaluateFunction: (params: Record<string, number | string>) => Promise<number>
  ): Promise<ParameterSensitivityTest> {
    const sensitivity: Record<string, number> = {};
    const baseScore = await evaluateFunction(parameters);
    
    const perturbations = [0.9, 0.95, 1.05, 1.1]; // ±10%, ±5%
    
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      if (typeof paramValue !== 'number') continue;
      
      const scores: number[] = [];
      
      for (const factor of perturbations) {
        const perturbedParams = { ...parameters, [paramName]: paramValue * factor };
        const score = await evaluateFunction(perturbedParams);
        scores.push(score);
      }
      
      // Calculate sensitivity as std deviation of score changes
      const scoreChanges = scores.map(s => Math.abs((s - baseScore) / baseScore));
      const avgChange = scoreChanges.reduce((sum, c) => sum + c, 0) / scoreChanges.length;
      sensitivity[paramName] = avgChange;
    }

    const sensitivities = Object.values(sensitivity);
    const avgSensitivity = sensitivities.reduce((sum, s) => sum + s, 0) / sensitivities.length;
    const maxSensitivity = Math.max(...sensitivities);
    
    // Parameters with high sensitivity (>0.2 means >20% score change for 10% param change)
    const unstableParameters = Object.entries(sensitivity)
      .filter(([_, s]) => s > 0.2)
      .map(([name, _]) => name);

    const passed = avgSensitivity < 0.15 && maxSensitivity < 0.3;

    const message = passed
      ? `Parameters show good stability (avg sensitivity: ${(avgSensitivity * 100).toFixed(1)}%)`
      : `High parameter sensitivity detected. Unstable parameters: ${unstableParameters.join(', ')}`;

    return {
      passed,
      sensitivity,
      avgSensitivity,
      maxSensitivity,
      unstableParameters,
      message
    };
  }

  /**
   * White noise test (Ljung-Box test approximation)
   */
  private testWhiteNoise(scores: number[]): WhiteNoiseTest {
    if (scores.length < 3) {
      return {
        passed: true,
        pValue: 1.0,
        isWhiteNoise: true,
        message: 'Insufficient data for white noise test'
      };
    }

    // Calculate autocorrelation at lag 1
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    
    if (variance === 0) {
      return {
        passed: false,
        pValue: 0,
        isWhiteNoise: false,
        message: 'No variance in scores - potential issue'
      };
    }

    let autocorr = 0;
    for (let i = 0; i < scores.length - 1; i++) {
      autocorr += (scores[i] - mean) * (scores[i + 1] - mean);
    }
    autocorr = autocorr / ((scores.length - 1) * variance);

    // Ljung-Box Q-statistic approximation
    const n = scores.length;
    const qStat = n * (n + 2) * Math.pow(autocorr, 2) / (n - 1);
    
    // Convert to p-value (chi-square distribution with 1 df)
    const pValue = 1 - this.chiSquareCDF(qStat, 1);

    const isWhiteNoise = pValue > this.config.whiteNoiseThreshold;
    const passed = isWhiteNoise;

    const message = passed
      ? `Residuals appear to be white noise (p=${pValue.toFixed(3)})`
      : `Residuals show autocorrelation (p=${pValue.toFixed(3)}), suggesting overfitting`;

    return {
      passed,
      pValue,
      isWhiteNoise,
      message
    };
  }

  /**
   * Statistical significance test
   */
  private testStatisticalSignificance(
    trainScore: number,
    validationScore: number,
    testScore: number
  ): StatisticalSignificanceTest {
    // Simplified t-test approximation
    const scores = [trainScore, validationScore, testScore];
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const std = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length);
    
    if (std === 0) {
      return {
        passed: false,
        pValue: 1.0,
        confidenceLevel: 0,
        isSignificant: false,
        effectSize: 0,
        message: 'No variance in scores'
      };
    }

    // Effect size (Cohen's d)
    const effectSize = (trainScore - testScore) / std;
    
    // Simplified p-value calculation
    const tStat = Math.abs(effectSize) * Math.sqrt(scores.length);
    const pValue = 2 * (1 - this.normalCDF(tStat)); // Two-tailed test
    
    const isSignificant = pValue < 0.05;
    const confidenceLevel = (1 - pValue) * 100;
    
    const passed = isSignificant && Math.abs(effectSize) < 1.0; // Significant but not overly so

    let message = '';
    if (!isSignificant) {
      message = 'Results not statistically significant';
    } else if (Math.abs(effectSize) > 1.0) {
      message = `Large effect size (${effectSize.toFixed(2)}) suggests overfitting`;
    } else {
      message = `Results are statistically significant with good effect size (${effectSize.toFixed(2)})`;
    }

    return {
      passed,
      pValue,
      confidenceLevel,
      isSignificant,
      effectSize,
      message
    };
  }

  /**
   * Calculate overall overfitting score
   */
  private calculateOverfittingScore(tests: {
    degradationTest: PerformanceDegradationTest;
    sensitivityTest: ParameterSensitivityTest;
    whiteNoiseTest: WhiteNoiseTest;
    significanceTest: StatisticalSignificanceTest;
  }): number {
    let score = 0;
    
    // Degradation component (0-0.4)
    const degradation = Math.max(
      tests.degradationTest.trainToValidationDegradation,
      tests.degradationTest.trainToTestDegradation
    );
    score += Math.min(0.4, degradation);
    
    // Sensitivity component (0-0.3)
    score += Math.min(0.3, tests.sensitivityTest.avgSensitivity);
    
    // White noise component (0-0.15)
    if (!tests.whiteNoiseTest.isWhiteNoise) {
      score += 0.15 * (1 - tests.whiteNoiseTest.pValue);
    }
    
    // Significance component (0-0.15)
    if (Math.abs(tests.significanceTest.effectSize) > 1.0) {
      score += 0.15 * (Math.abs(tests.significanceTest.effectSize) - 1.0);
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(tests: {
    degradationTest: PerformanceDegradationTest;
    sensitivityTest: ParameterSensitivityTest;
    whiteNoiseTest: WhiteNoiseTest;
    significanceTest: StatisticalSignificanceTest;
  }): string[] {
    const recommendations: string[] = [];

    if (!tests.degradationTest.passed) {
      recommendations.push('Reduce model complexity or increase training data');
      recommendations.push('Use stronger regularization');
      recommendations.push('Perform feature selection to reduce overfitting');
    }

    if (!tests.sensitivityTest.passed) {
      recommendations.push('Stabilize unstable parameters: ' + tests.sensitivityTest.unstableParameters.join(', '));
      recommendations.push('Use parameter averaging or ensemble methods');
      recommendations.push('Increase parameter constraints');
    }

    if (!tests.whiteNoiseTest.passed) {
      recommendations.push('Check for autocorrelation in residuals');
      recommendations.push('Consider adding time-series specific features');
    }

    if (!tests.significanceTest.passed && tests.significanceTest.effectSize > 1.0) {
      recommendations.push('Very large effect size suggests overfitting');
      recommendations.push('Use walk-forward validation');
      recommendations.push('Increase out-of-sample test period');
    }

    if (recommendations.length === 0) {
      recommendations.push('Model validation looks good');
      recommendations.push('Continue monitoring performance on new data');
    }

    return recommendations;
  }

  /**
   * Generate warnings based on test results
   */
  private generateWarnings(tests: {
    degradationTest: PerformanceDegradationTest;
    sensitivityTest: ParameterSensitivityTest;
    whiteNoiseTest: WhiteNoiseTest;
    significanceTest: StatisticalSignificanceTest;
  }): string[] {
    const warnings: string[] = [];

    if (tests.degradationTest.severity === 'severe') {
      warnings.push('⚠️ SEVERE: Performance degradation is critical');
    } else if (tests.degradationTest.severity === 'high') {
      warnings.push('⚠️ HIGH: Significant performance degradation detected');
    }

    if (tests.sensitivityTest.maxSensitivity > 0.5) {
      warnings.push('⚠️ CRITICAL: Extremely high parameter sensitivity');
    }

    if (!tests.significanceTest.isSignificant) {
      warnings.push('⚠️ Results may not be statistically significant');
    }

    return warnings;
  }

  /**
   * Analyze parameter stability across perturbations
   */
  async analyzeParameterStability(
    parameters: Record<string, number | string>,
    evaluateFunction: (params: Record<string, number | string>) => Promise<number>
  ): Promise<ParameterStability[]> {
    const stabilities: ParameterStability[] = [];
    const baseScore = await evaluateFunction(parameters);
    
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      if (typeof paramValue !== 'number') continue;
      
      // Test with perturbations
      const perturbations = [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2];
      const scores: Array<{ value: number; score: number }> = [];
      
      for (const delta of perturbations) {
        const testValue = paramValue * (1 + delta);
        const testParams = { ...parameters, [paramName]: testValue };
        const score = await evaluateFunction(testParams);
        scores.push({ value: testValue, score });
      }
      
      // Calculate sensitivity
      const scoreChanges = scores.map(s => Math.abs((s.score - baseScore) / baseScore));
      const sensitivity = scoreChanges.reduce((sum, c) => sum + c, 0) / scoreChanges.length;
      
      // Find robust range (within 10% of optimal score)
      const threshold = baseScore * 0.9;
      const robustValues = scores.filter(s => s.score >= threshold).map(s => s.value);
      const robustRange = {
        min: Math.min(...robustValues, paramValue),
        max: Math.max(...robustValues, paramValue)
      };
      
      stabilities.push({
        parameter: paramName,
        optimalValue: paramValue,
        sensitivity,
        robustRange,
        isStable: sensitivity < 0.15
      });
    }
    
    return stabilities;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  private chiSquareCDF(x: number, df: number): number {
    // Simplified chi-square CDF for df=1
    if (df !== 1) throw new Error('Only df=1 supported');
    if (x <= 0) return 0;
    
    const sqrtX = Math.sqrt(x);
    return this.erf(sqrtX / Math.sqrt(2));
  }
}

export default OverfittingDetector;
