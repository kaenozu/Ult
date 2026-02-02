# Performance Measurement System

## Overview

This standardized performance measurement system provides consistent tools for tracking and monitoring application performance across the ULT Trading Platform. It replaces the inconsistent usage of `performance.now()`, `console.time()`, and `Date.now()` with a unified, threshold-based monitoring system.

## Key Features

- ✅ **Unified API**: Consistent performance measurement across the application
- ✅ **Threshold-Based Alerts**: Automatic detection of slow operations with configurable thresholds
- ✅ **Severity Levels**: Classify operations as OK, Warning, or Error based on execution time
- ✅ **Decorator Support**: Clean, declarative syntax with TypeScript decorators
- ✅ **Functional Wrappers**: Alternative functional API for inline measurements
- ✅ **Metrics Aggregation**: Comprehensive statistics and reporting
- ✅ **Health Monitoring**: Real-time health scores and summaries

## Installation

The performance measurement system is already integrated into the project. Simply import the utilities you need:

```typescript
import { measure, measureAsync } from '@/app/lib/performance-utils';
import { PerformanceMonitor } from '@/app/lib/utils/performanceMonitor';
```

## Quick Start

### Using Decorators (Recommended)

```typescript
import { measure, measureAsync } from '@/app/lib/performance-utils';

class DataService {
  // Measure synchronous method with default 100ms threshold
  @measure('fetch-data')
  fetchData(id: string): Data {
    // Your implementation
  }

  // Measure async method with custom threshold
  @measureAsync('fetch-async-data', { threshold: 200 })
  async fetchDataAsync(id: string): Promise<Data> {
    // Your async implementation
  }
}
```

### Using Functional Wrappers

```typescript
import { measurePerformance, measurePerformanceAsync } from '@/app/lib/performance-utils';

// Synchronous measurement
const result = measurePerformance('process-data', () => {
  return processData(input);
}, { threshold: 50 });

// Asynchronous measurement
const data = await measurePerformanceAsync('fetch-api', async () => {
  return await fetch('/api/data');
}, { threshold: 300 });
```

## API Reference

### Decorators

#### `@measure(name: string, options?: MeasureOptions)`

Decorator for synchronous methods. Automatically measures execution time and records metrics.

**Parameters:**
- `name`: Metric identifier for tracking
- `options`: Optional configuration
  - `threshold`: Default threshold (100ms). Operations exceeding this trigger warnings
  - `warningThreshold`: Custom warning threshold
  - `errorThreshold`: Custom error threshold (defaults to threshold * 2)

**Example:**
```typescript
class PredictionService {
  @measure('ml-predict', { threshold: 50, errorThreshold: 200 })
  predict(features: number[]): number {
    // ML prediction logic
    return 0.85;
  }
}
```

#### `@measureAsync(name: string, options?: MeasureOptions)`

Decorator for asynchronous methods. Automatically measures async execution time and records metrics.

**Example:**
```typescript
class MarketDataService {
  @measureAsync('fetch-quotes', { threshold: 200 })
  async fetchQuotes(symbol: string): Promise<Quote[]> {
    const response = await fetch(`/api/quotes/${symbol}`);
    return response.json();
  }
}
```

### Functional API

#### `measurePerformance<T>(name: string, fn: () => T, options?: MeasureOptions): T`

Measures synchronous function execution.

**Example:**
```typescript
const processed = measurePerformance('data-transform', () => {
  return data.map(transformItem);
}, { threshold: 30 });
```

#### `measurePerformanceAsync<T>(name: string, fn: () => Promise<T>, options?: MeasureOptions): Promise<T>`

Measures asynchronous function execution.

**Example:**
```typescript
const result = await measurePerformanceAsync('api-call', async () => {
  return await apiClient.getData();
}, { threshold: 500 });
```

### PerformanceMonitor Class

#### Static Methods

##### `record(name: string, duration: number, severity: PerformanceSeverity)`

Manually record a performance metric.

```typescript
const start = performance.now();
doWork();
const duration = performance.now() - start;

PerformanceMonitor.record('custom-operation', duration, 'ok');
```

##### `getStats(name: string): PerformanceStats`

Get statistics for a specific metric.

```typescript
const stats = PerformanceMonitor.getStats('data-fetch');
console.log(`Average: ${stats.avg}ms, Count: ${stats.count}`);
console.log(`Warnings: ${stats.warningCount}, Errors: ${stats.errorCount}`);
```

##### `getAllMetrics(): Map<string, PerformanceStats>`

Get statistics for all tracked metrics.

```typescript
const allMetrics = PerformanceMonitor.getAllMetrics();
for (const [name, stats] of allMetrics) {
  console.log(`${name}: ${stats.avg}ms (${stats.count} calls)`);
}
```

##### `getSummary(): PerformanceSummary`

Get a comprehensive performance summary.

```typescript
const summary = PerformanceMonitor.getSummary();
console.log(`Health Score: ${summary.healthScore}/100`);
console.log(`Slow Operations: ${summary.slowOperations.join(', ')}`);
console.log(`Critical Operations: ${summary.criticalOperations.join(', ')}`);
```

##### `getMetricsBySeverity(severity: PerformanceSeverity): Map<string, PerformanceMetric[]>`

Filter metrics by severity level.

```typescript
const errors = PerformanceMonitor.getMetricsBySeverity('error');
for (const [name, metrics] of errors) {
  console.error(`${name}: ${metrics.length} critical slow operations`);
}
```

##### `getRawMetrics(name: string, limit?: number): PerformanceMetric[]`

Get raw measurement data for detailed analysis.

