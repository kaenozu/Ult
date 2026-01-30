/**
 * Enhanced Smart Alert Service
 * 
 * このモジュールは、高度なスマートアラート機能を提供します。
 * 技術指標のクロス、価格レベルの到達、出来高異常、市場マイクロストラクチャーの変化などを検知します。
 */

import { OHLCV, Stock, Signal } from '../types';
import { ProcessedData } from './high-frequency-data-processing-service';

export interface AlertCondition {
  type: 'price' | 'indicator' | 'volume' | 'pattern' | 'volatility' | 'correlation' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'cross_above' | 'cross_below';
  threshold: number | string;
  source: 'current' | 'historical' | 'calculated';
  lookbackPeriod?: number; // 観測期間
  symbol?: string; // 対象銘柄
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod: number; // 再通知までの猶予期間（分）
  enabled: boolean;
  actions: ('notify' | 'email' | 'sms' | 'execute_order' | 'log')[];
  createdAt: Date;
}

export interface AlertTrigger {
  ruleId: string;
  symbol: string;
  timestamp: Date;
  currentValue: number;
  threshold: number;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notified: boolean;
}

export interface AlertNotification {
  id: string;
  trigger: AlertTrigger;
  method: 'popup' | 'email' | 'sms' | 'push';
  sentAt: Date;
  delivered: boolean;
  content: string;
}

class EnhancedSmartAlertService {
  private rules: Map<string, AlertRule> = new Map();
  private triggers: AlertTrigger[] = [];
  private notifications: AlertNotification[] = [];
  private lastTriggerTimes: Map<string, Date> = new Map(); // ルールIDごとの最終トリガー時間

