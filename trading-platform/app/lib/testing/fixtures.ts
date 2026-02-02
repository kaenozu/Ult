/**
 * Test Fixtures
 * 
 * テストで使用する固定データとヘルパー関数
 */

import { OHLCV, Stock, Signal } from '../types';
import { ExtendedTechnicalIndicator } from '../types/prediction-types';

export const createMockOHLCV = (
  overrides: Partial<OHLCV> = {},
  count: number = 30
): OHLCV[] => {
  const base: OHLCV = {
    timestamp: Date.now(),
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1000000,
    ...overrides
  };

  return Array.from({ length: count }, (_, i) => ({
    ...base,
    timestamp: base.timestamp + i * 86400000, // 1日ずつ進む
    open: base.open + i * 0.5,
    high: base.high + i * 0.5,
    low: base.low + i * 0.5,
    close: base.close + i * 0.5,
  }));
};

export const createMockStock = (overrides: Partial<Stock> = {}): Stock => ({
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150,
  change: 2.5,
  changePercent: 1.69,
  volume: 1000000,
  ...overrides
});

export const createMockIndicators = (
  overrides: Partial<ExtendedTechnicalIndicator> = {}
): ExtendedTechnicalIndicator => ({
  sma20: Array(30).fill(100),
  sma50: Array(30).fill(100),
  rsi: Array(30).fill(50),
  atr: Array(30).fill(2),
  ...overrides
});

export const createMockSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: 'test-signal-1',
  symbol: 'AAPL',
  type: 'buy',
  strength: 0.8,
  timestamp: Date.now(),
  ...overrides
});

export const TestFixtures = {
  stocks: {
    aapl: createMockStock({ symbol: 'AAPL', name: 'Apple Inc.' }),
    googl: createMockStock({ symbol: 'GOOGL', name: 'Alphabet Inc.', price: 2800 }),
    msft: createMockStock({ symbol: 'MSFT', name: 'Microsoft Corp.', price: 300 }),
  },
  ohlcv: {
    uptrend: createMockOHLCV({ close: 100 }, 30).map((d, i) => ({
      ...d,
      close: 100 + i * 2,
      high: 102 + i * 2,
      low: 98 + i * 2,
    })),
    downtrend: createMockOHLCV({ close: 100 }, 30).map((d, i) => ({
      ...d,
      close: 100 - i * 2,
      high: 102 - i * 2,
      low: 98 - i * 2,
    })),
    sideways: createMockOHLCV({ close: 100 }, 30),
  },
  indicators: {
    neutral: createMockIndicators(),
    oversold: createMockIndicators({ rsi: Array(30).fill(20) }),
    overbought: createMockIndicators({ rsi: Array(30).fill(80) }),
  }
};
