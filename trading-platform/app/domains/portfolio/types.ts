/**
 * Portfolio Optimization Types
 * 
 * Type definitions for advanced portfolio optimization including:
 * - Modern Portfolio Theory (MPT)
 * - Black-Litterman Model
 * - Risk Parity
 * - Factor Modeling
 */

// ============================================================================
// Core Portfolio Types
// ============================================================================

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  sector?: string;
  returns: number[];
  prices?: number[];
  marketCap?: number;
}

export interface Portfolio {
  weights: number[];
  expectedReturn: number;
  variance: number;
  standardDeviation: number;
  sharpeRatio: number;
}

// ============================================================================
// Modern Portfolio Theory (MPT) Types
// ============================================================================

export interface MPTConfig {
  riskFreeRate: number;
  optimizer: OptimizerConfig;
  covariance: CovarianceConfig;
  returns: ReturnsConfig;
}

export interface OptimizerConfig {
  maxIterations?: number;
  convergenceTolerance?: number;
  method?: 'quadratic' | 'gradient' | 'genetic';
}

export interface CovarianceConfig {
  method?: 'sample' | 'shrinkage' | 'ledoit-wolf';
  shrinkageTarget?: 'identity' | 'constant-correlation';
  lookbackPeriod?: number;
}

export interface ReturnsConfig {
  method?: 'historical' | 'exponential' | 'capm';
  lookbackPeriod?: number;
  halfLife?: number;
}

export interface EfficientFrontier {
  portfolios: Portfolio[];
  minimumVariance: Portfolio;
  maximumSharpe: Portfolio;
  capitalMarketLine: CapitalMarketLine;
  timestamp: Date;
}

export interface CapitalMarketLine {
  slope: number;
  intercept: number;
  points: Array<{ risk: number; return: number }>;
}

// ============================================================================
// Black-Litterman Model Types
// ============================================================================

export interface BlackLittermanConfig {
  mptConfig: MPTConfig;
  viewsConfig: ViewsConfig;
  tau?: number;
  riskAversion?: number;
  targetReturn?: number;
}

export interface ViewsConfig {
  confidenceLevel?: number;
  uncertaintyScaling?: number;
}

export interface View {
  type: 'absolute' | 'relative';
  assets: string[];
  expectedReturn: number;
  confidence: number;
  description?: string;
}

export interface ProcessedViews {
  pickMatrix: number[][];
  viewReturns: number[];
  viewUncertainty: number[][];
}

export interface BlackLittermanResult {
  marketReturns: number[];
  adjustedReturns: number[];
  views: ProcessedViews;
  portfolio: Portfolio;
  timestamp: Date;
}

export interface SensitivityMetric {
  view: View;
  weightChange: number[];
  sensitivity: number;
}

export interface SensitivityAnalysisResult {
  baseResult: BlackLittermanResult;
  sensitivities: SensitivityMetric[];
  timestamp: Date;
}

// ============================================================================
// Risk Parity Types
// ============================================================================

export interface RiskParityConfig {
  covariance: CovarianceConfig;
  optimizer: RiskParityOptimizerConfig;
}

export interface RiskParityOptimizerConfig {
  maxIterations?: number;
  convergenceTolerance?: number;
  method?: 'slsqp' | 'newton' | 'gradient';
}

export interface RiskParityPortfolio {
  weights: number[];
  riskContributions: RiskContribution[];
  portfolioStats: PortfolioStats;
  riskBudget: RiskBudget;
  timestamp: Date;
}

export interface RiskContribution {
  asset: number;
  weight: number;
  marginalRisk: number;
  riskContribution: number;
  riskPercentage: number;
}

export interface PortfolioStats {
  expectedReturn: number;
  variance: number;
  standardDeviation: number;
  diversificationRatio: number;
}

export interface RiskBudget {
  targetRisk: number;
  deviations: Array<{
    asset: number;
    target: number;
    actual: number;
    deviation: number;
  }>;
  isBalanced: boolean;
}

export interface HRPPortfolio {
  weights: number[];
  clusters: Cluster[];
  dendrogram: DendrogramNode;
  timestamp: Date;
}

export interface Cluster {
  id: number;
  assets: number[];
  variance: number;
}

export interface DendrogramNode {
  id: number;
  left?: DendrogramNode;
  right?: DendrogramNode;
  distance: number;
  assets: number[];
}

export interface DynamicRiskParityResult {
  portfolios: RiskParityPortfolio[];
  rebalancePoints: Date[];
  performance: PerformanceMetrics;
  timestamp: Date;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
}

// ============================================================================
// Factor Modeling Types
// ============================================================================

export interface FactorModelingConfig {
  factorExtractor: FactorExtractorConfig;
  regression: RegressionConfig;
  attribution: RiskAttributionConfig;
}

export interface FactorExtractorConfig {
  numPCAFactors?: number;
  varianceThreshold?: number;
  predefinedFactors?: string[];
}

export interface RegressionConfig {
  method?: 'ols' | 'ridge' | 'lasso';
  regularizationParam?: number;
}

export interface RiskAttributionConfig {
  decompositionMethod?: 'brinson' | 'factor-based';
}

export interface Factor {
  id: string;
  name: string;
  returns: number[];
  type: 'market' | 'size' | 'value' | 'momentum' | 'quality' | 'volatility' | 'custom';
  loadings?: number[];
}

export interface FactorExtractionResult {
  factors: Factor[];
  factorReturns: number[][];
  factorCorrelations: number[][];
  timestamp: Date;
}

export interface FactorModel {
  assetId: string;
  factorSensitivities: number[];
  alpha: number;
  rSquared: number;
  standardError: number;
  timestamp: Date;
}

export interface RiskAttributionResult {
  totalRisk: number;
  factorRisk: Map<string, number>;
  specificRisk: number;
  diversificationEffect: number;
  marginalContributions: Map<string, number>;
  timestamp: Date;
}

export interface FactorRiskDecomposition {
  systematic: number;
  idiosyncratic: number;
  factorContributions: Map<string, {
    variance: number;
    percentage: number;
    marginalContribution: number;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface OptimizationConstraints {
  minWeight?: number;
  maxWeight?: number;
  sumToOne?: boolean;
  longOnly?: boolean;
  sectorLimits?: Map<string, number>;
  assetLimits?: Map<string, { min: number; max: number }>;
}

export interface OptimizationResult {
  success: boolean;
  weights: number[];
  objectiveValue: number;
  iterations: number;
  message: string;
}

export interface MatrixOperations {
  multiply(a: number[][], b: number[][]): number[][];
  transpose(a: number[][]): number[][];
  inverse(a: number[][]): number[][];
  add(a: number[][], b: number[][]): number[][];
  scalarMultiply(scalar: number, a: number[][]): number[][];
}
