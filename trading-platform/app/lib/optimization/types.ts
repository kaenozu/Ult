/**
 * types.ts
 * 
 * Type definitions for parameter optimization and strategy evaluation
 */

// ============================================================================
// Optimization Types
// ============================================================================

export type OptimizationMethod = 
  | 'bayesian' 
  | 'genetic' 
  | 'particle_swarm' 
  | 'grid_search';

export interface OptimizationParameter {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  min?: number;
  max?: number;
  values?: (number | string)[];
  default?: number | string;
}

export interface OptimizationConfig {
  method: OptimizationMethod;
  parameters: OptimizationParameter[];
  maxIterations: number;
  maxTime?: number; // in milliseconds
  convergenceThreshold?: number;
  parallelization?: boolean;
  numWorkers?: number;
  
  // Walk-Forward Analysis
  walkForward?: {
    enabled: boolean;
    trainPeriod: number; // days
    testPeriod: number; // days
    anchorMode: 'rolling' | 'expanding';
  };
  
  // Cross-validation
  crossValidation?: {
    enabled: boolean;
    folds: number;
    method: 'time_series' | 'blocked';
  };
}

export interface OptimizationResult {
  bestParameters: Record<string, number | string>;
  bestScore: number;
  allResults: Array<{
    parameters: Record<string, number | string>;
    score: number;
    metrics: Record<string, number>;
    isOutOfSample?: boolean;
  }>;
  iterations: number;
  timeElapsed: number;
  convergenceHistory: number[];
  
  // Validation results
  walkForwardResults?: WalkForwardResult[];
  crossValidationResults?: CrossValidationResult[];
  
  // Overfitting indicators
  overfittingScore?: number;
  stabilityScore?: number;
}

export interface WalkForwardResult {
  period: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  trainScore: number;
  testScore: number;
  parameters: Record<string, number | string>;
  degradation: number; // (trainScore - testScore) / trainScore
}

export interface CrossValidationResult {
  fold: number;
  trainScore: number;
  validationScore: number;
  parameters: Record<string, number | string>;
}

// ============================================================================
// Objective Function Types
// ============================================================================

export interface ObjectiveFunction {
  (parameters: Record<string, number | string>): Promise<number>;
}

export interface OptimizationConstraint {
  type: 'equality' | 'inequality';
  expression: (parameters: Record<string, number | string>) => number;
  threshold: number;
}

// ============================================================================
// Algorithm-Specific Types
// ============================================================================

// Bayesian Optimization
export interface BayesianOptimizationConfig {
  acquisitionFunction: 'ei' | 'ucb' | 'poi'; // Expected Improvement, Upper Confidence Bound, Probability of Improvement
  explorationWeight: number;
  kernelType: 'rbf' | 'matern';
  initialRandomSamples: number;
}

// Genetic Algorithm
export interface GeneticAlgorithmConfig {
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  selectionMethod: 'tournament' | 'roulette' | 'rank';
  tournamentSize?: number;
}

// Particle Swarm Optimization
export interface ParticleSwarmConfig {
  swarmSize: number;
  inertiaWeight: number;
  cognitiveWeight: number;
  socialWeight: number;
  velocityClamp: number;
}

export interface Particle {
  position: Record<string, number | string>;
  velocity: Record<string, number>;
  bestPosition: Record<string, number | string>;
  bestScore: number;
}

// Grid Search
export interface GridSearchConfig {
  gridPoints: number; // points per parameter
  randomSearch?: boolean;
  numRandomSamples?: number;
}

export interface OptimizationProgress {
  iteration: number;
  currentBestScore: number;
  currentBestParameters: Record<string, number | string>;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  progress: number; // 0-100
}
