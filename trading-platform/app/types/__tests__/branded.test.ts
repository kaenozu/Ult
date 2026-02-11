/**
 * Tests for Branded Types
 */

import {
  createSymbolId,
  isSymbolId,
  createPercentage,
  createRatio,
  percentageToRatio,
  ratioToPercentage,
  createPrice,
  createVolume,
  createTimestampMs,
  createDateString,
  createTradeId,
  createOrderId,
  type SymbolId,
  type Percentage,
  type Ratio,
  type Price,
  type Volume,
  type TimestampMs,
  type DateString,
  type TradeId,
  type OrderId,
} from '../branded';

describe('Branded Types - SymbolId', () => {
  it('should create SymbolId from string', () => {
    const symbol = createSymbolId('AAPL');
    expect(symbol).toBe('AAPL');
  });

  it('should throw for empty string', () => {
    expect(() => createSymbolId('')).toThrow('Symbol must be a non-empty string');
  });

  it('should validate SymbolId with type guard', () => {
    expect(isSymbolId('AAPL')).toBe(true);
    expect(isSymbolId('')).toBe(false);
    expect(isSymbolId(123)).toBe(false);
  });
});

describe('Branded Types - Percentage', () => {
  it('should create percentage from number', () => {
    const pct = createPercentage(75);
    expect(pct).toBe(75);
  });

  it('should throw for out of range values', () => {
    expect(() => createPercentage(-1)).toThrow('Percentage must be between 0 and 100');
    expect(() => createPercentage(101)).toThrow('Percentage must be between 0 and 100');
  });

  it('should convert percentage to ratio', () => {
    const pct = createPercentage(75);
    const r = percentageToRatio(pct);
    expect(r).toBe(0.75);
  });
});

describe('Branded Types - Ratio', () => {
  it('should create ratio from number', () => {
    const r = createRatio(0.5);
    expect(r).toBe(0.5);
  });

  it('should throw for out of range values', () => {
    expect(() => createRatio(-0.1)).toThrow('Ratio must be between 0 and 1');
    expect(() => createRatio(1.1)).toThrow('Ratio must be between 0 and 1');
  });

  it('should convert ratio to percentage', () => {
    const r = createRatio(0.25);
    const pct = ratioToPercentage(r);
    expect(pct).toBe(25);
  });
});

describe('Branded Types - Price', () => {
  it('should create price from number', () => {
    const price = createPrice(100.50);
    expect(price).toBe(100.50);
  });

  it('should throw for negative values', () => {
    expect(() => createPrice(-1)).toThrow('Price must be non-negative');
  });
});

describe('Branded Types - Volume', () => {
  it('should create volume from number', () => {
    const vol = createVolume(1500);
    expect(vol).toBe(1500);
  });

  it('should throw for negative values', () => {
    expect(() => createVolume(-1)).toThrow('Volume must be non-negative');
  });

  it('should throw for non-integer values', () => {
    expect(() => createVolume(1.5)).toThrow('Volume must be an integer');
  });
});

describe('Branded Types - TimestampMs', () => {
  it('should create timestamp from number', () => {
    const ts = createTimestampMs(1704067200000);
    expect(ts).toBe(1704067200000);
  });

  it('should throw for negative values', () => {
    expect(() => createTimestampMs(-1)).toThrow('Timestamp must be non-negative');
  });
});

describe('Branded Types - DateString', () => {
  it('should create DateString from ISO string', () => {
    const ds = createDateString('2024-01-01');
    expect(ds).toBe('2024-01-01');
  });

  it('should create DateString from Date object', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const ds = createDateString(date);
    expect(ds).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should throw for invalid date string', () => {
    expect(() => createDateString('invalid')).toThrow('Date string does not represent a valid date');
  });
});

describe('Branded Types - TradeId', () => {
  it('should create TradeId from string', () => {
    const id = createTradeId('trade-123');
    expect(id).toBe('trade-123');
  });

  it('should throw for empty string', () => {
    expect(() => createTradeId('')).toThrow('Trade ID must be a non-empty string');
  });
});

describe('Branded Types - OrderId', () => {
  it('should create OrderId from string', () => {
    const id = createOrderId('order-456');
    expect(id).toBe('order-456');
  });

  it('should throw for empty string', () => {
    expect(() => createOrderId('')).toThrow('Order ID must be a non-empty string');
  });
});

describe('Branded Types - Type Safety', () => {
  it('should maintain type safety at compile time', () => {
    const symbol: SymbolId = createSymbolId('AAPL');
    const pct: Percentage = createPercentage(50);
    const r: Ratio = createRatio(0.5);
    
    expect(typeof symbol).toBe('string');
    expect(typeof pct).toBe('number');
    expect(typeof r).toBe('number');
  });

  it('should allow conversion between percentage and ratio', () => {
    const pct = createPercentage(50);
    const r = percentageToRatio(pct);
    const backToPct = ratioToPercentage(r);
    
    expect(r).toBe(0.5);
    expect(backToPct).toBe(50);
  });
});
