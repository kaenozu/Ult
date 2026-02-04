
import { PerformanceMonitor } from './performance';

const monitor = new PerformanceMonitor();

async function simulateOperations() {
  console.log('Starting performance simulation...');

  // Simulate a fast operation
  const fastOpId = monitor.start('fast_operation');
  await new Promise(resolve => setTimeout(resolve, 50));
  monitor.end(fastOpId);

  // Simulate a slow operation
  const slowOpId = monitor.start('slow_operation');
  await new Promise(resolve => setTimeout(resolve, 500));
  monitor.end(slowOpId);

  // Simulate an error
  const errorOpId = monitor.start('error_operation');
  try {
    await new Promise((_, reject) => setTimeout(() => reject(new Error('Simulated failure')), 100));
  } catch (e) {
    // Monitor captures end automatically if integrated, but here we manually end
    monitor.end(errorOpId);
  }

  // Log report
  console.log('\nPerformance Report:');
  console.log(JSON.stringify(monitor.getReport(), null, 2));
}

simulateOperations().catch(console.error);
