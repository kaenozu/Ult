/**
 * Branded Types
 * 
 * Branded types (also known as nominal types) provide stronger type safety
 * by making primitive types incompatible with each other even if they
 * have the same underlying type.
 * 
 * This prevents common bugs like mixing up symbol names with other strings,
 * or using regular numbers where percentages are expected.
 */

// ============================================================================
// Brand Symbol (internal use only)
// ============================================================================

declare const __brand: unique symbol;

type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// ============================================================================
// Branded Types for Financial Data
// ============================================================================

/**
 * Stock symbol (e.g., "^N225", "AAPL")
 * Branded to prevent mixing with regular strings
 */
export type SymbolId = Brand<string, 'SymbolId'>;

/**
 * Creates a SymbolId from a string
 */
export function createSymbolId(symbol: string): SymbolId {
  if (!symbol || typeof symbol !== 'string') {
    throw new TypeError('Symbol must be a non-empty string');
  }
  return symbol as SymbolId;
}

/**
 * Type guard for SymbolId
 */
export function isSymbolId(value: unknown): value is SymbolId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Percentage value (0-100)
 * Branded to prevent confusion with decimal ratios
 */
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Creates a Percentage from a number
 * @param value - Number between 0 and 100
 */
export function createPercentage(value: number): Percentage {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Percentage must be a number');
  }
  if (value < 0 || value > 100) {
    throw new RangeError('Percentage must be between 0 and 100');
  }
  return value as Percentage;
}

/**
 * Decimal ratio (0-1)
 * Branded to prevent confusion with percentages
 */
export type Ratio = Brand<number, 'Ratio'>;

/**
 * Creates a Ratio from a number
 * @param value - Number between 0 and 1
 */
export function createRatio(value: number): Ratio {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Ratio must be a number');
  }
  if (value < 0 || value > 1) {
    throw new RangeError('Ratio must be between 0 and 1');
  }
  return value as Ratio;
}

/**
 * Price value (always positive)
 * Branded to ensure type safety for monetary values
 */
export type Price = Brand<number, 'Price'>;

/**
 * Creates a Price from a number
 * @param value - Positive number
 */
export function createPrice(value: number): Price {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Price must be a number');
  }
  if (value < 0) {
    throw new RangeError('Price must be non-negative');
  }
  return value as Price;
}

/**
 * Volume (always non-negative integer)
 * Branded to ensure type safety for volume data
 */
export type Volume = Brand<number, 'Volume'>;

/**
 * Creates a Volume from a number
 * @param value - Non-negative integer
 */
export function createVolume(value: number): Volume {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Volume must be a number');
  }
  if (value < 0) {
    throw new RangeError('Volume must be non-negative');
  }
  if (!Number.isInteger(value)) {
    throw new RangeError('Volume must be an integer');
  }
  return value as Volume;
}

/**
 * Timestamp in milliseconds
 * Branded to prevent confusion with other numeric values
 */
export type TimestampMs = Brand<number, 'TimestampMs'>;

/**
 * Creates a TimestampMs from a number
 * @param value - Unix timestamp in milliseconds
 */
export function createTimestampMs(value: number): TimestampMs {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Timestamp must be a number');
  }
  if (value < 0) {
    throw new RangeError('Timestamp must be non-negative');
  }
  return value as TimestampMs;
}

/**
 * ISO 8601 date string
 * Branded to ensure date string format
 */
export type DateString = Brand<string, 'DateString'>;

/**
 * Creates a DateString from a string or Date
 * @param value - ISO 8601 date string or Date object
 */
export function createDateString(value: string | Date): DateString {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new TypeError('Invalid Date object');
    }
    return value.toISOString() as DateString;
  }
  if (typeof value !== 'string') {
    throw new TypeError('Date must be a string or Date object');
  }
  // Validate that the string represents a valid date
  // This will catch invalid dates like '2025-02-31', '9999-99-99', etc.
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new TypeError('Date string does not represent a valid date');
  }
  return value as DateString;
}

/**
 * Trade ID (unique identifier for trades)
 * Branded to prevent mixing with other string IDs
 */
export type TradeId = Brand<string, 'TradeId'>;

/**
 * Creates a TradeId from a string
 */
export function createTradeId(id: string): TradeId {
  if (!id || typeof id !== 'string') {
    throw new TypeError('Trade ID must be a non-empty string');
  }
  return id as TradeId;
}

/**
 * Order ID (unique identifier for orders)
 * Branded to prevent mixing with other string IDs
 */
export type OrderId = Brand<string, 'OrderId'>;

/**
 * Creates an OrderId from a string
 */
export function createOrderId(id: string): OrderId {
  if (!id || typeof id !== 'string') {
    throw new TypeError('Order ID must be a non-empty string');
  }
  return id as OrderId;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert percentage to ratio
 */
export function percentageToRatio(percentage: Percentage): Ratio {
  return createRatio((percentage as number) / 100);
}

/**
 * Convert ratio to percentage
 */
export function ratioToPercentage(ratio: Ratio): Percentage {
  return createPercentage((ratio as number) * 100);
}

