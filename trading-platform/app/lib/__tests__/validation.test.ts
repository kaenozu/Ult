/**
 * @jest-environment node
 * 
 * Note: These tests use a simplified approach since validation.ts returns
 * NextResponse objects for errors rather than throwing traditional Errors.
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

describe('Validation Utilities', () => {
  describe('validateRequiredString', () => {
    it('should validate valid string', () => {
      expect(validateRequiredString('test', 'field')).toBe('test');
    });

    it('should trim whitespace', () => {
      expect(validateRequiredString('  test  ', 'field')).toBe('test');
    });

    it('should return Response for empty string', () => {
      const result = validateRequiredString('', 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for whitespace only', () => {
      const result = validateRequiredString('   ', 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for null', () => {
      const result = validateRequiredString(null, 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for undefined', () => {
      const result = validateRequiredString(undefined, 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for non-string', () => {
      const result = validateRequiredString(123, 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateNumber', () => {
    it('should validate valid number', () => {
      expect(validateNumber(42, 'field')).toBe(42);
    });

    it('should validate number with positive option', () => {
      expect(validateNumber(42, 'field', { positive: true })).toBe(42);
    });

    it('should return Response for non-number', () => {
      const result = validateNumber('42', 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for zero with positive option', () => {
      const result = validateNumber(0, 'field', { positive: true });
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for negative with positive option', () => {
      const result = validateNumber(-1, 'field', { positive: true });
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
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

    it('should return Response for non-boolean', () => {
      const result = validateBoolean('true', 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateArray', () => {
    it('should validate valid array', () => {
      expect(validateArray([1, 2, 3], 'field')).toEqual([1, 2, 3]);
    });

    it('should return Response for non-array', () => {
      const result = validateArray('not array', 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateObject', () => {
    it('should validate valid object', () => {
      const obj = { key: 'value' };
      expect(validateObject(obj, 'field')).toEqual(obj);
    });

    it('should return Response for null', () => {
      const result = validateObject(null, 'field');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
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

    it('should return Response for invalid characters', () => {
      const result = validateSymbol('AAPL!');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for symbol too long', () => {
      const result = validateSymbol('A'.repeat(25));
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateOrderSide', () => {
    it('should validate BUY', () => {
      expect(validateOrderSide('BUY')).toBe('BUY');
    });

    it('should validate SELL', () => {
      expect(validateOrderSide('SELL')).toBe('SELL');
    });

    it('should return Response for invalid side', () => {
      const result = validateOrderSide('HOLD');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateOrderType', () => {
    it('should validate MARKET', () => {
      expect(validateOrderType('MARKET')).toBe('MARKET');
    });

    it('should validate LIMIT', () => {
      expect(validateOrderType('LIMIT')).toBe('LIMIT');
    });

    it('should return Response for invalid type', () => {
      const result = validateOrderType('STOP');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
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

    it('should return Response for invalid market', () => {
      const result = validateMarketType('europe');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateTradingAction', () => {
    it('should validate start', () => {
      expect(validateTradingAction('start')).toBe('start');
    });

    it('should validate place_order', () => {
      expect(validateTradingAction('place_order')).toBe('place_order');
    });

    it('should return Response for invalid action', () => {
      const result = validateTradingAction('invalid');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateDataType', () => {
    it('should validate history', () => {
      expect(validateDataType('history')).toBe('history');
    });

    it('should validate quote', () => {
      expect(validateDataType('quote')).toBe('quote');
    });

    it('should return Response for invalid type', () => {
      const result = validateDataType('invalid');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
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

    it('should return Response for invalid interval', () => {
      const result = validateInterval('2h');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateDate', () => {
    it('should validate valid date', () => {
      expect(validateDate('2026-01-15')).toBe('2026-01-15');
    });

    it('should return Response for invalid format', () => {
      const result = validateDate('01-15-2026');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });

    it('should return Response for invalid date', () => {
      const result = validateDate('2026-13-45');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
    });
  });

  describe('validateOperator', () => {
    it('should validate >', () => {
      expect(validateOperator('>')).toBe('>');
    });

    it('should validate <=', () => {
      expect(validateOperator('<=')).toBe('<=');
    });

    it('should return Response for invalid operator', () => {
      const result = validateOperator('!=');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
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

    it('should return Response for invalid mode', () => {
      const result = validateMode('test');
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
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

    it('should return Response for non-positive number', () => {
      const result = validateRiskLimits({ maxPositionSize: -100 });
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(400);
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
