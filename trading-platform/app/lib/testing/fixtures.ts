/**
 * Test Fixtures
 * 
 * テストで使用する固定データとヘルパー関数
 */

import { OHLCV, Stock, Signal } from '@/app/types';
import { ExtendedTechnicalIndicator } from '../types/prediction-types';

export const createMockOHLCV = (
  overrides: Partial<OHLCV> = {},
  count: number = 30
): OHLCV[] => {
  const baseDate = new Date();
  const base: OHLCV = {
    symbol: 'AAPL',
    date: baseDate.toISOString().split('T')[0],
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1000000,
    ...overrides
  };

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    return {
      ...base,
      date: d.toISOString().split('T')[0],
      open: base.open + i * 0.5,
      high: base.high + i * 0.5,
      low: base.low + i * 0.5,
      close: base.close + i * 0.5,
    };
  });
};

export const createMockStock = (overrides: Partial<Stock> = {}): Stock => ({
  symbol: 'AAPL',
  name: 'Apple Inc.',
  market: 'usa',
  sector: 'Technology',
  price: 150,
  change: 2.5,
  changePercent: 1.69,
  volume: 1000000,
  ...overrides
});

export const createMockIndicators = (
  overrides: Partial<ExtendedTechnicalIndicator> = {}
): ExtendedTechnicalIndicator => ({
  symbol: 'AAPL',
  sma5: Array(30).fill(100),
  sma20: Array(30).fill(100),
  sma50: Array(30).fill(100),
  rsi: Array(30).fill(50),
  macd: {
    macd: Array(30).fill(0),
    signal: Array(30).fill(0),
    histogram: Array(30).fill(0),
  },
  bollingerBands: {
    upper: Array(30).fill(105),
    middle: Array(30).fill(100),
    lower: Array(30).fill(95),
  },
  atr: Array(30).fill(2),
  ...overrides
});

export const createMockSignal = (overrides: Partial<Signal> = {}): Signal => ({
  symbol: 'AAPL',
  type: 'BUY',
  confidence: 80,
  targetPrice: 155,
  stopLoss: 145,
  reason: 'Test signal',
  predictedChange: 3.5,
  predictionDate: new Date().toISOString().split('T')[0],
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
