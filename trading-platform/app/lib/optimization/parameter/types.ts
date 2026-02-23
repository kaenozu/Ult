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
  OptimizationConstraint
} from '../types';

export interface GeneticAlgorithmOptions {
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  selectionMethod: 'tournament' | 'roulette' | 'rank';
  tournamentSize?: number;
}

export interface GridSearchOptions {
  gridPoints: number;
  randomSearch?: boolean;
  numRandomSamples?: number;
}

export interface Individual {
  parameters: Record<string, number | string>;
  score: number;
}
