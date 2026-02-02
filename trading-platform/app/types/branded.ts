/**
 * Branded Types for Type-Safe Units
 * 
 * These types prevent mixing different units (e.g., milliseconds vs seconds)
 * at compile time while maintaining runtime compatibility with numbers.
 */

// Time units
export type Milliseconds = number & { readonly __brand: 'Milliseconds' };
export type Seconds = number & { readonly __brand: 'Seconds' };
export type Minutes = number & { readonly __brand: 'Minutes' };
export type Hours = number & { readonly __brand: 'Hours' };
export type Days = number & { readonly __brand: 'Days' };

// Percentage and ratio units
export type Percentage = number & { readonly __brand: 'Percentage' };
export type Ratio = number & { readonly __brand: 'Ratio' };
export type DecimalPercentage = number & { readonly __brand: 'DecimalPercentage' };

// Financial units
export type Currency = number & { readonly __brand: 'Currency' };
export type Points = number & { readonly __brand: 'Points' };

// Count/Index units
export type Count = number & { readonly __brand: 'Count' };
export type Index = number & { readonly __brand: 'Index' };

/**
 * Time Conversion Functions
 */

export const milliseconds = (value: number): Milliseconds => value as Milliseconds;

export const seconds = {
  fromMs: (ms: Milliseconds): Seconds => (ms / 1000) as Seconds,
  toMs: (s: Seconds): Milliseconds => (s * 1000) as Milliseconds,
  create: (value: number): Seconds => value as Seconds,
};

export const minutes = {
  fromMs: (ms: Milliseconds): Minutes => (ms / 60000) as Minutes,
  toMs: (m: Minutes): Milliseconds => (m * 60000) as Milliseconds,
  fromSeconds: (s: Seconds): Minutes => (s / 60) as Minutes,
  toSeconds: (m: Minutes): Seconds => (m * 60) as Seconds,
  create: (value: number): Minutes => value as Minutes,
};

export const hours = {
  fromMs: (ms: Milliseconds): Hours => (ms / 3600000) as Hours,
  toMs: (h: Hours): Milliseconds => (h * 3600000) as Milliseconds,
  fromMinutes: (m: Minutes): Hours => (m / 60) as Hours,
  toMinutes: (h: Hours): Minutes => (h * 60) as Minutes,
  create: (value: number): Hours => value as Hours,
};

export const days = {
  fromMs: (ms: Milliseconds): Days => (ms / 86400000) as Days,
  toMs: (d: Days): Milliseconds => (d * 86400000) as Milliseconds,
  fromHours: (h: Hours): Days => (h / 24) as Days,
  toHours: (d: Days): Hours => (d * 24) as Hours,
  create: (value: number): Days => value as Days,
};

/**
 * Percentage Conversion Functions
 */

export const percentage = {
  /** Create percentage from 0-100 scale */
  create: (value: number): Percentage => value as Percentage,
  /** Convert percentage (0-100) to decimal (0-1) */
  toDecimal: (p: Percentage): DecimalPercentage => (p / 100) as DecimalPercentage,
  /** Convert percentage (0-100) to ratio (0-1) */
  toRatio: (p: Percentage): Ratio => (p / 100) as Ratio,
};

export const decimalPercentage = {
  /** Create decimal percentage from 0-1 scale */
  create: (value: number): DecimalPercentage => value as DecimalPercentage,
  /** Convert decimal (0-1) to percentage (0-100) */
  toPercentage: (d: DecimalPercentage): Percentage => (d * 100) as Percentage,
};

export const ratio = {
  /** Create ratio from 0-1 scale */
  create: (value: number): Ratio => value as Ratio,
  /** Convert ratio (0-1) to percentage (0-100) */
  toPercentage: (r: Ratio): Percentage => (r * 100) as Percentage,
};

/**
 * Financial Conversion Functions
 */

export const currency = {
  create: (value: number): Currency => value as Currency,
};

export const points = {
  create: (value: number): Points => value as Points,
};

/**
 * Count/Index Functions
 */

export const count = {
  create: (value: number): Count => value as Count,
};

export const index = {
  create: (value: number): Index => value as Index,
};

/**
 * Type guards for runtime checking (optional, for debugging)
 */

export const isBrandedType = <T extends { readonly __brand: string }>(
  value: unknown,
  brand: string
): value is T => {
  return typeof value === 'number';
};
