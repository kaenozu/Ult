/**
 * Tests for calculation utilities
 */

import { 
  sum,
  mean,
  variance,
  stdDev,
  calculateReturns,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateRSIMomentum,
  calculateVolatility,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateKellyCriterion,
  calculateCorrelation,
  linearRegression,
  memoize,
  memoizeArray,
} from '../calculations';

describe('calculations', () => {
  describe('sum', () => {
    it('should calculate sum of array', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
      expect(sum([])).toBe(0);
      expect(sum([-1, 1])).toBe(0);
    });
  });

  describe('mean', () => {
    it('should calculate mean of array', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
      expect(mean([])).toBe(0);
      expect(mean([10])).toBe(10);
    });
  });

  describe('variance', () => {
    it('should calculate variance of array', () => {
      expect(variance([1, 2, 3, 4, 5])).toBe(2);
      expect(variance([])).toBe(0);
      expect(variance([5])).toBe(0);
    });
  });

  describe('stdDev', () => {
    it('should calculate standard deviation of array', () => {
      expect(stdDev([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2), 5);
      expect(stdDev([])).toBe(0);
    });
  });

  describe('calculateReturns', () => {
    it('should calculate returns from prices', () => {
      const prices = [100, 110, 105, 115];
      const returns = calculateReturns(prices);
      
      expect(returns.length).toBe(3);
      expect(returns[0]).toBeCloseTo(0.1, 5);
      expect(returns[1]).toBeCloseTo(-5/110, 5);
      expect(returns[2]).toBeCloseTo(10/105, 5);
    });

    it('should handle zero prices', () => {
      const prices = [100, 0, 110];
      const returns = calculateReturns(prices);
      
      expect(returns[0]).toBeCloseTo(-1, 5);
      expect(returns[1]).toBe(0);
    });
  });

  describe('calculateSMA', () => {
    it('should calculate simple moving average', () => {
      const prices = [1, 2, 3, 4, 5];
      const sma = calculateSMA(prices, 3);
      
      expect(sma[0]).toBeNaN();
      expect(sma[1]).toBeNaN();
      expect(sma[2]).toBe(2);
      expect(sma[3]).toBe(3);
      expect(sma[4]).toBe(4);
    });

    it('should calculate SMA in O(N) time complexity', () => {
      const largeSize = 50000;
      const prices = Array.from({ length: largeSize }, (_, i) => i + 1);
      const period = 200;
      
      const startTime = performance.now();
      const sma = calculateSMA(prices, period);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(sma.length).toBe(largeSize);
      expect(executionTime).toBeLessThan(500);
    });
  });

  describe('calculateEMA', () => {
    it('should calculate exponential moving average', () => {
      const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const ema = calculateEMA(prices, 5);
      
      expect(ema[0]).toBeNaN();
      expect(ema[1]).toBeNaN();
      expect(ema[2]).toBeNaN();
      expect(ema[3]).toBeNaN();
      expect(ema[4]).toBe(3);
      expect(ema[5]).toBeGreaterThan(0);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI', () => {
      const prices = Array(20).fill(100).map((v, i) => v + i);
      const rsi = calculateRSI(prices, 14);
      
      expect(rsi.length).toBe(prices.length);
      expect(rsi[13]).toBeNaN();
    });

    it('should handle constant prices', () => {
      const prices = Array(20).fill(100);
      const rsi = calculateRSI(prices, 14);
      
      expect(rsi[14]).toBeDefined();
    });
  });

  describe('calculateRSIMomentum', () => {
    it('should calculate RSI momentum', () => {
      const rsiValues = [30, 35, 40, 50];
      expect(calculateRSIMomentum(rsiValues)).toBe(10);
    });

    it('should return 0 for insufficient data', () => {
      expect(calculateRSIMomentum([])).toBe(0);
      expect(calculateRSIMomentum([50])).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate annualized volatility', () => {
      const prices = Array(252).fill(100).map((v, i) => v + Math.sin(i * 0.1) * 5);
      const vol = calculateVolatility(prices);
      
      expect(vol).toBeGreaterThan(0);
    });

    it('should return 0 for insufficient data', () => {
      expect(calculateVolatility([])).toBe(0);
      expect(calculateVolatility([100])).toBe(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate maximum drawdown', () => {
      const equityCurve = [100, 110, 105, 95, 100, 90, 95];
      const maxDD = calculateMaxDrawdown(equityCurve);
      
      expect(maxDD).toBeGreaterThan(0);
      expect(maxDD).toBeCloseTo((110 - 90) / 110 * 100, 1);
    });

    it('should return 0 for increasing curve', () => {
      const equityCurve = [100, 110, 120, 130];
      expect(calculateMaxDrawdown(equityCurve)).toBe(0);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate sharpe ratio', () => {
      const returns = Array(252).fill(0).map(() => 0.001 + (Math.random() - 0.5) * 0.02);
      const sharpe = calculateSharpeRatio(returns, 0.02);
      
      expect(sharpe).toBeDefined();
    });
  });

  describe('calculateKellyCriterion', () => {
    it('should calculate kelly criterion', () => {
      const kelly = calculateKellyCriterion(0.6, 2.0);
      expect(kelly).toBeGreaterThan(0);
      expect(kelly).toBeLessThan(0.5);
    });

    it('should return 0 for invalid win/loss ratio', () => {
      expect(calculateKellyCriterion(0.5, 0)).toBe(0);
      expect(calculateKellyCriterion(0.5, -1)).toBe(0);
    });
  });

  describe('calculateCorrelation', () => {
    it('should calculate correlation coefficient', () => {
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [2, 4, 6, 8, 10];
      const corr = calculateCorrelation(arr1, arr2);
      
      expect(corr).toBeCloseTo(1, 5);
    });

    it('should return 0 for empty arrays', () => {
      expect(calculateCorrelation([], [])).toBe(0);
    });

    it('should return 0 for mismatched lengths', () => {
      expect(calculateCorrelation([1, 2], [1])).toBe(0);
    });

    it('should calculate negative correlation', () => {
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [5, 4, 3, 2, 1];
      const corr = calculateCorrelation(arr1, arr2);
      
      expect(corr).toBeCloseTo(-1, 5);
    });
  });

  describe('linearRegression', () => {
    it('should perform linear regression', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = linearRegression(x, y);
      
      expect(result.slope).toBeCloseTo(2, 5);
      expect(result.intercept).toBeCloseTo(0, 5);
      expect(result.r2).toBeCloseTo(1, 5);
    });

    it('should handle empty arrays', () => {
      const result = linearRegression([], []);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.r2).toBe(0);
    });
  });

