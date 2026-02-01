/**
 * AlertSystem.ts
 * 
 * カスタマイズ可能なアラートシステム。テクニカル指標、価格、ボリューム、
 * およびその他の市場条件に基づくアラートを提供します。
 */

import { EventEmitter } from 'events';
import { BUFFER_LIMITS } from '../constants';

// ============================================================================
// Types
// ============================================================================

export interface AlertCondition {
  id: string;
  name: string;
  symbol: string;
  type: AlertType;
  operator: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between';
  value: number | [number, number];
  parameters?: Record<string, number>;
  timeframe?: string;
  enabled: boolean;
  createdAt: number;
  triggeredAt?: number;
  triggerCount: number;
  cooldown: number; // milliseconds
  notificationChannels: NotificationChannel[];
}

export type AlertType =
  | 'price'
  | 'volume'
  | 'rsi'
  | 'macd'
  | 'sma'
  | 'ema'
  | 'bollinger'
  | 'atr'
  | 'price_change'
  | 'volume_spike'
  | 'breakout'
  | 'pattern'
  | 'custom';

export type NotificationChannel = 'ui' | 'email' | 'sms' | 'webhook' | 'push' | 'sound';

export interface AlertTrigger {
  conditionId: string;
  symbol: string;
  type: AlertType;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface AlertHistory {
  triggers: AlertTrigger[];
  triggeredConditions: Set<string>;
}

export interface AlertTemplate {
  name: string;
  description: string;
  type: AlertType;
  defaultOperator: AlertCondition['operator'];
  defaultValue: number | [number, number];
  defaultParameters?: Record<string, number>;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'price';
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  indicators?: Map<string, number>;
  ohlcv?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
}

// ============================================================================
// Alert Templates
// ============================================================================

export const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    name: 'RSI Oversold',
    description: 'Alert when RSI falls below 30',
    type: 'rsi',
    defaultOperator: 'below',
    defaultValue: 30,
    defaultParameters: { period: 14 },
    category: 'momentum',
  },
  {
    name: 'RSI Overbought',
    description: 'Alert when RSI rises above 70',
    type: 'rsi',
    defaultOperator: 'above',
    defaultValue: 70,
    defaultParameters: { period: 14 },
    category: 'momentum',
  },
  {
    name: 'MACD Bullish Crossover',
    description: 'Alert when MACD crosses above signal line',
    type: 'macd',
    defaultOperator: 'crosses_above',
    defaultValue: 0,
    defaultParameters: { fast: 12, slow: 26, signal: 9 },
    category: 'momentum',
  },
  {
    name: 'Price Above SMA',
    description: 'Alert when price crosses above SMA',
    type: 'sma',
    defaultOperator: 'crosses_above',
    defaultValue: 0,
    defaultParameters: { period: 20 },
    category: 'trend',
  },
  {
    name: 'Bollinger Band Breakout',
    description: 'Alert when price breaks above upper Bollinger Band',
    type: 'bollinger',
    defaultOperator: 'above',
    defaultValue: 100,
    defaultParameters: { period: 20, stdDev: 2 },
    category: 'volatility',
  },
  {
    name: 'Volume Spike',
    description: 'Alert when volume exceeds 2x average',
    type: 'volume_spike',
    defaultOperator: 'above',
    defaultValue: 200,
    defaultParameters: { period: 20, multiplier: 2 },
    category: 'volume',
  },
  {
    name: 'Price Target',
    description: 'Alert when price reaches target',
    type: 'price',
    defaultOperator: 'above',
    defaultValue: 100,
    category: 'price',
  },
  {
    name: 'Stop Loss',
    description: 'Alert when price falls below stop level',
    type: 'price',
    defaultOperator: 'below',
    defaultValue: 90,
    category: 'price',
  },
  {
    name: 'ATR Expansion',
    description: 'Alert when volatility increases significantly',
    type: 'atr',
    defaultOperator: 'above',
    defaultValue: 2,
    defaultParameters: { period: 14 },
    category: 'volatility',
  },
  {
    name: 'Price Change %',
    description: 'Alert when price changes by specified percentage',
    type: 'price_change',
    defaultOperator: 'above',
    defaultValue: 5,
    defaultParameters: { period: 1 },
    category: 'price',
  },
];

// ============================================================================
// Alert System
// ============================================================================

export class AlertSystem extends EventEmitter {
  private conditions: Map<string, AlertCondition> = new Map();
  private conditionsBySymbol: Map<string, Set<string>> = new Map(); // symbol -> condition IDs
  private history: AlertHistory = {
    triggers: [],
    triggeredConditions: new Set(),
  };
  private lastValues: Map<string, Map<string, number>> = new Map(); // symbol -> indicator -> value
  private indicatorHistory: Map<string, Map<string, number[]>> = new Map(); // symbol -> indicator -> values