  /**
   * アラートルールを追加
   */
  addAlertRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * アラートルールを削除
   */
  removeAlertRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * アラートルールを更新
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const existingRule = this.rules.get(ruleId);
    if (existingRule) {
      this.rules.set(ruleId, { ...existingRule, ...updates });
    }
  }

  /**
   * アラートルールを有効化/無効化
   */
  setAlertRuleStatus(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * アラートを評価
   */
  evaluateAlerts(symbol: string, data: OHLCV | ProcessedData, indicators?: any): AlertTrigger[] {
    const triggeredAlerts: AlertTrigger[] = [];
    const currentTime = new Date();

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      // クールダウン期間を確認
      const lastTriggerTime = this.lastTriggerTimes.get(ruleId);
      if (lastTriggerTime) {
        const timeSinceLastTrigger = (currentTime.getTime() - lastTriggerTime.getTime()) / (1000 * 60); // 分
        if (timeSinceLastTrigger < rule.cooldownPeriod) {
          continue; // クールダウン中
        }
      }

      // ルールの条件を評価
      if (this.evaluateRuleConditions(rule, symbol, data, indicators)) {
        // トリガーを作成
        const trigger: AlertTrigger = {
          ruleId,
          symbol,
          timestamp: currentTime,
          currentValue: this.getCurrentValueFromData(data, rule.conditions[0]), // 最初の条件の値を使用
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

  /**
   * ルールの条件を評価
   */
  private evaluateRuleConditions(rule: AlertRule, symbol: string, data: OHLCV | ProcessedData, indicators?: any): boolean {
    for (const condition of rule.conditions) {
      let currentValue: number;

      // 現在値を取得
      if (condition.source === 'current') {
        currentValue = this.getCurrentValueFromData(data, condition);
      } else if (condition.source === 'calculated' && indicators) {
        // 計算された指標から値を取得
        currentValue = this.getValueFromIndicators(indicators, condition);
      } else {
        // 履歴データが必要な場合は別途処理
        continue;
      }

      // 条算子に基づいて条件を評価
      switch (condition.operator) {
        case 'gt':
          if (!(currentValue > condition.threshold as number)) return false;
          break;
        case 'lt':
          if (!(currentValue < condition.threshold as number)) return false;
          break;
        case 'eq':
          if (!(currentValue === condition.threshold as number)) return false;
          break;
        case 'gte':
          if (!(currentValue >= condition.threshold as number)) return false;
          break;
        case 'lte':
          if (!(currentValue <= condition.threshold as number)) return false;
          break;
        case 'cross_above':
          // クロス条件は履歴データが必要
          if (!this.checkCrossAbove(data, condition, symbol)) return false;
          break;
        case 'cross_below':
          // クロス条件は履歴データが必要
          if (!this.checkCrossBelow(data, condition, symbol)) return false;
          break;
      }
    }

    return true; // すべての条件を満たした
  }

  /**
   * データから現在値を取得
   */
  private getCurrentValueFromData(data: OHLCV | ProcessedData, condition: AlertCondition): number {
    if ('bar' in data) {
      // ProcessedDataの場合
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
      // OHLCVの場合
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

  /**
   * 指標から値を取得
   */
  private getValueFromIndicators(indicators: any, condition: AlertCondition): number {
    switch (condition.type) {
      case 'indicator':
        if (condition.threshold === 'rsi') {
          return indicators.rsi || 0;
        } else if (condition.threshold === 'macd') {
          return indicators.macd?.macd || 0;
        } else if (condition.threshold === 'bb_upper') {
          return indicators.bb?.upper || 0;
        } else if (condition.threshold === 'bb_lower') {
          return indicators.bb?.lower || 0;
        }
        break;
      default:
        return 0;
    }
    return 0;
  }

  /**
   * クロスアップをチェック
   */
  private checkCrossAbove(data: OHLCV | ProcessedData, condition: AlertCondition, symbol: string): boolean {
    // 実際には履歴データが必要だが、ここでは簡略化
    // 通常は過去のデータを保持して比較する
    return false;
  }

  /**
   * クロスダウンをチェック
   */
  private checkCrossBelow(data: OHLCV | ProcessedData, condition: AlertCondition, symbol: string): boolean {
    // 実際には履歴データが必要だが、ここでは簡略化
    return false;
  }

  /**
   * アラートメッセージを生成
   */
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

  /**
   * トリガーされたアラートを処理
   */
  processTriggeredAlerts(triggers: AlertTrigger[]): AlertNotification[] {
    const notifications: AlertNotification[] = [];

    for (const trigger of triggers) {
      const rule = this.rules.get(trigger.ruleId);
      if (!rule) continue;

      // アクションを実行
      for (const action of rule.actions) {
        switch (action) {
          case 'notify':
            const notification = this.createNotification(trigger, 'popup');
            notifications.push(notification);
            break;
          case 'email':
            // メール送信処理（実装が必要）
            break;
          case 'sms':
            // SMS送信処理（実装が必要）
            break;
          case 'execute_order':
            // 注文実行処理（実装が必要）
            break;
          case 'log':
            console.log(`Alert triggered: ${trigger.message}`);
            break;
        }
      }
    }

    // 通知を保存
    this.notifications.push(...notifications);

    return notifications;
  }

  /**
   * 通知を作成
   */
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

  /**
   * アラート履歴を取得
   */
  getAlertHistory(symbol?: string, daysBack: number = 7): AlertTrigger[] {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysBack);

    return this.triggers.filter(trigger => {
      const matchesSymbol = !symbol || trigger.symbol === symbol;
      const isAfterCutoff = trigger.timestamp >= cutoffTime;
      return matchesSymbol && isAfterCutoff;
    });
  }

  /**
   * 通知履歴を取得
   */
  getNotificationHistory(symbol?: string, daysBack: number = 7): AlertNotification[] {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysBack);

    return this.notifications.filter(notification => {
      const matchesSymbol = !symbol || notification.trigger.symbol === symbol;
      const isAfterCutoff = notification.sentAt >= cutoffTime;
      return matchesSymbol && isAfterCutoff;
    });
  }

  /**
   * 価格レベルアラートを追加
   */
  addPriceLevelAlert(symbol: string, price: number, operator: 'gt' | 'lt', priority: 'low' | 'medium' | 'high' = 'medium'): string {
    const ruleId = `price_alert_${symbol}_${price}_${operator}`;
    const rule: AlertRule = {
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
      cooldownPeriod: 5, // 5分のクールダウン
      enabled: true,
      actions: ['notify', 'log'],
      createdAt: new Date()
    };

    this.addAlertRule(rule);
    return ruleId;
  }

  /**
   * 技術指標アラートを追加
   */
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
      conditions: [{
        type: 'indicator',
        operator,
        threshold: indicator,
        source: 'calculated'
      }],
      priority,
      cooldownPeriod: 10, // 10分のクールダウン
      enabled: true,
      actions: ['notify', 'log'],
      createdAt: new Date()
    };

    this.addAlertRule(rule);
    return ruleId;
  }

  /**
   * 出来高異常アラートを追加
   */
  addVolumeAnomalyAlert(symbol: string, multiplier: number, priority: 'low' | 'medium' | 'high' = 'medium'): string {
    const ruleId = `volume_alert_${symbol}_${multiplier}`;
    const rule: AlertRule = {
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
      cooldownPeriod: 15, // 15分のクールダウン
      enabled: true,
      actions: ['notify', 'log'],
      createdAt: new Date()
    };

    this.addAlertRule(rule);
    return ruleId;
  }

  /**
   * すべてのアラートルールを取得
   */
  getAllAlertRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 銭のアラートルールを取得
   */
  getAlertRuleById(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * シンボルに関連するアラートルールを取得
   */
  getAlertRulesBySymbol(symbol: string): AlertRule[] {
    return Array.from(this.rules.values()).filter(rule => 
      rule.conditions.some(condition => condition.symbol === symbol)
    );
  }

  /**
   * アラートエンジンをリセット
   */
  resetAlertEngine(): void {
    this.rules.clear();
    this.triggers = [];
    this.notifications = [];
    this.lastTriggerTimes.clear();
  }
}

export const enhancedSmartAlertService = new EnhancedSmartAlertService();