import { AlertRule, AlertCondition } from './types';

export function createPriceLevelAlert(
  symbol: string,
  price: number,
  operator: 'gt' | 'lt',
  priority: 'low' | 'medium' | 'high' = 'medium'
): AlertRule {
  const ruleId = `price_alert_${symbol}_${price}_${operator}`;
  return {
    id: ruleId,
    name: `${symbol} 価格 ${price} ${operator === 'gt' ? '超' : '以下'}アラート`,
    description: `${symbol} が ${price} を ${operator === 'gt' ? '上回' : '下回'}ったときに通知`,
    conditions: [{
      type: 'price',
      operator,
      threshold: price,
      source: 'current'
    }],
    priority,
    cooldownPeriod: 5,
    enabled: true,
    actions: ['notify', 'log'],
    createdAt: new Date()
  };
}

export function createIndicatorAlert(
  symbol: string,
  indicator: 'rsi' | 'macd' | 'bb_upper' | 'bb_lower',
  threshold: number,
  operator: 'gt' | 'lt' | 'cross_above' | 'cross_below',
  priority: 'low' | 'medium' | 'high' = 'medium'
): AlertRule {
  const ruleId = `indicator_alert_${symbol}_${indicator}_${threshold}_${operator}`;
  return {
    id: ruleId,
    name: `${symbol} ${indicator} ${operator} ${threshold} アラート`,
    description: `${symbol} の ${indicator} が ${threshold} を ${operator} ときに通知`,
    conditions: [{
      type: 'indicator',
      operator,
      threshold: indicator,
      source: 'calculated'
    }],
    priority,
    cooldownPeriod: 10,
    enabled: true,
    actions: ['notify', 'log'],
    createdAt: new Date()
  };
}

export function createVolumeAnomalyAlert(
  symbol: string,
  multiplier: number,
  priority: 'low' | 'medium' | 'high' = 'medium'
): AlertRule {
  const ruleId = `volume_alert_${symbol}_${multiplier}`;
  return {
    id: ruleId,
    name: `${symbol} 出来高 ${multiplier}倍アラート`,
    description: `${symbol} の出来高が平均の ${multiplier} 倍を超えたときに通知`,
    conditions: [{
      type: 'volume',
      operator: 'gt',
      threshold: multiplier,
      source: 'current'
    }],
    priority,
    cooldownPeriod: 15,
    enabled: true,
    actions: ['notify', 'log'],
    createdAt: new Date()
  };
}

export function createCustomAlert(
  id: string,
  name: string,
  description: string,
  conditions: AlertCondition[],
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  cooldownPeriod: number = 10,
  actions: ('notify' | 'email' | 'sms' | 'execute_order' | 'log')[] = ['notify', 'log']
): AlertRule {
  return {
    id,
    name,
    description,
    conditions,
    priority,
    cooldownPeriod,
    enabled: true,
    actions,
    createdAt: new Date()
  };
}
