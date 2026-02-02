/**
 * Portfolio Optimization Module
 * 
 * Advanced portfolio optimization system including:
 * - Modern Portfolio Theory (MPT)
 * - Black-Litterman Model
 * - Risk Parity
 * - Factor Modeling
 * 
 * @module portfolioOptimization
 */

// Core components
export { CovarianceCalculator } from './CovarianceCalculator';
export { ReturnsCalculator } from './ReturnsCalculator';
export { QuadraticOptimizer } from './QuadraticOptimizer';

// Optimization strategies
export { ModernPortfolioTheory } from './ModernPortfolioTheory';
export { BlackLitterman } from './BlackLitterman';
export { RiskParity } from './RiskParity';
export { FactorModeling } from './FactorModeling';

// Types
export type {
  // Core types
  Asset,
  Portfolio,
  
  // MPT types
  MPTConfig,
  OptimizerConfig,
  CovarianceConfig,
  ReturnsConfig,
  EfficientFrontier,
  CapitalMarketLine,
  
  // Black-Litterman types
  BlackLittermanConfig,
  ViewsConfig,
  View,
  ProcessedViews,
  BlackLittermanResult,
  SensitivityMetric,
  SensitivityAnalysisResult,
  
  // Risk Parity types
  RiskParityConfig,
  RiskParityOptimizerConfig,
  RiskParityPortfolio,
  RiskContribution,
  PortfolioStats,
  RiskBudget,
  HRPPortfolio,
  Cluster,
  DendrogramNode,
  DynamicRiskParityResult,
  PerformanceMetrics,
  
  // Factor Modeling types
  FactorModelingConfig,
  FactorExtractorConfig,
  RegressionConfig,
  RiskAttributionConfig,
  Factor,
  FactorExtractionResult,
  FactorModel,
  RiskAttributionResult,
  FactorRiskDecomposition,
  
  // Utility types
  OptimizationConstraints,
  OptimizationResult,
  MatrixOperations,
} from './types';

/**
 * Create a default MPT configuration
 */
export function createDefaultMPTConfig(): import('./types').MPTConfig {
  return {
    riskFreeRate: 0.02, // 2%
    optimizer: {
      maxIterations: 1000,
      convergenceTolerance: 1e-8,
      method: 'quadratic',
    },
    covariance: {
      method: 'sample',
      lookbackPeriod: 252,
    },
    returns: {
      method: 'historical',
      lookbackPeriod: 252,
    },
  };
}

/**
 * Create a default Black-Litterman configuration
 */
export function createDefaultBlackLittermanConfig(): import('./types').BlackLittermanConfig {
  return {
    mptConfig: createDefaultMPTConfig(),
    viewsConfig: {
      confidenceLevel: 0.5,
      uncertaintyScaling: 1.0,
    },
    tau: 0.05,
    riskAversion: 2.5,
  };
}

/**
 * Create a default Risk Parity configuration
 */
export function createDefaultRiskParityConfig(): import('./types').RiskParityConfig {
  return {
    covariance: {
      method: 'sample',
      lookbackPeriod: 252,
    },
    optimizer: {
      maxIterations: 1000,
      convergenceTolerance: 1e-8,
      method: 'gradient',
    },
  };
}

/**
 * Create a default Factor Modeling configuration
 */
export function createDefaultFactorModelingConfig(): import('./types').FactorModelingConfig {
  return {
    factorExtractor: {
      numPCAFactors: 5,
      varianceThreshold: 0.95,
      predefinedFactors: ['market', 'size', 'value', 'momentum'],
    },
    regression: {
      method: 'ols',
    },
    attribution: {
      decompositionMethod: 'factor-based',
    },
  };
}
