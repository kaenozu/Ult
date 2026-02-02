/**
 * types.ts
 * 
 * Type definitions for overfitting detection and validation
 */

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationConfig {
  trainRatio: number; // 0-1
  validationRatio: number; // 0-1
  testRatio: number; // 0-1
  
  // Time series specific
  timeSeriesSplit: boolean;
  purgeGap?: number; // days to purge between train/test to avoid look-ahead bias
  
  // Overfitting thresholds
  degradationThreshold: number; // max acceptable (train - test) / train
  stabilityThreshold: number; // min required stability score
  whiteNoiseThreshold: number; // p-value threshold for white noise test
}

export interface DataSplit {
  train: {
    startIndex: number;
    endIndex: number;
    data: unknown[];
  };
  validation: {
    startIndex: number;
    endIndex: number;
    data: unknown[];
  };
  test: {
    startIndex: number;
    endIndex: number;
    data: unknown[];
  };
}

export interface OverfittingAnalysis {
  isOverfit: boolean;
  overfittingScore: number; // 0-1, higher = more overfit
  confidence: number; // 0-100
  
  tests: {
    performanceDegradation: PerformanceDegradationTest;
    parameterSensitivity: ParameterSensitivityTest;
    whiteNoiseCheck: WhiteNoiseTest;
    statisticalSignificance: StatisticalSignificanceTest;
  };
  
  recommendations: string[];
  warnings: string[];
}

export interface PerformanceDegradationTest {
  passed: boolean;
  trainScore: number;
  validationScore: number;
  testScore: number;
  trainToValidationDegradation: number;
  trainToTestDegradation: number;
  severity: 'none' | 'low' | 'medium' | 'high' | 'severe';
  message: string;
}

export interface ParameterSensitivityTest {
  passed: boolean;
  sensitivity: Record<string, number>; // parameter -> sensitivity score
  avgSensitivity: number;
  maxSensitivity: number;
  unstableParameters: string[];
  message: string;
}

export interface WhiteNoiseTest {
  passed: boolean;
  pValue: number;
  isWhiteNoise: boolean;
  message: string;
}

export interface StatisticalSignificanceTest {
  passed: boolean;
  pValue: number;
  confidenceLevel: number;
  isSignificant: boolean;
  effectSize: number;
  message: string;
}

export interface ParameterStability {
  parameter: string;
  optimalValue: number | string;
  sensitivity: number;
  robustRange: {
    min: number | string;
    max: number | string;
  };
  isStable: boolean;
}
