import { EventEmitter } from 'events';
import { ALERT_SYSTEM } from './constants/api';

export interface AlertCondition {
  id: string;
  name: string;
  type: 'price' | 'indicator' | 'portfolio' | 'risk';
  symbol?: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  createdAt: number;
}

export interface Alert {
  id: string;
  conditionId: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  acknowledged: boolean;
  data?: Record<string, unknown>;
}

export type NotificationChannelType = 'email' | 'sms' | 'push' | 'webhook' | 'slack';

export interface NotificationChannelConfig {
  [key: string]: string | number | boolean | undefined;
}

export interface NotificationChannel {
  type: NotificationChannelType;
  enabled: boolean;
  config: NotificationChannelConfig;
}

export class AlertNotificationSystem extends EventEmitter {
  private conditions: Map<string, AlertCondition> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private channels: Map<NotificationChannelType, NotificationChannel> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeDefaultChannels();
  }

  private initializeDefaultChannels(): void {
    const defaultChannels: NotificationChannel[] = [
      { type: 'push', enabled: true, config: {} },
      { type: 'email', enabled: false, config: {} },
      { type: 'sms', enabled: false, config: {} },
      { type: 'webhook', enabled: false, config: {} },
      { type: 'slack', enabled: false, config: {} },
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.type, channel);
    });
  }

  // Condition Management
  addCondition(condition: Omit<AlertCondition, 'id' | 'createdAt'>): string {
    const id = this.generateId();
    const newCondition: AlertCondition = {
      ...condition,
      id,
      createdAt: Date.now(),
    };
    this.conditions.set(id, newCondition);
    this.emit('conditionAdded', newCondition);
    return id;
  }

  updateCondition(id: string, updates: Partial<AlertCondition>): boolean {
    const condition = this.conditions.get(id);
    if (!condition) return false;

    const updated = { ...condition, ...updates, id };
    this.conditions.set(id, updated);
    this.emit('conditionUpdated', updated);
    return true;
  }

  removeCondition(id: string): boolean {
    const deleted = this.conditions.delete(id);
    if (deleted) {
      this.emit('conditionRemoved', id);
    }
    return deleted;
  }

  getCondition(id: string): AlertCondition | undefined {
    return this.conditions.get(id);
  }

  getAllConditions(): AlertCondition[] {
    return Array.from(this.conditions.values());
  }

  toggleCondition(id: string, enabled: boolean): boolean {
    const condition = this.conditions.get(id);
    if (!condition) return false;

    condition.enabled = enabled;
    this.conditions.set(id, condition);
    this.emit('conditionToggled', { id, enabled });
    return true;
  }

  // Alert Management
  createAlert(conditionId: string, message: string, severity: 'info' | 'warning' | 'critical', data?: Record<string, unknown>): string {
    const id = this.generateId();
    const alert: Alert = {
      id,
      conditionId,
      message,
      severity,
      timestamp: Date.now(),
      acknowledged: false,
      data,
    };

    this.alerts.set(id, alert);
    this.emit('alertCreated', alert);
    this.notifyChannels(alert);
    return id;
  }

  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    alert.acknowledged = true;
    this.alerts.set(id, alert);
    this.emit('alertAcknowledged', alert);
    return true;
  }

  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  getUnacknowledgedAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.acknowledged);
  }

  clearAcknowledgedAlerts(): void {
    const toRemove: string[] = [];
    this.alerts.forEach((alert, id) => {
      if (alert.acknowledged) {
        toRemove.push(id);
      }
    });
    toRemove.forEach(id => this.alerts.delete(id));
    this.emit('acknowledgedAlertsCleared');
  }

  // Channel Management
  configureChannel(type: NotificationChannelType, config: any): void {
    const channel = this.channels.get(type);
    if (channel) {
      channel.config = config;
      this.channels.set(type, channel);
      this.emit('channelConfigured', { type, config });
    }
  }

  toggleChannel(type: NotificationChannelType, enabled: boolean): void {
    const channel = this.channels.get(type);
    if (channel) {
      channel.enabled = enabled;
      this.channels.set(type, channel);
      this.emit('channelToggled', { type, enabled });
    }
  }

  getChannel(type: NotificationChannelType): NotificationChannel | undefined {
    return this.channels.get(type);
  }

  getAllChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  // Notification
  private notifyChannels(alert: Alert): void {
    this.channels.forEach((channel, type) => {
      if (channel.enabled) {
        this.sendNotification(type, alert, channel.config);
      }
    });
  }

  private sendNotification(type: NotificationChannelType, alert: Alert, config: any): void {
    // Emit event for UI to handle
    this.emit('notification', { type, alert, config });

    // In a real implementation, this would send to actual channels
    // For now, we just emit events that can be handled by the UI
    switch (type) {
      case 'push':
        this.sendPushNotification(alert);
        break;
      case 'email':
        // Would send email
        break;
      case 'sms':
        // Would send SMS
        break;
      case 'webhook':
        // Would call webhook
        break;
      case 'slack':
        // Would send to Slack
        break;
    }
  }

  private sendPushNotification(alert: Alert): void {
    // Browser notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Alert: ${alert.severity.toUpperCase()}`, {
          body: alert.message,
          icon: '/favicon.ico',
        });
      }
    }
  }

  // Monitoring
  startMonitoring(intervalMs: number = ALERT_SYSTEM.DEFAULT_MONITORING_INTERVAL_MS): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.checkConditions();
    }, intervalMs);

    this.emit('monitoringStarted', intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.emit('monitoringStopped');
    }
  }

  private checkConditions(): void {
    // This would evaluate all active conditions
    // For now, just emit an event
    this.emit('conditionsChecked', {
      timestamp: Date.now(),
      activeConditions: this.getAllConditions().filter(c => c.enabled).length,
    });
  }

  // Utilities
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  destroy(): void {
    this.stopMonitoring();
    this.conditions.clear();
    this.alerts.clear();
    this.removeAllListeners();
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

// Export singleton instance
export const alertNotificationSystem = new AlertNotificationSystem();
