/**
 * @jest-environment node
 */

import {
  validateRequiredString,
  validateNumber,
  validateBoolean,
  validateArray,
  validateObject,
  validateSymbol,
  validateOrderSide,
  validateOrderType,
  validateMarketType,
  validateTradingAction,
  validateDataType,
  validateInterval,
  validateDate,
  validateOperator,
  validateMode,
  validateRiskLimits,
  buildCleanConfig,
} from '../validation';
import { ValidationError } from '../errors/AppError';

describe('Validation Utilities', () => {
  describe('validateRequiredString', () => {
    it('should validate valid string', () => {
      expect(validateRequiredString('test', 'field')).toBe('test');
    });

    it('should trim whitespace', () => {
      expect(validateRequiredString('  test  ', 'field')).toBe('test');
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => validateRequiredString('', 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace only', () => {
      expect(() => validateRequiredString('   ', 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for null', () => {
      expect(() => validateRequiredString(null, 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for undefined', () => {
      expect(() => validateRequiredString(undefined, 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string', () => {
      expect(() => validateRequiredString(123, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateNumber', () => {
    it('should validate valid number', () => {
      expect(validateNumber(42, 'field')).toBe(42);
    });

    it('should validate number with positive option', () => {
      expect(validateNumber(42, 'field', { positive: true })).toBe(42);
    });

    it('should throw ValidationError for non-number', () => {
      expect(() => validateNumber('42', 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for zero with positive option', () => {
      expect(() => validateNumber(0, 'field', { positive: true })).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative with positive option', () => {
      expect(() => validateNumber(-1, 'field', { positive: true })).toThrow(ValidationError);
    });

    it('should validate with min and max options', () => {
      expect(validateNumber(5, 'field', { min: 0, max: 10 })).toBe(5);
    });
  });

  describe('validateBoolean', () => {
    it('should validate true', () => {
      expect(validateBoolean(true, 'field')).toBe(true);
    });

    it('should validate false', () => {
      expect(validateBoolean(false, 'field')).toBe(false);
    });

    it('should throw ValidationError for non-boolean', () => {
      expect(() => validateBoolean('true', 'field')).toThrow(ValidationError);
    });
  });

  describe('validateArray', () => {
    it('should validate valid array', () => {
      expect(validateArray([1, 2, 3], 'field')).toEqual([1, 2, 3]);
    });

    it('should throw ValidationError for non-array', () => {
      expect(() => validateArray('not array', 'field')).toThrow(ValidationError);
    });
  });

  describe('validateObject', () => {
    it('should validate valid object', () => {
      const obj = { key: 'value' };
      expect(validateObject(obj, 'field')).toEqual(obj);
    });

    it('should throw ValidationError for null', () => {
      expect(() => validateObject(null, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateSymbol', () => {
    it('should validate valid symbol', () => {
      expect(validateSymbol('AAPL')).toBe('AAPL');
    });

    it('should validate symbol with numbers', () => {
      expect(validateSymbol('BTC123')).toBe('BTC123');
    });

    it('should validate symbol with caret', () => {
      expect(validateSymbol('^N225')).toBe('^N225');
    });

    it('should validate batch symbols', () => {
      expect(validateSymbol('AAPL,MSFT,GOOGL')).toBe('AAPL,MSFT,GOOGL');
    });

    it('should throw ValidationError for invalid characters', () => {
      expect(() => validateSymbol('AAPL!')).toThrow(ValidationError);
    });

    it('should throw ValidationError for symbol too long', () => {
      expect(() => validateSymbol('A'.repeat(25))).toThrow(ValidationError);
    });
  });

  describe('validateOrderSide', () => {
    it('should validate BUY', () => {
      expect(validateOrderSide('BUY')).toBe('BUY');
    });

    it('should validate SELL', () => {
      expect(validateOrderSide('SELL')).toBe('SELL');
    });

    it('should throw ValidationError for invalid side', () => {
      expect(() => validateOrderSide('HOLD')).toThrow(ValidationError);
    });
  });

  describe('validateOrderType', () => {
    it('should validate MARKET', () => {
      expect(validateOrderType('MARKET')).toBe('MARKET');
    });

    it('should validate LIMIT', () => {
      expect(validateOrderType('LIMIT')).toBe('LIMIT');
    });

    it('should throw ValidationError for invalid type', () => {
      expect(() => validateOrderType('STOP')).toThrow(ValidationError);
    });
  });

  describe('validateMarketType', () => {
    it('should validate japan', () => {
      expect(validateMarketType('japan')).toBe('japan');
    });

    it('should validate usa', () => {
      expect(validateMarketType('usa')).toBe('usa');
    });

    it('should default to usa for empty', () => {
      expect(validateMarketType('')).toBe('usa');
    });

    it('should throw ValidationError for invalid market', () => {
      expect(() => validateMarketType('europe')).toThrow(ValidationError);
    });
  });

  describe('validateTradingAction', () => {
    it('should validate start', () => {
      expect(validateTradingAction('start')).toBe('start');
    });

    it('should validate place_order', () => {
      expect(validateTradingAction('place_order')).toBe('place_order');
    });

    it('should throw ValidationError for invalid action', () => {
      expect(() => validateTradingAction('invalid')).toThrow(ValidationError);
    });
  });

  describe('validateDataType', () => {
    it('should validate history', () => {
      expect(validateDataType('history')).toBe('history');
    });

    it('should validate quote', () => {
      expect(validateDataType('quote')).toBe('quote');
    });

    it('should throw ValidationError for invalid type', () => {
      expect(() => validateDataType('invalid')).toThrow(ValidationError);
    });
  });

  describe('validateInterval', () => {
    it('should validate 1m', () => {
      expect(validateInterval('1m')).toBe('1m');
    });

    it('should validate 1d', () => {
      expect(validateInterval('1d')).toBe('1d');
    });

    it('should default to 1d for empty', () => {
      expect(validateInterval('')).toBe('1d');
    });

    it('should throw ValidationError for invalid interval', () => {
      expect(() => validateInterval('2h')).toThrow(ValidationError);
    });
  });

  describe('validateDate', () => {
    it('should validate valid date', () => {
      expect(validateDate('2026-01-15')).toBe('2026-01-15');
    });

    it('should throw ValidationError for invalid format', () => {
      expect(() => validateDate('01-15-2026')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid date', () => {
      expect(() => validateDate('2026-13-45')).toThrow(ValidationError);
    });
  });

  describe('validateOperator', () => {
    it('should validate >', () => {
      expect(validateOperator('>')).toBe('>');
    });

    it('should validate <=', () => {
      expect(validateOperator('<=')).toBe('<=');
    });

    it('should throw ValidationError for invalid operator', () => {
      expect(() => validateOperator('!=')).toThrow(ValidationError);
    });
  });

  describe('validateMode', () => {
    it('should validate live', () => {
      expect(validateMode('live')).toBe('live');
    });

    it('should validate paper', () => {
      expect(validateMode('paper')).toBe('paper');
    });

    it('should default to paper for empty', () => {
      expect(validateMode('')).toBe('paper');
    });

    it('should throw ValidationError for invalid mode', () => {
      expect(() => validateMode('test')).toThrow(ValidationError);
    });
  });

  describe('validateRiskLimits', () => {
    it('should validate valid risk limits', () => {
      const limits = {
        maxPositionSize: 10000,
        maxDailyLoss: 5000,
        maxDrawdown: 10000,
      };
      expect(validateRiskLimits(limits)).toEqual(limits);
    });

    it('should filter out invalid fields', () => {
      const limits = {
        maxPositionSize: 10000,
        invalidField: 'value',
      };
      expect(validateRiskLimits(limits)).toEqual({ maxPositionSize: 10000 });
    });

    it('should throw ValidationError for non-positive number', () => {
      expect(() => validateRiskLimits({ maxPositionSize: -100 })).toThrow(ValidationError);
    });
  });

  describe('buildCleanConfig', () => {
    it('should build clean config with all fields', () => {
      const config = {
        mode: 'paper',
        initialCapital: 100000,
        riskLimits: {
          maxPositionSize: 10000,
        },
        aiEnabled: true,
        exchanges: ['NYSE', 'NASDAQ'],
      };
      
      const result = buildCleanConfig(config);
      expect(result).toEqual({
        mode: 'paper',
        initialCapital: 100000,
        riskLimits: { maxPositionSize: 10000 },
        aiEnabled: true,
        exchanges: ['NYSE', 'NASDAQ'],
      });
    });

    it('should filter out invalid fields', () => {
      const config = {
        mode: 'paper',
        invalidField: 'value',
      };
      
      const result = buildCleanConfig(config);
      expect(result).toEqual({ mode: 'paper' });
    });

    it('should handle empty config', () => {
      expect(buildCleanConfig({})).toEqual({});
    });
  });
});
