/**
 * Result型のテスト
 */

import {
  ok,
  err,
  isOk,
  isErr,
  combineResults,
  tryCatch,
  tryCatchAsync,
  Result,
  TradingError,
  AppError,
} from '../errors';

describe('Result Type', () => {
  describe('Ok', () => {
    it('should create a successful result', () => {
      const result = ok(42);
      
      expect(result.isOk).toBe(true);
      expect(result.isErr).toBe(false);
      expect(result.value).toBe(42);
    });
    
    it('should map the value', () => {
      const result = ok(10).map(x => x * 2);
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(20);
      }
    });
    
    it('should flatMap to a new result', () => {
      const result = ok(10).flatMap(x => ok(x * 2));
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(20);
      }
    });
    
    it('should not map error when successful', () => {
      const result = ok<number, TradingError>(10).mapErr(e => new AppError('mapped'));
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(10);
      }
    });
    
    it('should unwrap the value', () => {
      const result = ok(42);
      expect(result.unwrap()).toBe(42);
    });
    
    it('should unwrap the value and ignore default', () => {
      const result = ok(42);
      expect(result.unwrapOr(0)).toBe(42);
    });
    
    it('should unwrap without throwing', () => {
      const result = ok(42);
      expect(() => result.unwrapOrThrow()).not.toThrow();
      expect(result.unwrapOrThrow()).toBe(42);
    });
  });
  
  describe('Err', () => {
    it('should create a failed result', () => {
      const error = new AppError('test error');
      const result = err<number, AppError>(error);
      
      expect(result.isOk).toBe(false);
      expect(result.isErr).toBe(true);
      expect(result.error).toBe(error);
    });
    
    it('should not map the value when error', () => {
      const error = new AppError('test error');
      const result = err<number, AppError>(error).map(x => x * 2);
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error).toBe(error);
      }
    });
    
    it('should not flatMap when error', () => {
      const error = new AppError('test error');
      const result = err<number, AppError>(error).flatMap(x => ok(x * 2));
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error).toBe(error);
      }
    });
    
    it('should map error', () => {
      const error = new AppError('test error');
      const result = err<number, AppError>(error).mapErr(e => 
        new AppError(`mapped: ${e.message}`)
      );
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('mapped: test error');
      }
    });
    
    it('should throw when unwrapping', () => {
      const error = new AppError('test error');
      const result = err<number, AppError>(error);
      
      expect(() => result.unwrap()).toThrow(error);
    });
    
    it('should return default value when unwrapping with default', () => {
      const error = new AppError('test error');
      const result = err<number, AppError>(error);
      
      expect(result.unwrapOr(42)).toBe(42);
    });
    
    it('should throw when unwrapOrThrow', () => {
      const error = new AppError('test error');
      const result = err<number, AppError>(error);
      
      expect(() => result.unwrapOrThrow()).toThrow(error);
    });
  });
  
  describe('Type Guards', () => {
    it('should correctly identify Ok results', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });
    
    it('should correctly identify Err results', () => {
      const result = err(new AppError('test'));
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
    });
  });
  
  describe('combineResults', () => {
    it('should combine all successful results', () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = combineResults(results);
      
      expect(combined.isOk).toBe(true);
      if (combined.isOk) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });
    
    it('should return first error when any result fails', () => {
      const error1 = new AppError('error 1');
      const error2 = new AppError('error 2');
      const results: Result<number, AppError>[] = [
        ok(1),
        err(error1),
        ok(3),
        err(error2),
      ];
      const combined = combineResults(results);
      
      expect(combined.isErr).toBe(true);
      if (combined.isErr) {
        expect(combined.error).toBe(error1);
      }
    });
    
    it('should handle empty array', () => {
      const results: Result<number>[] = [];
      const combined = combineResults(results);
      
      expect(combined.isOk).toBe(true);
      if (combined.isOk) {
        expect(combined.value).toEqual([]);
      }
    });
  });
  
  describe('tryCatch', () => {
    it('should catch successful execution', () => {
      const result = tryCatch(
        () => 42,
        (error) => new AppError(String(error))
      );
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(42);
      }
    });
    
    it('should catch thrown errors', () => {
      const result = tryCatch(
        () => {
          throw new Error('test error');
        },
        (error) => new AppError(error instanceof Error ? error.message : String(error))
      );
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('test error');
      }
    });
    
    it('should handle string throws', () => {
      const result = tryCatch(
        () => {
          throw 'string error';
        },
        (error) => new AppError(String(error))
      );
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('string error');
      }
    });
  });
  
  describe('tryCatchAsync', () => {
    it('should catch successful async execution', async () => {
      const result = await tryCatchAsync(
        async () => 42,
        (error) => new AppError(String(error))
      );
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(42);
      }
    });
    
    it('should catch rejected promises', async () => {
      const result = await tryCatchAsync(
        async () => {
          throw new Error('async error');
        },
        (error) => new AppError(error instanceof Error ? error.message : String(error))
      );
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('async error');
      }
    });
    
    it('should handle promise rejection', async () => {
      const result = await tryCatchAsync(
        () => Promise.reject('promise error'),
        (error) => new AppError(String(error))
      );
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('promise error');
      }
    });
  });
  
  describe('Chaining', () => {
    it('should chain map operations', () => {
      const result = ok(10)
        .map(x => x * 2)
        .map(x => x + 5)
        .map(x => x.toString());
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe('25');
      }
    });
    
    it('should short-circuit on error', () => {
      const result = ok<number, AppError>(10)
        .flatMap(x => err(new AppError('error')))
        .map(x => x * 2) // This should not execute
        .map(x => x + 5); // This should not execute
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('error');
      }
    });
    
    it('should chain flatMap operations', () => {
      const divide = (a: number, b: number): Result<number, AppError> => {
        if (b === 0) {
          return err(new AppError('Division by zero'));
        }
        return ok(a / b);
      };
      
      const result = ok(100)
        .flatMap(x => divide(x, 2))
        .flatMap(x => divide(x, 5))
        .map(x => x * 10);
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(100);
      }
    });
    
    it('should handle division by zero in chain', () => {
      const divide = (a: number, b: number): Result<number, AppError> => {
        if (b === 0) {
          return err(new AppError('Division by zero'));
        }
        return ok(a / b);
      };
      
      const result = ok(100)
        .flatMap(x => divide(x, 2))
        .flatMap(x => divide(x, 0)) // This fails
        .map(x => x * 10); // This should not execute
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('Division by zero');
      }
    });
  });
  
  describe('Real-world scenarios', () => {
    // シミュレート: データ取得関数
    const fetchData = (shouldFail: boolean): Result<{ value: number }, AppError> => {
      if (shouldFail) {
        return err(new AppError('Failed to fetch data'));
      }
      return ok({ value: 42 });
    };
    
    // シミュレート: 計算関数
    const calculate = (data: { value: number }): Result<number, AppError> => {
      if (data.value < 0) {
        return err(new AppError('Invalid data'));
      }
      return ok(data.value * 2);
    };
    
    it('should handle successful data pipeline', () => {
      const result = fetchData(false)
        .flatMap(calculate)
        .map(x => x + 10);
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(94); // (42 * 2) + 10
      }
    });
    
    it('should handle fetch failure', () => {
      const result = fetchData(true)
        .flatMap(calculate)
        .map(x => x + 10);
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toBe('Failed to fetch data');
      }
    });
    
    it('should provide default value on error', () => {
      const result = fetchData(true)
        .flatMap(calculate)
        .map(x => x + 10)
        .unwrapOr(0);
      
      expect(result).toBe(0);
    });
  });
});
