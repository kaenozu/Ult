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
  console.log('Running sync operation...');
  service.syncOperation();

  console.log('Running async operation...');
  await service.asyncOperation();

  console.log('Running operation with custom threshold...');
  service.operationWithCustomThreshold();

  // Get metrics
  console.log('\n=== Performance Metrics ===');
  
  const syncStats = PerformanceMonitor.getStats('example-sync-operation');
  console.log('Sync Operation:', {
    avg: `${syncStats.avg.toFixed(2)}ms`,
    count: syncStats.count,
    warnings: syncStats.warningCount,
    errors: syncStats.errorCount,
  });

  const asyncStats = PerformanceMonitor.getStats('example-async-operation');
  console.log('Async Operation:', {
    avg: `${asyncStats.avg.toFixed(2)}ms`,
    count: asyncStats.count,
    warnings: asyncStats.warningCount,
    errors: asyncStats.errorCount,
  });

  // Get summary
  console.log('\n=== Performance Summary ===');
  const summary = PerformanceMonitor.getSummary();
  console.log('Health Score:', `${summary.healthScore}/100`);
  console.log('Total Metrics:', summary.totalMetrics);
  console.log('Total Measurements:', summary.totalMeasurements);
  
  if (summary.slowOperations.length > 0) {
    console.log('Slow Operations:', summary.slowOperations.join(', '));
  }
  
  if (summary.criticalOperations.length > 0) {
    console.log('Critical Operations:', summary.criticalOperations.join(', '));
  }

  // Check for issues
  if (PerformanceMonitor.hasWarnings()) {
    console.log('\n⚠️  Warnings detected:', PerformanceMonitor.getWarnings());
  }
  
  if (PerformanceMonitor.hasErrors()) {
    console.log('\n❌ Errors detected:', PerformanceMonitor.getErrors());
  }
}

// Run if this is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { ExampleService, runExample };
