/**
 * Enhanced Alert Manager
 * Manages anomaly detection alerts with escalation and aggregation
 * TRADING-010: 異常検知と市場予測システムの実装
 */

import {
  Alert,
  AlertAnalysis,
  AlertManagerConfig,
  AlertType,
  AnomalySeverity,
  AggregatedAlert,
  CriticalAlert,
  EscalationRule,
  NotificationChannelConfig,
} from './types';

export class AlertManager {
  private alertHistory: Alert[] = [];
  private channels: NotificationChannelConfig[];
  private escalationRules: EscalationRule[];
  private config: AlertManagerConfig;

  constructor(config?: Partial<AlertManagerConfig>) {
    this.config = {
      channels: config?.channels ?? [],
      escalationRules: config?.escalationRules ?? [],
      duplicateWindow: config?.duplicateWindow ?? 300000, // 5 minutes
      maxHistorySize: config?.maxHistorySize ?? 1000,
    };

    this.channels = this.config.channels;
    this.escalationRules = this.config.escalationRules;
  }

  /**
   * Send an alert
   */
  async sendAlert(alert: Alert): Promise<void> {
    // Check for duplicates
    if (this.isDuplicate(alert)) {
      return;
    }

    // Add to history
    this.addToHistory(alert);

    // Select channels based on severity
    const selectedChannels = this.selectChannels(alert.severity);

    // Send to all selected channels
    await Promise.all(
      selectedChannels.map(channel => this.sendToChannel(channel, alert))
    );

    // Check escalation rules
    await this.checkEscalation(alert);
  }

  /**
   * Send a critical alert with immediate action
   */
  async sendCriticalAlert(alert: CriticalAlert): Promise<void> {
    // Immediate notification
    await this.sendImmediateNotification(alert);

    // Auto-execute recommended action if configured
    if (this.shouldAutoExecute(alert)) {
      await this.executeAutoAction(alert);
      alert.autoActionExecuted = true;
    }

    // Escalate immediately
    await this.escalateAlert(alert);
    alert.escalated = true;

    // Add to history
    this.addToHistory(alert);
  }

  /**
   * Aggregate alerts within a time window
   */
  aggregateAlerts(timeWindow: number = 300000): AggregatedAlert[] {
    const now = Date.now();
    const recentAlerts = this.alertHistory.filter(
      alert => now - alert.timestamp.getTime() < timeWindow
    );

    const groups = this.groupAlerts(recentAlerts);

    return groups.map(group => ({
      type: group.type,
      count: group.alerts.length,
      severity: this.calculateAggregateSeverity(group.alerts),
      firstOccurrence: group.firstOccurrence,
      lastOccurrence: group.lastOccurrence,
      affectedSymbols: this.getAffectedSymbols(group.alerts),
      recommendedActions: this.getAggregateActions(group.alerts),
    }));
  }

  /**
   * Analyze alerts over a period
   */
  analyzeAlerts(period: number = 86400000): AlertAnalysis {
    const alerts = this.alertHistory.filter(
      alert => Date.now() - alert.timestamp.getTime() < period
    );

    return {
      totalAlerts: alerts.length,
      bySeverity: this.groupBySeverity(alerts),
      byType: this.groupByType(alerts),
      bySymbol: this.groupBySymbol(alerts),
      falsePositiveRate: this.calculateFalsePositiveRate(alerts),
      responseTime: this.calculateAverageResponseTime(alerts),
      trends: this.analyzeTrends(alerts),
    };
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    return limit ? this.alertHistory.slice(0, limit) : [...this.alertHistory];
  }

