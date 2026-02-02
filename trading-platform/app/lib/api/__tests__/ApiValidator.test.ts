/**
 * ApiValidator tests
 */

import {
  validateField,
  validateFields,
  validateSymbol,
  validateBatchSymbols,
  validateDate,
  validateInterval,
  validateMarket,
  validateQueryType,
  validatePositiveNumber,
  validateSide,
  validateNonEmptyString,
} from '../ApiValidator';

describe('ApiValidator', () => {
  describe('validateField', () => {
    it('should pass for valid required string', () => {
      const result = validateField({
        value: 'test',
        fieldName: 'testField',
        required: true,
      });
      expect(result).toBeNull();
    });

    it('should fail for missing required field', () => {
      const result = validateField({
        value: null,
        fieldName: 'testField',
        required: true,
      });
      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });

    it('should validate string length', () => {
      const tooShort = validateField({
        value: 'ab',
        fieldName: 'testField',
        minLength: 3,
      });
      expect(tooShort).not.toBeNull();

      const tooLong = validateField({
        value: 'abcdef',
        fieldName: 'testField',
        maxLength: 5,
      });
      expect(tooLong).not.toBeNull();

      const valid = validateField({
        value: 'abcd',
        fieldName: 'testField',
        minLength: 3,
        maxLength: 5,
      });
      expect(valid).toBeNull();
    });

    it('should validate pattern', () => {
      const result = validateField({
        value: 'abc123',
        fieldName: 'testField',
        pattern: /^\d+$/,
      });
      expect(result).not.toBeNull();

      const valid = validateField({
        value: '123',
        fieldName: 'testField',
        pattern: /^\d+$/,
      });
      expect(valid).toBeNull();
    });

    it('should validate enum values', () => {
      const invalid = validateField({
        value: 'invalid',
        fieldName: 'testField',
        enum: ['valid1', 'valid2'],
      });
      expect(invalid).not.toBeNull();

      const valid = validateField({
        value: 'valid1',
        fieldName: 'testField',
        enum: ['valid1', 'valid2'],
      });
      expect(valid).toBeNull();
    });

    it('should validate number range', () => {
      const tooSmall = validateField({
        value: 5,
        fieldName: 'testField',
        min: 10,
      });
      expect(tooSmall).not.toBeNull();

      const tooBig = validateField({
        value: 100,
        fieldName: 'testField',
        max: 50,
      });
      expect(tooBig).not.toBeNull();

      const valid = validateField({
        value: 25,
        fieldName: 'testField',
        min: 10,
        max: 50,
      });
      expect(valid).toBeNull();
    });

    it('should validate custom function', () => {
      const result = validateField({
        value: 'test',
        fieldName: 'testField',
        custom: (val) => (val === 'test' ? 'Test is not allowed' : null),
      });
      expect(result).not.toBeNull();

      const valid = validateField({
        value: 'other',
        fieldName: 'testField',
        custom: (val) => (val === 'test' ? 'Test is not allowed' : null),
      });
      expect(valid).toBeNull();
    });
  });

  describe('validateFields', () => {
    it('should return first validation error', () => {
      const result = validateFields([
        { value: 'valid', fieldName: 'field1', required: true },
        { value: null, fieldName: 'field2', required: true },
        { value: null, fieldName: 'field3', required: true },
      ]);
      expect(result).not.toBeNull();
    });

    it('should return null if all fields valid', () => {
      const result = validateFields([
        { value: 'valid1', fieldName: 'field1', required: true },
        { value: 'valid2', fieldName: 'field2', required: true },
      ]);
      expect(result).toBeNull();
    });
  });

  describe('validateSymbol', () => {
    it('should validate valid symbols', () => {
      expect(validateSymbol('AAPL')).toBeNull();
      expect(validateSymbol('^N225')).toBeNull();
      expect(validateSymbol('7203')).toBeNull();
    });

    it('should reject invalid symbols', () => {
      expect(validateSymbol('')).not.toBeNull();
      expect(validateSymbol('ABC-DEF')).not.toBeNull();
      expect(validateSymbol('a' .repeat(25))).not.toBeNull();
    });

    it('should handle optional symbols', () => {
      expect(validateSymbol(null, false)).toBeNull();
      expect(validateSymbol(null, true)).not.toBeNull();
    });
  });

  describe('validateBatchSymbols', () => {
    it('should validate batch symbols', () => {
      expect(validateBatchSymbols('AAPL,MSFT,GOOGL')).toBeNull();
      expect(validateBatchSymbols('^N225,^GSPC')).toBeNull();
    });

    it('should reject invalid batch symbols', () => {
      expect(validateBatchSymbols('AAPL-MSFT')).not.toBeNull();
      expect(validateBatchSymbols('a'.repeat(1001))).not.toBeNull();
    });
  });

  describe('validateDate', () => {
    it('should validate valid dates', () => {
      expect(validateDate('2024-01-01')).toBeNull();
      expect(validateDate('2024-12-31')).toBeNull();
    });

    it('should reject invalid dates', () => {
      expect(validateDate('2024-13-01')).not.toBeNull();
      expect(validateDate('2024/01/01')).not.toBeNull();
      expect(validateDate('invalid')).not.toBeNull();
    });
  });

  describe('validateInterval', () => {
    it('should validate valid intervals', () => {
      expect(validateInterval('1m')).toBeNull();
      expect(validateInterval('1d')).toBeNull();
      expect(validateInterval('1wk')).toBeNull();
    });

    it('should reject invalid intervals', () => {
      expect(validateInterval('2h')).not.toBeNull();
      expect(validateInterval('daily')).not.toBeNull();
    });
  });

  describe('validateMarket', () => {
    it('should validate valid markets', () => {
      expect(validateMarket('japan')).toBeNull();
      expect(validateMarket('usa')).toBeNull();
    });

    it('should reject invalid markets', () => {
      expect(validateMarket('europe')).not.toBeNull();
      expect(validateMarket('asia')).not.toBeNull();
    });
  });

  describe('validateQueryType', () => {
    it('should validate valid types', () => {
      expect(validateQueryType('history', ['history', 'quote'])).toBeNull();
      expect(validateQueryType('quote', ['history', 'quote'])).toBeNull();
    });

    it('should reject invalid types', () => {
      expect(validateQueryType('invalid', ['history', 'quote'])).not.toBeNull();
    });
  });

  describe('validatePositiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(validatePositiveNumber(1, 'quantity')).toBeNull();
      expect(validatePositiveNumber(100.5, 'quantity')).toBeNull();
    });

    it('should reject zero and negative numbers', () => {
      expect(validatePositiveNumber(0, 'quantity')).not.toBeNull();
      expect(validatePositiveNumber(-1, 'quantity')).not.toBeNull();
    });

    it('should reject non-finite numbers', () => {
      expect(validatePositiveNumber(Infinity, 'quantity')).not.toBeNull();
      expect(validatePositiveNumber(NaN, 'quantity')).not.toBeNull();
    });
  });

  describe('validateSide', () => {
    it('should validate valid sides', () => {
      expect(validateSide('BUY')).toBeNull();
      expect(validateSide('SELL')).toBeNull();
    });

    it('should reject invalid sides', () => {
      expect(validateSide('buy')).not.toBeNull();
      expect(validateSide('HOLD')).not.toBeNull();
    });
  });

  describe('validateNonEmptyString', () => {
    it('should validate non-empty strings', () => {
      expect(validateNonEmptyString('test', 'name')).toBeNull();
      expect(validateNonEmptyString('  test  ', 'name')).toBeNull();
    });

    it('should reject empty strings', () => {
      expect(validateNonEmptyString('', 'name')).not.toBeNull();
      expect(validateNonEmptyString('   ', 'name')).not.toBeNull();
    });
  });
});
