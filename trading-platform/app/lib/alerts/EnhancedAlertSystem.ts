/**
 * EnhancedAlertSystem.ts
 * 
 * 拡張アラートシステム。
 * 複合条件アラート、スマートパターン検出、学習機能を提供します。
 */

import { EventEmitter } from 'events';
import { AlertSystem, AlertCondition, AlertTrigger, AlertType, MarketData, ALERT_TEMPLATES } from './AlertSystem';
import { BUFFER_LIMITS } from '../constants';

// ============================================================================
// Enhanced Types
// ============================================================================

/**
 * 複合アラート条件
 */
export interface CompositeAlertCondition {
  id: string;
  name: string;
  /** 複合ロジック（AND/OR） */
  logic: 'AND' | 'OR';
  /** 子条件の配列 */
  conditions: AlertCondition[];
  /** ネストされた複合条件 */
  nestedConditions?: CompositeAlertCondition[];
  /** 有効/無効 */
  enabled: boolean;
  /** 優先度 */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** クールダウン（分） */
  cooldownMinutes: number;
}

/**
 * スマートアラート
 */
export interface SmartAlert {
  id: string;
  name: string;
  symbol: string;
  condition: CompositeAlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  priority: CompositeAlertCondition['priority'];
  metadata?: Record<string, unknown>;
}

/**
 * アラートアクション
 */
export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'sms' | 'auto_trade' | 'custom';
  config: Record<string, unknown>;
}

/**
 * 検出されたパターン
 */
export interface DetectedPattern {
  type: PatternType;
  confidence: number;
  startIndex: number;
  endIndex: number;
  direction?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  metadata?: Record<string, unknown>;
}

/**
 * パターンタイプ
 */
export type PatternType =
  | 'DOJI'
  | 'HAMMER'
  | 'INVERTED_HAMMER'
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'MORNING_STAR'
  | 'EVENING_STAR'
  | 'THREE_WHITE_SOLDIERS'
  | 'THREE_BLACK_CROWS'
  | 'HEAD_AND_SHOULDERS'
  | 'INVERSE_HEAD_AND_SHOULDERS'
  | 'DOUBLE_TOP'
  | 'DOUBLE_BOTTOM'
  | 'TRIANGLE_ASCENDING'
  | 'TRIANGLE_DESCENDING'
  | 'FLAG_BULLISH'
  | 'FLAG_BEARISH';

/**
 * 拡張市場データ
 */
export interface EnhancedMarketData extends MarketData {
  ohlcv: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  indicators?: Map<string, number>;
  patternData?: OHLCV[];
}

/**
 * OHLCV 再定義（エクスポート用）
 */
export interface OHLCV {
  symbol?: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * アラート学習データ
 */
export interface AlertLearningData {
  symbol: string;
  alertType: string;
  triggerPrice: number;
  subsequentPrice: number;
  timeToResolution: number; // 分
  wasProfitable: boolean;
  marketCondition: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'CRISIS';
}

/**
 * 增强されたアラート設定
 */
export interface EnhancedAlertConfig {
  /** 複合アラートの最大ネストレベル */
  maxNestingLevel: number;
  /** パターンの最小信頼度 */
  minPatternConfidence: number;
  /** 学習データの保持期間（日） */
  learningDataRetentionDays: number;
  /** 自動適応を有効にするか */
  adaptiveThresholdsEnabled: boolean;
  /** 異常検出の閾値 */
  anomalyThreshold: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: EnhancedAlertConfig = {
  maxNestingLevel: 3,
  minPatternConfidence: 0.6,
  learningDataRetentionDays: 30,
  adaptiveThresholdsEnabled: true,
  anomalyThreshold: 2.5,
};

// ============================================================================
// EnhancedAlertSystem Class
// ============================================================================

export class EnhancedAlertSystem extends AlertSystem {
  private config: EnhancedAlertConfig;
  private smartAlerts: Map<string, SmartAlert> = new Map();
  private learningData: AlertLearningData[] = [];
  private adaptiveThresholds: Map<string, number> = new Map();
  private detectedPatterns: Map<string, DetectedPattern[]> = new Map();
  private enhancedIndicatorHistory: Map<string, Map<string, number[]>> = new Map();

