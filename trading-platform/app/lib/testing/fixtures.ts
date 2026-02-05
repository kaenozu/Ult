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
  const baseDate = overrides.date ? new Date(overrides.date) : new Date();
  const base: OHLCV = {
    symbol: overrides.symbol,
    date: overrides.date ?? baseDate.toISOString(),
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1000000,
    ...overrides
  };

  return Array.from({ length: count }, (_, i) => ({
    ...base,
    date: new Date(baseDate.getTime() + i * 86400000).toISOString(), // 1?????
    open: base.open + i * 0.5,
    high: base.high + i * 0.5,
    low: base.low + i * 0.5,
    close: base.close + i * 0.5,
  }));
};

export const createMockStock = (overrides: Partial<Stock> = {}): Stock => {
  const base: Stock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'usa',
    sector: 'Technology',
    price: 150,
    change: 2.5,
    changePercent: 1.69,
    volume: 1000000,
  };

  return {
    ...base,
    ...overrides,
    symbol: overrides.symbol ?? base.symbol,
    name: overrides.name ?? base.name,
    market: overrides.market ?? base.market,
    sector: overrides.sector ?? base.sector,
    price: overrides.price ?? base.price,
    change: overrides.change ?? base.change,
    changePercent: overrides.changePercent ?? base.changePercent,
    volume: overrides.volume ?? base.volume,
  };
};

export const createMockIndicators = (
  overrides: Partial<ExtendedTechnicalIndicator> = {}
): ExtendedTechnicalIndicator => {
  const base: ExtendedTechnicalIndicator = {
    symbol: 'TEST',
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
      upper: Array(30).fill(110),
      middle: Array(30).fill(100),
      lower: Array(30).fill(90),
    },
    atr: Array(30).fill(2),
  };

  return {
    ...base,
    ...overrides,
    symbol: overrides.symbol ?? base.symbol,
    sma5: overrides.sma5 ?? base.sma5,
    sma20: overrides.sma20 ?? base.sma20,
    sma50: overrides.sma50 ?? base.sma50,
    rsi: overrides.rsi ?? base.rsi,
    macd: overrides.macd ?? base.macd,
    bollingerBands: overrides.bollingerBands ?? base.bollingerBands,
    atr: overrides.atr ?? base.atr,
  };
};

export const createMockSignal = (overrides: Partial<Signal> = {}): Signal => ({
  symbol: 'AAPL',
  type: 'BUY',
  confidence: 75,
  targetPrice: 155,
  stopLoss: 145,
  reason: 'Test signal',
  predictedChange: 1.2,
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
