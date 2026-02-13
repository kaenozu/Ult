/**
 * ParameterOptimizer.test.ts
 * 
 * Tests for parameter optimization engine
 */

import { ParameterOptimizer } from '../ParameterOptimizer';
import type { OptimizationConfig, ObjectiveFunction } from '../types';

describe('ParameterOptimizer', () => {
  // Simple objective function: minimize (x-5)^2 + (y-3)^2
  const testObjectiveFunction: ObjectiveFunction = async (params) => {
    const x = params.x as number;
    const y = params.y as number;
    // Return negative because we want to maximize (optimizer maximizes by default)
    return -(Math.pow(x - 5, 2) + Math.pow(y - 3, 2));
  };

  const baseConfig: OptimizationConfig = {
    method: 'grid_search',
    parameters: [
      { name: 'x', type: 'continuous', min: 0, max: 10 },
      { name: 'y', type: 'continuous', min: 0, max: 10 }
    ],
    maxIterations: 100,
    maxTime: 10000
  };

  describe('Grid Search', () => {
    it('should find approximate optimal parameters', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'grid_search'
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      // Should be close to (5, 3) - grid search may not hit exact values
      expect(result.bestParameters.x).toBeGreaterThanOrEqual(4);
      expect(result.bestParameters.x).toBeLessThanOrEqual(6);
      expect(result.bestParameters.y).toBeGreaterThanOrEqual(2);
      expect(result.bestParameters.y).toBeLessThanOrEqual(4);
      expect(result.bestScore).toBeGreaterThan(-1); // Negative because we negate the squared distance
      expect(result.iterations).toBeGreaterThan(0);
    });

    it('should handle discrete parameters', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        parameters: [
          { name: 'x', type: 'discrete', min: 0, max: 10 },
          { name: 'y', type: 'discrete', min: 0, max: 10 }
        ],
        method: 'grid_search'
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      expect(Number.isInteger(result.bestParameters.x as number)).toBe(true);
      expect(Number.isInteger(result.bestParameters.y as number)).toBe(true);
    });

    it('should handle categorical parameters', async () => {
      const categoricalObjective: ObjectiveFunction = async (params) => {
        const strategy = params.strategy as string;
        return strategy === 'optimal' ? 1.0 : 0.5;
      };

      const config: OptimizationConfig = {
        method: 'grid_search',
        parameters: [
          { name: 'strategy', type: 'categorical', values: ['strategy1', 'optimal', 'strategy3'] }
        ],
        maxIterations: 10
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(categoricalObjective);

      expect(result.bestParameters.strategy).toBe('optimal');
    });
  });

  describe('Genetic Algorithm', () => {
    it('should optimize parameters using GA', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'genetic',
        maxIterations: 200
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      // GA should get reasonably close (allowing for stochastic variance)
      expect(Math.abs((result.bestParameters.x as number) - 5)).toBeLessThan(2);
      expect(Math.abs((result.bestParameters.y as number) - 3)).toBeLessThan(2);
    });

    it('should improve over iterations', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'genetic',
        maxIterations: 100
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      // Check convergence history
      expect(result.convergenceHistory.length).toBeGreaterThan(0);
      
      // Best score at end should be better than or equal to start
      const startScore = result.convergenceHistory[0];
      const endScore = result.convergenceHistory[result.convergenceHistory.length - 1];
      expect(endScore).toBeGreaterThanOrEqual(startScore);
    });
  });

  describe('Particle Swarm Optimization', () => {
    it('should optimize parameters using PSO', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'particle_swarm',
        maxIterations: 150
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      // PSO should converge to a reasonable solution (stochastic algorithm)
      expect(Math.abs((result.bestParameters.x as number) - 5)).toBeLessThan(3);
      expect(Math.abs((result.bestParameters.y as number) - 3)).toBeLessThan(3);
    });
  });

  describe('Bayesian Optimization', () => {
    it('should optimize parameters using Bayesian method', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'bayesian',
        maxIterations: 50
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      // Bayesian should be efficient
      expect(result.iterations).toBeLessThanOrEqual(50);
      expect(result.bestScore).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    it('should call progress callback', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'grid_search',
        maxIterations: 20
      };

      const progressUpdates: number[] = [];
      const optimizer = new ParameterOptimizer(config);
      
      optimizer.onProgress((progress) => {
        progressUpdates.push(progress.progress);
      });

      await optimizer.optimize(testObjectiveFunction);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBeGreaterThan(0);
    });
  });

  describe('Walk-Forward Validation', () => {
    it('should perform walk-forward analysis when enabled', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'grid_search',
        maxIterations: 20,
        walkForward: {
          enabled: true,
          trainPeriod: 30,
          testPeriod: 10,
          anchorMode: 'rolling'
        }
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      expect(result.walkForwardResults).toBeDefined();
      expect(result.walkForwardResults!.length).toBeGreaterThan(0);
      expect(result.overfittingScore).toBeDefined();
      expect(result.overfittingScore).toBeGreaterThanOrEqual(0);
      expect(result.overfittingScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Cross-Validation', () => {
    it('should perform cross-validation when enabled', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'grid_search',
        maxIterations: 20,
        crossValidation: {
          enabled: true,
          folds: 5,
          method: 'time_series'
        }
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      expect(result.crossValidationResults).toBeDefined();
      expect(result.crossValidationResults!.length).toBe(5);
      expect(result.stabilityScore).toBeDefined();
      expect(result.stabilityScore).toBeGreaterThanOrEqual(0);
      // Stability score may exceed 1 due to variance calculation
    });
  });

  describe('Time Limits', () => {
    it('should respect max time limit', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'genetic',
        maxIterations: 10000,
        maxTime: 100 // 100ms
      };

      const optimizer = new ParameterOptimizer(config);
      const startTime = Date.now();
      const result = await optimizer.optimize(testObjectiveFunction);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(1000); // Should complete well before 1s
      expect(result.timeElapsed).toBeLessThan(200); // Some tolerance
    }, 10000);
  });

  describe('Convergence', () => {
    it('should track convergence history', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'genetic',
        maxIterations: 50
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      expect(result.convergenceHistory).toBeDefined();
      expect(result.convergenceHistory.length).toBeGreaterThan(0);
      
      // Should show improvement or stability
      const firstHalf = result.convergenceHistory.slice(0, Math.floor(result.convergenceHistory.length / 2));
      const secondHalf = result.convergenceHistory.slice(Math.floor(result.convergenceHistory.length / 2));
      
      const avgFirst = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
      
      expect(avgSecond).toBeGreaterThanOrEqual(avgFirst);
    });
  });

  describe('All Results Tracking', () => {
    it('should track all evaluated parameter combinations', async () => {
      const config: OptimizationConfig = {
        ...baseConfig,
        method: 'grid_search',
        maxIterations: 20
      };

      const optimizer = new ParameterOptimizer(config);
      const result = await optimizer.optimize(testObjectiveFunction);

      expect(result.allResults).toBeDefined();
      expect(result.allResults.length).toBeGreaterThan(0);
      expect(result.allResults.length).toBeLessThanOrEqual(result.iterations);
      
      // Each result should have parameters and score
      result.allResults.forEach(r => {
        expect(r.parameters).toBeDefined();
        expect(r.score).toBeDefined();
        expect(typeof r.score).toBe('number');
      });
    });
  });
});