  constructor(config: Partial<EnhancedAlertConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 複合条件アラートを作成
   */
  createCompositeAlert(
    name: string,
    symbol: string,
    conditions: AlertCondition[],
    logic: 'AND' | 'OR' = 'AND',
    options: Partial<{
      priority: SmartAlert['priority'];
      cooldownMinutes: number;
      actions: AlertAction[];
    }> = {}
  ): SmartAlert {
    const compositeCondition: CompositeAlertCondition = {
      id: `composite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${name} (Composite)`,
      logic,
      conditions,
      enabled: true,
      priority: options.priority || 'MEDIUM',
      cooldownMinutes: options.cooldownMinutes || 5,
    };

    const smartAlert: SmartAlert = {
      id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      symbol,
      condition: compositeCondition,
      actions: options.actions || [],
      enabled: true,
      createdAt: new Date(),
      triggerCount: 0,
      priority: options.priority || 'MEDIUM',
    };

    this.smartAlerts.set(smartAlert.id, smartAlert);
    this.emit('smart_alert_created', smartAlert);

    return smartAlert;
  }

  /**
   * ネストされた複合条件アラートを作成
   */
  createNestedCompositeAlert(
    name: string,
    symbol: string,
    conditionTree: CompositeAlertCondition,
    options: Partial<{
      priority: SmartAlert['priority'];
      cooldownMinutes: number;
      actions: AlertAction[];
    }> = {}
  ): SmartAlert {
    const smartAlert: SmartAlert = {
      id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      symbol,
      condition: conditionTree,
      actions: options.actions || [],
      enabled: true,
      createdAt: new Date(),
      triggerCount: 0,
      priority: options.priority || 'MEDIUM',
    };

    this.smartAlerts.set(smartAlert.id, smartAlert);
    this.emit('smart_alert_created', smartAlert);

    return smartAlert;
  }

  /**
   * 複合条件を評価（単一条件）
   */
  private evaluateSingleCondition(
    condition: AlertCondition,
    data: EnhancedMarketData
  ): boolean {
    let currentValue: number | undefined;
    let previousValue: number | undefined;

    switch (condition.type) {
      case 'price':
        currentValue = data.price;
        previousValue = this.getLastValue(data.symbol, 'price');
        break;
      case 'volume':
        currentValue = data.volume;
        previousValue = this.getLastValue(data.symbol, 'volume');
        break;
      case 'rsi':
      case 'macd':
      case 'sma':
      case 'ema':
      case 'bollinger':
      case 'atr':
        currentValue = data.indicators?.get(condition.type);
        previousValue = this.getLastValue(data.symbol, condition.type);
        break;
      default:
        currentValue = data.indicators?.get(condition.type);
    }

    if (currentValue === undefined) return false;

    // 演算子を評価
    const targetValue = condition.value;
    switch (condition.operator) {
      case 'above':
        return currentValue > (targetValue as number);
      case 'below':
        return currentValue < (targetValue as number);
      case 'crosses_above':
        return currentValue > (targetValue as number) && 
               previousValue !== undefined && 
               previousValue <= (targetValue as number);
      case 'crosses_below':
        return currentValue < (targetValue as number) && 
               previousValue !== undefined && 
               previousValue >= (targetValue as number);
      case 'equals':
        return Math.abs(currentValue - (targetValue as number)) < 0.0001;
      case 'between':
        const [min, max] = targetValue as [number, number];
        return currentValue >= min && currentValue <= max;
      default:
        return false;
    }
  }

  /**
   * 複合条件を評価
   */
  evaluateCompositeCondition(
    condition: CompositeAlertCondition,
    data: EnhancedMarketData
  ): boolean {
    if (!condition.enabled) return false;

    // 子条件を評価
    const childResults = condition.conditions.map(c => 
      this.evaluateSingleCondition(c, data)
    );

    // ネストされた条件を評価
    let nestedResults: boolean[] = [];
    if (condition.nestedConditions) {
      nestedResults = condition.nestedConditions.map(nc => 
        this.evaluateCompositeCondition(nc, data)
      );
    }

    // すべての結果を結合
    const allResults = [...childResults, ...nestedResults];

    // ロジックを適用
    if (condition.logic === 'AND') {
      return allResults.every(r => r);
    } else {
      return allResults.some(r => r);
    }
  }

  /**
   * スマートアラートを処理
   */
  processSmartAlert(data: EnhancedMarketData): AlertTrigger[] {
    const triggered: AlertTrigger[] = [];

    // インジケーター履歴を更新
    this.updateEnhancedIndicatorHistory(data);

    for (const [id, smartAlert] of this.smartAlerts) {
      if (!smartAlert.enabled) continue;
      if (smartAlert.symbol !== data.symbol) continue;

      // クールダウンをチェック
      if (smartAlert.lastTriggered) {
        const cooldownMs = smartAlert.condition.cooldownMinutes * 60 * 1000;
        if (Date.now() - smartAlert.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      // 複合条件を評価
      const isTriggered = this.evaluateCompositeCondition(smartAlert.condition, data);

      if (isTriggered) {
        smartAlert.triggerCount++;
        smartAlert.lastTriggered = new Date();

        const trigger: AlertTrigger = {
          conditionId: smartAlert.id,
          symbol: smartAlert.symbol,
          type: 'custom',
          message: `Smart Alert [${smartAlert.name}]: ${this.generateCompositeMessage(smartAlert.condition)}`,
          severity: this.mapPriorityToSeverity(smartAlert.condition.priority),
          timestamp: Date.now(),
          value: data.price,
          metadata: {
            alertId: smartAlert.id,
            alertName: smartAlert.name,
            priority: smartAlert.condition.priority,
          },
        };

        triggered.push(trigger);

        // アクションを実行
        this.executeActions(smartAlert.actions, trigger);

        // 学習データを記録
        this.recordLearningData(smartAlert, data);

        this.emit('smart_alert_triggered', { alert: smartAlert, trigger });
      }
    }

    return triggered;
  }

  /**
   * インジケーター履歴を更新
   */
  private updateEnhancedIndicatorHistory(data: EnhancedMarketData): void {
    if (!this.enhancedIndicatorHistory.has(data.symbol)) {
      this.enhancedIndicatorHistory.set(data.symbol, new Map());
    }

    const history = this.enhancedIndicatorHistory.get(data.symbol)!;

    if (data.indicators) {
      data.indicators.forEach((value, indicator) => {
        if (!history.has(indicator)) {
          history.set(indicator, []);
        }
        const values = history.get(indicator)!;
        values.push(value);
        if (values.length > BUFFER_LIMITS.VALUE_HISTORY) values.shift();
      });
    }

    // price と volume も記録
    if (!history.has('price')) history.set('price', []);
    history.get('price')!.push(data.price);
    if (history.get('price')!.length > BUFFER_LIMITS.VALUE_HISTORY) history.get('price')!.shift();

    if (!history.has('volume')) history.set('volume', []);
    history.get('volume')!.push(data.volume);
    if (history.get('volume')!.length > BUFFER_LIMITS.VALUE_HISTORY) history.get('volume')!.shift();
  }

  /**
   * 最後の値を取得
   */
  private getLastValue(symbol: string, indicator: string): number | undefined {
    const history = this.enhancedIndicatorHistory.get(symbol)?.get(indicator);
    if (history && history.length > 0) {
      return history[history.length - 1];
    }
    return undefined;
  }

  /**
   * チャートパターンを検出
   */
  detectPatterns(data: OHLCV[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (data.length < 3) return patterns;

    // 	doji 检测
    const dojiPattern = this.detectDoji(data);
    if (dojiPattern) patterns.push(dojiPattern);

    // ハンマー検出
    const hammerPattern = this.detectHammer(data);
    if (hammerPattern) patterns.push(hammerPattern);

    //  engulfing 検出
    const engulfingPattern = this.detectEngulfing(data);
    if (engulfingPattern) patterns.push(engulfingPattern);

    // morning/evening star 検出
    const starPattern = this.detectStar(data);
    if (starPattern) patterns.push(starPattern);

    // three white soldiers/black crows 検出
    const threePattern = this.detectThreeWhiteSoldiers(data);
    if (threePattern) patterns.push(threePattern);

    //  detected patternsを保存
    const symbol = data[0]?.symbol || 'unknown';
    this.detectedPatterns.set(symbol, patterns);

    return patterns;
  }

  /**
   * 異常を検出
   */
  detectAnomaly(symbol: string, data: EnhancedMarketData): {
    isAnomaly: boolean;
    anomalyType?: string;
    confidence: number;
    description: string;
  } {
    // 基本的な異常検出ロジック
    const history = this.enhancedIndicatorHistory.get(symbol);
    
    if (!history || history.size === 0) {
      return { isAnomaly: false, confidence: 0, description: 'No historical data' };
    }

    // 価格急変の検出
    const priceHistory = history.get('price') || [];
    if (priceHistory.length >= 10) {
      const recentPrices = priceHistory.slice(-10);
      const mean = recentPrices.reduce((sum: number, p: number) => sum + p, 0) / recentPrices.length;
      const stdDev = Math.sqrt(
        recentPrices.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length
      );

      if (stdDev > 0) {
        const zScore = Math.abs((data.price - mean) / stdDev);
        
        if (zScore > this.config.anomalyThreshold) {
          return {
            isAnomaly: true,
            anomalyType: 'PRICE_SPIKE',
            confidence: Math.min(zScore / this.config.anomalyThreshold, 1),
            description: `Price deviation of ${zScore.toFixed(2)} standard deviations detected`,
          };
        }
      }
    }

    // 成交量異常の検出
    const volumeHistory = history.get('volume') || [];
    if (volumeHistory.length >= 10) {
      const avgVolume = volumeHistory.slice(-10).reduce((sum: number, v: number) => sum + v, 0) / 10;
      const volumeRatio = data.volume / avgVolume;

      if (volumeRatio > 5) {
        return {
          isAnomaly: true,
          anomalyType: 'VOLUME_SPIKE',
          confidence: Math.min(volumeRatio / 5, 1),
          description: `Unusual volume: ${volumeRatio.toFixed(1)}x average`,
        };
      }
    }

    return { isAnomaly: false, confidence: 0, description: 'No anomaly detected' };
  }

  /**
   * アダプティブ閾値を更新
   */
  updateAdaptiveThreshold(alertType: AlertType, triggerRate: number): void {
    // トリガー率に基づいて閾値を調整
    const currentThreshold = this.adaptiveThresholds.get(alertType) || 0.5;
    
    if (triggerRate < 0.01) {
      // トリガーが少なすぎる場合は閾値を下げる
      this.adaptiveThresholds.set(alertType, currentThreshold * 0.95);
    } else if (triggerRate > 0.1) {
      // トリガーが多すぎる場合は閾値を上げる
      this.adaptiveThresholds.set(alertType, currentThreshold * 1.05);
    }
  }

  /**
   * スマートアラートを有効/無効化
   */
  toggleSmartAlert(alertId: string): boolean {
    const alert = this.smartAlerts.get(alertId);
    if (!alert) return false;

    alert.enabled = !alert.enabled;
    this.emit('smart_alert_toggled', alert);
    return alert.enabled;
  }

  /**
   * スマートアラートを削除
   */
  deleteSmartAlert(alertId: string): boolean {
    const deleted = this.smartAlerts.delete(alertId);
    if (deleted) {
      this.emit('smart_alert_deleted', alertId);
    }
    return deleted;
  }

  /**
   * 学習データを記録
   */
  private recordLearningData(alert: SmartAlert, data: EnhancedMarketData): void {
    const learningEntry: AlertLearningData = {
      symbol: alert.symbol,
      alertType: alert.condition.conditions[0]?.type || 'unknown',
      triggerPrice: data.price,
      subsequentPrice: 0, //  future price
      timeToResolution: 0,
      wasProfitable: false,
      marketCondition: 'RANGING',
    };

    this.learningData.push(learningEntry);

    // 古すぎるデータを削除
    const retentionMs = this.config.learningDataRetentionDays * 24 * 60 * 60 * 1000;
    this.learningData = this.learningData.filter(
      entry => Date.now() - entry.timeToResolution < retentionMs
    );
  }

  /**
   * アクションを実行
   */
  private executeActions(actions: AlertAction[], trigger: AlertTrigger): void {
    for (const action of actions) {
      switch (action.type) {
        case 'notification':
          this.emit('ui_notification', trigger);
          break;
        case 'webhook':
          this.emit('webhook_notification', action.config, trigger);
          break;
        case 'email':
          this.emit('email_notification', action.config, trigger);
          break;
        case 'sms':
          this.emit('sms_notification', action.config, trigger);
          break;
        case 'auto_trade':
          this.emit('auto_trade_signal', action.config, trigger);
          break;
        default:
          this.emit('custom_action', action, trigger);
      }
    }
  }

  /**
   * 複合条件メッセージ生成
   */
  private generateCompositeMessage(condition: CompositeAlertCondition): string {
    const conditionNames = condition.conditions.map(c => c.name).join(` ${condition.logic} `);
    return conditionNames;
  }

  /**
   * 優先度を重要度に変換
   */
  private mapPriorityToSeverity(priority: CompositeAlertCondition['priority']): AlertTrigger['severity'] {
    switch (priority) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'info';
    }
  }

  // ============================================================================
  // Pattern Detection Methods
  // ============================================================================

  /**
   * 	doji を検出
   */
  private detectDoji(data: OHLCV[]): DetectedPattern | null {
    const last = data[data.length - 1];
    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;

    if (range === 0) return null;

    const bodyRatio = body / range;
    
    if (bodyRatio < 0.1) {
      return {
        type: 'DOJI',
        confidence: 1 - bodyRatio,
        startIndex: data.length - 1,
        endIndex: data.length - 1,
        direction: last.close > last.open ? 'BULLISH' : 'BEARISH',
      };
    }

    return null;
  }

  /**
   * ハンマーを検出
   */
  private detectHammer(data: OHLCV[]): DetectedPattern | null {
    if (data.length < 1) return null;

    const last = data[data.length - 1];
    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;
    const lowerShadow = Math.min(last.open, last.close) - last.low;
    const upperShadow = last.high - Math.max(last.open, last.close);

    if (range === 0) return null;

    // ハンマーの条件: 
    // - ボディが全体の10-30%
    // - 下髭がボディの2倍以上
    // - 上髭が小さい
    const bodyRatio = body / range;
    
    if (bodyRatio >= 0.1 && bodyRatio <= 0.3 && 
        lowerShadow >= body * 2 && 
        upperShadow <= body * 0.5) {
      return {
        type: 'HAMMER',
        confidence: 0.7,
        startIndex: data.length - 1,
        endIndex: data.length - 1,
        direction: 'BULLISH',
      };
    }

    // 逆ハンマー
    if (bodyRatio >= 0.1 && bodyRatio <= 0.3 && 
        upperShadow >= body * 2 && 
        lowerShadow <= body * 0.5) {
      return {
        type: 'INVERTED_HAMMER',
        confidence: 0.7,
        startIndex: data.length - 1,
        endIndex: data.length - 1,
        direction: 'BULLISH',
      };
    }

    return null;
  }

  /**
   * engulfing パターンを検出
   */
  private detectEngulfing(data: OHLCV[]): DetectedPattern | null {
    if (data.length < 2) return null;

    const prev = data[data.length - 2];
    const last = data[data.length - 1];

    const prevBody = Math.abs(prev.close - prev.open);
    const lastBody = Math.abs(last.close - last.open);
    const prevRange = prev.high - prev.low;
    const lastRange = last.high - last.low;

    if (prevRange === 0 || lastRange === 0) return null;

    // 強気の engulfing
    const isBullishEngulfing = 
      prev.close < prev.open && // 前日が下落
      last.close > last.open && // 当日が上昇
      last.open < prev.close && // 当日の始値が前日の安値より低い
      last.close > prev.high; // 当日の終値が前日の高値より高い

    if (isBullishEngulfing && lastBody > prevBody) {
      return {
        type: 'BULLISH_ENGULFING',
        confidence: 0.75,
        startIndex: data.length - 2,
        endIndex: data.length - 1,
        direction: 'BULLISH',
      };
    }

    // 弱気の engulfing
    const isBearishEngulfing = 
      prev.close > prev.open && // 前日上昇
      last.close < last.open && // 当日下落
      last.open > prev.high && // 当日の始値が前日高値より高い
      last.close < prev.low; // 当日の終値が前日安値より低い

    if (isBearishEngulfing && lastBody > prevBody) {
      return {
        type: 'BEARISH_ENGULFING',
        confidence: 0.75,
        startIndex: data.length - 2,
        endIndex: data.length - 1,
        direction: 'BEARISH',
      };
    }

    return null;
  }

  /**
   * 星（morning/evening star）パターンを検出
   */
  private detectStar(data: OHLCV[]): DetectedPattern | null {
    if (data.length < 3) return null;

    const first = data[data.length - 3];
    const middle = data[data.length - 2];
    const last = data[data.length - 1];

    const firstBody = Math.abs(first.close - first.open);
    const middleBody = Math.abs(middle.close - middle.open);
    const lastBody = Math.abs(last.close - last.open);

    const firstRange = first.high - first.low;
    const middleRange = middle.high - middle.low;
    const lastRange = last.high - last.low;

    if (firstRange === 0 || middleRange === 0 || lastRange === 0) return null;

    // morning star: 下落 -> 小ボディ -> 上昇
    const isMorningStar = 
      first.close < first.open && // 前日下落
      middleBody / middleRange < 0.3 && // 中日小ボディ
      last.close > last.open && // 当日上昇
      last.close > (first.open + first.close) / 2; // 当日終値が前日 body の中央より上

    if (isMorningStar) {
      return {
        type: 'MORNING_STAR',
        confidence: 0.85,
        startIndex: data.length - 3,
        endIndex: data.length - 1,
        direction: 'BULLISH',
      };
    }

    // evening star: 上昇 -> 小ボディ -> 下落
    const isEveningStar = 
      first.close > first.open && // 前日上昇
      middleBody / middleRange < 0.3 && // 中日小ボディ
      last.close < last.open && // 当日下落
      last.close < (first.open + first.close) / 2; // 当日終値が前日 body の中央より下

    if (isEveningStar) {
      return {
        type: 'EVENING_STAR',
        confidence: 0.85,
        startIndex: data.length - 3,
        endIndex: data.length - 1,
        direction: 'BEARISH',
      };
    }

    return null;
  }

  /**
   * 三白兵/三黒シルエットを検出
   */
  private detectThreeWhiteSoldiers(data: OHLCV[]): DetectedPattern | null {
    if (data.length < 3) return null;

    const candles = data.slice(-3);
    
    // 三白兵: 3日連続の上昇陽線
    const isThreeWhiteSoldiers = candles.every(c => 
      c.close > c.open &&
      c.close > c.open && // 陽線
      Math.abs(c.close - c.open) / (c.high - c.low + 0.001) > 0.5 && // ボディが50%以上
      c.close > c.open && //  каждом日で上昇
      c.low > candles[0].open // 3日目の安値が1日目の始値より高い
    );

    if (isThreeWhiteSoldiers) {
      return {
        type: 'THREE_WHITE_SOLDIERS',
        confidence: 0.8,
        startIndex: data.length - 3,
        endIndex: data.length - 1,
        direction: 'BULLISH',
      };
    }

    // 三黒シルエット: 3日連続の下落陰線
    const isThreeBlackCrows = candles.every(c => 
      c.close < c.open &&
      Math.abs(c.close - c.open) / (c.high - c.low + 0.001) > 0.5 &&
      c.high < candles[0].open
    );

    if (isThreeBlackCrows) {
      return {
        type: 'THREE_BLACK_CROWS',
        confidence: 0.8,
        startIndex: data.length - 3,
        endIndex: data.length - 1,
        direction: 'BEARISH',
      };
    }

    return null;
  }

  /**
   * 設定を更新
   */
  updateConfig(updates: Partial<EnhancedAlertConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * スマートアラートをすべて取得
   */
  getAllSmartAlerts(): SmartAlert[] {
    return Array.from(this.smartAlerts.values());
  }

  /**
   * シンボルごとのスマートアラートを取得
   */
  getSmartAlertsBySymbol(symbol: string): SmartAlert[] {
    return Array.from(this.smartAlerts.values()).filter(a => a.symbol === symbol);
  }

  /**
   * インジケーター履歴を取得（公開メソッド）
   */
  getIndicatorHistory(symbol: string): Map<string, number[]> | undefined {
    return this.enhancedIndicatorHistory.get(symbol);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const enhancedAlertSystem = new EnhancedAlertSystem();
