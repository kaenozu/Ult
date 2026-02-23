import { AlertSystem, AlertTrigger, AlertType } from '../AlertSystem';
import type { AlertCondition } from '../AlertSystem';
import {
  CompositeAlertCondition,
  SmartAlert,
  AlertAction,
  DetectedPattern,
  EnhancedMarketData,
  AlertLearningData,
  EnhancedAlertConfig,
  DEFAULT_CONFIG,
} from './types';
import { executeActions } from './notifications';
import { detectAllPatterns } from './rules';
import { evaluateCompositeCondition } from './conditions';
import { detectAnomaly } from './anomaly';

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

  private getLastValue = (symbol: string, indicator: string): number | undefined => {
    const history = this.enhancedIndicatorHistory.get(symbol)?.get(indicator);
    return history && history.length > 0 ? history[history.length - 1] : undefined;
  };

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

  createNestedCompositeAlert(
    name: string,
    symbol: string,
    conditionTree: CompositeAlertCondition,
    options: Partial<{ priority: SmartAlert['priority']; cooldownMinutes: number; actions: AlertAction[] }> = {}
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

  evaluateCompositeCondition(condition: CompositeAlertCondition, data: EnhancedMarketData): boolean {
    return evaluateCompositeCondition(condition, data, this.getLastValue);
  }

  processSmartAlert(data: EnhancedMarketData): AlertTrigger[] {
    const triggered: AlertTrigger[] = [];
    this.updateEnhancedIndicatorHistory(data);

    for (const [, smartAlert] of this.smartAlerts) {
      if (!smartAlert.enabled || smartAlert.symbol !== data.symbol) continue;
      if (smartAlert.lastTriggered) {
        const cooldownMs = smartAlert.condition.cooldownMinutes * 60 * 1000;
        if (Date.now() - smartAlert.lastTriggered.getTime() < cooldownMs) continue;
      }

      if (this.evaluateCompositeCondition(smartAlert.condition, data)) {
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
          metadata: { alertId: smartAlert.id, alertName: smartAlert.name, priority: smartAlert.condition.priority },
        };

        triggered.push(trigger);
        executeActions(this, smartAlert.actions, trigger);
        this.recordLearningData(smartAlert, data);
        this.emit('smart_alert_triggered', { alert: smartAlert, trigger });
      }
    }
    return triggered;
  }

  private updateEnhancedIndicatorHistory(data: EnhancedMarketData): void {
    if (!this.enhancedIndicatorHistory.has(data.symbol)) {
      this.enhancedIndicatorHistory.set(data.symbol, new Map());
    }
    const history = this.enhancedIndicatorHistory.get(data.symbol)!;

    if (data.indicators) {
      data.indicators.forEach((value, indicator) => {
        if (!history.has(indicator)) history.set(indicator, []);
        const values = history.get(indicator)!;
        values.push(value);
        if (values.length > 100) values.shift();
      });
    }

    if (!history.has('price')) history.set('price', []);
    history.get('price')!.push(data.price);
    if (history.get('price')!.length > 100) history.get('price')!.shift();

    if (!history.has('volume')) history.set('volume', []);
    history.get('volume')!.push(data.volume);
    if (history.get('volume')!.length > 100) history.get('volume')!.shift();
  }

  detectPatterns(data: any[]): DetectedPattern[] {
    const patterns = detectAllPatterns(data);
    const symbol = data[0]?.symbol || 'unknown';
    this.detectedPatterns.set(symbol, patterns);
    return patterns;
  }

  detectAnomaly(symbol: string, data: EnhancedMarketData) {
    return detectAnomaly(symbol, data, this.enhancedIndicatorHistory, this.config.anomalyThreshold);
  }

  updateAdaptiveThreshold(alertType: AlertType, triggerRate: number): void {
    const currentThreshold = this.adaptiveThresholds.get(alertType) || 0.5;
    if (triggerRate < 0.01) this.adaptiveThresholds.set(alertType, currentThreshold * 0.95);
    else if (triggerRate > 0.1) this.adaptiveThresholds.set(alertType, currentThreshold * 1.05);
  }

  toggleSmartAlert(alertId: string): boolean {
    const alert = this.smartAlerts.get(alertId);
    if (!alert) return false;
    alert.enabled = !alert.enabled;
    this.emit('smart_alert_toggled', alert);
    return alert.enabled;
  }

  deleteSmartAlert(alertId: string): boolean {
    const deleted = this.smartAlerts.delete(alertId);
    if (deleted) this.emit('smart_alert_deleted', alertId);
    return deleted;
  }

  private recordLearningData(alert: SmartAlert, data: EnhancedMarketData): void {
    const entry: AlertLearningData = {
      symbol: alert.symbol,
      alertType: alert.condition.conditions[0]?.type || 'unknown',
      triggerPrice: data.price,
      subsequentPrice: 0,
      timeToResolution: 0,
      wasProfitable: false,
      marketCondition: 'RANGING',
    };
    this.learningData.push(entry);
    const retentionMs = this.config.learningDataRetentionDays * 24 * 60 * 60 * 1000;
    this.learningData = this.learningData.filter(e => Date.now() - e.timeToResolution < retentionMs);
  }

  private generateCompositeMessage(condition: CompositeAlertCondition): string {
    return condition.conditions.map(c => c.name).join(` ${condition.logic} `);
  }

  private mapPriorityToSeverity(priority: CompositeAlertCondition['priority']): AlertTrigger['severity'] {
    const map: Record<string, AlertTrigger['severity']> = { CRITICAL: 'critical', HIGH: 'warning', MEDIUM: 'warning', LOW: 'info' };
    return map[priority] || 'info';
  }

  updateConfig(updates: Partial<EnhancedAlertConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getAllSmartAlerts(): SmartAlert[] {
    return Array.from(this.smartAlerts.values());
  }

  getSmartAlertsBySymbol(symbol: string): SmartAlert[] {
    return Array.from(this.smartAlerts.values()).filter(a => a.symbol === symbol);
  }

  getIndicatorHistory(symbol: string): Map<string, number[]> | undefined {
    return this.enhancedIndicatorHistory.get(symbol);
  }
}
