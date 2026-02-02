# Test Patterns and Guidelines

## Overview

This document provides comprehensive test patterns and guidelines for the ULT Trading Platform. Following these patterns ensures consistent, maintainable, and effective tests.

## Table of Contents

1. [Unit Test Patterns](#unit-test-patterns)
2. [Integration Test Patterns](#integration-test-patterns)
3. [Error Testing Patterns](#error-testing-patterns)
4. [Mock Data Patterns](#mock-data-patterns)
5. [Best Practices](#best-practices)

## Unit Test Patterns

### Basic Service Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceName } from '../ServiceName';
import { MockMarketDataGenerator } from './test-utils';

describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(() => {
    service = new ServiceName();
  });
  
  afterEach(() => {
    // Cleanup if needed
  });

  describe('methodName', () => {
    it('should handle normal case correctly', () => {
      // Arrange
      const input = MockMarketDataGenerator.generateOHLCV();
      
      // Act
      const result = service.methodName(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });

    it('should handle edge case: empty input', () => {
      const result = service.methodName([]);
      expect(result).toEqual(defaultValue);
    });

    it('should handle edge case: invalid input', () => {
      expect(() => service.methodName(null as any)).toThrow();
    });
  });
});
```

### Property-Based Testing Pattern

```typescript
import { fc, test } from '@fast-check/jest';

describe('PropertyBasedTests', () => {
  test.prop([fc.array(fc.double({ min: 0, max: 100000 }), { minLength: 1 })])(
    'should always return valid RSI values',
    (prices) => {
      const rsi = calculateRSI(prices);
      
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
      expect(Number.isFinite(rsi)).toBe(true);
    }
  );
});
```

### Async Operation Test Pattern

```typescript
describe('AsyncService', () => {
  it('should fetch data successfully', async () => {
    // Arrange
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: 'test' }),
    });
    global.fetch = mockFetch;
    
    // Act
    const result = await service.fetchData('symbol');
    
    // Assert
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('symbol'));
    expect(result).toEqual({ data: 'test' });
  });

  it('should handle network errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    await expect(service.fetchData('symbol')).rejects.toThrow('Network error');
  });

  it('should timeout after specified duration', async () => {
    jest.useFakeTimers();
    
    const promise = service.fetchWithTimeout('symbol', 1000);
    jest.advanceTimersByTime(1000);
    
    await expect(promise).rejects.toThrow('Timeout');
    
    jest.useRealTimers();
  });
});
```

## Integration Test Patterns

### Service Integration Pattern

```typescript
describe('ServiceIntegration', () => {
  let marketDataService: MarketDataService;
  let analysisService: AnalysisService;
  
  beforeEach(() => {
    marketDataService = new MarketDataService();
    analysisService = new AnalysisService(marketDataService);
  });

  it('should integrate market data with analysis', async () => {
    // Arrange
    const symbol = '^N225';
    
    // Act
    const marketData = await marketDataService.fetchData(symbol);
    const analysis = await analysisService.analyze(marketData);
    
    // Assert
    expect(analysis.symbol).toBe(symbol);
    expect(analysis.signals).toBeDefined();
    expect(analysis.indicators).toBeDefined();
  });
});
```

### API Route Integration Pattern

```typescript
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

describe('API Route Integration', () => {
  it('GET should return market data', async () => {
    const request = new NextRequest('http://localhost/api/market?symbol=^N225');
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.symbol).toBe('^N225');
  });

  it('POST should handle invalid data', async () => {
    const request = new NextRequest('http://localhost/api/market', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
```

## Error Testing Patterns

### Error Scenario Pattern

```typescript
describe('ErrorHandling', () => {
  it('should handle API errors gracefully', async () => {
    // Arrange: Simulate API error
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
    
    // Act & Assert
    await expect(service.fetchData('symbol')).rejects.toThrow('API Error');
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('API Error')
    );
  });

  it('should handle rate limiting', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 429,
      json: () => Promise.resolve({ retryAfter: 60 }),
    });
    
    const result = await service.fetchData('symbol');
    
    expect(result.error).toBe('RATE_LIMIT_EXCEEDED');
    expect(result.retryAfter).toBe(60);
  });

  it('should handle validation errors', () => {
    const invalidData = { price: -100 };
    
    expect(() => service.validate(invalidData)).toThrow('Invalid price');
  });
});
```

### Error Recovery Pattern

```typescript
describe('ErrorRecovery', () => {
  it('should retry failed requests', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Temporary error'));
      }
      return Promise.resolve({ json: () => Promise.resolve({ data: 'success' }) });
    });
    
    const result = await service.fetchWithRetry('symbol', 3);
    
    expect(callCount).toBe(3);
    expect(result.data).toBe('success');
  });

  it('should use fallback data when primary fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Primary failed'));
    
    const result = await service.fetchWithFallback('symbol');
    
    expect(result.source).toBe('cache');
    expect(result.data).toBeDefined();
  });
});
```

## Mock Data Patterns

### Using MockMarketDataGenerator

```typescript
import { MockMarketDataGenerator } from './test-utils';

