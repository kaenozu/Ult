export { ParameterOptimizerService, createDefaultOptimizationConfig } from './service';
export { GeneticAlgorithm, type Individual } from './genetic-algorithm';
export { GridSearch, createGridEvaluator, type GridEvaluationResult } from './grid-search';
export { BayesianOptimizer, type BayesianOptimizationConfigInternal } from './bayesian';
export { ParticleSwarmOptimizer } from './particle-swarm';
export { ValidationService } from './validation';

export type {
  OptimizationConfig,
  OptimizationResult,
  OptimizationParameter,
  ObjectiveFunction,
  OptimizationProgress,
  BayesianOptimizationConfig,
  GeneticAlgorithmConfig,
  ParticleSwarmConfig,
  GridSearchConfig,
  WalkForwardResult,
  CrossValidationResult,
  Particle,
  OptimizationMethod,
  OptimizationConstraint,
  GeneticAlgorithmOptions,
  GridSearchOptions
} from './types';
