import type { OptimizationParameter } from './types';

export interface BayesianOptimizationConfigInternal {
  acquisitionFunction: 'ei' | 'ucb' | 'poi';
  explorationWeight: number;
  kernelType: 'rbf' | 'matern';
  initialRandomSamples: number;
}

export class BayesianOptimizer {
  private parameters: OptimizationParameter[];
  private allResults: Array<{ parameters: Record<string, number | string>; score: number }> = [];
  private bestScore: number = -Infinity;

  constructor(parameters: OptimizationParameter[]) {
    this.parameters = parameters;
  }

  setResults(results: Array<{ parameters: Record<string, number | string>; score: number }>, bestScore: number): void {
    this.allResults = results;
    this.bestScore = bestScore;
  }

  getDefaultConfig(): BayesianOptimizationConfigInternal {
    return {
      acquisitionFunction: 'ei',
      explorationWeight: 2.0,
      kernelType: 'rbf',
      initialRandomSamples: 10
    };
  }

  selectNextPoint(): Record<string, number | string> {
    const candidates = Array(100).fill(null).map(() => this.sampleRandomParameters());
    let bestCandidate = candidates[0];
    let bestAcquisition = -Infinity;

    for (const candidate of candidates) {
      const acquisition = this.expectedImprovement(candidate);
      if (acquisition > bestAcquisition) {
        bestAcquisition = acquisition;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private sampleRandomParameters(): Record<string, number | string> {
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

  private expectedImprovement(parameters: Record<string, number | string>): number {
    const mean = this.predictMean(parameters);
    const std = this.predictStd(parameters);
    const improvement = mean - this.bestScore;

    if (std === 0) return improvement > 0 ? 1 : 0;

    const z = improvement / std;
    return improvement * this.normalCDF(z) + std * this.normalPDF(z);
  }

  private predictMean(parameters: Record<string, number | string>): number {
    if (this.allResults.length === 0) return 0;

    const distances = this.allResults.map(result => ({
      distance: this.parameterDistance(parameters, result.parameters),
      score: result.score
    }));

    distances.sort((a, b) => a.distance - b.distance);
    const k = Math.min(5, distances.length);

    return distances.slice(0, k).reduce((sum, d) => sum + d.score, 0) / k;
  }

  private predictStd(parameters: Record<string, number | string>): number {
    if (this.allResults.length < 2) return 1;

    const mean = this.predictMean(parameters);
    const distances = this.allResults.map(result => ({
      distance: this.parameterDistance(parameters, result.parameters),
      score: result.score
    }));

    distances.sort((a, b) => a.distance - b.distance);
    const k = Math.min(5, distances.length);

    const variance = distances.slice(0, k).reduce((sum, d) => sum + Math.pow(d.score - mean, 2), 0) / k;
    return Math.sqrt(variance);
  }

  private parameterDistance(
    p1: Record<string, number | string>,
    p2: Record<string, number | string>
  ): number {
    let distance = 0;

    for (const param of this.parameters) {
      const v1 = p1[param.name];
      const v2 = p2[param.name];

      if (param.type === 'categorical') {
        distance += v1 === v2 ? 0 : 1;
      } else if (typeof v1 === 'number' && typeof v2 === 'number') {
        const range = (param.max ?? 1) - (param.min ?? 0);
        distance += Math.pow((v1 - v2) / range, 2);
      }
    }

    return Math.sqrt(distance);
  }

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
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
}
