/**
 * Quick Start Example for Performance Measurement System
 *
 * This example demonstrates basic usage of the standardized
 * performance measurement utilities.
 */

import { measurePerformance, measurePerformanceAsync, PerformanceMonitor } from './performance-utils';

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

  operationWithCustomThreshold(): void {
    measurePerformance('example-with-threshold', () => {
      // This operation should complete quickly
    }, { threshold: 50 });
  }
}

// Example 2: Run and view results
async function runExample(): Promise<void> {
  const service = new ExampleService();

  // Run operations
  service.syncOperation();

  await service.asyncOperation();

  service.operationWithCustomThreshold();

  // Get metrics

  const syncStats = PerformanceMonitor.getStats(example-sync-operation);
  const asyncStats = PerformanceMonitor.getStats(example-async-operation);

  console.table([
    {
      operation: 'example-sync-operation',
      avg: `${syncStats.avg.toFixed(2)}ms`,
      count: syncStats.count,
      warnings: syncStats.warningCount,
      errors: syncStats.errorCount,
    },
    {
      operation: 'example-async-operation',
      avg: `${asyncStats.avg.toFixed(2)}ms`,
      count: asyncStats.count,
      warnings: asyncStats.warningCount,
      errors: asyncStats.errorCount,
    }
  ]);
  // Get summary
  const summary = PerformanceMonitor.getSummary();

  if (summary.slowOperations.length > 0) {
  }

  if (summary.criticalOperations.length > 0) {
  }

  // Check for issues
  if (PerformanceMonitor.hasWarnings()) {
  }

  if (PerformanceMonitor.hasErrors()) {
  }
}

// Run if this is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { ExampleService, runExample };
