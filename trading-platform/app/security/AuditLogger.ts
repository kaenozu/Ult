/**
 * Audit Logger
 * 
 * Comprehensive audit logging for security and compliance.
 * Tracks all important user actions and system events.
 */

import { AuditEvent, AuditEventType, AuditEventOutcome } from '../types/shared';

interface AuditQuery {
  type?: AuditEventType;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  outcome?: AuditEventOutcome;
}

interface AuditLoggerConfig {
  maxEvents: number;
  sensitiveEvents: AuditEventType[];
  enablePersistence: boolean;
  persistenceEndpoint?: string;
}

function generateSecureId(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for non-secure environments
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private readonly config: AuditLoggerConfig;

  constructor(config?: Partial<AuditLoggerConfig>) {
    this.config = {
      maxEvents: config?.maxEvents ?? 10000,
      sensitiveEvents: config?.sensitiveEvents ?? [
        'LOGIN',
        'PASSWORD_CHANGE',
        'API_KEY_CREATED',
        'API_KEY_REVOKED',
        'PERMISSION_CHANGED',
      ],
      enablePersistence: config?.enablePersistence ?? false,
      persistenceEndpoint: config?.persistenceEndpoint,
    };
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: generateSecureId(),
      timestamp: new Date(),
    };

    this.events.push(auditEvent);

    // Memory management - archive old events if limit exceeded
    if (this.events.length > this.config.maxEvents) {
      this.archiveOldEvents();
    }

    // Persist sensitive events immediately
    if (this.isSensitiveEvent(event.type)) {
      this.persistImmediately(auditEvent);
    }
  }

  /**
   * Check if event type is sensitive
   */
  private isSensitiveEvent(type: AuditEventType): boolean {
    return this.config.sensitiveEvents.includes(type);
  }

  /**
   * Archive old events to free memory
   */
  private archiveOldEvents(): void {
    const archivedCount = this.events.length - this.config.maxEvents;
    const archivedEvents = this.events.splice(0, archivedCount);
    
    // In a real implementation, this would persist to storage
    if (this.config.enablePersistence) {
      this.persistBatch(archivedEvents);
    }
  }

  /**
   * Persist a single event immediately
   */
  private persistImmediately(event: AuditEvent): void {
    if (!this.config.enablePersistence || !this.config.persistenceEndpoint) {
      return;
    }

    // In a real implementation, this would send to a backend service
    console.log('[AUDIT] Persisting sensitive event:', event.id, event.type);
  }

  /**
   * Persist a batch of events
   */
  private persistBatch(events: AuditEvent[]): void {
    if (!this.config.enablePersistence || !this.config.persistenceEndpoint) {
      return;
    }

    // In a real implementation, this would send to a backend service
    console.log(`[AUDIT] Persisting batch of ${events.length} events`);
  }

  /**
   * Query audit events
   */
  query(filter: AuditQuery): AuditEvent[] {
    return this.events.filter((event) => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.userId && event.userId !== filter.userId) return false;
      if (filter.outcome && event.outcome !== filter.outcome) return false;
      if (filter.startDate && event.timestamp < filter.startDate) return false;
      if (filter.endDate && event.timestamp > filter.endDate) return false;
      return true;
    });
  }

  /**
   * Get all events for a specific user
   */
  getByUserId(userId: string): AuditEvent[] {
    return this.events.filter((event) => event.userId === userId);
  }

  /**
   * Get all events of a specific type
   */
  getByType(type: AuditEventType): AuditEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  /**
   * Get recent events
   */
  getRecent(limit?: number): AuditEvent[] {
    // イベントは既に時系列順なので、配列全体をソートするよりも
    // 末尾からスライスして逆順にする方がはるかに効率的です。
    const items = limit ? this.events.slice(-limit) : [...this.events];
    return items.reverse();
  }

  /**
   * Get event count by type
   */
  getCountByType(): Record<AuditEventType, number> {
    const counts: Record<string, number> = {};
    
    this.events.forEach((event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    return counts as Record<AuditEventType, number>;
  }

  /**
   * Get failed events count
   */
  getFailedEventsCount(startDate?: Date): number {
    return this.events.filter((event) => {
      if (event.outcome === 'FAILURE') {
        if (startDate && event.timestamp < startDate) return false;
        return true;
      }
      return false;
    }).length;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Export events to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Get total event count
   */
  getTotalCount(): number {
    return this.events.length;
  }

  /**
   * Get configuration
   */
  getConfig(): AuditLoggerConfig {
    return { ...this.config };
  }
}

// Factory functions for common audit events
export function createLoginEvent(
  userId: string,
  ipAddress: string,
  userAgent: string,
  success: boolean
): Omit<AuditEvent, 'id' | 'timestamp'> {
  return {
    userId,
    type: 'LOGIN',
    ipAddress,
    userAgent,
    details: { method: 'password' },
    outcome: success ? 'SUCCESS' : 'FAILURE',
  };
}

export function createOrderEvent(
  userId: string,
  ipAddress: string,
  userAgent: string,
  orderDetails: {
    orderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
  },
  success: boolean
): Omit<AuditEvent, 'id' | 'timestamp'> {
  return {
    userId,
    type: 'ORDER_PLACED',
    ipAddress,
    userAgent,
    details: orderDetails,
    outcome: success ? 'SUCCESS' : 'FAILURE',
  };
}

export function createSettingsChangeEvent(
  userId: string,
  ipAddress: string,
  userAgent: string,
  settingsChanged: Record<string, unknown>
): Omit<AuditEvent, 'id' | 'timestamp'> {
  return {
    userId,
    type: 'SETTINGS_CHANGED',
    ipAddress,
    userAgent,
    details: settingsChanged,
    outcome: 'SUCCESS',
  };
}

// Singleton instance
let auditLoggerInstance: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger();
  }
  return auditLoggerInstance;
}

export const auditLogger = getAuditLogger();
