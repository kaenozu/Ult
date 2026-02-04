import type { OHLCV } from '@/app/types';
import type {
  Strategy,
  StrategyAction,
  StrategyContext,
} from './AdvancedBacktestEngine';

export type StrategyPresetId = 'sma' | 'rsi' | 'buy_hold';

export interface StrategyPresetOptions {
  shortPeriod?: number;
  longPeriod?: number;
  rsiPeriod?: number;
  oversold?: number;
  overbought?: number;
  positionSize?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
}

const DEFAULTS = {
  shortPeriod: 10,
  longPeriod: 30,
  rsiPeriod: 14,
  oversold: 30,
  overbought: 70,
  stopLossPct: 0.02,
  takeProfitPct: 0.04,
};

const toNumber = (value: number | undefined, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export function createStrategyPreset(
  preset: StrategyPresetId,
  options: StrategyPresetOptions = {}
): Strategy {
  switch (preset) {
    case 'rsi':
      return createRsiReversionStrategy(options);
    case 'buy_hold':
      return createBuyHoldStrategy(options);
    case 'sma':
    default:
      return createSmaCrossoverStrategy(options);
  }
}

function createSmaCrossoverStrategy(options: StrategyPresetOptions): Strategy {
  const shortPeriod = Math.max(2, Math.floor(toNumber(options.shortPeriod, DEFAULTS.shortPeriod)));
  const longPeriod = Math.max(shortPeriod + 1, Math.floor(toNumber(options.longPeriod, DEFAULTS.longPeriod)));
  const positionSize = typeof options.positionSize === 'number'
    ? Math.max(1, Math.floor(options.positionSize))
    : undefined;
  const stopLossPct = toNumber(options.stopLossPct, DEFAULTS.stopLossPct);
  const takeProfitPct = toNumber(options.takeProfitPct, DEFAULTS.takeProfitPct);

  return {
    name: `SMA(${shortPeriod}/${longPeriod}) Crossover`,
    description: 'Buy when short SMA crosses above long SMA, close when it crosses below.',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      if (index < longPeriod) {
        return { action: 'HOLD' };
      }

      const recentData = context.data.slice(Math.max(0, index - longPeriod), index + 1);
      const shortData = recentData.slice(-shortPeriod);

      const shortSma = average(shortData.map((d) => d.close));
      const longSma = average(recentData.map((d) => d.close));

      const prevRecentData = context.data.slice(Math.max(0, index - longPeriod - 1), index);
      const prevShortData = prevRecentData.slice(-shortPeriod);
      const prevShortSma = average(prevShortData.map((d) => d.close));
      const prevLongSma = average(prevRecentData.map((d) => d.close));

      const bullishCross = prevShortSma <= prevLongSma && shortSma > longSma;
      const bearishCross = prevShortSma >= prevLongSma && shortSma < longSma;

      if (bullishCross && !context.currentPosition) {
        return {
          action: 'BUY',
          ...(positionSize ? { quantity: positionSize } : {}),
          stopLoss: data.close * (1 - stopLossPct),
          takeProfit: data.close * (1 + takeProfitPct),
        };
      }

      if (bearishCross && context.currentPosition) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  };
}

function createRsiReversionStrategy(options: StrategyPresetOptions): Strategy {
  const rsiPeriod = Math.max(2, Math.floor(toNumber(options.rsiPeriod, DEFAULTS.rsiPeriod)));
  const oversold = toNumber(options.oversold, DEFAULTS.oversold);
  const overbought = toNumber(options.overbought, DEFAULTS.overbought);
  const positionSize = typeof options.positionSize === 'number'
    ? Math.max(1, Math.floor(options.positionSize))
    : undefined;
  const stopLossPct = toNumber(options.stopLossPct, DEFAULTS.stopLossPct);
  const takeProfitPct = toNumber(options.takeProfitPct, DEFAULTS.takeProfitPct);

  return {
    name: `RSI(${rsiPeriod}) Mean Reversion`,
    description: 'Buy on oversold RSI and close on overbought RSI.',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      const recentData = context.data.slice(Math.max(0, index - rsiPeriod * 3), index + 1);
      if (recentData.length < rsiPeriod + 1) {
        return { action: 'HOLD' };
      }

      const rsi = calculateRsi(recentData, rsiPeriod);
      if (rsi === null) {
        return { action: 'HOLD' };
      }

      if (rsi <= oversold && !context.currentPosition) {
        return {
          action: 'BUY',
          ...(positionSize ? { quantity: positionSize } : {}),
          stopLoss: data.close * (1 - stopLossPct),
          takeProfit: data.close * (1 + takeProfitPct),
        };
      }

      if (rsi >= overbought && context.currentPosition) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  };
}

function createBuyHoldStrategy(options: StrategyPresetOptions): Strategy {
  const positionSize = typeof options.positionSize === 'number'
    ? Math.max(1, Math.floor(options.positionSize))
    : undefined;
  return {
    name: 'Buy and Hold',
    description: 'Buy on the first signal and hold until the end.',
    onData: (_data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      if (index <= 50 && !context.currentPosition) {
        return { action: 'BUY', ...(positionSize ? { quantity: positionSize } : {}) };
      }
      return { action: 'HOLD' };
    },
  };
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateRsi(data: OHLCV[], period: number): number | null {
  if (data.length < period + 1) return null;

  const closes = data.map((d) => d.close);
  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  if (gains === 0 && losses === 0) return 50;
  if (losses === 0) return 100;

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}
