/**
 * ApiValidator - Unified validation utilities for API routes
 * 
 * This module consolidates common validation patterns used across API routes,
 * reducing duplication and ensuring consistent validation behavior.
 */

import { validationError } from '../error-handler';

export interface ValidationRule<T = string> {
  value: T | null | undefined;
  fieldName: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: readonly T[];
  min?: number;
  max?: number;
  custom?: (value: T) => string | null; // Returns error message or null
}

/**
 * Validate a single field
 */
export function validateField<T = string>(rule: ValidationRule<T>): ReturnType<typeof validationError> | null {
  const { value, fieldName, required, minLength, maxLength, pattern, enum: enumValues, min, max, custom } = rule;

  // Check required
  if (required && (value === null || value === undefined || value === '')) {
    return validationError(`${fieldName} is required`, fieldName);
  }

  // If value is empty and not required, skip further validation
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    // Check length
    if (minLength !== undefined && value.length < minLength) {
      return validationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return validationError(`${fieldName} must be at most ${maxLength} characters`, fieldName);
    }

    // Check pattern
    if (pattern && !pattern.test(value)) {
      return validationError(`Invalid ${fieldName} format`, fieldName);
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return validationError(`${fieldName} must be a finite number`, fieldName);
    }
    if (min !== undefined && value < min) {
      return validationError(`${fieldName} must be at least ${min}`, fieldName);
    }
    if (max !== undefined && value > max) {
      return validationError(`${fieldName} must be at most ${max}`, fieldName);
    }
  }

  // Enum validation
  if (enumValues && !enumValues.includes(value)) {
    return validationError(
      `${fieldName} must be one of: ${enumValues.join(', ')}`,
      fieldName
    );
  }

  // Custom validation
  if (custom) {
    const error = custom(value);
    if (error) {
      return validationError(error, fieldName);
    }
  }

  return null;
}

/**
 * Validate multiple fields at once
 * Returns the first validation error found
 */
export function validateFields(rules: ValidationRule[]): ReturnType<typeof validationError> | null {
  for (const rule of rules) {
    const error = validateField(rule);
    if (error) return error;
  }
  return null;
}

/**
 * Symbol validator - validates stock symbols
 */
export function validateSymbol(symbol: string | null | undefined, required = true): ReturnType<typeof validationError> | null {
  const trimmed = symbol?.trim().toUpperCase();
  
  return validateField({
    value: trimmed,
    fieldName: 'symbol',
    required,
    maxLength: 20,
    pattern: /^[A-Z0-9.,^]+$/,
  });
}

/**
 * Batch symbols validator - validates comma-separated symbols
 */
export function validateBatchSymbols(symbols: string | null | undefined): ReturnType<typeof validationError> | null {
  return validateField({
    value: symbols,
    fieldName: 'symbols',
    required: true,
    maxLength: 1000,
    pattern: /^[A-Z0-9.,^]+$/,
  });
}

/**
 * Date validator - validates YYYY-MM-DD format
 */
export function validateDate(date: string | null | undefined, fieldName = 'date', required = false): ReturnType<typeof validationError> | null {
  return validateField({
    value: date,
    fieldName,
    required,
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    custom: (val) => {
      if (isNaN(Date.parse(val))) {
        return 'Invalid date format. Use YYYY-MM-DD.';
      }
      return null;
    },
  });
}

/**
 * Interval validator - validates trading intervals
 */
export const VALID_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1wk', '1mo'] as const;
export type ValidInterval = typeof VALID_INTERVALS[number];

export function validateInterval(interval: string | null | undefined, required = false): ReturnType<typeof validationError> | null {
  return validateField({
    value: interval,
    fieldName: 'interval',
    required,
    enum: VALID_INTERVALS,
  });
}

/**
 * Market validator - validates market type
 */
export const VALID_MARKETS = ['japan', 'usa'] as const;
export type ValidMarket = typeof VALID_MARKETS[number];

export function validateMarket(market: string | null | undefined, required = false): ReturnType<typeof validationError> | null {
  return validateField({
    value: market,
    fieldName: 'market',
    required,
    enum: VALID_MARKETS,
  });
}

/**
 * Query type validator - validates API query type
 */
export function validateQueryType(type: string | null | undefined, validTypes: readonly string[], required = true): ReturnType<typeof validationError> | null {
  return validateField({
    value: type,
    fieldName: 'type',
    required,
    enum: validTypes,
  });
}

/**
 * Positive number validator
 */
export function validatePositiveNumber(value: number | null | undefined, fieldName: string, required = true): ReturnType<typeof validationError> | null {
  return validateField({
    value,
    fieldName,
    required,
    min: 0.000001,
    custom: (val) => {
      if (!Number.isFinite(val)) {
        return `${fieldName} must be a finite number`;
      }
      if (val <= 0) {
        return `${fieldName} must be positive`;
      }
      return null;
    },
  });
}

/**
 * Side validator - validates BUY/SELL
 */
export const VALID_SIDES = ['BUY', 'SELL'] as const;
export type ValidSide = typeof VALID_SIDES[number];

export function validateSide(side: string | null | undefined, required = true): ReturnType<typeof validationError> | null {
  return validateField({
    value: side,
    fieldName: 'side',
    required,
    enum: VALID_SIDES,
  });
}

/**
 * Non-empty string validator
 */
export function validateNonEmptyString(value: string | null | undefined, fieldName: string, required = true): ReturnType<typeof validationError> | null {
  return validateField({
    value,
    fieldName,
    required,
    minLength: 1,
    custom: (val) => {
      if (val.trim().length === 0) {
        return `${fieldName} cannot be empty or whitespace only`;
      }
      return null;
    },
  });
}
