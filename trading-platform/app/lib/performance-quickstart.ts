/**
 * Quick Start Example for Performance Measurement System
 *
 * This example demonstrates basic usage of the standardized
 * performance measurement utilities.
 */


import { measurePerformance, measurePerformanceAsync } from './performance-utils';
import { devLog } from '@/app/lib/utils/dev-logger';

// Example 1: Using functional wrappers
class ExampleService {
  syncOperation(): number {
    return measurePerformance('example-sync-operation', () => {
      let result = 0;
      for (let i = 0; i < 100000; i++) {
        result += Math.sqrt(i);
      }
      return result;
    }) as number;
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

  devLog('Performance example completed');
}

// Run if this is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { ExampleService, runExample };