describe('WithMockData', () => {
  it('should generate realistic market data', () => {
    const data = MockMarketDataGenerator.generateOHLCV({
      count: 100,
      startPrice: 30000,
      volatility: 0.02,
      trend: 'up',
    });
    
    expect(data).toHaveLength(100);
    expect(data[data.length - 1].close).toBeGreaterThan(data[0].close);
  });

  it('should generate complete market data', () => {
    const marketData = MockMarketDataGenerator.generateMarketData('^N225');
    
    expect(marketData.symbol).toBe('^N225');
    expect(marketData.ohlcv).toBeDefined();
    expect(marketData.indicators).toBeDefined();
  });
});
```

### Custom Mock Pattern

```typescript
const createMockService = () => ({
  fetchData: jest.fn().mockResolvedValue({
    symbol: '^N225',
    price: 30000,
  }),
  analyze: jest.fn().mockReturnValue({
    signal: 'BUY',
    confidence: 0.8,
  }),
});

describe('WithCustomMock', () => {
  it('should use mocked service', async () => {
    const mockService = createMockService();
    const component = new Component(mockService);
    
    await component.update();
    
    expect(mockService.fetchData).toHaveBeenCalledWith('^N225');
    expect(mockService.analyze).toHaveBeenCalled();
  });
});
```

## Best Practices

### 1. Arrange-Act-Assert Pattern

Always structure tests using the AAA pattern:

```typescript
it('should calculate correctly', () => {
  // Arrange: Set up test data
  const input = [1, 2, 3, 4, 5];
  
  // Act: Execute the code under test
  const result = calculateAverage(input);
  
  // Assert: Verify the results
  expect(result).toBe(3);
});
```

### 2. One Assertion Per Test (when practical)

```typescript
// Good: Focused test
it('should return correct average', () => {
  expect(calculateAverage([1, 2, 3])).toBe(2);
});

// Good: Related assertions
it('should calculate statistics correctly', () => {
  const stats = calculateStats([1, 2, 3]);
  expect(stats.mean).toBe(2);
  expect(stats.median).toBe(2);
  expect(stats.mode).toBe(undefined);
});
```

### 3. Test Edge Cases

```typescript
describe('EdgeCases', () => {
  it('should handle empty array', () => {
    expect(calculateAverage([])).toBe(0);
  });

  it('should handle single element', () => {
    expect(calculateAverage([5])).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(calculateAverage([-1, -2, -3])).toBe(-2);
  });

  it('should handle very large numbers', () => {
    expect(calculateAverage([Number.MAX_SAFE_INTEGER])).toBe(Number.MAX_SAFE_INTEGER);
  });
});
```

### 4. Use Descriptive Test Names

```typescript
// Good: Descriptive name
it('should return BUY signal when RSI is below 30 and MACD is positive', () => {
  // ...
});

// Bad: Vague name
it('should work', () => {
  // ...
});
```

### 5. Isolate Tests

```typescript
// Good: Each test is independent
describe('IndependentTests', () => {
  beforeEach(() => {
    // Fresh state for each test
    service = new Service();
  });

  it('test 1', () => {
    service.method1();
    expect(service.state).toBe('state1');
  });

  it('test 2', () => {
    service.method2();
    expect(service.state).toBe('state2');
  });
});
```

### 6. Mock External Dependencies

```typescript
describe('WithMockedDependencies', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: 'test' }),
    });
    
    // Mock console
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not call real APIs', async () => {
    await service.fetchData('symbol');
    expect(global.fetch).toHaveBeenCalled();
  });
});
```

### 7. Test Error Paths

```typescript
describe('ErrorPaths', () => {
  it('should throw on invalid input', () => {
    expect(() => validateInput(null)).toThrow('Input required');
  });

  it('should return error on API failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
    
    const result = await service.fetchData('symbol');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 8. Use Test Utilities

```typescript
import { TestHelpers, MockMarketDataGenerator } from './test-utils';

describe('WithTestUtils', () => {
  it('should use test helpers effectively', async () => {
    // Generate mock data
    const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
    
    // Assert ranges
    TestHelpers.assertInRange(data[0].close, 28000, 32000);
    
    // Wait for async operations
    await TestHelpers.wait(100);
  });
});
```

## Summary

- Use consistent test structure (AAA pattern)
- Test both happy paths and error scenarios
- Use descriptive test names
- Isolate tests from each other
- Mock external dependencies
- Use test utilities for common patterns
- Aim for high coverage but focus on meaningful tests
- Keep tests simple and readable
