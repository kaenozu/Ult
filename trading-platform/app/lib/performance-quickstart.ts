/**
 * Quick Start Example for Performance Measurement System
 *
 * This example demonstrates basic usage of the standardized
 * performance measurement utilities.
 */

import { measurePerformance, measurePerformanceAsync } from './performance';
import { performanceMonitor } from './performance/monitor';
import type { PerformanceMetric } from './performance/monitor';

// Example 1: Using functional wrappers
class ExampleService {
  syncOperation(): number {
    return measurePerformance('example-sync-operation', () => {
      let result = 0;
      for (let i = 0; i < 100000; i++) {
        result += Math.sqrt(i);
      }
      return result;
    });
  }

  async asyncOperation(): Promise<string> {
    return await measurePerformanceAsync('example-async-operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'completed';
    });
  }
}

// Example 2: Run and view results
async function runExample(): Promise<void> {
  const service = new ExampleService();

  // Run operations
  service.syncOperation();
  await service.asyncOperation();

  // Get metrics
  const syncStats = performanceMonitor.getMetric('example-sync-operation');
  const asyncStats = performanceMonitor.getMetric('example-async-operation');

  const defaultStats: PerformanceMetric = { avg: 0, min: 0, max: 0, count: 0 };
  const s = syncStats || defaultStats;
  const a = asyncStats || defaultStats;

  console.table([
    {
      operation: 'example-sync-operation',
      avg: `${s.avg.toFixed(2)}ms`,
      count: s.count,
      min: `${s.min.toFixed(2)}ms`,
      max: `${s.max.toFixed(2)}ms`,
    },
    {
      operation: 'example-async-operation',
      avg: `${a.avg.toFixed(2)}ms`,
      count: a.count,
      min: `${a.min.toFixed(2)}ms`,
      max: `${a.max.toFixed(2)}ms`,
    }
  ]);
}

// Run if this is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { ExampleService, runExample };