describe('memoize', () => {
  it('should memoize function results', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(callCount).toBe(1);

    expect(memoized(5)).toBe(10);
    expect(callCount).toBe(1);

    expect(memoized(10)).toBe(20);
    expect(callCount).toBe(2);
  });

  it('should work with custom key generator', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * 2;
    };
    const keyGenerator = (x: number) => `key-${x}`;
    const memoized = memoize(fn, keyGenerator);

    expect(memoized(5)).toBe(10);
    expect(callCount).toBe(1);

    // Same key should use cache
    expect(memoized(5)).toBe(10);
    expect(callCount).toBe(1);

    // Different key should execute
    expect(memoized(3)).toBe(6);
    expect(callCount).toBe(2);
  });

  it('should handle multiple arguments', () => {
    let callCount = 0;
    const fn = (a: number, b: number, c: number) => {
      callCount++;
      return a + b + c;
    };
    const memoized = memoize(fn);

    memoized(1, 2, 3);
    memoized(1, 2, 3);
    memoized(1, 2, 4); // Different third arg

    expect(callCount).toBe(2);
  });
});

describe('memoizeArray', () => {
  it('should cache results for arrays', () => {
    let callCount = 0;
    const fn = (arr: number[]) => {
      callCount++;
      return arr.reduce((a, b) => a + b, 0);
    };
    const memoized = memoizeArray(fn);

    const arr1 = [1, 2, 3];
    const arr2 = [1, 2, 3];

    expect(memoized(arr1)).toBe(6);
    expect(callCount).toBe(1);

    // Same content should use cache
    expect(memoized(arr2)).toBe(6);
    expect(callCount).toBe(1);

    // Different content should execute
    expect(memoized([1, 2, 4])).toBe(7);
    expect(callCount).toBe(2);
  });

  it('should respect max cache size', () => {
    let callCount = 0;
    const fn = (arr: number[]) => {
      callCount++;
      return arr.length;
    };
    const memoized = memoizeArray(fn, 2);

    // Fill cache
    memoized([1]);
    memoized([2]);
    memoized([3]);

    // Should have evicted oldest entry
    memoized([1]);
    expect(callCount).toBe(4);
  });

  it('should work with Float64Array', () => {
    let callCount = 0;
    const fn = (arr: Float64Array) => {
      callCount++;
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
      }
      return sum;
    };
    const memoized = memoizeArray(fn);

    const arr = new Float64Array([1.5, 2.5, 3.5]);

    expect(memoized(arr)).toBe(7.5);
    expect(callCount).toBe(1);

    // Same array should use cache
    expect(memoized(arr)).toBe(7.5);
    expect(callCount).toBe(1);
  });
});
});
