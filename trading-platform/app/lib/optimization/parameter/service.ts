import type {
  OptimizationConfig,
  OptimizationResult,
  OptimizationParameter,
  ObjectiveFunction,
  OptimizationProgress
} from './types';
import { GeneticAlgorithm, type Individual } from './genetic-algorithm';
import { GridSearch, createGridEvaluator } from './grid-search';
import { BayesianOptimizer } from './bayesian';
import { ParticleSwarmOptimizer } from './particle-swarm';
import { ValidationService } from './validation';

export class ParameterOptimizerService {
  private config: OptimizationConfig;
  private progressCallback?: (progress: OptimizationProgress) => void;
  private startTime: number = 0;
  private bestScore: number = -Infinity;
  private bestParameters: Record<string, number | string> = {};
  private allResults: OptimizationResult['allResults'] = [];
  private convergenceHistory: number[] = [];
  private validation = new ValidationService();

  constructor(config: OptimizationConfig) {
    this.config = config;
  }

  onProgress(callback: (progress: OptimizationProgress) => void): void {
    this.progressCallback = callback;
  }

  async optimize(objectiveFunction: ObjectiveFunction): Promise<OptimizationResult> {
    this.startTime = Date.now();
    this.bestScore = -Infinity;
    this.bestParameters = {};
    this.allResults = [];
    this.convergenceHistory = [];

    const result = await this.runMethod(objectiveFunction);

    if (this.config.walkForward?.enabled) {
      result.walkForwardResults = await this.validation.performWalkForwardAnalysis(
        objectiveFunction, result.bestParameters, 5
      );
      result.overfittingScore = this.validation.calculateOverfittingScore(result.walkForwardResults);
    }

    if (this.config.crossValidation?.enabled) {
      result.crossValidationResults = await this.validation.performCrossValidation(
        objectiveFunction, result.bestParameters, this.config.crossValidation.folds
      );
      result.stabilityScore = this.validation.calculateStabilityScore(result.crossValidationResults);
    }

    return result;
  }

  private async runMethod(objectiveFunction: ObjectiveFunction): Promise<OptimizationResult> {
    switch (this.config.method) {
      case 'bayesian': return this.bayesianOptimization(objectiveFunction);
      case 'genetic': return this.geneticAlgorithm(objectiveFunction);
      case 'particle_swarm': return this.particleSwarmOptimization(objectiveFunction);
      case 'grid_search': return this.gridSearch(objectiveFunction);
      default: throw new Error(`Unknown optimization method: ${this.config.method}`);
    }
  }

  private async bayesianOptimization(objectiveFunction: ObjectiveFunction): Promise<OptimizationResult> {
    const optimizer = new BayesianOptimizer(this.config.parameters);
    const initialSamples = Math.min(10, Math.floor(this.config.maxIterations * 0.2));

    for (let i = 0; i < initialSamples; i++) {
      await this.evaluateAndStore(objectiveFunction, this.sampleRandomParameters(), i);
    }

    optimizer.setResults(
      this.allResults.map(r => ({ parameters: r.parameters, score: r.score })),
      this.bestScore
    );

    for (let i = initialSamples; i < this.config.maxIterations; i++) {
      if (this.shouldStop()) break;
      await this.evaluateAndStore(objectiveFunction, optimizer.selectNextPoint(), i);
      optimizer.setResults(
        this.allResults.map(r => ({ parameters: r.parameters, score: r.score })),
        this.bestScore
      );
    }

    return this.buildResult();
  }

  private async geneticAlgorithm(objectiveFunction: ObjectiveFunction): Promise<OptimizationResult> {
    const ga = new GeneticAlgorithm(this.config.parameters);
    const gaConfig = ga.getOptions();
    let population = await ga.initializePopulation(gaConfig.populationSize, objectiveFunction);
    this.updateBestFromPopulation(population);

    const generations = Math.floor(this.config.maxIterations / gaConfig.populationSize);

    for (let gen = 0; gen < generations; gen++) {
      if (this.shouldStop()) break;

      const selected = ga.selection(population);
      const offspring = ga.crossover(selected);
      const mutated = ga.mutate(offspring);
      const evaluatedOffspring = await ga.evaluatePopulation(mutated, objectiveFunction);
      population = ga.nextGeneration(population, evaluatedOffspring);

      this.updateBestFromPopulation(population);
      this.reportProgress((gen + 1) * gaConfig.populationSize);
    }

    return this.buildResult();
  }

