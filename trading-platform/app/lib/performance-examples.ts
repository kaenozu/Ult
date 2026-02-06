/**
 * Performance Examples
 *
 * Demonstrates usage of the performance monitoring utilities.
 */

import { performanceMonitor } from './performance';

async function simulateOperations() {
  console.log('Starting performance simulation...');

  // Simulate a fast operation
  performanceMonitor.measure('fast_operation', () => {
    // Sync operation
    for (let i = 0; i < 1000; i++) {
      Math.random();
    }
  });

  // Simulate an async operation
  await performanceMonitor.measureAsync('slow_operation', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  // Simulate API call
  await performanceMonitor.measureApiCall('test_endpoint', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { success: true };
  });

  // Log report
  console.log('\nPerformance Report:');
  console.log(performanceMonitor.getReport());
}

simulateOperations().catch(console.error);