```typescript
const recentMetrics = PerformanceMonitor.getRawMetrics('api-call', 10);
recentMetrics.forEach(m => {
  console.log(`${new Date(m.timestamp).toISOString()}: ${m.duration}ms (${m.severity})`);
});
```

##### `clear()` / `clearMetric(name: string)`

Clear all metrics or specific metric.

```typescript
PerformanceMonitor.clear(); // Clear all
PerformanceMonitor.clearMetric('old-operation'); // Clear specific
```

##### `hasWarnings()` / `hasErrors()`

Check for performance issues.

```typescript
if (PerformanceMonitor.hasErrors()) {
  console.error('Critical performance issues detected!');
  const errors = PerformanceMonitor.getErrors();
  // Handle errors
}
```

## Severity Levels

The system uses three severity levels:

| Severity | Condition | Action |
|----------|-----------|--------|
| **OK** | duration ≤ threshold | Normal operation, no alert |
| **WARNING** | threshold < duration ≤ errorThreshold | Console warning logged |
| **ERROR** | duration > errorThreshold | Console error logged |

Default thresholds:
- `threshold`: 100ms (warning threshold)
- `errorThreshold`: 200ms (2x threshold)

## Best Practices

### 1. Choose Appropriate Thresholds

Set thresholds based on the operation type:

```typescript
// Quick operations: 50ms
@measure('cache-lookup', { threshold: 50 })

// API calls: 200ms
@measureAsync('api-fetch', { threshold: 200 })

// Heavy computation: 500ms
@measure('ml-training', { threshold: 500 })

// Background jobs: 5000ms
@measureAsync('data-sync', { threshold: 5000 })
```

### 2. Use Meaningful Names

Use clear, hierarchical naming:

```typescript
@measure('trading.signal-generation')
@measure('trading.backtest.run')
@measureAsync('api.market-data.fetch')
@measureAsync('db.user.query')
```

### 3. Monitor Critical Paths

Focus on user-facing and business-critical operations:

```typescript
class TradingEngine {
  @measure('trading.order-placement', { threshold: 100 })
  placeOrder(order: Order): void { }

  @measureAsync('trading.price-prediction', { threshold: 200 })
  async predictPrice(symbol: string): Promise<number> { }
}
```

### 4. Regular Performance Reviews

Set up periodic performance checks:

```typescript
// Check every minute in production
setInterval(() => {
  const summary = PerformanceMonitor.getSummary();
  
  if (summary.healthScore < 80) {
    logger.warn('Performance degradation detected', summary);
  }
  
  if (PerformanceMonitor.hasErrors()) {
    logger.error('Critical performance issues', {
      errors: PerformanceMonitor.getErrors(),
    });
  }
}, 60000);
```

### 5. Test Performance

Add performance assertions to your tests:

```typescript
describe('DataService', () => {
  it('should fetch data within performance budget', () => {
    PerformanceMonitor.clear();
    
    const service = new DataService();
    service.fetchData('test-id');
    
    const stats = PerformanceMonitor.getStats('fetch-data');
    expect(stats.avg).toBeLessThan(50); // Must be under 50ms
    expect(stats.errorCount).toBe(0); // No critical slowdowns
  });
});
```

## Migration Guide

### From `performance.now()`

**Before:**
```typescript
const start = performance.now();
const result = calculate();
console.log(`Time: ${performance.now() - start}ms`);
```

**After:**
```typescript
const result = measurePerformance('calculation', () => calculate());
// or
@measure('calculation')
calculate(): Result { }
```

### From `console.time()`

**Before:**
```typescript
console.time('calculation');
const data = process();
console.timeEnd('calculation');
```

**After:**
```typescript
const data = measurePerformance('calculation', () => process());
```

### From `Date.now()`

**Before:**
```typescript
const t0 = Date.now();
await fetchData();
console.log(`Fetch took ${Date.now() - t0}ms`);
```

**After:**
```typescript
await measurePerformanceAsync('fetch-data', () => fetchData());
```

## Performance Dashboard Integration

The system is designed to integrate with performance dashboards:

```typescript
// Export metrics for visualization
function exportMetricsToMonitoring(): void {
  const allMetrics = PerformanceMonitor.getAllMetrics();
  
  // Send to monitoring service
  for (const [name, stats] of allMetrics) {
    monitoringService.gauge(`performance.${name}.avg`, stats.avg);
    monitoringService.gauge(`performance.${name}.p95`, stats.max);
    monitoringService.counter(`performance.${name}.errors`, stats.errorCount);
  }
}

// Run periodically
setInterval(exportMetricsToMonitoring, 30000);
```

## Troubleshooting

### High Memory Usage

If storing too many metrics:

```typescript
// Limit measurements per metric
const MAX_MEASUREMENTS = 1000; // Already implemented

// Clear old metrics periodically
setInterval(() => {
  PerformanceMonitor.clear();
}, 3600000); // Every hour
```

### Decorator Not Working

Ensure TypeScript decorators are enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

### Missing Metrics

Verify the metric name and check if measurements are being recorded:

```typescript
const stats = PerformanceMonitor.getStats('my-metric');
if (stats.count === 0) {
  console.log('No measurements recorded yet');
}
```

## Examples

See `performance-examples.ts` for comprehensive usage examples.

## Support

For issues or questions about the performance measurement system, please refer to:
- Technical documentation: `/trading-platform/app/lib/performance-utils.ts`
- Test examples: `/trading-platform/app/lib/__tests__/performance-utils.test.ts`
- Usage examples: `/trading-platform/app/lib/performance-examples.ts`