  private async particleSwarmOptimization(objectiveFunction: ObjectiveFunction): Promise<OptimizationResult> {
    const pso = new ParticleSwarmOptimizer(this.config.parameters);
    const config = pso.getConfig();
    const particles = pso.initializeSwarm();
    let globalBest = { parameters: {} as Record<string, number | string>, score: -Infinity };
    const iterations = Math.floor(this.config.maxIterations / config.swarmSize);

    for (let iter = 0; iter < iterations; iter++) {
      if (this.shouldStop()) break;

      for (let i = 0; i < particles.length; i++) {
        const score = await this.evaluateAndStore(objectiveFunction, particles[i].position, iter * config.swarmSize + i);

        if (score > particles[i].bestScore) {
          particles[i].bestScore = score;
          particles[i].bestPosition = { ...particles[i].position };
        }
        if (score > globalBest.score) {
          globalBest = { parameters: { ...particles[i].position }, score };
        }
      }

      for (const particle of particles) {
        pso.updateParticleVelocity(particle, globalBest.parameters);
        pso.updateParticlePosition(particle);
      }
      this.reportProgress(iter * config.swarmSize);
    }

    return this.buildResult();
  }

  private async gridSearch(objectiveFunction: ObjectiveFunction): Promise<OptimizationResult> {
    const gs = new GridSearch(this.config.parameters);
    const grid = gs.getEvaluationGrid();
    const evaluator = createGridEvaluator(grid);

    const results = this.config.parallelization && this.config.numWorkers
      ? await evaluator.evaluateParallel(objectiveFunction, this.config.numWorkers, (i) => this.reportProgress(i))
      : await evaluator.evaluateSequential(objectiveFunction, (i) => this.reportProgress(i));

    for (const result of results) {
      this.allResults.push({ parameters: result.parameters, score: result.score, metrics: {} });
      if (result.score > this.bestScore) {
        this.bestScore = result.score;
        this.bestParameters = result.parameters;
      }
      this.convergenceHistory.push(this.bestScore);
    }

    return this.buildResult();
  }

  private sampleRandomParameters(): Record<string, number | string> {
    const parameters: Record<string, number | string> = {};
    for (const param of this.config.parameters) {
      if (param.type === 'continuous' && param.min !== undefined && param.max !== undefined) {
        parameters[param.name] = Math.random() * (param.max - param.min) + param.min;
      } else if (param.type === 'discrete' && param.min !== undefined && param.max !== undefined) {
        parameters[param.name] = Math.floor(Math.random() * (param.max - param.min + 1)) + param.min;
      } else if (param.type === 'categorical' && param.values) {
        parameters[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
      }
    }
    return parameters;
  }

  private updateBestFromPopulation(population: Individual[]): void {
    for (const individual of population) {
      this.allResults.push({ parameters: individual.parameters, score: individual.score, metrics: {} });
      if (individual.score > this.bestScore) {
        this.bestScore = individual.score;
        this.bestParameters = individual.parameters;
      }
    }
    this.convergenceHistory.push(this.bestScore);
  }

  private async evaluateAndStore(
    objectiveFunction: ObjectiveFunction,
    parameters: Record<string, number | string>,
    iteration: number
  ): Promise<number> {
    const score = await objectiveFunction(parameters);
    this.allResults.push({ parameters, score, metrics: {} });
    if (score > this.bestScore) {
      this.bestScore = score;
      this.bestParameters = parameters;
    }
    this.convergenceHistory.push(this.bestScore);
    this.reportProgress(iteration);
    return score;
  }

  private shouldStop(): boolean {
    if (this.config.maxTime && Date.now() - this.startTime >= this.config.maxTime) return true;
    if (this.config.convergenceThreshold && this.convergenceHistory.length > 10) {
      const recent = this.convergenceHistory.slice(-10);
      if (Math.abs(recent[recent.length - 1] - recent[0]) < this.config.convergenceThreshold) return true;
    }
    return false;
  }

  private reportProgress(iteration: number): void {
    if (!this.progressCallback) return;
    const timeElapsed = Date.now() - this.startTime;
    const progress = Math.min(100, (iteration / this.config.maxIterations) * 100);
    this.progressCallback({
      iteration,
      currentBestScore: this.bestScore,
      currentBestParameters: this.bestParameters,
      timeElapsed,
      estimatedTimeRemaining: progress > 0 ? timeElapsed / progress * (100 - progress) : 0,
      progress
    });
  }

  private buildResult(): OptimizationResult {
    return {
      bestParameters: this.bestParameters,
      bestScore: this.bestScore,
      allResults: this.allResults,
      iterations: this.allResults.length,
      timeElapsed: Date.now() - this.startTime,
      convergenceHistory: this.convergenceHistory
    };
  }
}

export function createDefaultOptimizationConfig(parameters?: OptimizationParameter[]): OptimizationConfig {
  return {
    method: 'grid_search',
    parameters: parameters || [],
    maxIterations: 100,
    maxTime: 3600000,
    convergenceThreshold: 0.001,
    parallelization: true,
    numWorkers: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
  };
}
