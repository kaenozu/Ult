/**
 * Technical indicator constants
 */
export const TECHNICAL_INDICATORS = {
  RSI: {
    DEFAULT_PERIOD: 14,
    OVERBOUGHT: 70,
    OVERSOLD: 30,
  },
  MACD: {
    FAST: 12,
    SLOW: 26,
    SIGNAL: 9,
  },
  BB: {
    PERIOD: 20,
    STD_DEV: 2,
  },
} as const;