  constructor() {
    super();
  }

  /**
   * アラート条件を作成
   */
  createCondition(
    name: string,
    symbol: string,
    type: AlertType,
    operator: AlertCondition['operator'],
    value: number | [number, number],
    options: Partial<Omit<AlertCondition, 'id' | 'name' | 'symbol' | 'type' | 'operator' | 'value' | 'createdAt' | 'triggerCount'>> = {}
  ): AlertCondition {
    const condition: AlertCondition = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      symbol,
      type,
      operator,
      value,
      parameters: options.parameters || {},
      timeframe: options.timeframe || '1d',
      enabled: options.enabled !== false,
      createdAt: Date.now(),
      triggerCount: 0,
      cooldown: options.cooldown || 300000, // 5 minutes default
      notificationChannels: options.notificationChannels || ['ui'],
    };

    this.conditions.set(condition.id, condition);
    
    // Update symbol index
    if (!this.conditionsBySymbol.has(symbol)) {
      this.conditionsBySymbol.set(symbol, new Set());
    }
    this.conditionsBySymbol.get(symbol)!.add(condition.id);
    
    this.emit('condition_created', condition);

    return condition;
  }

  /**
   * テンプレートからアラート条件を作成
   */
  createFromTemplate(
    template: AlertTemplate,
    symbol: string,
    customValue?: number | [number, number],
    options: Partial<Omit<AlertCondition, 'id' | 'name' | 'symbol' | 'type' | 'operator' | 'value' | 'createdAt' | 'triggerCount'>> = {}
  ): AlertCondition {
    return this.createCondition(
      template.name,
      symbol,
      template.type,
      template.defaultOperator,
      customValue ?? template.defaultValue,
      {
        parameters: template.defaultParameters,
        ...options,
      }
    );
  }

  /**
   * アラート条件を削除
   */
  deleteCondition(conditionId: string): boolean {
    const condition = this.conditions.get(conditionId);
    const deleted = this.conditions.delete(conditionId);
    if (deleted) {
      this.history.triggeredConditions.delete(conditionId);
      
      // Remove from symbol index
      if (condition) {
        const symbolConditions = this.conditionsBySymbol.get(condition.symbol);
        if (symbolConditions) {
          symbolConditions.delete(conditionId);
          if (symbolConditions.size === 0) {
            this.conditionsBySymbol.delete(condition.symbol);
          }
        }
      }
      
      this.emit('condition_deleted', conditionId);
    }
    return deleted;
  }

  /**
   * アラート条件を更新
   */
  updateCondition(conditionId: string, updates: Partial<AlertCondition>): AlertCondition | null {
    const condition = this.conditions.get(conditionId);
    if (!condition) return null;

    const updated = { ...condition, ...updates };
    this.conditions.set(conditionId, updated);
    
    // Update symbol index if symbol changed
    if (updates.symbol && updates.symbol !== condition.symbol) {
      // Remove from old symbol
      const oldSymbolConditions = this.conditionsBySymbol.get(condition.symbol);
      if (oldSymbolConditions) {
        oldSymbolConditions.delete(conditionId);
        if (oldSymbolConditions.size === 0) {
          this.conditionsBySymbol.delete(condition.symbol);
        }
      }
      
      // Add to new symbol
      if (!this.conditionsBySymbol.has(updates.symbol)) {
        this.conditionsBySymbol.set(updates.symbol, new Set());
      }
      this.conditionsBySymbol.get(updates.symbol)!.add(conditionId);
    }
    
    this.emit('condition_updated', updated);

    return updated;
  }

  /**
   * アラート条件を有効/無効化
   */
  toggleCondition(conditionId: string): boolean {
    const condition = this.conditions.get(conditionId);
    if (!condition) return false;

    condition.enabled = !condition.enabled;
    this.emit('condition_toggled', condition);
    return condition.enabled;
  }

  /**
   * マーケットデータを処理してアラートをチェック
   */
  processMarketData(data: MarketData): AlertTrigger[] {
    const triggered: AlertTrigger[] = [];

    // Update indicator history
    if (!this.indicatorHistory.has(data.symbol)) {
      this.indicatorHistory.set(data.symbol, new Map());
    }

    if (data.indicators) {
      data.indicators.forEach((value, indicator) => {
        const history = this.indicatorHistory.get(data.symbol)!;
        if (!history.has(indicator)) {
          history.set(indicator, []);
        }
        const values = history.get(indicator)!;
        values.push(value);
        if (values.length > BUFFER_LIMITS.VALUE_HISTORY) values.shift();
      });
    }

    // Use symbol index to check only relevant conditions
    const conditionIds = this.conditionsBySymbol.get(data.symbol);
    if (conditionIds) {
      for (const conditionId of conditionIds) {
        const condition = this.conditions.get(conditionId);
        if (!condition || !condition.enabled) continue;

        const trigger = this.checkCondition(condition, data);
        if (trigger) {
          triggered.push(trigger);
          this.history.triggers.push(trigger);
          condition.triggerCount++;
          condition.triggeredAt = Date.now();

          this.emit('alert_triggered', trigger);

          // Send notifications
          this.sendNotifications(condition, trigger);
        }
      }
    }

    // Update last values
    if (!this.lastValues.has(data.symbol)) {
      this.lastValues.set(data.symbol, new Map());
    }
    if (data.indicators) {
      data.indicators.forEach((value, indicator) => {
        this.lastValues.get(data.symbol)!.set(indicator, value);
      });
    }
    this.lastValues.get(data.symbol)!.set('price', data.price);
    this.lastValues.get(data.symbol)!.set('volume', data.volume);

    return triggered;
  }

  /**
   * 条件をチェック
   */
  private checkCondition(condition: AlertCondition, data: MarketData): AlertTrigger | null {
    // Check cooldown
    if (condition.triggeredAt && Date.now() - condition.triggeredAt < condition.cooldown) {
      return null;
    }

    let currentValue: number | undefined;
    let previousValue: number | undefined;

    // Get current value based on type
    switch (condition.type) {
      case 'price':
        currentValue = data.price;
        previousValue = this.lastValues.get(data.symbol)?.get('price');
        break;
      case 'volume':
        currentValue = data.volume;
        previousValue = this.lastValues.get(data.symbol)?.get('volume');
        break;
      case 'rsi':
      case 'macd':
      case 'sma':
      case 'ema':
      case 'bollinger':
      case 'atr':
        currentValue = data.indicators?.get(condition.type);
        previousValue = this.lastValues.get(data.symbol)?.get(condition.type);
        break;
      case 'price_change':
        const period = condition.parameters?.period || 1;
        const prices = this.indicatorHistory.get(data.symbol)?.get('price') || [];
        if (prices.length >= period) {
          const oldPrice = prices[prices.length - period - 1] || prices[0];
          currentValue = ((data.price - oldPrice) / oldPrice) * 100;
        }
        break;
      case 'volume_spike':
        const volumeHistory = this.indicatorHistory.get(data.symbol)?.get('volume') || [];
        const avgVolume = volumeHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
        currentValue = avgVolume > 0 ? (data.volume / avgVolume) * 100 : 100;
        break;
      default:
        currentValue = data.indicators?.get(condition.type);
    }

    if (currentValue === undefined) return null;

    // Evaluate condition
    let triggered = false;
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'above':
        triggered = currentValue > (targetValue as number);
        break;
      case 'below':
        triggered = currentValue < (targetValue as number);
        break;
      case 'crosses_above':
        triggered = currentValue > (targetValue as number) && 
                    previousValue !== undefined && 
                    previousValue <= (targetValue as number);
        break;
      case 'crosses_below':
        triggered = currentValue < (targetValue as number) && 
                    previousValue !== undefined && 
                    previousValue >= (targetValue as number);
        break;
      case 'equals':
        triggered = Math.abs(currentValue - (targetValue as number)) < 0.0001;
        break;
      case 'between':
        const [min, max] = targetValue as [number, number];
        triggered = currentValue >= min && currentValue <= max;
        break;
    }

    if (!triggered) return null;

    // Determine severity
    let severity: AlertTrigger['severity'] = 'info';
    if (condition.type === 'price' || condition.type === 'breakout') {
      severity = 'critical';
    } else if (condition.type === 'rsi' || condition.type === 'macd') {
      severity = 'warning';
    }

    return {
      conditionId: condition.id,
      symbol: condition.symbol,
      type: condition.type,
      message: this.generateAlertMessage(condition, currentValue),
      severity,
      timestamp: Date.now(),
      value: currentValue,
      metadata: {
        condition: condition.name,
        operator: condition.operator,
        targetValue,
        parameters: condition.parameters,
      },
    };
  }

  /**
   * アラートメッセージを生成
   */
  private generateAlertMessage(condition: AlertCondition, currentValue: number): string {
    const valueStr = typeof condition.value === 'number' 
      ? condition.value.toFixed(2) 
      : `${condition.value[0].toFixed(2)} - ${condition.value[1].toFixed(2)}`;

    const messages: Record<AlertType, string> = {
      price: `${condition.symbol} price is ${condition.operator} ${valueStr} (current: ${currentValue.toFixed(2)})`,
      volume: `${condition.symbol} volume is ${condition.operator} ${valueStr} (current: ${currentValue.toFixed(0)})`,
      rsi: `${condition.symbol} RSI(${condition.parameters?.period || 14}) is ${condition.operator} ${valueStr} (current: ${currentValue.toFixed(2)})`,
      macd: `${condition.symbol} MACD has ${condition.operator.replace('_', ' ')} ${valueStr}`,
      sma: `${condition.symbol} price ${condition.operator.replace('_', ' ')} SMA(${condition.parameters?.period || 20})`,
      ema: `${condition.symbol} price ${condition.operator.replace('_', ' ')} EMA(${condition.parameters?.period || 20})`,
      bollinger: `${condition.symbol} price ${condition.operator} Bollinger Band`,
      atr: `${condition.symbol} ATR is ${condition.operator} ${valueStr}`,
      price_change: `${condition.symbol} price changed ${currentValue.toFixed(2)}%`,
      volume_spike: `${condition.symbol} volume spike detected: ${currentValue.toFixed(0)}% of average`,
      breakout: `${condition.symbol} breakout detected!`,
      pattern: `${condition.symbol} pattern detected: ${condition.name}`,
      custom: `${condition.symbol}: ${condition.name} triggered`,
    };

    return messages[condition.type] || `${condition.name} triggered for ${condition.symbol}`;
  }

  /**
   * 通知を送信
   */
  private sendNotifications(condition: AlertCondition, trigger: AlertTrigger): void {
    for (const channel of condition.notificationChannels) {
      switch (channel) {
        case 'ui':
          this.emit('ui_notification', trigger);
          break;
        case 'email':
          this.emit('email_notification', condition, trigger);
          break;
        case 'sms':
          this.emit('sms_notification', condition, trigger);
          break;
        case 'webhook':
          this.emit('webhook_notification', condition, trigger);
          break;
        case 'push':
          this.emit('push_notification', trigger);
          break;
        case 'sound':
          this.emit('sound_notification', trigger);
          break;
      }
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * 全アラート条件を取得
   */
  getAllConditions(): AlertCondition[] {
    return Array.from(this.conditions.values());
  }

  /**
   * シンボル別アラート条件を取得
   */
  getConditionsBySymbol(symbol: string): AlertCondition[] {
    return this.getAllConditions().filter((c) => c.symbol === symbol);
  }

  /**
   * タイプ別アラート条件を取得
   */
  getConditionsByType(type: AlertType): AlertCondition[] {
    return this.getAllConditions().filter((c) => c.type === type);
  }

  /**
   * アラート履歴を取得
   */
  getAlertHistory(limit: number = 100): AlertTrigger[] {
    return this.history.triggers.slice(-limit);
  }

  /**
   * シンボル別アラート履歴を取得
   */
  getAlertHistoryBySymbol(symbol: string, limit: number = 100): AlertTrigger[] {
    return this.history.triggers
      .filter((t) => t.symbol === symbol)
      .slice(-limit);
  }

  /**
   * アラート統計を取得
   */
  getStatistics(): {
    totalConditions: number;
    activeConditions: number;
    totalTriggers: number;
    triggersByType: Map<AlertType, number>;
    triggersBySymbol: Map<string, number>;
  } {
    const conditions = this.getAllConditions();
    const triggersByType = new Map<AlertType, number>();
    const triggersBySymbol = new Map<string, number>();

    this.history.triggers.forEach((t) => {
      triggersByType.set(t.type, (triggersByType.get(t.type) || 0) + 1);
      triggersBySymbol.set(t.symbol, (triggersBySymbol.get(t.symbol) || 0) + 1);
    });

    return {
      totalConditions: conditions.length,
      activeConditions: conditions.filter((c) => c.enabled).length,
      totalTriggers: this.history.triggers.length,
      triggersByType,
      triggersBySymbol,
    };
  }

  /**
   * テンプレートを取得
   */
  getTemplates(): AlertTemplate[] {
    return ALERT_TEMPLATES;
  }

  /**
   * カテゴリ別テンプレートを取得
   */
  getTemplatesByCategory(category: AlertTemplate['category']): AlertTemplate[] {
    return ALERT_TEMPLATES.filter((t) => t.category === category);
  }

  /**
   * 全データをクリア
   */
  clear(): void {
    this.conditions.clear();
    this.history.triggers = [];
    this.history.triggeredConditions.clear();
    this.lastValues.clear();
    this.indicatorHistory.clear();
    this.emit('cleared');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalAlertSystem: AlertSystem | null = null;

export function getGlobalAlertSystem(): AlertSystem {
  if (!globalAlertSystem) {
    globalAlertSystem = new AlertSystem();
  }
  return globalAlertSystem;
}

export function resetGlobalAlertSystem(): void {
  globalAlertSystem = null;
}

export default AlertSystem;