  /**
   * Clear acknowledged alerts
   */
  clearAcknowledged(): void {
    this.alertHistory = this.alertHistory.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string): void {
    const alert = this.alertHistory.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Check if alert is duplicate
   */
  private isDuplicate(alert: Alert): boolean {
    const now = Date.now();
    const duplicateWindow = this.config.duplicateWindow;

    return this.alertHistory.some(
      existing =>
        existing.type === alert.type &&
        existing.severity === alert.severity &&
        now - existing.timestamp.getTime() < duplicateWindow &&
        JSON.stringify(existing.data) === JSON.stringify(alert.data)
    );
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: Alert): void {
    this.alertHistory.unshift(alert);

    // Maintain max history size
    if (this.alertHistory.length > this.config.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(0, this.config.maxHistorySize);
    }
  }

  /**
   * Select notification channels based on severity
   */
  private selectChannels(severity: AnomalySeverity): NotificationChannelConfig[] {
    return this.channels.filter(
      channel => channel.enabled && channel.severity.includes(severity)
    );
  }

  /**
   * Send alert to a notification channel
   */
  private async sendToChannel(
    channel: NotificationChannelConfig,
    alert: Alert
  ): Promise<void> {
    // In production, this would actually send notifications
    // For now, we'll just log
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });
  }

  /**
   * Send immediate notification for critical alerts
   */
  private async sendImmediateNotification(alert: CriticalAlert): Promise<void> {
    const criticalChannels = this.channels.filter(
      channel => channel.enabled && channel.severity.includes('CRITICAL')
    );

    await Promise.all(
      criticalChannels.map(channel => this.sendToChannel(channel, alert))
    );
  }

  /**
   * Check if auto-execution is enabled for this alert
   */
  private shouldAutoExecute(alert: CriticalAlert): boolean {
    // Only auto-execute for specific critical scenarios
    return alert.severity === 'CRITICAL' && alert.type === 'FLASH_CRASH';
  }

  /**
   * Execute automatic action
   */
  private async executeAutoAction(alert: CriticalAlert): Promise<void> {
    // In production, this would trigger actual trading actions
  }

  /**
   * Check and apply escalation rules
   */
  private async checkEscalation(alert: Alert): Promise<void> {
    for (const rule of this.escalationRules) {
      if (this.shouldEscalate(alert, rule)) {
        await this.applyEscalation(alert, rule);
      }
    }
  }

  /**
   * Check if alert should be escalated
   */
  private shouldEscalate(alert: Alert, rule: EscalationRule): boolean {
    const { condition } = rule;

    // Check severity match
    if (condition.severity && alert.severity !== condition.severity) {
      return false;
    }

    // Check type match
    if (condition.type && alert.type !== condition.type) {
      return false;
    }

    // Check count threshold within time window
    if (condition.count && condition.timeWindow) {
      const timeWindow = condition.timeWindow;
      const recentAlerts = this.alertHistory.filter(
        a =>
          a.type === alert.type &&
          Date.now() - a.timestamp.getTime() < timeWindow
      );
      return recentAlerts.length >= condition.count;
    }

    return true;
  }

  /**
   * Apply escalation action
   */
  private async applyEscalation(alert: Alert, rule: EscalationRule): Promise<void> {
    // In production, this would trigger escalation procedures
  }

  /**
   * Escalate a critical alert
   */
  private async escalateAlert(alert: CriticalAlert): Promise<void> {
    // In production, this would notify senior management, etc.
  }

  /**
   * Group alerts by type
   */
  private groupAlerts(alerts: Alert[]): Array<{
    type: AlertType;
    alerts: Alert[];
    firstOccurrence: Date;
    lastOccurrence: Date;
  }> {
    const groups = new Map<AlertType, Alert[]>();

    for (const alert of alerts) {
      const existing = groups.get(alert.type) ?? [];
      existing.push(alert);
      groups.set(alert.type, existing);
    }

    return Array.from(groups.entries()).map(([type, typeAlerts]) => ({
      type,
      alerts: typeAlerts,
      firstOccurrence: typeAlerts[typeAlerts.length - 1].timestamp,
      lastOccurrence: typeAlerts[0].timestamp,
    }));
  }

  /**
   * Calculate aggregate severity
   */
  private calculateAggregateSeverity(alerts: Alert[]): AnomalySeverity {
    const severityScores = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const maxScore = Math.max(...alerts.map(a => severityScores[a.severity]));
    
    const scoreToSeverity: Record<number, AnomalySeverity> = {
      1: 'LOW',
      2: 'MEDIUM',
      3: 'HIGH',
      4: 'CRITICAL',
    };
    
    return scoreToSeverity[maxScore] ?? 'MEDIUM';
  }

  /**
   * Get affected symbols from alerts
   */
  private getAffectedSymbols(alerts: Alert[]): string[] {
    const symbols = new Set<string>();
    
    for (const alert of alerts) {
      const data = alert.data as { symbol?: string };
      if (data?.symbol) {
        symbols.add(data.symbol);
      }
    }
    
    return Array.from(symbols);
  }

  /**
   * Get aggregate recommended actions
   */
  private getAggregateActions(alerts: Alert[]): string[] {
    const actions = new Set<string>();
    
    for (const alert of alerts) {
      const criticalAlert = alert as CriticalAlert;
      if (criticalAlert.recommendedAction) {
        actions.add(criticalAlert.recommendedAction);
      }
    }
    
    return Array.from(actions);
  }

  /**
   * Group alerts by severity
   */
  private groupBySeverity(alerts: Alert[]): Record<AnomalySeverity, number> {
    const counts: Record<AnomalySeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const alert of alerts) {
      counts[alert.severity]++;
    }

    return counts;
  }

  /**
   * Group alerts by type
   */
  private groupByType(alerts: Alert[]): Record<AlertType, number> {
    const counts: Partial<Record<AlertType, number>> = {};

    for (const alert of alerts) {
      counts[alert.type] = (counts[alert.type] ?? 0) + 1;
    }

    return counts as Record<AlertType, number>;
  }

  /**
   * Group alerts by symbol
   */
  private groupBySymbol(alerts: Alert[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const alert of alerts) {
      const data = alert.data as { symbol?: string };
      if (data?.symbol) {
        counts[data.symbol] = (counts[data.symbol] ?? 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Calculate false positive rate
   */
  private calculateFalsePositiveRate(alerts: Alert[]): number {
    // Simplified: In production, this would track actual outcomes
    const acknowledgedAlerts = alerts.filter(a => a.acknowledged);
    return acknowledgedAlerts.length > 0 ? 0.1 : 0; // Placeholder
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(alerts: Alert[]): number {
    // Simplified: In production, this would track actual response times
    return 30; // Placeholder: 30 seconds
  }

  /**
   * Analyze alert trends
   */
  private analyzeTrends(alerts: Alert[]): Array<{
    period: string;
    alertCount: number;
    averageSeverity: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  }> {
    // Simplified trend analysis
    const severityScores = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const avgSeverity = alerts.length > 0
      ? alerts.reduce((sum, a) => sum + severityScores[a.severity], 0) / alerts.length
      : 0;

    return [
      {
        period: 'last_24h',
        alertCount: alerts.length,
        averageSeverity: avgSeverity,
        trend: 'STABLE',
      },
    ];
  }

  /**
   * Reset alert manager
   */
  reset(): void {
    this.alertHistory = [];
  }
}
