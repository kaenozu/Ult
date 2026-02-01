/**
 * test-utils.ts
 * 
 * Comprehensive test utilities for the trading platform
 * Provides mock data generators, helper functions, and common test patterns
 */

import type { OHLCV } from '@/app/types';

/**
 * Mock Market Data Generator
 */
export class MockMarketDataGenerator {
  /**
   * Generate realistic OHLCV data
   */
  static generateOHLCV(options: {
    count?: number;
    startPrice?: number;
    volatility?: number;
    trend?: 'up' | 'down' | 'sideways';
    startDate?: Date;
  } = {}): OHLCV[] {
    const {
      count = 100,
      startPrice = 30000,
      volatility = 0.02,
      trend = 'sideways',
      startDate = new Date('2024-01-01'),
    } = options;

    const data: OHLCV[] = [];
    let currentPrice = startPrice;
    const trendFactor = trend === 'up' ? 1.001 : trend === 'down' ? 0.999 : 1;

    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Generate realistic price movements
      const dailyChange = (Math.random() - 0.5) * volatility * currentPrice;
      currentPrice = currentPrice * trendFactor + dailyChange;

      const open = currentPrice;
      const high = open + Math.random() * volatility * currentPrice;
      const low = open - Math.random() * volatility * currentPrice;
      const close = low + Math.random() * (high - low);
      const volume = Math.floor(1000000 + Math.random() * 5000000);

      data.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume,
      });
    }

    return data;
  }

  /**
   * Generate mock technical indicators
   */
  static generateTechnicalIndicators(ohlcvData: OHLCV[]) {
    const latestClose = ohlcvData[ohlcvData.length - 1].close;

    return {
      sma: {
        sma20: latestClose * 0.98,
        sma50: latestClose * 0.97,
        sma200: latestClose * 0.95,
      },
      ema: {
        ema12: latestClose * 0.99,
        ema26: latestClose * 0.98,
      },
      rsi: {
        value: 50 + (Math.random() - 0.5) * 40, // 30-70 range
        overbought: false,
        oversold: false,
      },
      macd: {
        macd: (Math.random() - 0.5) * 100,
        signal: (Math.random() - 0.5) * 100,
        histogram: (Math.random() - 0.5) * 50,
      },
      bollingerBands: {
        upper: latestClose * 1.02,
        middle: latestClose,
        lower: latestClose * 0.98,
      },
      stochastic: {
        k: 50 + (Math.random() - 0.5) * 40,
        d: 50 + (Math.random() - 0.5) * 40,
      },
    };
  }

  /**
   * Generate complete market data
   */
  static generateMarketData(symbol: string = '^N225') {
    const ohlcvData = this.generateOHLCV();
    const latestData = ohlcvData[ohlcvData.length - 1];

    return {
      symbol,
      name: symbol === '^N225' ? 'Nikkei 225' : 'S&P 500',
      price: latestData.close,
      change: latestData.close - ohlcvData[ohlcvData.length - 2].close,
      changePercent:
        ((latestData.close - ohlcvData[ohlcvData.length - 2].close) /
          ohlcvData[ohlcvData.length - 2].close) *
        100,
      volume: latestData.volume,
      timestamp: new Date().toISOString(),
      data: ohlcvData,
      indicators: this.generateTechnicalIndicators(ohlcvData),
    };
  }
}

/**
 * Mock API Response Generator
 */
