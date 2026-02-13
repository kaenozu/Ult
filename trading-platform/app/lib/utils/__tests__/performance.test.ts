import { measurePerformance, getPerformanceStats } from '../performance';

describe('Performance Monitoring Utility', () => {
  beforeEach(() => {
    // Clear stats before each test if possible
  });

  it('should measure execution time of a synchronous function', () => {
    const fn = () => {
      // Simulate work
      for (let i = 0; i < 1000000; i++) {}
      return 'done';
    };

    const result = measurePerformance('test-sync', fn);
    
    expect(result).toBe('done');
    const stats = getPerformanceStats('test-sync');
    expect(stats.count).toBe(1);
    expect(stats.avgTime).toBeGreaterThan(0);
  });

  it('should measure execution time of an asynchronous function', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'async-done';
    };

    const result = await measurePerformance('test-async', asyncFn);
    
    expect(result).toBe('async-done');
    const stats = getPerformanceStats('test-async');
    expect(stats.avgTime).toBeGreaterThanOrEqual(50);
  });
});
