// @ts-nocheck - Example file, not part of production code

/**
 * Performance Measurement Examples
 *
 * This file demonstrates various usage patterns for the standardized
 * performance measurement system.
 */

import { measure, measureAsync, measurePerformance, measurePerformanceAsync } from './performance-utils';
import { PerformanceMonitor } from './utils/performanceMonitor';

// Example 1: Using decorators with default threshold (100ms)
class DataService {
  @measure('data-fetch')
  fetchData(id: string): { id: string; name: string } {
    // Simulate data fetching
    const data = { id, name: 'Sample Data' };
    return data;
  }

  @measureAsync('async-data-fetch')
  async fetchDataAsync(id: string): Promise<{ id: string; name: string }> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 50));
    return { id, name: 'Async Data' };
  }
}

// Example 2: Using decorators with custom thresholds
class AnalysisService {
  // Warning at 50ms, Error at 100ms
  @measure('quick-analysis', { threshold: 50 })
  quickAnalysis(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0);
  }

  // Custom warning and error thresholds
  @measure('complex-analysis', { 
    warningThreshold: 100, 
    errorThreshold: 500 
  })
  complexAnalysis(data: number[][]): number {
    return data.flat().reduce((sum, val) => sum + val, 0);
  }

  @measureAsync('ml-prediction', { threshold: 200 })
  async predict(features: number[]): Promise<number> {
    // Simulate ML prediction
    await new Promise(resolve => setTimeout(resolve, 150));
    return features.reduce((sum, val) => sum + val, 0) / features.length;
  }
}

// Example 3: Using functional wrappers for inline measurements
function processData<T>(data: T[]): (T & { processed: boolean; timestamp: number })[] {
  return measurePerformance('process-data', () => {
    return data.map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now(),
    }));
  }, { threshold: 50 });
}

async function fetchAndProcess<T>(url: string): Promise<(T & { processed: boolean; timestamp: number })[]> {
  return measurePerformanceAsync('fetch-and-process', async () => {
    const response = await fetch(url);
    const data = await response.json();
    return processData(data);
  }, { threshold: 300 });
}

// Example 4: Manual measurement with PerformanceMonitor
function manualMeasurement(): void {
  const start = performance.now();
  
  // Do some work
  const result = heavyComputation();
  
  const duration = performance.now() - start;
  
  // Record with appropriate severity
  const severity = duration > 200 ? 'error' 
    : duration > 100 ? 'warning' : 'ok';
  
  PerformanceMonitor.record('manual-computation', duration, severity);
}

function heavyComputation(): number {
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

// Example 5: Monitoring multiple operations
class TradingService {
  @measure('calculate-indicators', { threshold: 50 })
  calculateIndicators(prices: number[]): { sma: number; rsi: number } {
    // Calculate moving averages, RSI, etc.
    return {
      sma: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      rsi: 50, // Simplified
    };
  }

  @measureAsync('fetch-market-data', { threshold: 200 })
  async fetchMarketData(symbol: string): Promise<{ symbol: string; price: number; volume: number }> {
    // Fetch from API
    await new Promise(resolve => setTimeout(resolve, 100));
    return { symbol, price: 100, volume: 1000 };
  }

  @measure('generate-signals', { threshold: 75 })
  generateSignals(indicators: { rsi: number }): { buy: boolean; sell: boolean } {
    return {
      buy: indicators.rsi < 30,
      sell: indicators.rsi > 70,
    };
  }
}

// Example 6: Performance reporting and monitoring
function generatePerformanceReport(): void {
  // Get all metrics
  const allMetrics = PerformanceMonitor.getAllMetrics();
  
  
  for (const [name, stats] of allMetrics) {
    console.log(`Metric: ${name}`);
    console.log(`Count: ${stats.count}`);
    console.log(`Average: ${stats.avg.toFixed(2)}ms`);
    console.log(`Min: ${stats.min.toFixed(2)}ms`);
  Max: ${stats.max.toFixed(2)}ms
  OK: ${stats.okCount}
  Warnings: ${stats.warningCount}
  Errors: ${stats.errorCount}
    `);
  }
  
  // Get summary
  const summary = PerformanceMonitor.getSummary();
Summary:
  Total Metrics: ${summary.totalMetrics}
  Total Measurements: ${summary.totalMeasurements}
  Health Score: ${summary.healthScore}/100
  Slow Operations: ${summary.slowOperations.join(', ')}
  Critical Operations: ${summary.criticalOperations.join(', ')}
  `);
}

// Example 7: Checking for performance issues
function checkPerformanceIssues(): void {
  if (PerformanceMonitor.hasErrors()) {
    console.error('Critical performance issues detected:');
    console.error(PerformanceMonitor.getErrors());
    
    // Get detailed metrics for errors
    const errorMetrics = PerformanceMonitor.getMetricsBySeverity('error');
    for (const [name, metrics] of errorMetrics) {
      console.error(`${name}: ${metrics.length} critical slow operations`);
    }
  }
  
  if (PerformanceMonitor.hasWarnings()) {
    console.warn('Performance warnings detected:');
    console.warn(PerformanceMonitor.getWarnings());
  }
}

// Example 8: Real-time monitoring setup
function setupRealtimeMonitoring(): void {
  // Check performance every 10 seconds
  setInterval(() => {
    const summary = PerformanceMonitor.getSummary();
    
    if (summary.healthScore < 80) {
      console.warn(`Performance health declining: ${summary.healthScore}/100`);
      checkPerformanceIssues();
    }
    
    // Clear old metrics periodically to prevent memory issues
    if (summary.totalMeasurements > 10000) {
      PerformanceMonitor.clear();
    }
  }, 10000);
}

// Example 9: Conditional performance tracking
class OptimizedService {
  private enableProfiling = process.env.NODE_ENV === 'development';

  processData<T>(data: T[]): (T & { processed: true })[] {
    if (this.enableProfiling) {
      return measurePerformance('optimized-process', () => {
        return this.doProcessing(data);
      });
    } else {
      return this.doProcessing(data);
    }
  }

  private doProcessing<T>(data: T[]): (T & { processed: true })[] {
    return data.map(item => ({ ...item, processed: true }));
  }
}

// Example 10: Testing with performance assertions
function testWithPerformanceAssertions(): void {
  PerformanceMonitor.clear();
  
  const service = new TradingService();
  service.calculateIndicators([100, 101, 102, 103, 104]);
  
  const stats = PerformanceMonitor.getStats('calculate-indicators');
  
  // Assert performance is within acceptable range
  if (stats.avg > 50) {
    throw new Error(`Performance regression: average ${stats.avg}ms exceeds 50ms threshold`);
  }
  
  if (stats.errorCount > 0) {
    throw new Error(`Critical performance issues detected: ${stats.errorCount} errors`);
  }
  
}

// Export examples for reference
export {
  DataService,
  AnalysisService,
  TradingService,
  processData,
  fetchAndProcess,
  generatePerformanceReport,
  checkPerformanceIssues,
  setupRealtimeMonitoring,
  testWithPerformanceAssertions,
};
