import type { AlertCondition } from '../AlertSystem';
import type { CompositeAlertCondition, EnhancedMarketData } from './types';

export type GetLastValueFn = (symbol: string, indicator: string) => number | undefined;

export function evaluateSingleCondition(
  condition: AlertCondition,
  data: EnhancedMarketData,
  getLastValue: GetLastValueFn
): boolean {
  let currentValue: number | undefined;
  let previousValue: number | undefined;

  switch (condition.type) {
    case 'price':
      currentValue = data.price;
      previousValue = getLastValue(data.symbol, 'price');
      break;
    case 'volume':
      currentValue = data.volume;
      previousValue = getLastValue(data.symbol, 'volume');
      break;
    case 'rsi':
    case 'macd':
    case 'sma':
    case 'ema':
    case 'bollinger':
    case 'atr':
      currentValue = data.indicators?.get(condition.type);
      previousValue = getLastValue(data.symbol, condition.type);
      break;
    default:
      currentValue = data.indicators?.get(condition.type);
  }

  if (currentValue === undefined) return false;

  const targetValue = condition.value;
  switch (condition.operator) {
    case 'above':
      return currentValue > (targetValue as number);
    case 'below':
      return currentValue < (targetValue as number);
    case 'crosses_above':
      return (
        currentValue > (targetValue as number) &&
        previousValue !== undefined &&
        previousValue <= (targetValue as number)
      );
    case 'crosses_below':
      return (
        currentValue < (targetValue as number) &&
        previousValue !== undefined &&
        previousValue >= (targetValue as number)
      );
    case 'equals':
      return Math.abs(currentValue - (targetValue as number)) < 0.0001;
    case 'between':
      const [min, max] = targetValue as [number, number];
      return currentValue >= min && currentValue <= max;
    default:
      return false;
  }
}

export function evaluateCompositeCondition(
  condition: CompositeAlertCondition,
  data: EnhancedMarketData,
  getLastValue: GetLastValueFn
): boolean {
  if (!condition.enabled) return false;

  const childResults = condition.conditions.map(c => evaluateSingleCondition(c, data, getLastValue));

  let nestedResults: boolean[] = [];
  if (condition.nestedConditions) {
    nestedResults = condition.nestedConditions.map(nc => evaluateCompositeCondition(nc, data, getLastValue));
  }

  const allResults = [...childResults, ...nestedResults];

  if (condition.logic === 'AND') {
    return allResults.every(r => r);
  } else {
    return allResults.some(r => r);
  }
}