export class MockAPIResponseGenerator {
  /**
   * Generate success response
   */
  static success<T>(data: T) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate error response
   */
  static error(message: string, code: string = 'UNKNOWN_ERROR') {
    return {
      success: false,
      error: {
        message,
        code,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate rate limit error
   */
  static rateLimitError(retryAfter: number = 60) {
    return {
      success: false,
      error: {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test Helpers
 */
export class TestHelpers {
  /**
   * Wait for a specified time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a mock function with call tracking
   */
  static createMockFn<T extends (...args: any[]) => any>() {
    const calls: Parameters<T>[] = [];
    const fn = ((...args: Parameters<T>) => {
      calls.push(args);
    }) as jest.Mock<ReturnType<T>, Parameters<T>>;
    (fn as any).calls = calls;
    return fn;
  }

  /**
   * Assert that a value is within a range
   */
  static assertInRange(
    value: number,
    min: number,
    max: number,
    message?: string
  ) {
    if (value < min || value > max) {
      throw new Error(
        message ||
          `Expected ${value} to be between ${min} and ${max}`
      );
    }
  }

  /**
   * Assert that a percentage is valid
   */
  static assertValidPercentage(value: number, message?: string) {
    this.assertInRange(value, 0, 100, message);
  }

  /**
   * Generate random number in range
   */
  static randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Generate random integer in range
   */
  static randomIntInRange(min: number, max: number): number {
    return Math.floor(this.randomInRange(min, max + 1));
  }

  /**
   * Create a spy on console methods
   */
  static spyOnConsole() {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    const errors: any[] = [];
    const warnings: any[] = [];
    const logs: any[] = [];

    console.error = (...args: any[]) => {
      errors.push(args);
    };

    console.warn = (...args: any[]) => {
      warnings.push(args);
    };

    console.log = (...args: any[]) => {
      logs.push(args);
    };

    return {
      errors,
      warnings,
      logs,
      restore: () => {
        console.error = originalError;
        console.warn = originalWarn;
        console.log = originalLog;
      },
    };
  }

  /**
   * Suppress console output during test
   */
  static suppressConsole(fn: () => void | Promise<void>): void | Promise<void> {
    const spy = this.spyOnConsole();
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => spy.restore());
      }
      spy.restore();
      return result;
    } catch (error) {
      spy.restore();
      throw error;
    }
  }
}

/**
 * Mock Time Series Data Generator
 */
export class MockTimeSeriesGenerator {
  /**
   * Generate simple moving average data
   */
  static generateSMA(
    prices: number[],
    period: number
  ): number[] {
    const sma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(0);
        continue;
      }
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  /**
   * Generate exponential moving average data
   */
  static generateEMA(
    prices: number[],
    period: number
  ): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    // First EMA is SMA
    const firstSMA =
      prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(firstSMA);

    // Calculate subsequent EMAs
    for (let i = period; i < prices.length; i++) {
      const value = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(value);
    }

    return ema;
  }

  /**
   * Generate RSI data
   */
  static generateRSI(
    prices: number[],
    period: number = 14
  ): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain =
        gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    return rsi;
  }
}

/**
 * Test Data Validators
 */
export class TestDataValidators {
  /**
   * Validate OHLCV data structure
   */
  static validateOHLCV(data: OHLCV): void {
    expect(data).toHaveProperty('date');
    expect(data).toHaveProperty('open');
    expect(data).toHaveProperty('high');
    expect(data).toHaveProperty('low');
    expect(data).toHaveProperty('close');
    expect(data).toHaveProperty('volume');

    expect(typeof data.date).toBe('string');
    expect(typeof data.open).toBe('number');
    expect(typeof data.high).toBe('number');
    expect(typeof data.low).toBe('number');
    expect(typeof data.close).toBe('number');
    expect(typeof data.volume).toBe('number');

    // Validate OHLC relationships
    expect(data.high).toBeGreaterThanOrEqual(data.low);
    expect(data.high).toBeGreaterThanOrEqual(data.open);
    expect(data.high).toBeGreaterThanOrEqual(data.close);
    expect(data.low).toBeLessThanOrEqual(data.open);
    expect(data.low).toBeLessThanOrEqual(data.close);
  }

  /**
   * Validate market data structure
   */
  static validateMarketData(data: any): void {
    expect(data).toHaveProperty('symbol');
    expect(data).toHaveProperty('data');

    expect(typeof data.symbol).toBe('string');
    expect(Array.isArray(data.data)).toBe(true);
  }

  /**
   * Validate technical indicators
   */
  static validateTechnicalIndicators(indicators: any): void {
    if (indicators.rsi) {
      expect(indicators.rsi.value).toBeGreaterThanOrEqual(0);
      expect(indicators.rsi.value).toBeLessThanOrEqual(100);
    }

    if (indicators.stochastic) {
      expect(indicators.stochastic.k).toBeGreaterThanOrEqual(0);
      expect(indicators.stochastic.k).toBeLessThanOrEqual(100);
      expect(indicators.stochastic.d).toBeGreaterThanOrEqual(0);
      expect(indicators.stochastic.d).toBeLessThanOrEqual(100);
    }

    if (indicators.bollingerBands) {
      expect(indicators.bollingerBands.upper).toBeGreaterThan(
        indicators.bollingerBands.middle
      );
      expect(indicators.bollingerBands.middle).toBeGreaterThan(
        indicators.bollingerBands.lower
      );
    }
  }
}

/**
 * Error Test Helpers
 */
export class ErrorTestHelpers {
  /**
   * Test that a function throws an error
   */
  static async expectToThrow<T>(
    fn: () => Promise<T> | T,
    errorMessage?: string | RegExp
  ): Promise<void> {
    try {
      await fn();
      throw new Error('Expected function to throw, but it did not');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Expected function to throw')) {
        throw error;
      }
      if (errorMessage) {
        if (typeof errorMessage === 'string') {
          expect((error as Error).message).toContain(errorMessage);
        } else {
          expect((error as Error).message).toMatch(errorMessage);
        }
      }
    }
  }

  /**
   * Test error handling with different error types
   */
  static async testErrorScenarios<T>(
    fn: (errorType: string) => Promise<T> | T,
    scenarios: { type: string; expectedMessage?: string }[]
  ): Promise<void> {
    for (const scenario of scenarios) {
      await this.expectToThrow(
        () => fn(scenario.type),
        scenario.expectedMessage
      );
    }
  }
}
