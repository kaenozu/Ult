import type { OptimizationParameter, ObjectiveFunction, GridSearchOptions } from './types';

export class GridSearch {
  private parameters: OptimizationParameter[];
  private options: GridSearchOptions;

  constructor(parameters: OptimizationParameter[], options?: Partial<GridSearchOptions>) {
    this.parameters = parameters;
    this.options = {
      gridPoints: 10,
      randomSearch: false,
      ...options
    };
  }

  getOptions(): GridSearchOptions {
    return this.options;
  }

  generateParameterGrid(): Array<Record<string, number | string>> {
    const grid: Array<Record<string, number | string>> = [];
    const paramArrays: Array<Array<number | string>> = [];

    for (const param of this.parameters) {
      if (param.type === 'continuous' && param.min !== undefined && param.max !== undefined) {
        const step = (param.max - param.min) / (this.options.gridPoints - 1);
        paramArrays.push(Array(this.options.gridPoints).fill(0).map((_, i) => param.min! + i * step));
      } else if (param.type === 'discrete' && param.min !== undefined && param.max !== undefined) {
        const step = Math.max(1, Math.ceil((param.max - param.min) / (this.options.gridPoints - 1)));
        const values: number[] = [];
        for (let v = param.min; v <= param.max; v += step) {
          values.push(v);
        }
        paramArrays.push(values);
      } else if (param.type === 'categorical' && param.values) {
        paramArrays.push(param.values);
      }
    }

    const product = this.cartesianProduct(paramArrays);

    for (const values of product) {
      const parameters: Record<string, number | string> = {};
      values.forEach((value, i) => {
        parameters[this.parameters[i].name] = value;
      });
      grid.push(parameters);
    }

    return grid;
  }

  private cartesianProduct(arrays: Array<Array<number | string>>): Array<Array<number | string>> {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restProduct = this.cartesianProduct(rest);
    return first.flatMap(value => restProduct.map(arr => [value, ...arr]));
  }

  sampleFromGrid(
    grid: Array<Record<string, number | string>>,
    numSamples: number
  ): Array<Record<string, number | string>> {
    const samples: Array<Record<string, number | string>> = [];
    const indices = new Set<number>();

    while (indices.size < numSamples && indices.size < grid.length) {
      indices.add(Math.floor(Math.random() * grid.length));
    }

    for (const index of indices) {
      samples.push(grid[index]);
    }

    return samples;
  }

  getEvaluationGrid(): Array<Record<string, number | string>> {
    const grid = this.generateParameterGrid();

    if (this.options.randomSearch && this.options.numRandomSamples) {
      return this.sampleFromGrid(grid, this.options.numRandomSamples);
    }

    return grid;
  }
}

export interface GridEvaluationResult {
  grid: Array<Record<string, number | string>>;
  evaluateSequential: (
    objectiveFunction: ObjectiveFunction,
    onProgress?: (iteration: number, total: number) => void
  ) => Promise<Array<{ parameters: Record<string, number | string>; score: number }>>;
  evaluateParallel: (
    objectiveFunction: ObjectiveFunction,
    batchSize: number,
    onProgress?: (iteration: number, total: number) => void
  ) => Promise<Array<{ parameters: Record<string, number | string>; score: number }>>;
}

export function createGridEvaluator(grid: Array<Record<string, number | string>>): GridEvaluationResult {
  return {
    grid,
    async evaluateSequential(objectiveFunction, onProgress) {
      const results: Array<{ parameters: Record<string, number | string>; score: number }> = [];

      for (let i = 0; i < grid.length; i++) {
        const score = await objectiveFunction(grid[i]);
        results.push({ parameters: grid[i], score });
        onProgress?.(i + 1, grid.length);
      }

      return results;
    },
    async evaluateParallel(objectiveFunction, batchSize, onProgress) {
      const results: Array<{ parameters: Record<string, number | string>; score: number }> = [];

      for (let i = 0; i < grid.length; i += batchSize) {
        const batch = grid.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (params) => ({
            parameters: params,
            score: await objectiveFunction(params)
          }))
        );
        results.push(...batchResults);
        onProgress?.(Math.min(i + batchSize, grid.length), grid.length);
      }

      return results;
    }
  };
}
