
import { PerformanceMonitor } from './performance/monitor';

const monitor = new PerformanceMonitor();

async function simulateOperations() {
  console.log('Starting performance simulation...');

  // Simulate a fast operation
  await monitor.measureAsync('fast_operation', () => new Promise(resolve => setTimeout(resolve, 50)));

  // Simulate a slow operation
  await monitor.measureAsync('slow_operation', () => new Promise(resolve => setTimeout(resolve, 500)));

  // Simulate an error
  try {
    await monitor.measureAsync(
      'error_operation',
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Simulated failure')), 100))
    );
  } catch (e) {
  }

  // Log report
  console.log('\nPerformance Report:');
  console.log(JSON.stringify(monitor.getReport(), null, 2));
}

simulateOperations().catch(console.error);
