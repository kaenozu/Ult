import { OHLCV } from '@/app/types';
import type { TechnicalIndicators } from '@/app/types';
import { ProcessedData } from '../high-frequency-data-processing-service';
import {
  AlertCondition,
  AlertRule,
  AlertTrigger,
  AlertNotification
} from './types';

export class EnhancedSmartAlertService {
  private rules: Map<string, AlertRule> = new Map();
  private triggers: AlertTrigger[] = [];
  private notifications: AlertNotification[] = [];
  private lastTriggerTimes: Map<string, Date> = new Map();

  addAlertRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  removeAlertRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const existingRule = this.rules.get(ruleId);
    if (existingRule) {
      this.rules.set(ruleId, { ...existingRule, ...updates });
    }
  }

  setAlertRuleStatus(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  evaluateAlerts(symbol: string, data: OHLCV | ProcessedData, indicators?: TechnicalIndicators): AlertTrigger[] {
    const triggeredAlerts: AlertTrigger[] = [];
    const currentTime = new Date();

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      const lastTriggerTime = this.lastTriggerTimes.get(ruleId);
      if (lastTriggerTime) {
        const timeSinceLastTrigger = (currentTime.getTime() - lastTriggerTime.getTime()) / (1000 * 60);
        if (timeSinceLastTrigger < rule.cooldownPeriod) {
          continue;
        }
      }

      if (this.evaluateRuleConditions(rule, symbol, data, indicators)) {
        const trigger: AlertTrigger = {
          ruleId,
          symbol,
          timestamp: currentTime,
          currentValue: this.getCurrentValueFromData(data, rule.conditions[0]),
          threshold: rule.conditions[0].threshold as number,
          message: this.generateAlertMessage(rule, symbol, data),
          priority: rule.priority,
          notified: false
        };

        triggeredAlerts.push(trigger);
        this.triggers.push(trigger);
        this.lastTriggerTimes.set(ruleId, currentTime);
      }
    }

    return triggeredAlerts;
  }

  private evaluateRuleConditions(rule: AlertRule, symbol: string, data: OHLCV | ProcessedData, indicators?: TechnicalIndicators): boolean {
    for (const condition of rule.conditions) {
      let currentValue: number;

      if (condition.source === 'current') {
        currentValue = this.getCurrentValueFromData(data, condition);
      } else if (condition.source === 'calculated' && indicators) {
        currentValue = this.getValueFromIndicators(indicators, condition);
      } else {
        continue;
      }

      const threshold = Number(condition.threshold);

      switch (condition.operator) {
        case 'gt':
          if (!(currentValue > threshold)) return false;
          break;
        case 'lt':
          if (!(currentValue < threshold)) return false;
          break;
        case 'eq':
          if (!(currentValue === threshold)) return false;
          break;
        case 'gte':
          if (!(currentValue >= threshold)) return false;
          break;
        case 'lte':
          if (!(currentValue <= threshold)) return false;
          break;
        case 'cross_above':
          if (!this.checkCrossAbove(data, condition, symbol)) return false;
          break;
        case 'cross_below':
          if (!this.checkCrossBelow(data, condition, symbol)) return false;
          break;
      }
    }

    return true;
  }

  private getCurrentValueFromData(data: OHLCV | ProcessedData, condition: AlertCondition): number {
    if ('bar' in data) {
      const processedData = data as ProcessedData;
      switch (condition.type) {
        case 'price':
          return processedData.bar.close;
        case 'volume':
          return processedData.bar.volume;
        case 'volatility':
          return processedData.marketMicrostructure?.volatility || 0;
        default:
          return processedData.bar.close;
      }
    } else {
      const ohlcv = data as OHLCV;
      switch (condition.type) {
        case 'price':
          return ohlcv.close;
        case 'volume':
          return ohlcv.volume;
        default:
          return ohlcv.close;
      }
    }
  }

  private getValueFromIndicators(indicators: TechnicalIndicators, condition: AlertCondition): number {
    switch (condition.type) {
      case 'indicator':
        if (condition.threshold === 'rsi') {
          return indicators.rsi || 0;
        } else if (condition.threshold === 'macd') {
          return indicators.macd || 0;
        } else if (condition.threshold === 'bb_upper') {
          return indicators.bollingerUpper || 0;
        } else if (condition.threshold === 'bb_lower') {
          return indicators.bollingerLower || 0;
        }
        break;
      default:
        return 0;
    }
    return 0;
  }

  private checkCrossAbove(_data: OHLCV | ProcessedData, _condition: AlertCondition, _symbol: string): boolean {
    return false;
  }

  private checkCrossBelow(_data: OHLCV | ProcessedData, _condition: AlertCondition, _symbol: string): boolean {
    return false;
  }

  private generateAlertMessage(rule: AlertRule, symbol: string, data: OHLCV | ProcessedData): string {
    let message = `${symbol} で "${rule.name}" がトリガーされました`;

    if ('bar' in data) {
      const processedData = data as ProcessedData;
      message += `: 価格 ${processedData.bar.close}`;
    } else {
      const ohlcv = data as OHLCV;
      message += `: 価格 ${ohlcv.close}`;
    }

    return message;
  }

  processTriggeredAlerts(triggers: AlertTrigger[]): AlertNotification[] {
    const notifications: AlertNotification[] = [];

    for (const trigger of triggers) {
      const rule = this.rules.get(trigger.ruleId);
      if (!rule) continue;

      for (const action of rule.actions) {
        switch (action) {
          case 'notify':
            const notification = this.createNotification(trigger, 'popup');
            notifications.push(notification);
            break;
          case 'email':
            break;
          case 'sms':
            break;
          case 'execute_order':
            break;
          case 'log':
            break;
        }
      }
    }

    this.notifications.push(...notifications);
    return notifications;
  }

  private createNotification(trigger: AlertTrigger, method: 'popup' | 'email' | 'sms' | 'push'): AlertNotification {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trigger,
      method,
      sentAt: new Date(),
      delivered: false,
      content: trigger.message
    };
  }

  getAlertHistory(symbol?: string, daysBack: number = 7): AlertTrigger[] {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysBack);

    return this.triggers.filter(trigger => {
      const matchesSymbol = !symbol || trigger.symbol === symbol;
      const isAfterCutoff = trigger.timestamp >= cutoffTime;
      return matchesSymbol && isAfterCutoff;
    });
  }

  getNotificationHistory(symbol?: string, daysBack: number = 7): AlertNotification[] {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysBack);

    return this.notifications.filter(notification => {
      const matchesSymbol = !symbol || notification.trigger.symbol === symbol;
      const isAfterCutoff = notification.sentAt >= cutoffTime;
      return matchesSymbol && isAfterCutoff;
    });
  }

  addPriceLevelAlert(symbol: string, price: number, operator: 'gt' | 'lt', priority: 'low' | 'medium' | 'high' = 'medium'): string {
    const ruleId = `price_alert_${symbol}_${price}_${operator}`;
    const rule: AlertRule = {
      id: ruleId,
      name: `${symbol} 価格 ${price} ${operator === 'gt' ? '超' : '以下'}アラート`,
      description: `${symbol} が ${price} を ${operator === 'gt' ? '上回' : '下回'}ったときに通知`,
      conditions: [{ type: 'price', operator, threshold: price, source: 'current' }],
      priority,
      cooldownPeriod: 5,
      enabled: true,
      actions: ['notify', 'log'],
      createdAt: new Date()
    };
    this.addAlertRule(rule);
    return ruleId;
  }

  addIndicatorAlert(
    symbol: string,
    indicator: 'rsi' | 'macd' | 'bb_upper' | 'bb_lower',
    threshold: number,
    operator: 'gt' | 'lt' | 'cross_above' | 'cross_below',
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): string {
    const ruleId = `indicator_alert_${symbol}_${indicator}_${threshold}_${operator}`;
    const rule: AlertRule = {
      id: ruleId,
      name: `${symbol} ${indicator} ${operator} ${threshold} アラート`,
      description: `${symbol} の ${indicator} が ${threshold} を ${operator} ときに通知`,
      conditions: [{ type: 'indicator', operator, threshold: indicator, source: 'calculated' }],
      priority,
      cooldownPeriod: 10,
      enabled: true,
      actions: ['notify', 'log'],
      createdAt: new Date()
    };
    this.addAlertRule(rule);
    return ruleId;
  }

  addVolumeAnomalyAlert(symbol: string, multiplier: number, priority: 'low' | 'medium' | 'high' = 'medium'): string {
    const ruleId = `volume_alert_${symbol}_${multiplier}`;
    const rule: AlertRule = {
      id: ruleId,
      name: `${symbol} 出来高 ${multiplier}倍アラート`,
      description: `${symbol} の出来高が平均の ${multiplier} 倍を超えたときに通知`,
      conditions: [{ type: 'volume', operator: 'gt', threshold: multiplier, source: 'current' }],
      priority,
      cooldownPeriod: 15,
      enabled: true,
      actions: ['notify', 'log'],
      createdAt: new Date()
    };
    this.addAlertRule(rule);
    return ruleId;
  }

  getAllAlertRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getAlertRuleById(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  getAlertRulesBySymbol(symbol: string): AlertRule[] {
    return Array.from(this.rules.values()).filter(rule =>
      rule.conditions.some(condition => condition.symbol === symbol)
    );
  }

  resetAlertEngine(): void {
    this.rules.clear();
    this.triggers = [];
    this.notifications = [];
    this.lastTriggerTimes.clear();
  }
}

export const enhancedSmartAlertService = new EnhancedSmartAlertService();
