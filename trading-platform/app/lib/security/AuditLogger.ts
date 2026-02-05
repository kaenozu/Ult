/**
 * Audit Logger
 * 
 * セキュリティ上重要な操作を記録する監査ログシステム
 * 改ざん検知、証跡保全、コンプライアンス対応
 */

import { SafeStorage } from './XSSProtection';

// ============================================================================
// 監査ログ型定義
// ============================================================================

export type AuditEventType = 
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'ORDER_CREATE'
  | 'ORDER_MODIFY'
  | 'ORDER_CANCEL'
  | 'ORDER_EXECUTE'
  | 'POSITION_OPEN'
  | 'POSITION_CLOSE'
  | 'CONFIG_CHANGE'
  | 'DATA_ACCESS'
  | 'DATA_EXPORT'
  | 'API_CALL'
  | 'SUSPICIOUS_ACTIVITY';

export type AuditEventOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ERROR';

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  outcome: AuditEventOutcome;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hash?: string; // 改ざん検知用
  previousHash?: string; // チェーン化用
}

export interface AuditLogConfig {
  maxEntries: number;
  retentionDays: number;
  enableEncryption: boolean;
  alertThreshold: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  exportFormat: 'JSON' | 'CSV';
}

// ============================================================================
// デフォルト設定
// ============================================================================

const DEFAULT_CONFIG: AuditLogConfig = {
  maxEntries: 10000,
  retentionDays: 90,
  enableEncryption: false,
  alertThreshold: 'HIGH',
  exportFormat: 'JSON',
};

// ============================================================================
// AuditLoggerクラス
// ============================================================================

