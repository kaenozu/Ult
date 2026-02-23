import type { OptimizationParameter, ObjectiveFunction, GeneticAlgorithmOptions, Individual } from './types';

export class GeneticAlgorithm {
  private parameters: OptimizationParameter[];
  private options: GeneticAlgorithmOptions;

  constructor(parameters: OptimizationParameter[], options?: Partial<GeneticAlgorithmOptions>) {
    this.parameters = parameters;
    this.options = {
      populationSize: 50,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      elitismRate: 0.1,
      selectionMethod: 'tournament',
      tournamentSize: 3,
      ...options
    };
  }

  getOptions(): GeneticAlgorithmOptions {
    return this.options;
  }

  sampleRandomParameters(): Record<string, number | string> {
    const result: Record<string, number | string> = {};

    for (const param of this.parameters) {
      if (param.type === 'continuous' && param.min !== undefined && param.max !== undefined) {
        result[param.name] = Math.random() * (param.max - param.min) + param.min;
      } else if (param.type === 'discrete' && param.min !== undefined && param.max !== undefined) {
        result[param.name] = Math.floor(Math.random() * (param.max - param.min + 1)) + param.min;
      } else if (param.type === 'categorical' && param.values) {
        result[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
      }
    }

    return result;
  }

  async initializePopulation(
    size: number,
    objectiveFunction: ObjectiveFunction
  ): Promise<Individual[]> {
    const population: Individual[] = [];

    for (let i = 0; i < size; i++) {
      const parameters = this.sampleRandomParameters();
      const score = await objectiveFunction(parameters);
      population.push({ parameters, score });
    }

    return population;
  }

  selection(population: Individual[]): Record<string, number | string>[] {
    const selected: Record<string, number | string>[] = [];

    if (this.options.selectionMethod === 'tournament') {
      for (let i = 0; i < population.length; i++) {
        const tournament: Individual[] = [];
        for (let j = 0; j < (this.options.tournamentSize || 3); j++) {
          tournament.push(population[Math.floor(Math.random() * population.length)]);
        }
        tournament.sort((a, b) => b.score - a.score);
        selected.push(tournament[0].parameters);
      }
    }

    return selected;
  }

  crossover(parents: Record<string, number | string>[]): Record<string, number | string>[] {
    const offspring: Record<string, number | string>[] = [];

    for (let i = 0; i < parents.length - 1; i += 2) {
      if (Math.random() < this.options.crossoverRate) {
        const [child1, child2] = this.uniformCrossover(parents[i], parents[i + 1]);
        offspring.push(child1, child2);
      } else {
        offspring.push({ ...parents[i] }, { ...parents[i + 1] });
      }
    }

    return offspring;
  }

  private uniformCrossover(
    parent1: Record<string, number | string>,
    parent2: Record<string, number | string>
  ): [Record<string, number | string>, Record<string, number | string>] {
    const child1: Record<string, number | string> = {};
    const child2: Record<string, number | string> = {};

    for (const param of this.parameters) {
      if (Math.random() < 0.5) {
        child1[param.name] = parent1[param.name];
        child2[param.name] = parent2[param.name];
      } else {
        child1[param.name] = parent2[param.name];
        child2[param.name] = parent1[param.name];
      }
    }

    return [child1, child2];
  }

  mutate(individuals: Record<string, number | string>[]): Record<string, number | string>[] {
    return individuals.map(individual => {
      if (Math.random() < this.options.mutationRate) {
        const mutated = { ...individual };
        const param = this.parameters[Math.floor(Math.random() * this.parameters.length)];

        if (param.type === 'continuous' && param.min !== undefined && param.max !== undefined) {
          mutated[param.name] = Math.random() * (param.max - param.min) + param.min;
        } else if (param.type === 'discrete' && param.min !== undefined && param.max !== undefined) {
          mutated[param.name] = Math.floor(Math.random() * (param.max - param.min + 1)) + param.min;
        } else if (param.type === 'categorical' && param.values) {
          mutated[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
        }

        return mutated;
      }
      return individual;
    });
  }

  async evaluatePopulation(
    population: Record<string, number | string>[],
    objectiveFunction: ObjectiveFunction
  ): Promise<Individual[]> {
    const evaluated: Individual[] = [];

    for (const individual of population) {
      const score = await objectiveFunction(individual);
      evaluated.push({ parameters: individual, score });
    }

    return evaluated;
  }

  nextGeneration(oldPopulation: Individual[], newPopulation: Individual[]): Individual[] {
    const combined = [...oldPopulation, ...newPopulation];
    combined.sort((a, b) => b.score - a.score);
    return combined.slice(0, this.options.populationSize);
  }
}