class AuditLogger {
  private config: AuditLogConfig;
  private eventBuffer: AuditEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private lastHash: string = '0';
  private encryptionKey: CryptoKey | null = null;
  
  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startAutoFlush();
    // Load last hash asynchronously without blocking construction
    this.loadLastHash().catch(e => console.error('Failed to load audit log history:', e));
  }
  
  // ========================================================================
  // コアログ機能
  // ========================================================================
  
  /**
   * 監査イベントを記録
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'hash' | 'previousHash'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      previousHash: this.lastHash,
    };
    
    // ハッシュを計算（改ざん検知用）
    auditEvent.hash = this.calculateHash(auditEvent);
    this.lastHash = auditEvent.hash;
    
    // バッファに追加
    this.eventBuffer.push(auditEvent);
    
     // クリティカルイベントは即座に保存
     if (event.riskLevel === 'CRITICAL') {
       this.flush().catch(e => console.error('Flush error:', e));
     }
    
     // バッファサイズチェック
     if (this.eventBuffer.length >= 100) {
       this.flush().catch(e => console.error('Flush error:', e));
     }
    
    // アラートチェック
    this.checkAlert(auditEvent);
  }
  
  /**
   * 簡易ログ関数
   */
  logAction(
    type: AuditEventType,
    action: string,
    resource: string,
    outcome: AuditEventOutcome,
    options: {
      userId?: string;
      details?: Record<string, unknown>;
      riskLevel?: AuditEvent['riskLevel'];
    } = {}
  ): void {
    this.log({
      type,
      outcome,
      action,
      resource,
      userId: options.userId,
      details: options.details || {},
      riskLevel: options.riskLevel || 'LOW',
    });
  }
  
  // ========================================================================
  // 特定イベントタイプ用ヘルパー
  // ========================================================================
  
  logAuth(userId: string, success: boolean, details?: Record<string, unknown>): void {
    this.logAction(
      success ? 'AUTH_LOGIN' : 'AUTH_FAILED',
      success ? 'User login' : 'Login attempt failed',
      'authentication',
      success ? 'SUCCESS' : 'FAILURE',
      { userId, details, riskLevel: success ? 'LOW' : 'MEDIUM' }
    );
  }
  
  logOrder(
    userId: string,
    orderId: string,
    action: 'CREATE' | 'MODIFY' | 'CANCEL' | 'EXECUTE',
    outcome: AuditEventOutcome,
    details?: Record<string, unknown>
  ): void {
    const typeMap: Record<string, AuditEventType> = {
      CREATE: 'ORDER_CREATE',
      MODIFY: 'ORDER_MODIFY',
      CANCEL: 'ORDER_CANCEL',
      EXECUTE: 'ORDER_EXECUTE',
    };
    
    this.logAction(
      typeMap[action],
      `Order ${action.toLowerCase()}`,
      `order:${orderId}`,
      outcome,
      { userId, details, riskLevel: 'HIGH' }
    );
  }
  
  logPosition(
    userId: string,
    symbol: string,
    action: 'OPEN' | 'CLOSE',
    outcome: AuditEventOutcome,
    details?: Record<string, unknown>
  ): void {
    this.logAction(
      action === 'OPEN' ? 'POSITION_OPEN' : 'POSITION_CLOSE',
      `Position ${action.toLowerCase()}`,
      `position:${symbol}`,
      outcome,
      { userId, details, riskLevel: 'HIGH' }
    );
  }
  
  logConfigChange(
    userId: string,
    configKey: string,
    oldValue: unknown,
    newValue: unknown
  ): void {
    this.logAction(
      'CONFIG_CHANGE',
      'Configuration modified',
      `config:${configKey}`,
      'SUCCESS',
      {
        userId,
        details: { oldValue, newValue },
        riskLevel: 'MEDIUM',
      }
    );
  }
  
  logSuspiciousActivity(
    userId: string | undefined,
    activity: string,
    details?: Record<string, unknown>
  ): void {
    this.logAction(
      'SUSPICIOUS_ACTIVITY',
      activity,
      'security',
      'DENIED',
      { userId, details, riskLevel: 'CRITICAL' }
    );
  }
  
  // ========================================================================
  // ストレージ管理
  // ========================================================================
  
  /**
   * バッファをストレージに保存
   */
  private async flush(): Promise<void> {
    if (this.flushing || this.eventBuffer.length === 0) return;
    this.flushing = true;
    try {
      const existingLogs = await this.loadLogs();
      const allLogs = [...existingLogs, ...this.eventBuffer];
      
      const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      const filteredLogs = allLogs.filter(log => log.timestamp > cutoffTime);
      
      const trimmedLogs = filteredLogs.slice(-this.config.maxEntries);
      
      const serialized = JSON.stringify(trimmedLogs);
      let saveData: string;
      if (this.config.enableEncryption) {
        saveData = await this.encrypt(serialized);
      } else {
        saveData = serialized;
      }
      SafeStorage.setItem('audit_logs', saveData);
      
      this.eventBuffer = [];
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
    } finally {
      this.flushing = false;
    }
  }
  
  /**
   * ログをストレージから読み込み
   */
  private async loadLogs(): Promise<AuditEvent[]> {
    try {
      const stored = SafeStorage.getItem('audit_logs');
      if (!stored) return [];
      const decrypted = this.config.enableEncryption
        ? await this.decrypt(stored)
        : stored;
      const logs: AuditEvent[] = JSON.parse(decrypted);
      return this.verifyIntegrity(logs);
    } catch {
      return [];
    }
  }
  }
  
  /**
   * ログを検索
   */
  async searchLogs(filters: {
    type?: AuditEventType;
    userId?: string;
    startTime?: number;
    endTime?: number;
    riskLevel?: AuditEvent['riskLevel'];
  }): Promise<AuditEvent[]> {
    const logs = await this.loadLogs();
    
    return logs.filter(log => {
      if (filters.type && log.type !== filters.type) return false;
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.startTime && log.timestamp < filters.startTime) return false;
      if (filters.endTime && log.timestamp > filters.endTime) return false;
      if (filters.riskLevel && log.riskLevel !== filters.riskLevel) return false;
      return true;
    });
  }
  
  /**
   * ログをエクスポート
   */
  async exportLogs(format: 'JSON' | 'CSV' = this.config.exportFormat): Promise<string> {
    const logs = await this.loadLogs();
    
    if (format === 'CSV') {
      const headers = ['id', 'timestamp', 'type', 'outcome', 'userId', 'action', 'resource', 'riskLevel'];
      const rows = logs.map(log => [
        log.id,
        new Date(log.timestamp).toISOString(),
        log.type,
        log.outcome,
        log.userId || '',
        log.action,
        log.resource,
        log.riskLevel,
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
    
    return JSON.stringify(logs, null, 2);
  }
    
    return JSON.stringify(logs, null, 2);
  }
  
  // ========================================================================
  // 改ざん検知
  // ========================================================================
  
  /**
   * ハッシュを計算
   */
  private calculateHash(event: AuditEvent): string {
    const data = JSON.stringify({
      timestamp: event.timestamp,
      type: event.type,
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      previousHash: event.previousHash,
    });
    
    // 簡易ハッシュ（本番環境ではSHA-256等を使用）
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  /**
   * ログの整合性を検証
   */
  private verifyIntegrity(logs: AuditEvent[]): AuditEvent[] {
    const verified: AuditEvent[] = [];
    let expectedPreviousHash = '0';
    
    for (const log of logs) {
      if (log.previousHash !== expectedPreviousHash) {
        console.warn(`Audit log chain broken at event ${log.id}`);
        // 改ざん検知イベントを記録
        this.logSuspiciousActivity(
          undefined,
          'Audit log integrity violation detected',
          { brokenEventId: log.id, expectedHash: expectedPreviousHash }
        );
        break;
      }
      
      // ハッシュを再計算して検証
      const recalculatedHash = this.calculateHash({ ...log, hash: undefined });
      if (recalculatedHash !== log.hash) {
        console.warn(`Audit log hash mismatch at event ${log.id}`);
        this.logSuspiciousActivity(
          undefined,
          'Audit log hash mismatch detected',
          { eventId: log.id }
        );
        break;
      }
      
      verified.push(log);
      expectedPreviousHash = log.hash;
    }
    
    return verified;
  }
  
  // ========================================================================
  // アラート機能
  // ========================================================================
  
  private checkAlert(event: AuditEvent): void {
    const alertLevels: Record<AuditEvent['riskLevel'], number> = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3,
    };
    
    const thresholdLevel: Record<AuditLogConfig['alertThreshold'], number> = {
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3,
    };
    
    if (alertLevels[event.riskLevel] >= thresholdLevel[this.config.alertThreshold]) {
      this.triggerAlert(event);
    }
  }
  
  private triggerAlert(event: AuditEvent): void {
    // アラートをコンソールに出力（本番環境では通知サービスへ）
    console.warn(`[AUDIT ALERT] ${event.riskLevel}: ${event.action}`, {
      eventId: event.id,
      userId: event.userId,
      timestamp: new Date(event.timestamp).toISOString(),
    });
    
    // カスタムイベントを発火
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audit-alert', { detail: event }));
    }
  }
  
  // ========================================================================
  // ユーティリティ
  // ========================================================================
  
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(e => console.error('Auto-flush error:', e));
    }, 30000); // 30秒ごと
  }
  
  private async loadLastHash(): Promise<void> {
    try {
      const logs = await this.loadLogs();
      if (logs.length > 0) {
        this.lastHash = logs[logs.length - 1].hash || '0';
      }
    } catch (error) {
      console.error('Failed to load last hash:', error);
    }
  }
  
  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.deriveKey();
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryptionKey!,
      encoded
    );
    const encryptedBuffer = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(encryptedBuffer, iv.length);
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  }

  private async decrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.deriveKey();
    }
    const binary = atob(data);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryptionKey!,
      encrypted
    );
    const decryptedBuffer = new Uint8Array(decrypted);
    return new TextDecoder().decode(decryptedBuffer);
  }

  private async deriveKey(): Promise<void> {
    const secret = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_AUDIT_ENCRYPTION_KEY)
      ? process.env.NEXT_PUBLIC_AUDIT_ENCRYPTION_KEY
      : 'change-me-in-production';
    const keyData = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
    this.encryptionKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * クリーンアップ
   */
  async destroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush().catch(e => console.error('Destroy flush error:', e));
  }
}

// ============================================================================
// シングルトンエクスポート
// ============================================================================

let globalAuditLogger: AuditLogger | null = null;

export function getAuditLogger(config?: Partial<AuditLogConfig>): AuditLogger {
  if (!globalAuditLogger) {
    globalAuditLogger = new AuditLogger(config);
  }
  return globalAuditLogger;
}

export function resetAuditLogger(): void {
  if (globalAuditLogger) {
    globalAuditLogger.destroy();
    globalAuditLogger = null;
  }
}

export { AuditLogger };
export default AuditLogger;
